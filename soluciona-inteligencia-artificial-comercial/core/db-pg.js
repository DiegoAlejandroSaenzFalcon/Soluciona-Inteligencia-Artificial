'use strict';
const path = require('path');
const { Worker } = require('worker_threads');
const { config } = require('../config.cjs');

const PAYLOAD_SIZE = 8 * 1024 * 1024;
const WAIT_TIMEOUT_MS = 120000;

function buildUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  return `postgresql://${config.dbUser || 'postgres'}:${config.dbPass || 'postgres'}@${config.dbHost || 'localhost'}:${config.dbPort || 5432}/${config.dbName || 'soluciona_inteligencia_artificial_comercial'}`;
}

let worker = null;
let ctl = null;
let dataSab = null;
let mainSeq = 0;
let workerMuerto = false;

function ensureWorker() {
  if (worker && !workerMuerto) return;
  ctl = new Int32Array(new SharedArrayBuffer(4 * 4));
  dataSab = new SharedArrayBuffer(PAYLOAD_SIZE);
  workerMuerto = false;
  worker = new Worker(path.join(__dirname, 'db-pg-worker.js'), {
    workerData: {
      url: buildUrl(),
      max: config.dbPoolSize || 10,
      ctlBuf: ctl.buffer,
      dataSab
    }
  });
  worker.unref();
  worker.on('exit', () => { workerMuerto = true; });
  worker.on('error', () => { workerMuerto = true; });
}

function call(text, params) {
  ensureWorker();
  const seq = ++mainSeq;
  const req = JSON.stringify({ id: seq, sql: text, params: params || [] });
  const reqBytes = new TextEncoder().encode(req);
  if (reqBytes.length > PAYLOAD_SIZE) throw new Error('Solicitud demasiado grande para el canal DB');
  new Uint8Array(dataSab).set(reqBytes);
  Atomics.store(ctl, 3, reqBytes.length);
  Atomics.store(ctl, 1, seq);
  Atomics.store(ctl, 0, 1);
  Atomics.notify(ctl, 0);

  const sab = new Uint8Array(dataSab);
  let resp = null;
  while (true) {
    const w = Atomics.wait(ctl, 0, 1, WAIT_TIMEOUT_MS);
    if (workerMuerto) throw new Error('Hilo de base de datos terminado');
    const state = Atomics.load(ctl, 0);
    if (state === 2 && Atomics.load(ctl, 2) === seq) {
      const len = Atomics.load(ctl, 3);
      resp = JSON.parse(new TextDecoder('utf-8').decode(sab.subarray(0, len)));
      Atomics.store(ctl, 0, 0);
      break;
    }
    if (w === 'timed-out' && state === 1) {
      // el worker podría estar ocupado conectando; reintentamos la espera
      continue;
    }
  }
  if (!resp.ok) {
    const msg = (resp.error && resp.error.message) || 'Error desconocido de base de datos';
    const e = new Error(msg);
    e.dbError = true;
    throw e;
  }
  return resp;
}

function q(text, params) {
  return call(text, params).rows;
}

function g(text, params) {
  const rows = call(text, params).rows;
  return rows && rows.length ? rows[0] : undefined;
}

function m(text, params) {
  return call(text, params).changes || 0;
}

// ---------------------------------------------------------------------------
// API pública (espejo de core/db-sqlite.js)
// ---------------------------------------------------------------------------

function siguienteId() {
  const row = g('SELECT COALESCE(MAX(id),0)+1 AS n FROM pedidos WHERE tenant_id=$1', [config.clienteId]);
  return row ? Number(row.n) : 1;
}

function guardarPedido(datos) {
  m(`INSERT INTO pedidos
    (id, tenant_id, fecha, dia, remitente, telefono, items, total, crudo, direccion, lat, lng, estado, tipo, estado_pago, factura_emitida, factura_proveedor, distancia_km, costo_domicilio)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
    [
      datos.id, config.clienteId,
      datos.fecha || new Date().toISOString(),
      datos.dia || (datos.fecha ? datos.fecha.slice(0, 10) : ''),
      datos.remitente || '',
      datos.telefono || '',
      JSON.stringify(datos.items || []),
      datos.total || 0,
      datos.crudo || '',
      datos.direccion || '',
      datos.lat || '',
      datos.lng || '',
      datos.estado || 'recibido',
      datos.tipo || 'domicilio',
      datos.estado_pago || 'pendiente',
      datos.factura_emitida || '',
      datos.factura_proveedor || '',
      datos.distancia_km != null ? datos.distancia_km : null,
      datos.costo_domicilio != null ? datos.costo_domicilio : null
    ]
  );
  if (datos.telefono) actualizarPerfil(datos);
}

function leerPedidos() {
  const rows = q('SELECT * FROM pedidos WHERE tenant_id=$1 ORDER BY id ASC', [config.clienteId]);
  return rows.map(r => ({
    id: r.id,
    fecha: r.fecha,
    dia: r.dia,
    remitente: r.remitente,
    telefono: resolverLid(r.telefono) || r.telefono,
    items: JSON.parse(r.items || '[]'),
    total: r.total,
    crudo: r.crudo,
    direccion: r.direccion,
    lat: r.lat,
    lng: r.lng,
    estado: r.estado,
    tipo: r.tipo,
    estado_pago: r.estado_pago,
    factura_emitida: r.factura_emitida,
    factura_proveedor: r.factura_proveedor,
    distancia_km: r.distancia_km,
    costo_domicilio: r.costo_domicilio
  }));
}

const COLS_PEDIDO = ['fecha','dia','remitente','telefono','items','total','crudo','direccion','lat','lng','estado','tipo','estado_pago','factura_emitida','factura_proveedor','distancia_km','costo_domicilio'];

function patchPedido(id, campos) {
  const cols = Object.keys(campos).filter(k => COLS_PEDIDO.includes(k));
  if (!cols.length) return;
  const set = cols.map((c, i) => `${c}=$${i + 2}`).join(', ');
  const vals = cols.map(c => c === 'items' ? JSON.stringify(campos[c]) : campos[c]);
  m(`UPDATE pedidos SET ${set} WHERE tenant_id=$1 AND id=$${cols.length + 2}`, [config.clienteId, ...vals, id]);
}

function cambiarEstado(id, estado) {
  patchPedido(id, { estado });
  return leerPedidos().find(p => p.id === id) || null;
}

// ---- Clientes / perfilación ----
function actualizarPerfil(datos) {
  const existente = g('SELECT * FROM clientes WHERE tenant_id=$1 AND telefono=$2', [config.clienteId, datos.telefono]);
  if (existente) {
    m("UPDATE clientes SET total_pedidos=total_pedidos+1, ultima_compra=$1, nombre=COALESCE(NULLIF($2, ''), nombre) WHERE tenant_id=$3 AND telefono=$4",
      [datos.fecha || new Date().toISOString(), datos.remitente || '', config.clienteId, datos.telefono]);
  } else {
    m('INSERT INTO clientes (tenant_id, telefono, nombre, total_pedidos, ultima_compra, creado) VALUES ($1,$2,$3,$4,$5,$6)',
      [config.clienteId, datos.telefono, datos.remitente || '', 1, datos.fecha || new Date().toISOString(), new Date().toISOString()]);
  }
}

function obtenerCliente(telefono) {
  return g('SELECT * FROM clientes WHERE tenant_id=$1 AND telefono=$2', [config.clienteId, telefono]) || null;
}

function listarClientes() {
  const rows = q('SELECT telefono, nombre, total_pedidos, ultima_compra FROM clientes WHERE tenant_id=$1 ORDER BY ultima_compra DESC', [config.clienteId]);
  return rows.map(c => {
    const real = resolverLid(c.telefono);
    return { ...c, telefono: real || c.telefono, lid: real ? c.telefono : '' };
  });
}

// ---- Conversaciones ----
function registrarConversacion(hilo, remitente, rol, texto) {
  if (!texto || !String(texto).trim()) return;
  if (!hilo) hilo = 'desconocido';
  m('INSERT INTO conversaciones (tenant_id, hilo, remitente, rol, texto, fecha) VALUES ($1,$2,$3,$4,$5,$6)',
    [config.clienteId, hilo, remitente || '', rol, String(texto), new Date().toISOString()]);
}

function hilosConversacion() {
  const rows = q(`SELECT hilo, MAX(remitente) AS remitente, COUNT(*) AS total, MAX(fecha) AS ultima
    FROM conversaciones WHERE tenant_id=$1 GROUP BY hilo ORDER BY ultima DESC`, [config.clienteId]);
  return rows.map(r => ({ telefono: resolverLid(r.hilo) || r.hilo, remitente: r.remitente, total: Number(r.total), ultima: r.ultima }));
}

function leerHiloConversacion(hilo) {
  if (!hilo) return [];
  return q('SELECT fecha, rol, texto FROM conversaciones WHERE tenant_id=$1 AND hilo=$2 ORDER BY id ASC', [config.clienteId, hilo])
    .map(mi => ({ fecha: new Date(mi.fecha).toLocaleString('es-CO'), rol: mi.rol, texto: mi.texto }));
}

// ---- LID -> número real (privacidad WhatsApp) ----
function normalizarLid(lid) {
  return String(lid).split('@')[0].split(':')[0].replace(/\D/g, '');
}

function guardarLidMap(lid, telefono) {
  if (!lid || !telefono) return;
  lid = normalizarLid(lid);
  m(`INSERT INTO lid_map (lid, telefono, actualizado) VALUES ($1, $2, $3)
    ON CONFLICT(lid) DO UPDATE SET telefono=EXCLUDED.telefono, actualizado=EXCLUDED.actualizado`,
    [lid, telefono, new Date().toISOString()]);
}

function leerLidMaps() {
  return q('SELECT lid, telefono FROM lid_map').reduce((acc, r) => {
    acc[normalizarLid(r.lid)] = r.telefono;
    return acc;
  }, {});
}

function resolverLid(lid) {
  if (!lid) return null;
  const r = g('SELECT telefono FROM lid_map WHERE lid=$1', [normalizarLid(lid)]);
  return r ? r.telefono : null;
}

function lidsPendientes() {
  const rows = q(`
    SELECT telefono FROM clientes WHERE tenant_id=$1 AND telefono ~ '^[0-9]{15}$'
    UNION
    SELECT hilo AS telefono FROM conversaciones WHERE tenant_id=$2 AND hilo ~ '^[0-9]{15}$'
    UNION
    SELECT telefono FROM pedidos WHERE tenant_id=$3 AND telefono ~ '^[0-9]{15}$'
  `, [config.clienteId, config.clienteId, config.clienteId]);
  return rows.map(r => r.telefono).filter((v, i, a) => a.indexOf(v) === i);
}

function aplicarMapeoLid(lid, telefono) {
  if (!lid || !telefono) return 0;
  lid = normalizarLid(lid);
  guardarLidMap(lid, telefono);
  let n = 0;
  n += m('UPDATE pedidos SET telefono=$1 WHERE tenant_id=$2 AND telefono=$3', [telefono, config.clienteId, lid]);
  n += m('UPDATE clientes SET telefono=$1 WHERE tenant_id=$2 AND telefono=$3', [telefono, config.clienteId, lid]);
  n += m('UPDATE conversaciones SET hilo=$1 WHERE tenant_id=$2 AND hilo=$3', [telefono, config.clienteId, lid]);
  return n;
}

function migrarLegacy() {
  // No aplica: el runtime ya no gestiona archivos JSONL; ver src/db/migrate-sqlite-to-pg.js
}

// ---- Consumo IA (cuotas por rol: chatbot / asistentes / vision) ----
function registrarUsoIA(rol, modelo, proveedor, tokensPrompt, tokensCompletados) {
  try {
    m(`INSERT INTO uso_ia (tenant_id, rol, modelo, proveedor, tokens_prompt, tokens_completados, fecha)
      VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [config.clienteId, rol || 'chatbot', modelo || '', proveedor || '', tokensPrompt || 0, tokensCompletados || 0, new Date().toISOString()]);
  } catch (e) {
    console.error('[CONSUMO] No pude registrar:', e.message);
  }
}

function consumoIADia(rol) {
  const hoy = new Date().toISOString().slice(0, 10);
  const r = g(`
    SELECT COUNT(*) AS llamadas, COALESCE(SUM(tokens_prompt+tokens_completados),0) AS tokens
    FROM uso_ia WHERE tenant_id=$1 AND rol=$2 AND substr(fecha,1,10)=$3`,
    [config.clienteId, rol || 'chatbot', hoy]);
  return { llamadas: Number(r ? r.llamadas : 0), tokens: Number(r ? r.tokens : 0) };
}

function consumoIAMes(rol) {
  const mes = new Date().toISOString().slice(0, 7);
  const r = g(`
    SELECT COUNT(*) AS llamadas, COALESCE(SUM(tokens_prompt+tokens_completados),0) AS tokens
    FROM uso_ia WHERE tenant_id=$1 AND rol=$2 AND substr(fecha,1,7)=$3`,
    [config.clienteId, rol || 'chatbot', mes]);
  return { llamadas: Number(r ? r.llamadas : 0), tokens: Number(r ? r.tokens : 0) };
}

// ---- Citas (segmento salud) ----
function siguienteCitaId() {
  const row = g('SELECT COALESCE(MAX(id),0)+1 AS n FROM citas WHERE tenant_id=$1', [config.clienteId]);
  return row ? Number(row.n) : 1;
}

const COLS_CITA = ['fecha','hora','servicio','profesional','paciente','telefono','estado','confirmada'];

function guardarCita(datos) {
  m(`INSERT INTO citas
    (id, tenant_id, fecha, hora, servicio, profesional, paciente, telefono, estado, confirmada, creado)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      datos.id, config.clienteId,
      datos.fecha || '',
      datos.hora || '',
      datos.servicio || '',
      datos.profesional || '',
      datos.paciente || '',
      datos.telefono || '',
      datos.estado || 'reservada',
      datos.confirmada ? 1 : 0,
      new Date().toISOString()
    ]
  );
}

function leerCitas(estadoFiltro) {
  const rows = estadoFiltro
    ? q('SELECT * FROM citas WHERE tenant_id=$1 AND estado=$2 ORDER BY fecha, hora ASC', [config.clienteId, estadoFiltro])
    : q('SELECT * FROM citas WHERE tenant_id=$1 ORDER BY fecha, hora ASC', [config.clienteId]);
  return rows.map(r => ({
    id: r.id,
    fecha: r.fecha,
    hora: r.hora,
    servicio: r.servicio,
    profesional: r.profesional,
    paciente: r.paciente,
    telefono: resolverLid(r.telefono) || r.telefono,
    estado: r.estado,
    confirmada: !!r.confirmada,
    creado: r.creado
  }));
}

function patchCita(id, campos) {
  const cols = Object.keys(campos).filter(k => COLS_CITA.includes(k));
  if (!cols.length) return;
  const set = cols.map((c, i) => `${c}=$${i + 2}`).join(', ');
  const vals = cols.map(c => c === 'confirmada' ? (campos[c] ? 1 : 0) : campos[c]);
  m(`UPDATE citas SET ${set} WHERE tenant_id=$1 AND id=$${cols.length + 2}`, [config.clienteId, ...vals, id]);
}

function cambiarEstadoCita(id, estado) {
  patchCita(id, { estado });
  return leerCitas().find(c => c.id === id) || null;
}

function ping() {
  try {
    call('SELECT 1', []);
    return true;
  } catch (e) {
    return false;
  }
}

// SQL crudo (para herramientas admin y limpieza)
function _sql(text, params) {
  return call(text, params);
}

module.exports = {
  db: { ping },
  tenantId: config.clienteId,
  siguienteId, guardarPedido, leerPedidos, patchPedido, cambiarEstado,
  actualizarPerfil, obtenerCliente, listarClientes,
  registrarConversacion, hilosConversacion, leerHiloConversacion,
  guardarLidMap, leerLidMaps, resolverLid, aplicarMapeoLid, lidsPendientes,
  registrarUsoIA, consumoIADia, consumoIAMes,
  siguienteCitaId, guardarCita, leerCitas, patchCita, cambiarEstadoCita,
  migrarLegacy,
  ping,
  _sql
};