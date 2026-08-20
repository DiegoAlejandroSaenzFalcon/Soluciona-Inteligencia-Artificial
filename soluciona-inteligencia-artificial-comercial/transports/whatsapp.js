const pino = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys');

const {
  config, fechaDia, hoyInicio, numDeCelular
} = require('../config');
const {
  guardarLidMap, leerLidMaps, resolverLid, aplicarMapeoLid
} = require('../core/db');
const {
  leerPedidos, guardarPedido, patchPedido, resumenDe,
  formatearConfirmacion, reporteHoyTexto, siguienteId, parsearPedido
} = require('../core/orders');
const { validarUbicacion, distanciaRuta, costoDomicilio } = require('../core/geo');
const { setSock, setConectado, alertarDueno } = require('../core/notify');
const { generarMenuPNG } = require('../core/menu-img');
const { registrar } = require('../core/conversacion');
const { obtenerFlujo } = require('../core/flows');
const {
  askLLM, atenderClienteIA, agenteMasRelevante,
  dividirMensaje, esRespuestaDeError, esFueraDeTema, AGENTES
} = require('../core/ai');
const {
  ESTADOS, TRIGGERS,
  obtenerEstado, guardarEstado, limpiarEstado, resetearCarrito,
  agregarAlCarrito, quitarDelCarrito, obtenerResumenCarrito,
  transicionarAConfirmacion, transicionarAEsperandoUbicacion,
  transicionarAExploracion, transicionarACancelacion,
  agregarHistorial, obtenerHistorialReciente, detectarTrigger
} = require('../core/state-machine');
const {
  procesarMensajeCliente,
  formatearRespuestaNatural,
  formatearTriggerConfirmacion,
  formatearTriggerCancelacion,
  formatearTriggerModificacion
} = require('../core/ai-structured');
const { StructuredLogger, runWithCorrelation, getTraceId, getTenantId } = require('../kernel/src/common/logger/structured-logger');
const logger = new StructuredLogger('whatsapp-transport', 'info');

let sock = null;
let habiaEstado = false;

// ==================== LOCK FILE (SINGLE INSTANCE) ====================
const LOCK_FILE = path.join(config.dataDir || 'data', 'whatsapp.lock');

// En Windows process.kill(pid, 0) solo comprueba si el proceso existe.
function procesoVivo(pid) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; }
  catch (e) { return e && e.code === 'EPERM'; }
}

function registrarLimpiezaLock() {
  process.on('exit', () => { try { fs.unlinkSync(LOCK_FILE); } catch {} });
  process.on('SIGINT', () => { try { fs.unlinkSync(LOCK_FILE); } catch {}; process.exit(0); });
  process.on('SIGTERM', () => { try { fs.unlinkSync(LOCK_FILE); } catch {}; process.exit(0); });
}

function acquireLock() {
  try {
    fs.writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, started: new Date().toISOString() }), { flag: 'wx' });
    registrarLimpiezaLock();
    return true;
  } catch (e) {
    if (e.code === 'EEXIST') {
      let existing = {};
      try { existing = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8')); } catch {}
      // Lock HUÉRFANO (el proceso que lo creó ya murió): se reemplaza.
      if (!procesoVivo(existing.pid)) {
        console.log('[LOCK] Lock huérfano detectado (PID ' + existing.pid + ' no está activo). Reemplazando...');
        try {
          fs.writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, started: new Date().toISOString() }));
          registrarLimpiezaLock();
          return true;
        } catch (e2) {
          console.error('[LOCK] No pude reemplazar el lock:', e2.message);
          process.exit(1);
        }
      }
      console.error('[LOCK] Otra instancia ya corriendo', { existing });
      console.error('[ERROR] Otra instancia del bot ya está corriendo. Cierra la otra ventana primero.');
      process.exit(1);
    }
    throw e;
  }
}
acquireLock();

// ==================== MESSAGE QUEUE + RATE LIMIT + DEDUP ====================
const QUEUE_DIR = path.join(config.dataDir || 'data', 'queue');
if (!fs.existsSync(QUEUE_DIR)) fs.mkdirSync(QUEUE_DIR, { recursive: true });

const SENT_IDS_FILE = path.join(QUEUE_DIR, 'sent_ids.json');
const FAILED_IDS_FILE = path.join(QUEUE_DIR, 'failed_ids.json');

function loadSentIds() {
  try {
    if (fs.existsSync(SENT_IDS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SENT_IDS_FILE, 'utf8'));
      return new Set(data.ids || []);
    }
  } catch (e) { logger.warn('[QUEUE] Error cargando sent_ids:', e.message); }
  return new Set();
}

function saveSentIds(ids) {
  try {
    fs.writeFileSync(SENT_IDS_FILE, JSON.stringify({ ids: Array.from(ids), updated: new Date().toISOString() }));
  } catch (e) { logger.warn('[QUEUE] Error guardando sent_ids:', e.message); }
}

function loadFailedIds() {
  try {
    if (fs.existsSync(FAILED_IDS_FILE)) {
      const data = JSON.parse(fs.readFileSync(FAILED_IDS_FILE, 'utf8'));
      return new Set(data.ids || []);
    }
  } catch (e) { logger.warn('[QUEUE] Error cargando failed_ids:', e.message); }
  return new Set();
}

function saveFailedIds(ids) {
  try {
    fs.writeFileSync(FAILED_IDS_FILE, JSON.stringify({ ids: Array.from(ids), updated: new Date().toISOString() }));
  } catch (e) { logger.warn('[QUEUE] Error guardando failed_ids:', e.message); }
}

const idsEnviados = loadSentIds();
const idsFallidos = loadFailedIds();
const procesadosIn = new Set();
const lidMap = new Map();
try {
  for (const [lid, tel] of Object.entries(leerLidMaps())) lidMap.set(lid, tel);
} catch {}
const esperandoDireccion = new Map();
const pendientesConfirmar = new Map();

// Cola de envío con rate limit (1-3s aleatorio) + reintentos
const messageQueue = [];
let queueProcessing = false;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 3000;

// ==================== MÉTRICAS EN TIEMPO REAL ====================
const metrics = {
  messagesReceived: 0,
  messagesSent: 0,
  messagesFailed: 0,
  messagesDeduplicated: 0,
  mediaSent: 0,
  queueRetries: 0,
  queueStuck: 0,
  reconnections: 0,
  watchdogTriggers: 0,
  lastReset: Date.now(),
  latencies: [], // últimos 100
  errorsByType: {}
};

function recordMetric(name, value = 1) {
  if (name === 'latency') {
    metrics.latencies.push(value);
    if (metrics.latencies.length > 100) metrics.latencies.shift();
  } else if (name === 'error') {
    metrics.errorsByType[value] = (metrics.errorsByType[value] || 0) + 1;
  } else {
    metrics[name] = (metrics[name] || 0) + value;
  }
}

function getMetricsSnapshot() {
  const lat = metrics.latencies;
  const avgLatency = lat.length ? Math.round(lat.reduce((a,b)=>a+b,0)/lat.length) : 0;
  const p95Latency = lat.length ? Math.round(lat.sort((a,b)=>a-b)[Math.floor(lat.length*0.95)]) : 0;
  return {
    ...metrics,
    avgLatencyMs: avgLatency,
    p95LatencyMs: p95Latency,
    uptimeSec: Math.round(process.uptime()),
    sinceLastResetSec: Math.round((Date.now() - metrics.lastReset) / 1000)
  };
}

function resetMetrics() {
  Object.keys(metrics).forEach(k => {
    if (Array.isArray(metrics[k])) metrics[k] = [];
    else if (typeof metrics[k] === 'object') metrics[k] = {};
    else if (k !== 'lastReset') metrics[k] = 0;
  });
  metrics.lastReset = Date.now();
}

// Exponer globalmente
global.whatsappMetrics = getMetricsSnapshot;
global.whatsappMetricsReset = resetMetrics;

function randomDelay() {
  return BASE_DELAY_MS + Math.random() * (MAX_DELAY_MS - BASE_DELAY_MS);
}

async function processQueue() {
  if (queueProcessing || messageQueue.length === 0 || !sock) return;
  queueProcessing = true;
  while (messageQueue.length > 0 && sock) {
    const item = messageQueue.shift();
    const { jid, content, options, retries = 0, resolve, reject, startTime } = item;
    const delay = randomDelay();
    await new Promise(r => setTimeout(r, delay));
    try {
      const res = await sock.sendMessage(jid, content, options);
      if (res && res.key && res.key.id) {
        idsEnviados.add(res.key.id);
        saveSentIds(idsEnviados);
      }
      const latency = Date.now() - startTime;
      recordMetric('latency', latency);
      recordMetric('messagesSent');
      if (Object.keys(content)[0] !== 'text') recordMetric('mediaSent');
      logger.debug('[QUEUE] Enviado OK', { jid, latencyMs: latency, messageId: res.key?.id });
      resolve(res);
    } catch (e) {
      const isRateLimit = e?.message?.includes('429') || e?.message?.includes('rate') || e?.statusCode === 429;
      if (isRateLimit && retries < MAX_RETRIES) {
        const backoff = BASE_DELAY_MS * Math.pow(2, retries) + Math.random() * 1000;
        recordMetric('queueRetries');
        logger.warn('[QUEUE] Rate limit, reintentando', { jid, retry: retries + 1, backoffMs: backoff });
        messageQueue.unshift({ ...item, retries: retries + 1 });
        await new Promise(r => setTimeout(r, backoff));
      } else {
        recordMetric('messagesFailed');
        recordMetric('error', e?.message?.slice(0, 50) || 'unknown');
        logger.error('[QUEUE] Error enviando', { jid, error: e?.message, retries });
        idsFallidos.add(`${jid}:${JSON.stringify(content).slice(0, 100)}`);
        saveFailedIds(idsFallidos);
        reject(e);
      }
    }
  }
  queueProcessing = false;
}

function enqueueMessage(jid, content, options = {}) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    // Deduplicación: si ya enviamos este contenido exacto a este JID recientemente, no reenviar
    const dedupKey = `${jid}:${JSON.stringify(content).slice(0, 200)}`;
    if (idsEnviados.has(dedupKey)) {
      recordMetric('messagesDeduplicated');
      logger.debug('[QUEUE] Deduplicado', { jid });
      return resolve({ deduplicated: true });
    }
    messageQueue.push({ jid, content, options, resolve, reject, startTime });
    if (!queueProcessing) processQueue();
  });
}

const DUENO_JID = config.numero_dueno.replace(/\D/g, '') + '@s.whatsapp.net';

// Logger estructurado para whatsapp transport (ya definido arriba)

// Moneda presentable: si config.moneda tiene basura tipo "Cop: $:" o "$:", muestra "$.
function monedaPresentable() {
  const m = (config.moneda || '$').trim();
  if (/^cop\b|^col\b/i.test(m)) return '$';
  if (/:\s*\$+\s*:?\s*$/i.test(m)) return '$';
  return m;
}

// Detecta si el cliente eligió DOMICILIO o RECOGER en su mensaje.
function detectarModoEntrega(cuerpo) {
  const t = String(cuerpo || '').toLowerCase().trim();
  if (/domicilio|delivery|env[ií]o|reparto|mandar|a mi casa|para mi casa|me lo llevan|que me lo traigan|llevar a la casa|a domicilio/i.test(t)) return 'domicilio';
  if (/recoger|recogida|recojo|recoge|pasar por|paso por|recoger en|recoger pedido|lo recoge/i.test(t)) return 'recoger';
  return null;
}

// Base de un pedido nuevo (datos comunes a recoger/domicilio).
function pedidoBase(m, remitente, tel, carrito, resumenCarrito) {
  return {
    id: siguienteId(),
    fecha: new Date(Number(m.messageTimestamp) * 1000 || Date.now()).toISOString(),
    dia: fechaDia(),
    remitente,
    telefono: tel,
    items: carrito,
    total: resumenCarrito ? resumenCarrito.total : 0,
    crudo: JSON.stringify(carrito),
    estado: 'recibido'
  };
}

// Calcula distancia y costo de domicilio contra la ubicación del negocio.
async function cotizarDomicilio(lat, lng, subtotal) {
  const base = config.ubicacion_negocio;
  if (!base || !base.lat || !base.lng) {
    return { distancia: null, costo: 0, fuera_radio: false, sinUbicacionNegocio: true };
  }
  const distancia = await distanciaRuta(base.lat, base.lng, lat, lng);
  const res = costoDomicilio(config.domicilios, distancia, subtotal);
  return { distancia, costo: res.costo, fuera_radio: res.fuera_radio, motivo: res.motivo };
}

// Los LIDs de WhatsApp son identificadores de 15 dígitos (números reales
// E.164 con código de país rara vez superan los 13). Con 15 es LID.
function esLid(base) {
  return /^\d{15}$/.test(base);
}

function celularReal(jid) {
  const base = numDeCelular(jid);
  if (lidMap.has(base)) return lidMap.get(base);
  if (esLid(base)) return '';
  return base;
}

// Número del cliente SIEMPRE presente: usa el real si se conoce, si no el LID
// (never empty). Es el identificador obligatorio del cliente/pedido.
// Prioridad: senderPn del mensaje -> lidMap (memoria/DB) -> LID.
function numeroCliente(jid, m) {
  if (m && m.key) {
    const pn = m.key.senderPn || m.key.participantPn;
    if (pn) return numDeCelular(pn);
  }
  const base = numDeCelular(jid);
  if (lidMap.has(base)) return lidMap.get(base);
  return base;
}

// Captura mapeos LID -> PN que WhatsApp manda en los mensajes (sender_pn).
// Si el mapeo es nuevo, migra en cascada pedidos/clientes/conversaciones.
function capturarMapeoLid(m) {
  if (!m || !m.key) return null;
  const lid = (m.key.senderLid || (m.key.remoteJid && m.key.remoteJid.endsWith('@lid') ? m.key.remoteJid : ''));
  const pn = m.key.senderPn || m.key.participantPn;
  if (!lid || !pn) return null;
  const lidBase = numDeCelular(lid);
  const pnBase = numDeCelular(pn);
  if (!lidBase || !pnBase || !esLid(lidBase)) return null;
  if (lidMap.get(lidBase) === pnBase) return null;
  lidMap.set(lidBase, pnBase);
  const n = aplicarMapeoLid(lidBase, pnBase);
  if (n > 0) logger.info(`[LID] Mapeado ${lidBase} -> ${pnBase} (migrados ${n} registros)`);
  return pnBase;
}

// Intenta resolver un LID -> PN consultando a WhatsApp (USync, best-effort).
// No lanza excepciones: cualquier fallo deja el LID como está.
async function intentarResolverLid(s, lidBase) {
  if (!s || !s.executeUSyncQuery) return null;
  if (lidMap.has(lidBase) && !esLid(lidMap.get(lidBase))) return lidMap.get(lidBase);
  try {
    const { USyncQuery, USyncUser } = require('@whiskeysockets/baileys');
    const q = new USyncQuery()
      .withContactProtocol()
      .withLIDProtocol()
      .withUser(new USyncUser().withId(lidBase + '@lid'));
    const res = await s.executeUSyncQuery(q);
    const user = res && res.list && res.list[0];
    if (!user) return null;
    // El protocolo LID de USync devuelve el número REAL como PN plano en user.lid
    // (ej: "573001234567"). El protocolo de contacto puede traer user.id con el jid.
    const pnPlano = user.lid && String(user.lid).replace(/\D/g, '');
    const jid = user.id || user.jid || '';
    let pnBase = '';
    if (pnPlano && pnPlano.length > 5 && !esLid(pnPlano)) {
      pnBase = pnPlano;
    } else if (jid && !jid.endsWith('@lid')) {
      pnBase = numDeCelular(jid);
    }
    if (pnBase && !esLid(pnBase)) {
      lidMap.set(lidBase, pnBase);
      const n = aplicarMapeoLid(lidBase, pnBase);
      if (n > 0) logger.info(`[LID] USync resolvió ${lidBase} -> ${pnBase} (migrados ${n} registros)`);
      return pnBase;
    }
    logger.info('[LID] USync sin PN para', lidBase, '| user:', JSON.stringify(user).slice(0, 200));
  } catch (e) {
    logger.info('[LID] No pude resolver por USync:', e && e.message ? e.message : e);
  }
  return null;
}

// Al conectar: intenta resolver los LIDs ya almacenados en la DB
// (clientes/conversaciones/pedidos) que aún no tienen número real.
async function resolverLidsPendientes(s) {
  try {
    const { lidsPendientes } = require('../core/db');
    const lids = lidsPendientes();
    if (!lids.length) return;
    logger.info(`[LID] ${lids.length} LIDs pendientes de resolver...`);
    for (const lid of lids) {
      if (lidMap.has(lid) && !esLid(lidMap.get(lid))) continue;
      await intentarResolverLid(s, lid);
      await new Promise(r => setTimeout(r, 1500));
    }
  } catch (e) {
    logger.info('[LID] No pude revisar pendientes:', e && e.message ? e.message : e);
  }
}

async function cargarContactos(s, reintento) {
  if (typeof s.fetchContacts !== 'function') {
    if (reintento === 0) {
      logger.info('[OK] Número de contacto: WhatsApp lo resuelve automáticamente si el cliente está en la agenda del celular del negocio.');
    }
    return;
  }
  try {
    const contactos = await s.fetchContacts();
    for (const c of contactos) {
      if (c.lid && c.jid && !lidMap.has(c.lid)) {
        const pn = numDeCelular(c.jid);
        lidMap.set(c.lid, pn);
        guardarLidMap(c.lid, pn);
      }
    }
    logger.info(`[OK] Contactos cargados (${contactos.length}), con número real: ${lidMap.size}`);
  } catch (e) {
    logger.info('[!] No pude cargar los contactos:', e.message || e);
  }
  if (reintento < 3) setTimeout(() => cargarContactos(s, reintento + 1), 60000);
}

async function responder(s, jid, texto, m) {
  const phone = numDeCelular(jid);
  const traceId = getTraceId();
  const tenantId = getTenantId();
  const startTime = Date.now();
  try {
    const res = await enqueueMessage(jid, { text: texto }, m ? { quoted: m } : undefined);
    const latency = Date.now() - startTime;
    if (res && !res.deduplicated && res.key && res.key.id) {
      idsEnviados.add(res.key.id);
      saveSentIds(idsEnviados);
    }
    registrar(phone, '', 'bot', texto);
    logger.debug(`Mensaje enviado a ${phone}`, {
      traceId,
      tenantId: phone,
      action: 'message_sent',
      module: 'whatsapp-transport',
      meta: { length: texto.length, latencyMs: latency, deduplicated: !!res?.deduplicated }
    });
    return res;
  } catch (e) {
    logger.error('[RESPONDER] Error en queue', { phone, error: e?.message });
    throw e;
  }
}

async function responderMedia(s, jid, content, m) {
  const phone = numDeCelular(jid);
  const traceId = getTraceId();
  const tenantId = getTenantId();
  const startTime = Date.now();
  try {
    const res = await enqueueMessage(jid, content, m ? { quoted: m } : undefined);
    const latency = Date.now() - startTime;
    if (res && !res.deduplicated && res.key && res.key.id) {
      idsEnviados.add(res.key.id);
      saveSentIds(idsEnviados);
    }
    logger.debug(`Media enviada a ${phone}`, {
      traceId,
      tenantId: phone,
      action: 'media_sent',
      module: 'whatsapp-transport',
      meta: { latencyMs: latency, type: Object.keys(content)[0] }
    });
    return res;
  } catch (e) {
    logger.error('[RESPONDER-MEDIA] Error en queue', { phone, error: e?.message });
    throw e;
  }
}

async function enviarMenu(s, jid, m) {
  const menu = config.menu || {};
  const base = path.resolve(__dirname, '..');
  const imgs = (menu.imagenes || []).filter(f => f && fs.existsSync(path.join(base, f)));
  if (imgs.length) {
    for (const f of imgs) {
      const buf = fs.readFileSync(path.join(base, f));
      await responderMedia(s, jid, { image: buf, caption: `📋 Menú ${config.nombreNegocio()}` }, m);
      registrar(numeroCliente(jid, m), '', 'bot', '[imagen de menú]');
    }
    return;
  }
  if (menu.url) {
    await responder(s, jid, `📋 Menú completo de ${config.nombreNegocio()}:\n${menu.url}`, m);
    return;
  }
  // 1) Menú en IMAGEN (generado automáticamente desde config.productos).
  //    Divide en páginas legibles y las envía como fotos.
  try {
    const archivos = generarMenuPNG();
    if (archivos.length) {
      const total = archivos.length;
      for (let i = 0; i < archivos.length; i++) {
        const buf = fs.readFileSync(archivos[i]);
        const caption = total > 1
          ? `📋 Menú ${config.nombreNegocio()} (${i + 1}/${total})`
          : `📋 Menú ${config.nombreNegocio()}`;
        await responderMedia(s, jid, { image: buf, caption }, m);
        registrar(numeroCliente(jid, m), '', 'bot', `[imagen de menú ${i + 1}/${total}]`);
      }
      await responder(s, jid, '¿Qué te provoca hoy? 🍔 Escríbeme los platos y las cantidades.', m);
      return;
    }
  } catch (e) {
    logger.info('[MENU-IMG] Falló el envío por imagen, uso texto:', e && e.message ? e.message : e);
  }
  // 2) Respaldo: menú en TEXTO seccionado por categorías.
  const prods = config.productos || [];
  const catDe = p => p.categoria || '📦 Otros';
  const porCat = new Map();
  for (const p of prods) {
    if (!porCat.has(catDe(p))) porCat.set(catDe(p), []);
    porCat.get(catDe(p)).push(p);
  }
  const pedirNota = 'Para pedir escribe los platos y cantidades. Ej: "2 perros especiales y 1 limonada de coco"';
  const bloques = [...porCat].map(([cat, lista]) =>
    `*${cat}*\n${lista.map(p => {
      const precio = `${monedaPresentable()}${p.precio.toLocaleString('es-CO')}`;
      const lleva = p.ingredientes ? ` — ${p.ingredientes}` : '';
      return `▸ ${p.nombre}: ${precio}${lleva}`;
    }).join('\n')}\n`);
  const mensajes = [];
  let seccion = '';
  for (const bloque of bloques) {
    // Cada mensaje de WhatsApp se ve bien hasta ~3800 chars.
    if (seccion.length + bloque.length > 3800 && seccion.trim()) {
      mensajes.push(seccion);
      seccion = '';
    }
    seccion += bloque;
  }
  if (seccion.trim()) mensajes.push(seccion);
  const total = mensajes.length;
  const cabecera = `📋 *MENÚ ${config.nombreNegocio().toUpperCase()}*\n\n`;
  for (let i = 0; i < mensajes.length; i++) {
    let texto = `${cabecera}${mensajes[i]}${pedirNota}`;
    if (total > 1) texto += `\n_(${i + 1} de ${total})_`;
    await responder(s, jid, texto, m);
  }
}

async function procesar(s, m, jid, cuerpo, ubicacion) {
  const esDueno = numDeCelular(jid) === config.numero_dueno.replace(/\D/g, '');
  const esComando = cuerpo.startsWith('!') || /^(ia|agente|agent)\b/i.test(cuerpo);

  if (esComando && esDueno) {
    if (cuerpo === '!reporte') {
      const r = resumenDe(leerPedidos(), hoyInicio());
      logger.info('[OK] Enviando !reporte al dueño');
      await responder(s, jid, r.texto, m);
    } else if (cuerpo === '!vendidos') {
      const pedidos = leerPedidos().filter(p => p.dia === fechaDia());
      const texto = pedidos.length
        ? pedidos.map(p => `#${p.id} ${p.remitente}: ${p.items.map(i => `${i.cantidad} ${i.producto}`).join(', ')} = ${config.moneda}${p.total.toLocaleString('es-CO')} ${p.lat ? `📍 https://maps.google.com/?q=${p.lat},${p.lng}` : p.direccion ? `📍 ${p.direccion}` : ''}`).join('\n')
        : 'Hoy no hay pedidos aún.';
      logger.info('[OK] Enviando !vendidos al dueño');
      await responder(s, jid, `📋 PEDIDOS DE HOY\n\n${texto}`, m);
    } else if (cuerpo === '!menu') {
      logger.info('[OK] Enviando menú');
      await enviarMenu(s, jid, m);
    } else if (cuerpo === '!ayuda') {
      logger.info('[OK] Enviando !ayuda al dueño');
      await responder(s, jid, 'Comandos:\n!reporte → resumen de hoy\n!vendidos → lista de pedidos de hoy\n!agentes → áreas de la Agencia IA\n\nIA desde el celular:\n• ia <tu consulta> → elige el experto ideal solo\n• agente <Nombre>: <consulta> → hablas con uno específico', m);
    } else if (/^!agentes?$/i.test(cuerpo)) {
      const cats = {};
      AGENTES.forEach(a => { cats[a.category] = (cats[a.category] || 0) + 1; });
      const lista = Object.entries(cats).map(([c, n]) => `• ${c}: ${n}`).join('\n');
      logger.info('[OK] Enviando !agentes al dueño');
      await responder(s, jid, `🤖 AGENCIA IA — ${AGENTES.length} expertos disponibles\n\n${lista}\n\nCómo consultar:\n• ia <tu consulta> → elige el experto ideal solo\n• agente <Nombre>: <consulta> → hablas con uno específico\nEj: ia arma una promo para Instagram este finde`, m);
    } else if (/^(ia|agente|agent)\b/i.test(cuerpo)) {
      await responder(s, jid, '🤖 Buscando al experto indicado y preparando respuesta...', m);
      let consulta = cuerpo.replace(/^(ia|agente|agent)\b\s*/i, '').trim();
      let agente = null;
      let texto = consulta;
      const matchNombre = consulta.match(/^([^:]+):\s*([\s\S]+)$/);
      if (matchNombre) {
        const nombre = matchNombre[1].trim();
        texto = matchNombre[2].trim();
        agente = AGENTES.find(a => a.name.toLowerCase().includes(nombre.toLowerCase()));
        if (!agente) {
          const sugs = AGENTES.filter(a => a.name.toLowerCase().includes(nombre.toLowerCase().slice(0, 5))).slice(0, 6).map(a => a.name);
          await responder(s, jid, `No encontré un experto llamado "${nombre}".\nAlgunos parecidos:\n${sugs.length ? sugs.map(x => '• ' + x).join('\n') : '(escribe "!agentes" para ver áreas)'}\n\nO escribe "ia <consulta>" y elijo el mejor.`, m);
          return;
        }
      } else {
        agente = agenteMasRelevante(texto);
      }
      const reply = await askLLM(agente, texto);
      const encabezado = `🤖 ${agente.emoji || '🤖'} ${agente.name}\n(${agente.category})\n\n`;
      for (const parte of dividirMensaje(encabezado + reply, 3800)) {
        await responder(s, jid, parte, m);
      }
      return;
    }
    return;
  }

  const flujo = obtenerFlujo();
  if (flujo) {
    const ctx = {
      s, jid, m, cuerpo, ubicacion,
      remitente: m.pushName || 'Cliente',
      tel: numeroCliente(jid, m),
      esDueno: numDeCelular(jid) === config.numero_dueno.replace(/\D/g, ''),
      responder: (texto) => responder(s, jid, texto, m)
    };
    const manejado = await flujo.manejarMensaje(ctx);
    if (manejado) return;
  }

  const remitente = m.pushName || 'Cliente';
  const tel = numeroCliente(jid, m);
  if (remitente !== 'Cliente') {
    const { actualizarPerfil } = require('../core/db');
    actualizarPerfil({ telefono: tel, remitente, fecha: new Date().toISOString() });
  }

  registrar(tel, remitente, 'cliente', cuerpo || (ubicacion ? '[ubicación compartida]' : ''));
  agregarHistorial(jid, 'user', cuerpo);

  const estadoObj = obtenerEstado(jid);
  const estado = estadoObj.estado;
  const carrito = estadoObj.carrito;
  const resumenCarrito = obtenerResumenCarrito(jid);
  const historial = obtenerHistorialReciente(jid, 8);

  const items = parsearPedido(cuerpo);

  if (items.length > 0) {
    agregarAlCarrito(jid, items);
    const totalUnidades = carrito.reduce((s, i) => s + i.cantidad, 0) + items.reduce((s, i) => s + i.cantidad, 0);
    if (totalUnidades > config.max_unidades_confirmar) {
      await responder(s, jid, `⚠️ ¿Son realmente ${totalUnidades} unidades en total?\n\nSi es correcto responde CONFIRMAR.\nSi no, responde CANCELAR y escríbelo de nuevo.`, m);
      transicionarAConfirmacion(jid);
      return;
    }
    const nuevoResumen = obtenerResumenCarrito(jid);
    const lineas = items.map(i => `✅ ${i.cantidad} x ${i.producto} = ${config.moneda}${i.subtotal.toLocaleString('es-CO')}`).join('\n');
    await responder(s, jid, `${lineas}\n\n🛒 Subtotal: ${config.moneda}${nuevoResumen.total.toLocaleString('es-CO')}\n\n¿Agregas algo más? Si terminaste, escribe: DOMICILIO (envías tu ubicación 📍) o RECOGER.`, m);
    return;
  }

  // Modo de entrega elegido por el cliente con el carrito listo.
  const modoEntrega = detectarModoEntrega(cuerpo);
  if (modoEntrega && carrito.length > 0 && estado !== ESTADOS.ESPERANDO_UBICACION) {
    if (modoEntrega === 'domicilio') {
      transicionarAEsperandoUbicacion(jid);
      await responder(s, jid, config.pregunta_direccion || '📍 Mándame tu UBICACIÓN por GPS (botón 📎 → Ubicación).', m);
    } else {
      const pedido = pedidoBase(m, remitente, tel, carrito, resumenCarrito);
      pedido.tipo = 'recoger';
      pedido.direccion = 'Recoge en el local';
      guardarPedido(pedido);
      logger.info(`[PEDIDO] Guardado #${pedido.id} RECOGER | total ${config.moneda}${pedido.total.toLocaleString('es-CO')}`);
      await responder(s, jid, formatearConfirmacion(pedido, remitente), m);
      limpiarEstado(jid);
    }
    return;
  }

  const trigger = detectarTrigger(cuerpo, estado, carrito);

  if (trigger === TRIGGERS.CONFIRMAR_PEDIDO && carrito.length > 0) {
    const pendiente = pendientesConfirmar.get(jid);
    // Caso DOMICILIO: el pedido pendiente ya tiene la ubicación y costo calculado.
    if (pendiente && pendiente.modo === 'domicilio' && pendiente.lat) {
      const pedido = pedidoBase(m, remitente, tel, carrito, resumenCarrito);
      pedido.tipo = 'domicilio';
      pedido.direccion = pendiente.etiqueta || 'Ubicación compartida';
      pedido.lat = pendiente.lat;
      pedido.lng = pendiente.lng;
      pedido.distancia_km = pendiente.distancia;
      pedido.costo_domicilio = pendiente.costo;
      pedido.total = resumenCarrito.total + (pendiente.costo || 0);
      guardarPedido(pedido);
      logger.info(`[PEDIDO] Guardado #${pedido.id} DOMICILIO | total ${config.moneda}${pedido.total.toLocaleString('es-CO')} | ${pedido.distancia_km != null ? pedido.distancia_km.toFixed(1) + ' km' : 'sin distancia'}`);
      await responder(s, jid, formatearConfirmacion(pedido, remitente), m);
      limpiarEstado(jid);
      pendientesConfirmar.delete(jid);
      return;
    }
    // Caso RECOGER: confirmación directa sin ubicación.
    if (pendiente && pendiente.modo === 'recoger') {
      const pedido = pedidoBase(m, remitente, tel, carrito, resumenCarrito);
      pedido.tipo = 'recoger';
      pedido.direccion = 'Recoge en el local';
      guardarPedido(pedido);
      logger.info(`[PEDIDO] Guardado #${pedido.id} RECOGER | total ${config.moneda}${pedido.total.toLocaleString('es-CO')}`);
      await responder(s, jid, formatearConfirmacion(pedido, remitente), m);
      limpiarEstado(jid);
      pendientesConfirmar.delete(jid);
      return;
    }
    // Sin modo elegido aún: pide DOMICILIO o RECOGER antes de confirmar.
    await responder(s, jid, 'Primero dime cómo lo quieres: escribe DOMICILIO (envías tu ubicación 📍) o RECOGER.', m);
    return;
  }

  if (trigger === TRIGGERS.CANCELAR_PEDIDO && carrito.length > 0) {
    limpiarEstado(jid);
    pendientesConfirmar.delete(jid);
    await responder(s, jid, '✅ Listo, pedido cancelado. Cuando quieras haz un nuevo pedido.', m);
    return;
  }

  if (trigger === TRIGGERS.MODIFICAR_PEDIDO && carrito.length > 0) {
    const r = await procesarMensajeCliente(jid, cuerpo, estado, carrito, resumenCarrito || { lineas: [], total: 0 }, historial);
    if (r.type === 'function_call' && r.name === 'modificar_pedido') {
      const triggerData = formatearTriggerModificacion(r.arguments);
      if (triggerData.accion === 'quitar') {
        quitarDelCarrito(jid, triggerData.producto);
        const nuevoResumen = obtenerResumenCarrito(jid);
        if (nuevoResumen) {
          await responder(s, jid, `🗑️ Quitado: ${triggerData.producto}\n\n🛒 Tu carrito:\n${nuevoResumen.lineas.join('\n')}\nTOTAL: ${config.moneda}${nuevoResumen.total.toLocaleString('es-CO')}\n\n¿Algo más? Escribe CONFIRMAR para terminar.`, m);
        } else {
          await responder(s, jid, `🗑️ Carrito vacío. Escribe tu nuevo pedido.`, m);
        }
      } else if (triggerData.accion === 'cambiar_cantidad') {
        const estadoObj = obtenerEstado(jid);
        const item = estadoObj.carrito.find(i => i.producto === triggerData.producto);
        if (item) {
          item.cantidad = triggerData.cantidad;
          item.subtotal = item.cantidad * item.precioUnitario;
          guardarEstado(jid, estadoObj);
          const nuevoResumen = obtenerResumenCarrito(jid);
          await responder(s, jid, `🔢 Actualizado: ${triggerData.producto} → ${triggerData.cantidad} und\n\n🛒 Tu carrito:\n${nuevoResumen.lineas.join('\n')}\nTOTAL: ${config.moneda}${nuevoResumen.total.toLocaleString('es-CO')}`, m);
        }
      }
      return;
    }
  }

  if (trigger === TRIGGERS.SOLICITAR_MENU) {
    await enviarMenu(s, jid, m);
    return;
  }

  if (trigger === TRIGGERS.CONSULTAR_PRODUCTO) {
    const respIng = buscarIngredientes(cuerpo);
    if (respIng) {
      await responder(s, jid, respIng, m);
    } else {
      const r = await procesarMensajeCliente(jid, cuerpo, estado, carrito, resumenCarrito || { lineas: [], total: 0 }, historial);
      if (r.type === 'function_call' && r.name === 'consultar_producto') {
      } else if (r.type === 'text') {
        await responder(s, jid, formatearRespuestaNatural(r.content), m);
      }
    }
    return;
  }

  if (estado === ESTADOS.ESPERANDO_UBICACION || esperandoDireccion.has(jid)) {
    const pendId = esperandoDireccion.get(jid) || null;
    if (!ubicacion) {
      // GPS estricto: SOLO se acepta la ubicación por GPS. Todo texto se rechaza.
      await responder(s, jid, '⚠️ Solo acepto tu UBICACIÓN por GPS (botón 📎 → Ubicación). No se guardan otros textos.', m);
      return;
    }
    const valida = validarUbicacion(ubicacion);
    if (!valida) {
      logger.info(`[DIRECCION] ⚠️ Ubicación inválida (${ubicacion.lat},${ubicacion.lng})`);
      await responder(s, jid, '⚠️ No pude leer bien la ubicación. Envíala de nuevo (📎 → Ubicación).', m);
      return;
    }
    const lat = Number(ubicacion.lat).toFixed(6);
    const lng = Number(ubicacion.lng).toFixed(6);
    const etiqueta = [ubicacion.nombre, ubicacion.detalle].filter(Boolean).join(' - ');
    // Cotiza el domicilio por distancia contra la ubicación del negocio.
    const cotizacion = await cotizarDomicilio(lat, lng, resumenCarrito ? resumenCarrito.total : 0);
    if (cotizacion.fuera_radio) {
      await responder(s, jid, `Lo sentimos, no hacemos entregas a esa distancia (${cotizacion.distancia != null ? cotizacion.distancia.toFixed(1) + ' km' : 'fuera de rango'}). Puedes enviar otra ubicación o escribir CANCELAR.`, m);
      return;
    }
    if (pendId && pendId !== 'carrito_actual') {
      patchPedido(pendId, { direccion: etiqueta || 'Ubicación compartida', lat, lng, distancia_km: cotizacion.distancia, costo_domicilio: cotizacion.costo });
      logger.info(`[DIRECCION] Pedido #${pendId}: ${lat},${lng} ${etiqueta}`);
      limpiarEstado(jid);
      esperandoDireccion.delete(jid);
      await responder(s, jid, formatearConfirmacion(leerPedidos().find(p => p.id === pendId), remitente), m);
      return;
    }
    // Guarda la cotización pendiente y pide la confirmación final con el total.
    pendientesConfirmar.set(jid, { modo: 'domicilio', lat, lng, etiqueta, distancia: cotizacion.distancia, costo: cotizacion.costo });
    const distTxt = cotizacion.distancia != null ? ` (${cotizacion.distancia.toFixed(1)} km)` : '';
    const costoDomiTxt = cotizacion.costo > 0 ? `${config.moneda}${cotizacion.costo.toLocaleString('es-CO')}` : 'sin costo 🎉';
    await responder(s, jid, `📍 Ubicación recibida${distTxt}.\n\n${resumenCarrito.lineas.join('\n')}\n\n🚚 Domicilio: ${costoDomiTxt}\n💰 TOTAL: ${config.moneda}${(resumenCarrito.total + (cotizacion.costo || 0)).toLocaleString('es-CO')}\n\nEscribe CONFIRMAR para terminar o CANCELAR.`, m);
    return;
  }

  if (!esDueno) {
    const r = await procesarMensajeCliente(jid, cuerpo, estado, carrito, resumenCarrito || { lineas: [], total: 0 }, historial);
    if (r.type === 'function_call') {
      if (r.name === 'mostrar_menu') {
        await enviarMenu(s, jid, m);
      } else if (r.name === 'consultar_producto') {
        const respIng = buscarIngredientes(cuerpo);
        if (respIng) await responder(s, jid, respIng, m);
      } else if (r.name === 'responder_natural') {
        await responder(s, jid, formatearRespuestaNatural(r.arguments.mensaje), m);
      }
    } else if (r.type === 'text') {
      await responder(s, jid, formatearRespuestaNatural(r.content), m);
    } else if (r.type === 'error') {
      await responder(s, jid, config.mensaje_fallback || config.mensaje_bienvenida, m);
    }
  }
  }

  // Responde por CÓDIGO las preguntas de ingredientes/diferencias usando los datos
// reales del menú (nunca inventa). Devuelve null si la consulta no es de eso.
function buscarIngredientes(cuerpo) {
  const prods = config.productos || [];
  const esLleva = /(qué|que) lleva|(qué|que) tiene|lleva |ingredientes|con qué|de qué está|diferencia|diferentes|distingue|es la diferencia|qué incluye|incluye|contiene|compuesto|hecho de|hecha de|de qué es|de que es/i.test(cuerpo);
  if (!esLleva) return null;
  const norm = t => String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cuerpoN = norm(cuerpo);
  // Levenshtein para tolerar typos ("volvanica" -> "volcanica").
  const dist = (a, b) => {
    const m = a.length, n = b.length;
    const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 0; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return d[m][n];
  };
  // 1) Matches exactos de nombre o alias completos. Un match corto no cuenta
  //    si su texto es subcadena de un match más largo ("super perra" cubre "perra").
  const paresExactos = [];
  for (const p of prods) {
    if (cuerpoN.includes(norm(p.nombre))) paresExactos.push([p.nombre, norm(p.nombre)]);
    for (const a of (p.alias || [])) {
      if (cuerpoN.includes(norm(a))) paresExactos.push([p.nombre, norm(a)]);
    }
  }
  paresExactos.sort((x, y) => y[1].length - x[1].length);
  const aceptados = [];
  for (const [prod, texto] of paresExactos) {
    if (aceptados.some(([, t]) => texto !== t && texto.length < t.length && t.includes(texto))) continue;
    aceptados.push([prod, texto]);
  }
  const matchesExactos = new Set(aceptados.map(([prod]) => prod));
  // 2) Fuzzy: cada palabra del cuerpo (>=5 chars) contra palabras del
  //    nombre/alias (>=5 chars) con distancia <=2. Se SIEMPRE combina con los
  //    exactos para casos como "diferencia entre perro y perra".
  const matchesFuzzy = new Set();
  {
    const palabrasCuerpo = [...new Set(cuerpoN.split(/[^a-z0-9]+/).filter(w => w.length >= 5))];
    const diccionario = new Map(); // palabra-prod -> [producto, distancia]
    for (const p of prods) {
      const palabras = [...new Set(
        [p.nombre, ...(p.alias || [])].map(norm).flatMap(x => x.split(/[^a-z0-9]+/))
      )].filter(w => w.length >= 5);
      for (const pw of palabras) {
        if (!diccionario.has(pw) || diccionario.get(pw)[1] > 0) diccionario.set(pw, [p.nombre, 0]);
      }
    }
    for (const w of palabrasCuerpo) {
      for (const [pw, [prod]] of diccionario) {
        const d = dist(w, pw);
        const tol = w.length >= 8 ? 2 : 1;
        if (d <= tol) matchesFuzzy.add(prod);
      }
    }
  }
  // 3) Regla de combinación:
  //    - Pregunta de DIFERENCIA -> combinar exactos + fuzzy (comparar varios).
  //    - "Qué lleva X" -> SOLO exactos si los hay; fuzzy solo si no hay exacto.
  const esDiferencia = /diferencia|diferentes|distingue|es la diferencia/i.test(cuerpo);
  let platos;
  if (esDiferencia) {
    platos = [...new Set([...matchesExactos, ...matchesFuzzy])];
  } else if (matchesExactos.size) {
    platos = [...matchesExactos];
  } else {
    platos = [...matchesFuzzy];
  }
  platos = platos.map(nombre => prods.find(p => p.nombre === nombre)).filter(Boolean);
  if (!platos.length) return null;
  // Evita listas gigantes: máximo 4 platos comparados.
  if (platos.length > 4) platos.length = 4;
  const precio = p => `${monedaPresentable()}${p.precio.toLocaleString('es-CO')}`;
  if (platos.length === 1) {
    const p = platos[0];
    if (!p.ingredientes) return `🤔 *${p.nombre}* (${precio(p)}). No tenemos la lista de ingredientes registrada aún; pregúntale al local 😊`;
    return `🍽️ *${p.nombre}* (${precio(p)})\nLleva: ${p.ingredientes}`;
  }
  const titulo = /diferencia|diferentes|distingue/i.test(cuerpo)
    ? '⚖️ Diferencias:'
    : '🍽️ Esto llevan:';
  return `${titulo}\n${platos.map(p =>
    `\n*${p.nombre}* (${precio(p)})\n${p.ingredientes || 'Sin lista de ingredientes registrada.'}`
  ).join('\n')}`;
}

async function iniciarSesion() {
  const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
  // Versión de baileys local (sin fetch a internet en cada arranque => arranque rápido)
  const version = require('@whiskeysockets/baileys/lib/Defaults/baileys-version.json').version;
  const s = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' })
  });
  sock = s;
  s.ev.on('creds.update', saveCreds);

  // ==================== WATCHDOG + HEALTH CHECK ====================
  let lastMessageTs = Date.now();
  let lastSentTs = Date.now();
  const WATCHDOG_INTERVAL = 30000; // 30s
  // Ya NO se reinicia el socket por inactividad: un negocio real pasa horas
  // sin mensajes. El watchdog solo actúa si la conexión websocket está muerta
  // o la cola de envío quedó atascada.
  const WS_OPEN = 1;

  function socketVivo() {
    try {
      if (!sock) return false;
      if (!sock.ws) return false;
      return sock.ws.readyState === WS_OPEN;
    } catch { return false; }
  }

  function startWatchdog() {
    if (global.watchdogTimer) clearInterval(global.watchdogTimer);
    global.watchdogTimer = setInterval(() => {
      const now = Date.now();
      const wsMuerto = !socketVivo();
      const queueStuck = messageQueue.length > 0 && !queueProcessing && (now - (messageQueue[0]?.startTime || now)) > 120000;

      // El websocket murió sin evento 'close' (Baileys a veces queda en CONNECTING
      // eterno). Forzar reconexión si alguna vez conectamos en esta ejecución y
      // no hay ya una reconexión en curso.
      if (wsMuerto && habiaEstado && !global.reconectando) {
        global.reconectando = true;
        recordMetric('watchdogTriggers');
        logger.warn('[WATCHDOG] Websocket muerto, forzando reconexión', {
          queueLen: messageQueue.length,
          queueProcessing
        });
        if (sock) { try { sock.ws?.close(); } catch {} sock = null; }
        global.reconnectAttempts = 0;
        setTimeout(() => { global.reconectando = false; iniciarSesion(); }, 2000);
      } else if (queueStuck) {
        recordMetric('watchdogTriggers');
        recordMetric('queueStuck');
        logger.warn('[WATCHDOG] Queue atascada, limpiando cola', {
          queueLen: messageQueue.length,
          queueProcessing
        });
        const atascados = messageQueue.splice(0);
        for (const item of atascados) {
          try { item.reject(new Error('queue_stuck_watchdog')); } catch {}
        }
      }
      // Log heartbeat cada 5min
      if (now % 300000 < WATCHDOG_INTERVAL) {
        logger.info('[HEARTBEAT] Bot vivo', { 
          uptimeSec: Math.round(process.uptime()), 
          queueLen: messageQueue.length, 
          connected: !!sock && global.conectado === true,
          wsVivo: socketVivo(),
          lastMsgAgoSec: Math.round((now - lastMessageTs)/1000)
        });
      }
    }, WATCHDOG_INTERVAL);
  }

  function stopWatchdog() {
    if (global.watchdogTimer) clearInterval(global.watchdogTimer);
  }

  // Actualizar timestamps en eventos clave
  const originalOnMessage = s.ev.on.bind(s.ev);
  s.ev.on('messages.upsert', ({ messages }) => {
    lastMessageTs = Date.now();
  });

  // Hook en responder para lastSentTs
  const origResponder = responder;
  responder = async (...args) => {
    lastSentTs = Date.now();
    return origResponder(...args);
  };

  // Llamadas entrantes: rechazar automáticamente y avisar que se atiende por texto
  s.ev.on('call', async (calls) => {
    for (const c of calls || []) {
      const jid = c.from || '';
      if (!jid) continue;
      logger.info(`[LLAMADA] ${c.status || 'desconocido'} de ${jid}`);
      try {
        if (sock && typeof sock.rejectCall === 'function') {
          await sock.rejectCall(c.id, c.from);
        }
      } catch (e) { logger.debug('[LLAMADA] No pude rechazar', e && e.message); }
      try {
        const msgLlamada = (config.mensaje_llamada || '').trim() ||
          `Hola 👋 No puedo contestar llamadas aquí, pero escríbeme tu pedido y lo atiendo de inmediato 🛵`;
        enqueueMessage(jid, { text: msgLlamada });
      } catch (e) { logger.debug('[LLAMADA] No pude responder', e && e.message); }
    }
  });

  // Exponer health check data
  global.whatsappHealth = () => ({
    connected: !!sock && global.conectado === true,
    uptimeSec: Math.round(process.uptime()),
    lastMessageAgoSec: Math.round((Date.now() - lastMessageTs) / 1000),
    lastSentAgoSec: Math.round((Date.now() - lastSentTs) / 1000),
    queueLength: messageQueue.length,
    queueProcessing,
    sentIdsCount: idsEnviados.size,
    failedIdsCount: idsFallidos.size,
    stale: Date.now() - lastMessageTs > STALE_THRESHOLD
  });

  startWatchdog();

  s.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (update.qr) {
      logger.info('\n[!] Escanea este QR con el WhatsApp del NEGOCIO: Ajustes > Dispositivos vinculados > Vincular dispositivo\n');
      qrcode.generate(update.qr, { small: true });
    }
    if (connection === 'open') {
      global.reconectando = false;
      setSock(s);
      setConectado(true);
      logger.info(`[OK] ${config.nombreNegocio()} conectado. Escuchando pedidos...`);
      logger.info('[VISTO] Esperando mensajes...');
      if (habiaEstado) alertarDueno('✅ El bot volvió a CONECTARSE. Ya puede recibir pedidos.');
      habiaEstado = true;
      // Backup inmediato al conectar + programar diario
      setImmediate(() => { try { backupAuthInfo(); } catch {} });
      programarBackupDiario();
      cargarContactos(s, 0);
      resolverLidsPendientes(s);
      setTimeout(() => {
        responder(s, DUENO_JID, `✅ El bot de ${config.nombreNegocio()} está ACTIVO. Escribe un pedido y lo registramos.`)
          .then(() => logger.info('[OK] Mensaje de prueba enviado al dueño.'))
          .catch(e => logger.info('[!] No pude enviar mensaje de prueba:', e.message || e));
      }, 3000);
    }
    if (connection === 'close') {
      setConectado(false);
      const statusCode = lastDisconnect && lastDisconnect.error && lastDisconnect.error.output
        ? lastDisconnect.error.output.statusCode
        : null;
      if (statusCode === DisconnectReason.loggedOut) {
        logger.info('[!] La sesión fue cerrada desde el celular. Borra la carpeta "auth_info" y vuelve a abrir iniciar.bat para escanear de nuevo.');
        alertarDueno('❌ SESIÓN CERRADA desde el celular. El bot NO recibe pedidos hasta escanear el QR de nuevo.');
      } else {
        // Reconexión exponencial con jitter: 5s, 10s, 20s, 40s, 80s, max 300s
        const RECONNECT_BASE = 5000;
        const RECONNECT_MAX = 300000;
        if (!global.reconnectAttempts) global.reconnectAttempts = 0;
        global.reconnectAttempts++;
        recordMetric('reconnections');
        const delay = Math.min(RECONNECT_BASE * Math.pow(2, global.reconnectAttempts - 1) + Math.random() * 1000, RECONNECT_MAX);
        logger.warn('[RECONNECT] Conexión caída, reintentando', { attempt: global.reconnectAttempts, delayMs: delay });
        alertarDueno(`⚠️ Bot desconectado. Reintentando en ${Math.round(delay/1000)}s (intento ${global.reconnectAttempts})...`);
        global.reconectando = true;
        setTimeout(() => {
          global.reconectando = false;
          if (sock) { sock.ws?.close(); sock = null; }
          iniciarSesion();
        }, delay);
      }
    }
  });

  s.ev.on('contacts.upsert', (contactos) => {
    for (const c of contactos) {
      if (c.lid && c.jid) {
        const pn = numDeCelular(c.jid);
        lidMap.set(c.lid, pn);
        guardarLidMap(c.lid, pn);
      }
    }
  });

  // EVENTO CLAVE: baileys emite esto cuando WhatsApp envía el número REAL del
  // remitente en el paquete (sender_pn) para mensajes de LIDs. Aquí lo capturamos
  // y migramos en cascada (pedidos/clientes/conversaciones).
  s.ev.on('chats.phoneNumberShare', ({ lid, jid }) => {
    if (!lid || !jid) return;
    const lidBase = numDeCelular(lid);
    const pnBase = numDeCelular(jid);
    if (!lidBase || !pnBase || esLid(pnBase)) return;
    if (lidMap.get(lidBase) === pnBase) return;
    lidMap.set(lidBase, pnBase);
    const n = aplicarMapeoLid(lidBase, pnBase);
    logger.info(`[LID] phoneNumberShare: ${lidBase} -> ${pnBase} (migrados ${n} registros)`);
  });

  s.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify' && type !== 'append') return;
    for (const m of messages) {
      if (!m.message) continue;
      const jid = m.key.remoteJid || '';
      if (!jid) continue;
      const idMsg = m.key.id || '';
      if (idsEnviados.has(idMsg) || procesadosIn.has(idMsg)) continue;
      const lmsg = m.message.locationMessage;
      const ubicacion = lmsg ? {
        lat: lmsg.degreesLatitude,
        lng: lmsg.degreesLongitude,
        nombre: lmsg.name || '',
        detalle: lmsg.address || ''
      } : null;
      const cuerpo = (m.message.conversation ||
        (m.message.extendedTextMessage && m.message.extendedTextMessage.text) || '').trim();
      capturarMapeoLid(m);
      if (jid.endsWith('@lid')) {
        const lidBase = numDeCelular(jid);
        if (!lidMap.has(lidBase) || esLid(lidMap.get(lidBase))) {
          intentarResolverLid(s, lidBase);
        }
      }
      const phone = numDeCelular(jid);
      const traceId = `wa-${idMsg}-${Date.now()}`;
      logger.info(`[VISTO] de ${jid} | fromMe=${!!m.key.fromMe} | texto="${cuerpo.slice(0, 100)}"${ubicacion ? ' | UBICACION ✓' : ''}`, {
        traceId,
        tenantId: phone,
        action: 'message_received',
        module: 'whatsapp-transport',
        meta: { jid, idMsg, fromMe: !!m.key.fromMe, hasLocation: !!ubicacion }
      });
      if (jid.endsWith('@g.us')) continue;
      if (jid === 'status@broadcast') continue;
      if (m.key.fromMe) continue; // ignora mensajes propios del bot
      if (!cuerpo && !ubicacion) continue;
      recordMetric('messagesReceived');
      try {
        // Run message processing with correlation context
        runWithCorrelation(traceId, phone, phone, async () => {
          await procesar(s, m, jid, cuerpo, ubicacion);
        });
      } catch (e) {
        logger.error('[!] Error procesando mensaje:', e && e.message ? e.message : e, {
          traceId,
          tenantId: phone,
          action: 'message_processing_error',
          module: 'whatsapp-transport'
        });
      }
      procesadosIn.add(idMsg);
    }
  });
}

// ==================== BACKUP AUTOMÁTICO AUTH_INFO DIARIO ====================
const BACKUP_DIR = path.join(config.dataDir || 'data', 'backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
const AUTH_DIR = config.authDir;

function backupAuthInfo() {
  if (!fs.existsSync(AUTH_DIR)) {
    logger.warn('[BACKUP] Directorio auth no existe', { AUTH_DIR });
    return;
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(BACKUP_DIR, `auth_${timestamp}`);
  try {
    // Copia recursiva
    fs.cpSync(AUTH_DIR, dest, { recursive: true });
    // Limpia backups > 7 días
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('auth_'));
    const now = Date.now();
    for (const f of files) {
      const fpath = path.join(BACKUP_DIR, f);
      const stat = fs.statSync(fpath);
      if (now - stat.mtimeMs > 7 * 24 * 60 * 60 * 1000) {
        fs.rmSync(fpath, { recursive: true, force: true });
        logger.info('[BACKUP] Borrado backup antiguo', { file: f });
      }
    }
    logger.info('[BACKUP] auth_info respaldado', { dest, files: fs.readdirSync(BACKUP_DIR).length });
  } catch (e) {
    logger.error('[BACKUP] Error', { error: e.message });
  }
}

function programarBackupDiario() {
  // Ejecutar a las 03:00 AM todos los días
  const runAt3am = () => {
    const now = new Date();
    const target = new Date(now);
    target.setHours(3, 0, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const ms = target - now;
    setTimeout(() => {
      backupAuthInfo();
      // Reprogramar para el siguiente día
      setInterval(backupAuthInfo, 24 * 60 * 60 * 1000);
    }, ms);
  };
  runAt3am();
}

function programarReporteDiario() {
  const [h, mn] = config.hora_reporte.split(':').map(Number);
  const tarea = () => {
    const ahora = new Date();
    const min = ahora.getHours() * 60 + ahora.getMinutes();
    const objetivo = h * 60 + mn;
    if (min === objetivo && sock) {
      sock.sendMessage(DUENO_JID, { text: reporteHoyTexto() }).catch(() => {});
    }
  };
  setInterval(tarea, 60000);
}

async function iniciarWhatsApp() {
  programarReporteDiario();
  await iniciarSesion();
}

module.exports = { iniciarWhatsApp };
