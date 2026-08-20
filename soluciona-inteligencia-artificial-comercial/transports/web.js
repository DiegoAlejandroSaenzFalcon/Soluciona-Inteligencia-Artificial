const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { config, esc, csvCell, hoyInicio, normalizar } = require('../config');
const { leerPedidos, resumenDe, cambiarEstado } = require('../core/orders');
const { listarClientes, obtenerCliente, resolverLid } = require('../core/db');
const { notificar, estadoBot } = require('../core/notify');
const { hilos, leerHilo } = require('../core/conversacion');
const { askLLM } = require('../core/ai');
const { loadAgentesUtiles } = require('../agents-loader');
const { ASISTENTES, catalogoExpertos, preguntarAsistente } = require('../core/asistentes');
const { extraerMenu } = require('../core/vision');
const { handleAuthRequest } = require('../src/auth/routes');

const { handleConfigRequest } = require('../src/config/routes');

const modules = require('../core/modules');

const { handleInventoryRequest } = require('../src/inventory/routes');
const { handleAccountingRequest } = require('../src/accounting/routes');

const { initWebSockets, emitir, contarClientes } = require('../src/websockets');

const AGENTES = loadAgentesUtiles();
const DASHBOARD = path.join(__dirname, '..', 'dashboard.html');
const KDS = path.join(__dirname, '..', 'kds.html');
const MANIFEST = path.join(__dirname, '..', 'manifest.webmanifest');
const SW = path.join(__dirname, '..', 'sw.js');
const SESIONES = new Set();

// Campos que NUNCA se exponen en el panel (solo se indica si están configurados)
const CAMPOS_SENSIBLES = ['api_key', 'access_key', 'token', 'password', 'secret_key', 'cert_pass', 'pin_software', 'codigo_software', 'panel_password'];

let licenseValidUntil = 0;
let trialMode = false;
const features = {};
const LICENSE_FILE = path.join(config.dataDir || 'data', 'whatsapp.lock');

// ... (resto del código mantiene intacto)

function maskear(valor) {
  if (!valor) return '';
  const s = String(valor);
  return s.length <= 4 ? '••••' : '••••' + s.slice(-4);
}

// Sanea un objeto: elimina/oculta claves sensibles recursivamente
function saneoConfig(obj) {
  if (obj == null) return null;
  if (Array.isArray(obj)) return obj.map(saneoConfig);
  if (typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (CAMPOS_SENSIBLES.includes(k)) {
      if (v !== undefined && v !== null && v !== '') out['_' + k + '_configurado'] = true;
      continue;
    }
    if (typeof v === 'object') out[k] = saneoConfig(v);
    else out[k] = v;
  }
  return out;
}

// Quita emojis/caracteres decorativos del inicio de una categoría y normaliza.
function limpiarCategoria(cat) {
  return String(cat || '').replace(/^[^\p{L}\p{N}]+/u, '').trim() || 'Sin categoría';
}

function formatearTel(t) {
  const d = String(t || '').replace(/\D/g, '');
  if (!d) return '—';
  if (d.length === 12 && d.startsWith('57')) return '+' + d.slice(0, 2) + ' ' + d.slice(2, 5) + ' ' + d.slice(5, 8) + ' ' + d.slice(8);
  if (d.length === 13 && d.startsWith('57')) return '+' + d.slice(0, 2) + ' ' + d.slice(2, 5) + ' ' + d.slice(5, 8) + ' ' + d.slice(8);
  return d;
}

// Construye el resumen de configuración para el panel (sin secretos)
function resumenConfiguracion() {
  const productoCount = (config.productos || []).length;
  const categorias = [...new Set((config.productos || []).map(p => p.categoria).filter(Boolean))];
  const categoriasLimpias = [...new Set(categorias.map(limpiarCategoria))].sort((a, b) => a.localeCompare(b, 'es'));
  const menuCfg = config.menu || {};

  const llm = config.llm || {};
  const asistentes = config.asistentes_ia || {};
  const vision = config.vision || {};
  const integracion = config.integracion || {};
  const facturacion = config.facturacion || {};

  // Productos agrupados por categoría (limpia), para el visor del panel.
  const productosPorCategoria = categoriasLimpias.map(cat => ({
    categoria: cat,
    productos: (config.productos || [])
      .filter(p => limpiarCategoria(p.categoria) === cat)
      .map(p => ({
        nombre: p.nombre,
        precio: p.precio,
        ingredientes: p.ingredientes || '',
        alias: (p.alias || []).slice(0, 4)
      }))
  }));

  // Claves críticas por adaptador para indicar si está configurado
  const clavesPorAdaptador = {
    'pos-propio': [],
    webhook: ['url'],
    archivo: ['salida'],
    telegram: ['token', 'chat_id'],
    siigo: ['username', 'access_key'],
    alegra: ['email', 'token'],
    factus: ['email', 'password'],
    alanube: ['username', 'password'],
    opendata: ['api_key', 'secret_key'],
    'dian-gratuito': ['nit', 'password', 'codigo_software']
  };

  const adaptadores = Object.keys(require('./../core/integracion').REGISTRO).map(tipo => {
    const clavesReq = clavesPorAdaptador[tipo] || [];
    const activo = integracion.tipo === tipo;
    const faltantes = activo ? clavesReq.filter(c => !integracion[c]) : clavesReq;
    return {
      tipo,
      activo,
      estado: activo
        ? (faltantes.length === 0 ? 'configurado' : 'incompleto')
        : 'disponible',
      faltantes
    };
  });

  const tipoActivo = integracion.tipo && integracion.tipo !== 'kds' && integracion.tipo !== 'none'
    ? integracion.tipo : 'pos-propio';

  const estadoBotDatos = estadoBot();

  const domicilios = config.domicilios || {};
  const ubNegocio = config.ubicacion_negocio || {};

  return {
    generado: new Date().toISOString(),
    segmento: config.segmento || 'comidas',
    ciiu: config.ciiu || '',
    ubicacion_negocio: {
      lat: ubNegocio.lat || 0,
      lng: ubNegocio.lng || 0,
      configurada: !!(ubNegocio.lat && ubNegocio.lng)
    },
    domicilios: {
      faixas: Array.isArray(domicilios.faixas) ? domicilios.faixas : [],
      radio_max_entrega_km: domicilios.radio_max_entrega_km || 0,
      gratis_si_total_sobre: domicilios.gratis_si_total_sobre || 0,
      configurados: Array.isArray(domicilios.faixas) && domicilios.faixas.length > 0
    },
    negocio: {
      nombre: config.negocio,
      clienteId: config.clienteId,
      moneda: config.moneda,
      puerto: config.puerto,
      hora_reporte: config.hora_reporte,
      panel_protegido: !!(config.panel_password),
      numero_dueno: config.numero_dueno,
      numero_dueno_formateado: formatearTel(config.numero_dueno),
      dataDir: config.dataDir
    },
    menu: {
      total_productos: productoCount,
      categorias,
      categorias_limpias: categoriasLimpias,
      productos_por_categoria: productosPorCategoria,
      url: menuCfg.url || '',
      color: menuCfg.color || '',
      tiene_imagenes: Array.isArray(menuCfg.imagenes) && menuCfg.imagenes.length > 0
    },
    ia: {
      chatbot: {
        proveedor: llm.proveedor,
        modelo: llm.modelo,
        base_url: llm.base_url,
        limite_diario: llm.limite_diario || 0,
        limite_mensual: llm.limite_mensual || 0,
        tiene_key: !!(llm.api_key)
      },
      asistentes: {
        modelo: asistentes.modelo,
        limite_diario: asistentes.limite_diario || 0,
        limite_mensual: asistentes.limite_mensual || 0,
        tiene_key: !!(asistentes.api_key)
      },
      vision: {
        modelo: vision.modelo,
        limite_diario: vision.limite_diario || 0,
        limite_mensual: vision.limite_mensual || 0,
        tiene_key: !!(vision.api_key)
      },
      gemini: {
        modelo: config.gemini_model,
        tiene_key: !!(config.gemini_api_key)
      }
    },
    integracion: {
      tipo_activo: tipoActivo,
      adaptadores,
      claves: saneoConfig(integracion)
    },
    facturacion: {
      proveedor: facturacion.proveedor || '',
      emision_automatica: !!facturacion.emision_automatica,
      estado_dispara: facturacion.estado_dispara || 'pagado',
      enviar_mail: facturacion.enviar_mail !== false,
      email_remitente: facturacion.email_remitente || '',
      email_cliente: facturacion.email_cliente || ''
    },
    bot: {
      conectado: estadoBotDatos.conectado,
      ultimoCambio: estadoBotDatos.ultimoCambio,
      numero: estadoBotDatos.numero || '',
      numero_formateado: formatearTel(estadoBotDatos.numero),
      nombre: estadoBotDatos.nombre || ''
    }
  };
}

// Guarda cambios de configuración permitidos en config.json.
// Devuelve { ok, actualizados }.
function guardarConfiguracion(campos) {
  const cfgPath = path.join(__dirname, '..', 'config.json');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const actualizados = [];
  const hexOk = v => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);

  const texto = v => String(v == null ? '' : v).trim();
  const bool = v => v === true || v === 'true' || v === '1' || v === 'on';

  if (campos.menu) {
    if (typeof campos.menu.color === 'string' && hexOk(campos.menu.color)) {
      cfg.menu = cfg.menu || {};
      cfg.menu.color = campos.menu.color;
      if (config.menu) config.menu.color = campos.menu.color;
      actualizados.push('menu.color');
    }
    if (typeof campos.menu.url === 'string') {
      cfg.menu = cfg.menu || {};
      cfg.menu.url = texto(campos.menu.url);
      if (config.menu) config.menu.url = texto(campos.menu.url);
      actualizados.push('menu.url');
    }
  }
  if (typeof campos.numero_dueno === 'string') {
    const solo = texto(campos.numero_dueno).replace(/\D/g, '');
    if (solo) {
      cfg.numero_dueno = solo;
      config.numero_dueno = solo;
      actualizados.push('numero_dueno');
    }
  }
  if (typeof campos.negocio === 'string' && texto(campos.negocio)) {
    cfg.negocio = texto(campos.negocio);
    config.negocio = texto(campos.negocio);
    actualizados.push('negocio');
  }
  if (typeof campos.moneda === 'string' && texto(campos.moneda)) {
    cfg.moneda = texto(campos.moneda);
    config.moneda = texto(campos.moneda);
    actualizados.push('moneda');
  }
  if (typeof campos.hora_reporte === 'string' && /^\d{1,2}:\d{2}$/.test(texto(campos.hora_reporte))) {
    cfg.hora_reporte = texto(campos.hora_reporte);
    config.hora_reporte = texto(campos.hora_reporte);
    actualizados.push('hora_reporte');
  }
  if (campos.ubicacion_negocio && typeof campos.ubicacion_negocio === 'object') {
    const lat = Number(campos.ubicacion_negocio.lat);
    const lng = Number(campos.ubicacion_negocio.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      cfg.ubicacion_negocio = { lat, lng };
      config.ubicacion_negocio = { lat, lng };
      actualizados.push('ubicacion_negocio');
    }
  }
  if (campos.domicilios && typeof campos.domicilios === 'object') {
    const dom = campos.domicilios;
    const cfgDom = cfg.domicilios || {};
    const nDom = config.domicilios || {};
    if (Number(dom.radio_max_entrega_km) >= 0) {
      cfgDom.radio_max_entrega_km = Number(dom.radio_max_entrega_km);
      nDom.radio_max_entrega_km = Number(dom.radio_max_entrega_km);
      actualizados.push('domicilios.radio_max_entrega_km');
    }
    if (Number(dom.gratis_si_total_sobre) >= 0) {
      cfgDom.gratis_si_total_sobre = Number(dom.gratis_si_total_sobre);
      nDom.gratis_si_total_sobre = Number(dom.gratis_si_total_sobre);
      actualizados.push('domicilios.gratis_si_total_sobre');
    }
    if (Array.isArray(dom.faixas)) {
      const limpias = dom.faixas
        .filter(f => f && Number(f.hasta_km) > 0)
        .map(f => {
          const faixa = {
            hasta_km: Number(f.hasta_km),
            tipo: ['gratis', 'fijo', 'por_km'].includes(f.tipo) ? f.tipo : 'fijo',
            valor: Number(f.valor) || 0
          };
          if (f.minimo != null) faixa.minimo = Number(f.minimo);
          if (f.pedido_minimo != null) faixa.pedido_minimo = Number(f.pedido_minimo);
          return faixa;
        })
        .sort((a, b) => a.hasta_km - b.hasta_km);
      cfgDom.faixas = limpias;
      nDom.faixas = limpias;
      actualizados.push('domicilios.faixas');
    }
    cfg.domicilios = cfgDom;
    config.domicilios = nDom;
  }
  if (campos.segmento && ['comidas', 'salud', 'retail'].includes(campos.segmento)) {
    cfg.segmento = campos.segmento;
    config.segmento = campos.segmento;
    actualizados.push('segmento');
  }
  if (campos.ciiu && typeof campos.ciiu === 'string' && /^\d{2,4}$/.test(texto(campos.ciiu))) {
    cfg.ciiu = texto(campos.ciiu);
    config.ciiu = texto(campos.ciiu);
    actualizados.push('ciiu');
  }
  if (campos.facturacion && typeof campos.facturacion === 'object') {
    cfg.facturacion = cfg.facturacion || {};
    config.facturacion = config.facturacion || {};
    const f = campos.facturacion;
    if (typeof f.proveedor === 'string') { cfg.facturacion.proveedor = texto(f.proveedor); config.facturacion.proveedor = texto(f.proveedor); actualizados.push('facturacion.proveedor'); }
    if (typeof f.emision_automatica !== 'undefined') { cfg.facturacion.emision_automatica = bool(f.emision_automatica); config.facturacion.emision_automatica = bool(f.emision_automatica); actualizados.push('facturacion.emision_automatica'); }
    if (typeof f.estado_dispara === 'string' && texto(f.estado_dispara)) { cfg.facturacion.estado_dispara = texto(f.estado_dispara); config.facturacion.estado_dispara = texto(f.estado_dispara); actualizados.push('facturacion.estado_dispara'); }
    if (typeof f.enviar_mail !== 'undefined') { cfg.facturacion.enviar_mail = bool(f.enviar_mail); config.facturacion.enviar_mail = bool(f.enviar_mail); actualizados.push('facturacion.enviar_mail'); }
    if (typeof f.email_remitente === 'string') { cfg.facturacion.email_remitente = texto(f.email_remitente); config.facturacion.email_remitente = texto(f.email_remitente); actualizados.push('facturacion.email_remitente'); }
    if (typeof f.email_cliente === 'string') { cfg.facturacion.email_cliente = texto(f.email_cliente); config.facturacion.email_cliente = texto(f.email_cliente); actualizados.push('facturacion.email_cliente'); }
  }

  if (actualizados.length) fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
  return { ok: true, actualizados };
}

// Guarda/actualiza el pool de claves IA. Recibe { proveedor, modelos[], claves[] } por proveedor.
// Las claves enmascaradas (••••) o vacías NO se sobrescriben.
function guardarIAPool(campos) {
  const cfgPath = path.join(__dirname, '..', 'config.json');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  if (!cfg.ia_pool || typeof cfg.ia_pool !== 'object') cfg.ia_pool = {};
  const actualizados = [];

  const esVieja = v => /^••••/.test(v) || v === '';
  const normKey = v => String(v == null ? '' : v).trim();

  for (const [provNombre, provDatos] of Object.entries(campos)) {
    if (!provDatos || typeof provDatos !== 'object') continue;
    const actual = cfg.ia_pool[provNombre] || { base_url: '', modelos: [], claves: [] };

    if (typeof provDatos.base_url === 'string' && normKey(provDatos.base_url)) {
      actual.base_url = normKey(provDatos.base_url);
    }
    if (Array.isArray(provDatos.modelos)) {
      actual.modelos = provDatos.modelos.map(m => normKey(m)).filter(Boolean);
    }
    if (Array.isArray(provDatos.claves)) {
      const entrantes = provDatos.claves.map(normKey).filter(Boolean);
      const nuevas = entrantes.filter(k => !esVieja(k));
      if (nuevas.length > 0) {
        actual.claves = nuevas;
      } else if (actual.claves && actual.claves.length) {
        // Solo se editaron modelos/url, se conservan las claves existentes.
        actual.claves = actual.claves;
      } else {
        actual.claves = [];
      }
    }
    cfg.ia_pool[provNombre] = actual;
    actualizados.push(provNombre);
  }

  // Reflejar en memoria para el proceso en curso.
  config.ia_pool = cfg.ia_pool;

  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
  return { ok: true, actualizados };
}

function aplicarMenu(productos) {
  const cfgPath = path.join(__dirname, '..', 'config.json');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  if (!Array.isArray(cfg.productos)) cfg.productos = [];
  let actualizados = 0, nuevos = 0;
  const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[^\x00-\x7F]/g, '').replace(/\s+/g, ' ').trim();
  for (const pr of productos) {
    if (!pr.nombre || !Number(pr.precio)) continue;
    const idx = cfg.productos.findIndex(p => norm(p.nombre) === norm(pr.nombre));
    if (idx >= 0) {
      cfg.productos[idx].precio = Number(pr.precio);
      if (pr.ingredientes) cfg.productos[idx].ingredientes = pr.ingredientes;
      actualizados++;
    } else {
      cfg.productos.push({ nombre: pr.nombre, alias: [], precio: Number(pr.precio), ingredientes: pr.ingredientes || '' });
      nuevos++;
    }
  }
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
  return { actualizados, nuevos };
}

function estadoHtml(p) {
  const est = p.estado || 'recibido';
  const colores = { recibido: '#ff9800', en_cocina: '#2196f3', listo: '#4caf50', entregado: '#607d8b', cancelado: '#f44336' };
  const label = { recibido: 'Recibido', en_cocina: 'En cocina', listo: 'Listo', entregado: 'Entregado', cancelado: 'Cancelado' };
  const color = colores[est] || '#888';
  const badge = `<span style="background:${color};color:#fff;padding:2px 8px;border-radius:10px;font-size:.75rem;font-weight:700">${label[est] || est}</span>`;
  const btn = (estado, texto, bg) => `<button onclick="cambiarEstado(${p.id},'${estado}')" style="background:${bg};color:#fff;border:none;padding:2px 6px;border-radius:4px;cursor:pointer;font-size:.72rem;margin:2px">${texto}</button>`;
  let bots = '<span style="color:#999">—</span>';
  if (est === 'recibido') bots = btn('en_cocina', '👨‍🍳 Cocina', '#075e54') + btn('listo', '✅ Listo', '#25D366') + btn('cancelado', '❌', '#f44336');
  else if (est === 'en_cocina') bots = btn('listo', '✅ Listo', '#25D366') + btn('cancelado', '❌', '#f44336');
  else if (est === 'listo') bots = btn('entregado', '🚚 Entregado', '#607d8b');
  return `<td>${badge}<br><span style="display:inline-block;margin-top:4px">${bots}</span></td>`;
}

function tokenValido(req) {
  const c = req.headers.cookie || '';
  const m = c.match(/(?:^|;\s*)panel_token=([^;]+)/);
  return m && SESIONES.has(m[1]);
}

function paginaLogin(error) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Acceso ${esc(config.negocio)}</title>
<style>body{font-family:Arial,Segoe UI,sans-serif;background:#075e54;color:#fff;display:flex;height:100vh;align-items:center;justify-content:center}
form{background:#fff;color:#333;padding:2rem 2.5rem;border-radius:10px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,.3)}
h2{margin-top:0;color:#075e54}input{padding:.6rem;width:220px;margin:.6rem 0;border:1px solid #ccc;border-radius:6px;font-size:1rem}
button{background:#25D366;color:#fff;border:none;padding:.6rem 1.4rem;border-radius:6px;cursor:pointer;font-weight:700;font-size:1rem}
.msg{color:#c00;margin-top:.4rem;font-size:.9rem}</style></head>
<body><form method="post" action="/login"><h2>Acceso al panel</h2>
<input name="password" type="password" placeholder="Contraseña del panel" autofocus><br>
<button type="submit">Entrar</button>${error ? `<div class="msg">${esc(error)}</div>` : ''}</form></body></html>`;
}

function iniciarWeb() {
  const server = http.createServer(async (req, res) => {
    const url = req.url.split('?')[0];

    // PWA: manifest e íconos públicos (la app se instala en el celular sin Play Store).
    if (url === '/socket.io-client.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
      res.end(fs.readFileSync(path.join(__dirname, '..', 'node_modules', 'socket.io', 'client-dist', 'socket.io.js')));
      return;
    }
    if (url === '/manifest.webmanifest') {
      res.writeHead(200, { 'Content-Type': 'application/manifest+json; charset=utf-8' });
      res.end(fs.readFileSync(MANIFEST, 'utf8'));
      return;
    }
    if (url === '/sw.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
      res.end(fs.readFileSync(SW, 'utf8'));
      return;
    }
    if (url === '/icon-192.png' || url === '/icon-512.png') {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(fs.readFileSync(path.join(__dirname, '..', url.slice(1))));
      return;
    }

    // ===== Panel Empresarial (Sprint 1): página propia fuera del SPA legacy =====
    if (url === '/panel-empresarial') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(path.join(__dirname, '..', 'panel-empresarial.html'), 'utf8'));
      return;
    }
    if (url === '/panel-empresarial.js' || url === '/panel-config.js' || url === '/panel-inventario.js' || url === '/panel-contabilidad.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
      res.end(fs.readFileSync(path.join(__dirname, '..', url.slice(1)), 'utf8'));
      return;
    }

    // ===== AUTH / RBAC (Sprint 1) =====
    if (url.startsWith('/api/auth/') || url === '/api/users') {
      const atendida = await handleAuthRequest(req, res, url);
      if (atendida) return;
    }

    // ===== CONFIG V2 (Sprint 1) =====
    if (url.startsWith('/api/configv2/') || url === '/api/audit') {
      const atendida = await handleConfigRequest(req, res, url);
      if (atendida) return;
    }

    // ===== INVENTARIO / COMPRAS (Sprint 1) =====
    if (url.startsWith('/api/inventory/')) {
      const atendida = await handleInventoryRequest(req, res, url);
      if (atendida) {
        if (req.method === 'POST' && url.includes('/recibir')) emitir('default', 'stock:cambio', { metodo: req.method, url });
        if (req.method === 'PUT' && url.includes('/stock')) emitir('default', 'stock:cambio', { metodo: req.method, url });
        if (req.method === 'POST' && url.includes('/stock/traslado')) emitir('default', 'stock:cambio', { metodo: req.method, url });
        if (req.method === 'POST' && url.includes('/purchase-orders') && !url.includes('/estado') && !url.includes('/recibir')) {
          emitir('default', 'compras:cambio', { metodo: req.method, url });
        }
        return;
      }
    }

    // ===== CXC / CXP + CONTABILIDAD (Sprint 1) =====
    if (url.startsWith('/api/accounting/')) {
      const atendida = await handleAccountingRequest(req, res, url);
      if (atendida) {
        if (req.method === 'POST' && url.endsWith('/invoices')) emitir('default', 'venta:nueva', { metodo: req.method, url });
        if (req.method === 'POST' && url.endsWith('/payments')) emitir('default', 'pago:nuevo', { metodo: req.method, url });
        return;
      }
    }

    const pw = config.panel_password || '';
    if (pw) {
      if (url === '/login' && req.method === 'POST') {
        let body = '';
        req.on('data', c => { body += c; });
        req.on('end', () => {
          try {
            const params = new URLSearchParams(body);
            if (params.get('password') === pw) {
              const t = crypto.randomBytes(16).toString('hex');
              SESIONES.add(t);
              res.writeHead(302, { 'Set-Cookie': `panel_token=${t}; HttpOnly; Path=/; SameSite=Lax`, 'Location': '/' });
              res.end();
            } else {
              res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(paginaLogin('Contraseña incorrecta'));
            }
          } catch {
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(paginaLogin('Solicitud inválida'));
          }
        });
        return;
      }
      if (!tokenValido(req)) {
        res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(paginaLogin());
        return;
      }
    }

    if (url === '/api/agents') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(AGENTES.map(a => ({ id: a.id, name: a.name, category: a.category, description: a.description, emoji: a.emoji, vibe: a.vibe }))));
      return;
    }

    if (url === '/api/agent-chat' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const agent = AGENTES.find(a => a.id === data.agentId);
          if (!agent) {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'Agente no encontrado' }));
            return;
          }
          const reply = await askLLM(agent, data.message || 'Hola');
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ reply }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    if (url === '/api/asistentes') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ asistentes: ASISTENTES, expertos: catalogoExpertos() }));
      return;
    }

    if (url === '/api/consumo') {
      const { resumenConsumo } = require('../core/consumo');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ roles: resumenConsumo() }));
      return;
    }

    if (url === '/api/asistente-chat' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const asistente = ASISTENTES.find(a => a.id === data.asistenteId);
          if (!asistente) {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'Asistente no encontrado' }));
            return;
          }
          if (asistente.tipo === 'vision' && data.image) {
            const mime = (data.image.match(/^data:(.*);base64,/) || [])[1] || 'image/jpeg';
            const b64 = data.image.replace(/^data:.*;base64,/, '');
            const propuesta = await extraerMenu(b64, mime);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
              reply: propuesta.length
                ? `📸 Encontré ${propuesta.length} platos en la imagen. Revisa la propuesta y pulsa "Aplicar al menú".`
                : 'No detecté platos claros en la imagen. Intenta con una foto más nítida del menú.',
              propuesta
            }));
            return;
          }
          const reply = await preguntarAsistente(asistente, data.message || 'Hola');
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ reply }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    if (url === '/api/menu-aplicar' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const r = aplicarMenu(data.productos || []);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: true, actualizados: r.actualizados, nuevos: r.nuevos }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    if (url === '/api/estado') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(estadoBot()));
      return;
    }

    if (url === '/api/health') {
      const waHealth = global.whatsappHealth ? global.whatsappHealth() : { connected: false, error: 'health not available' };
      const waMetrics = global.whatsappMetrics ? global.whatsappMetrics() : { error: 'metrics not available' };
      const dbHealth = { ok: await require('../core/db').ping() };
      const healthy = waHealth.connected && dbHealth.ok;
      res.writeHead(healthy ? 200 : 503, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ healthy, timestamp: new Date().toISOString(), whatsapp: waHealth, metrics: waMetrics, database: dbHealth }));
      return;
    }

    if (url === '/api/configuracion' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(resumenConfiguracion()));
      return;
    }

    if (url === '/api/configuracion' && req.method === 'POST') {
      let body = '';
      req.on('data', c => { body += c; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body || '{}');
          const r = guardarConfiguracion(data);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(r));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, error: e.message }));
        }
      });
      return;
    }

    // ===== POOL DE CLAVES IA (rotación automática) =====
    if (url === '/api/ia-pool' && req.method === 'GET') {
      const poolMod = require('../core/ia-pool');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, pool: poolMod.resumenPool() }));
      return;
    }

    if (url === '/api/ia-pool' && req.method === 'POST') {
      let body = '';
      req.on('data', c => { body += c; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body || '{}');
          const r = guardarIAPool(data);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(r));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, error: e.message }));
        }
      });
      return;
    }

    // ===== LICENCIA (SOLUCIONA) =====
    if (url === '/api/license/status' && req.method === 'GET') {
      const lic = modules.loadLicense();
      const trial = modules.isTrialActive();
      const dias = modules.getTrialDaysRemaining();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        valid: lic.valid,
        trial,
        expiresAt: licenseValidUntil || Date.now() + (dias || 10) * 24 * 60 * 60 * 1000,
        trialDaysRemaining: dias,
        features: modules.getFeatures()
      }));
      return;
    }

    if (url === '/api/license/activate' && req.method === 'POST') {
      let body = '';
      req.on('data', c => { body += c; });
      req.on('end', async () => {
        try {
          const data = JSON.parse(body || '{}');
          // En producción: validar código contra BD
          // Por ahora, trial de 10 días si no hay licencia vigente
          if (!licenseValidUntil || Date.now() > licenseValidUntil) {
            // Iniciar trial de 10 días
            // Nota: en producción esto iria a un endpoint real
            licenseValidUntil = Date.now() + 10 * 24 * 60 * 60 * 1000;
            Object.assign(features, { whatsapp: true, orders: true, panel: true, inventory: false, accounting: false, kds: false });
            try {
              fs.writeFileSync(LICENSE_FILE, JSON.stringify({
                expiresAt: licenseValidUntil,
                features: features,
                deviceId: data.deviceId || 'desktop'
              }));
            } catch {}
          }
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: true, trial: true, expiresAt: licenseValidUntil }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, error: e.message }));
        }
      });
      return;
    }

    if (url === '/api/license/validate' && req.method === 'POST') {
      let body = '';
      req.on('data', c => { body += c; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body || '{}');
          const valid = licenseValidUntil > Date.now() && modules.hasFeature('whatsapp') && modules.hasFeature('orders');
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ valid, features: modules.getFeatures(), trial: licenseValidUntil > Date.now() }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ valid: false, error: e.message }));
        }
      });
      return;
    }

    if (url === '/api/citas') {
      const u = new URL(req.url, 'http://localhost');
      const estadoFiltro = u.searchParams.get('estado') || null;
      const { leerCitas, cambiarEstadoCita } = require('../core/db');
      if (req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(leerCitas(estadoFiltro)));
        return;
      }
      if (req.method === 'POST') {
        let body = '';
        req.on('data', c => { body += c; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            if (data.id && data.estado) {
              const cita = cambiarEstadoCita(data.id, data.estado);
              emitir('default', 'cita:estado', { id: data.id, estado: data.estado });
              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ ok: true, cita }));
            } else {
              res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ ok: false, error: 'id y estado requeridos' }));
            }
          } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: false, error: e.message }));
          }
        });
        return;
      }
    }

    if (url === '/cocina') {
      let html = fs.readFileSync(KDS, 'utf8');
      html = html.replaceAll('{{negocio}}', config.nombreNegocio());
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    if (url === '/api/pedidos') {
      const pedidos = leerPedidos().reverse();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(pedidos));
      return;
    }

    if (url === '/api/conversaciones') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(hilos()));
      return;
    }

    if (url === '/api/clientes') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(listarClientes()));
      return;
    }

    if (url === '/api/conversacion') {
      const u = new URL(req.url, 'http://localhost');
      const tel = u.searchParams.get('tel') || '';
      const msgs = leerHilo(tel).map(m => ({
        fecha: new Date(m.fecha).toLocaleString('es-CO'),
        rol: m.rol,
        texto: m.texto
      }));
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(msgs));
      return;
    }

    if (url.startsWith('/api/pedido/') && req.method === 'POST') {
      const m = url.match(/^\/api\/pedido\/(\d+)\/estado$/);
      if (m) {
        let body = '';
        req.on('data', c => { body += c; });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const id = parseInt(m[1], 10);
            const pedido = cambiarEstado(id, data.estado);
            if (pedido) emitir('default', 'pedido:estado', { id, estado: data.estado, telefono: pedido.telefono || null });
            if (pedido && data.estado === 'listo' && pedido.telefono) {
              const tel = pedido.telefono;
              const esLidNum = /^\d{15}$/.test(tel);
              const real = resolverLid(tel) || tel;
              const jid = (esLidNum && real === tel) ? tel + '@lid' : real + '@s.whatsapp.net';
              const ok = await notificar(jid, `✅ ¡Tu pedido #${pedido.id} está LISTO! \ te avisa.`);
              console.log('[KDS] Aviso a cliente:', ok ? 'enviado' : 'no enviado (bot puede estar apagado)');
            }
            if (pedido && data.estado === 'entregado') {
              const orders = require('../core/orders');
              const facturacion = require('../core/facturacion');
              const conPago = { ...pedido, estado_pago: 'pagado' };
              orders.patchPedido(id, { estado_pago: 'pagado' });
              facturacion.intentarEmitirAlCobrar(conPago).catch(e => console.error('[FACTURA]', e && e.message ? e.message : e));
            }
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: true, estado: pedido ? pedido.estado : null }));
          } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: e.message }));
          }
        });
        return;
      }
    }

    if (url === '/export.csv') {
      const pedidos = leerPedidos();
      const filas = ['id;fecha;remitente;telefono;detalle;total;direccion;lat;lng;mensaje_original'];
      for (const p of pedidos) {
        filas.push([
          p.id, p.fecha, csvCell(p.remitente), p.telefono,
          p.items.map(i => `${i.cantidad} ${i.producto}`).join(' | '),
          p.total, csvCell((p.direccion || '').replace(/;/g, ',')), p.lat || '', p.lng || '',
          `"${(p.crudo || '').replace(/"/g, '""')}"`
        ].join(';'));
      }
      res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8' });
      res.end(filas.join('\n'));
      return;
    }

    const pedidos = leerPedidos();
    const r = resumenDe(pedidos, hoyInicio());
    const totalHistorico = resumenDe(pedidos).total;
    const filasHtml = pedidos.slice().reverse().slice(0, 100).map(p => {
      const dirCelda = p.lat
        ? `<a href="https://maps.google.com/?q=${p.lat},${p.lng}" target="_blank" style="color:#25D366;font-weight:bold">📌 Ver mapa</a>`
        : esc(p.direccion || '-');
      const telReal = resolverLid(p.telefono) || p.telefono;
      const telCelda = telReal ? (telReal.replace(/^(\d{2})(\d{3})(\d{3})(\d+)$/, '+$1 $2 $3 $4')) : '-';
      return `<tr><td>#${p.id}</td><td>${new Date(p.fecha).toLocaleString('es-CO')}</td><td>${esc(p.remitente)}</td><td>${p.items.map(i => `${i.cantidad} ${i.producto}`).join(', ')}</td><td>${dirCelda}</td><td>${config.moneda}${p.total.toLocaleString('es-CO')}</td><td>${telCelda}</td>${estadoHtml(p)}</tr>`;
    }).join('');

    let html = fs.readFileSync(DASHBOARD, 'utf8');
    html = html
      .replaceAll('{{negocio}}', config.nombreNegocio())
      .replaceAll('{{pedidosHoy}}', r.pedidos)
      .replaceAll('{{moneda}}', config.moneda)
      .replaceAll('{{ventasHoy}}', r.total.toLocaleString('es-CO'))
      .replaceAll('{{ventasTotal}}', totalHistorico.toLocaleString('es-CO'))
      .replaceAll('{{filasHtml}}', filasHtml);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });

  initWebSockets(server);

  server.listen(config.puerto, () => {
    console.log(`[OK] Tablero web: http://localhost:${config.puerto}`);
  }).on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.log('[!] Ya hay OTRO bot de pedidos corriendo en esta laptop. Cierra TODAS las ventanas negras y abre SOLO UNA vez iniciar.bat.');
      console.log('[!] Este bot se apaga solo en 5 segundos.');
      setTimeout(() => process.exit(1), 5000);
    } else {
      console.log('[!] Error del servidor web:', e.message);
    }
  });
}

module.exports = { iniciarWeb };
