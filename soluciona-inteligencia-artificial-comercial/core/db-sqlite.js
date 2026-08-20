const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { config } = require('../config');

const DB_PATH = path.join(config.dataDir, 'neurallgo.db');
if (!fs.existsSync(config.dataDir)) fs.mkdirSync(config.dataDir, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  nombre TEXT,
  creado TEXT
);
CREATE TABLE IF NOT EXISTS pedidos (
  id INTEGER,
  tenant_id TEXT,
  fecha TEXT,
  dia TEXT,
  remitente TEXT,
  telefono TEXT,
  items TEXT,
  total INTEGER,
  crudo TEXT,
  direccion TEXT,
  lat TEXT,
  lng TEXT,
  estado TEXT DEFAULT 'recibido',
  tipo TEXT DEFAULT 'domicilio',
  estado_pago TEXT DEFAULT 'pendiente',
  factura_emitida TEXT,
  factura_proveedor TEXT,
  distancia_km REAL,
  costo_domicilio INTEGER,
  PRIMARY KEY (tenant_id, id)
);
CREATE TABLE IF NOT EXISTS clientes (
  tenant_id TEXT,
  telefono TEXT,
  nombre TEXT,
  total_pedidos INTEGER DEFAULT 0,
  ultima_compra TEXT,
  creado TEXT,
  PRIMARY KEY (tenant_id, telefono)
);
CREATE TABLE IF NOT EXISTS conversaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT,
  hilo TEXT,
  remitente TEXT,
  rol TEXT,
  texto TEXT,
  fecha TEXT
);
CREATE TABLE IF NOT EXISTS lid_map (
  lid TEXT PRIMARY KEY,
  telefono TEXT,
  actualizado TEXT
);
CREATE TABLE IF NOT EXISTS uso_ia (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT,
  rol TEXT,
  modelo TEXT,
  proveedor TEXT,
  tokens_prompt INTEGER DEFAULT 0,
  tokens_completados INTEGER DEFAULT 0,
  fecha TEXT
);
CREATE TABLE IF NOT EXISTS citas (
  id INTEGER,
  tenant_id TEXT,
  fecha TEXT,
  hora TEXT,
  servicio TEXT,
  profesional TEXT,
  paciente TEXT,
  telefono TEXT,
  estado TEXT DEFAULT 'reservada',
  confirmada INTEGER DEFAULT 0,
  creado TEXT,
  PRIMARY KEY (tenant_id, id)
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  nombre TEXT,
  telefono TEXT,
  role TEXT NOT NULL DEFAULT 'operador',
  activo INTEGER DEFAULT 1,
  two_factor_enabled INTEGER DEFAULT 0,
  two_factor_secret TEXT,
  last_login_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, email)
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  tenant_id TEXT,
  ip TEXT,
  user_agent TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  nombre TEXT
);
CREATE TABLE IF NOT EXISTS role_permissions (
  role TEXT NOT NULL,
  permission_id INTEGER NOT NULL,
  PRIMARY KEY (role, permission_id)
);
CREATE TABLE IF NOT EXISTS user_permissions (
  user_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  granted INTEGER DEFAULT 1,
  PRIMARY KEY (user_id, permission_id)
);
CREATE INDEX IF NOT EXISTS idx_pedidos_tenant ON pedidos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conv_tenant ON conversaciones(tenant_id, hilo);
CREATE INDEX IF NOT EXISTS idx_clientes_tenant ON clientes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_citas_tenant ON citas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`);

const tenantId = config.clienteId;
db.prepare('INSERT OR IGNORE INTO tenants (id, nombre, creado) VALUES (?, ?, ?)')
  .run(tenantId, config.negocio || tenantId, new Date().toISOString());

// Migraciones de esquema para DBs creadas con versiones anteriores.
const colsPedidos = db.prepare('PRAGMA table_info(pedidos)').all().map(c => c.name);
if (!colsPedidos.includes('factura_emitida')) {
  db.exec('ALTER TABLE pedidos ADD COLUMN factura_emitida TEXT');
}
if (!colsPedidos.includes('factura_proveedor')) {
  db.exec('ALTER TABLE pedidos ADD COLUMN factura_proveedor TEXT');
}
if (!colsPedidos.includes('distancia_km')) {
  db.exec('ALTER TABLE pedidos ADD COLUMN distancia_km REAL');
}
if (!colsPedidos.includes('costo_domicilio')) {
  db.exec('ALTER TABLE pedidos ADD COLUMN costo_domicilio INTEGER');
}

// Normaliza claves de lid_map: si quedaron guardadas como "123...@lid",
// las pasa a solo dígitos (evitando duplicados) para que resolverLid matchee.
db.exec(`UPDATE lid_map SET lid = CASE WHEN instr(lid, '@') > 0 THEN substr(lid, 1, instr(lid, '@') - 1) ELSE lid END
  WHERE lid LIKE '%@%' AND (SELECT COUNT(*) FROM lid_map m WHERE m.lid = substr(lid_map.lid, 1, instr(lid_map.lid, '@') - 1)) = 0`);
db.exec(`DELETE FROM lid_map WHERE lid LIKE '%@%'`);

function siguienteId() {
  const row = db.prepare('SELECT COALESCE(MAX(id),0)+1 AS n FROM pedidos WHERE tenant_id=?').get(tenantId);
  return row.n;
}

function guardarPedido(datos) {
  db.prepare(`INSERT INTO pedidos
    (id, tenant_id, fecha, dia, remitente, telefono, items, total, crudo, direccion, lat, lng, estado, tipo, estado_pago, factura_emitida, factura_proveedor, distancia_km, costo_domicilio)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    datos.id, tenantId,
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
  );
  if (datos.telefono) actualizarPerfil(datos);
}

function leerPedidos() {
  const rows = db.prepare('SELECT * FROM pedidos WHERE tenant_id=? ORDER BY id ASC').all(tenantId);
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

function patchPedido(id, campos) {
  const cols = Object.keys(campos).filter(k => ['fecha','dia','remitente','telefono','items','total','crudo','direccion','lat','lng','estado','tipo','estado_pago','factura_emitida','factura_proveedor','distancia_km','costo_domicilio'].includes(k));
  if (!cols.length) return;
  const set = cols.map(c => `${c}=?`).join(', ');
  const vals = cols.map(c => c === 'items' ? JSON.stringify(campos[c]) : campos[c]);
  db.prepare(`UPDATE pedidos SET ${set} WHERE tenant_id=? AND id=?`).run(...vals, tenantId, id);
}

function cambiarEstado(id, estado) {
  patchPedido(id, { estado });
  return leerPedidos().find(p => p.id === id) || null;
}

// ---- Clientes / perfilación ----
function actualizarPerfil(datos) {
  const existente = db.prepare('SELECT * FROM clientes WHERE tenant_id=? AND telefono=?').get(tenantId, datos.telefono);
  if (existente) {
    db.prepare("UPDATE clientes SET total_pedidos=total_pedidos+1, ultima_compra=?, nombre=COALESCE(NULLIF(?, ''), nombre) WHERE tenant_id=? AND telefono=?")
      .run(datos.fecha || new Date().toISOString(), datos.remitente || '', tenantId, datos.telefono);
  } else {
    db.prepare('INSERT INTO clientes (tenant_id, telefono, nombre, total_pedidos, ultima_compra, creado) VALUES (?,?,?,?,?,?)')
      .run(tenantId, datos.telefono, datos.remitente || '', 1, datos.fecha || new Date().toISOString(), new Date().toISOString());
  }
}

function obtenerCliente(telefono) {
  return db.prepare('SELECT * FROM clientes WHERE tenant_id=? AND telefono=?').get(tenantId, telefono) || null;
}

function listarClientes() {
  const rows = db.prepare('SELECT telefono, nombre, total_pedidos, ultima_compra FROM clientes WHERE tenant_id=? ORDER BY ultima_compra DESC').all(tenantId);
  return rows.map(c => {
    const real = resolverLid(c.telefono);
    return { ...c, telefono: real || c.telefono, lid: real ? c.telefono : '' };
  });
}

// ---- Conversaciones ----
function registrarConversacion(hilo, remitente, rol, texto) {
  if (!texto || !String(texto).trim()) return;
  if (!hilo) hilo = 'desconocido';
  db.prepare('INSERT INTO conversaciones (tenant_id, hilo, remitente, rol, texto, fecha) VALUES (?,?,?,?,?,?)')
    .run(tenantId, hilo, remitente || '', rol, String(texto), new Date().toISOString());
}

function hilosConversacion() {
  const rows = db.prepare(`SELECT hilo, MAX(remitente) AS remitente, COUNT(*) AS total, MAX(fecha) AS ultima
    FROM conversaciones WHERE tenant_id=? GROUP BY hilo ORDER BY ultima DESC`).all(tenantId);
  return rows.map(r => ({ telefono: resolverLid(r.hilo) || r.hilo, remitente: r.remitente, total: r.total, ultima: r.ultima }));
}

function leerHiloConversacion(hilo) {
  if (!hilo) return [];
  return db.prepare('SELECT fecha, rol, texto FROM conversaciones WHERE tenant_id=? AND hilo=? ORDER BY id ASC')
    .all(tenantId, hilo)
    .map(m => ({ fecha: new Date(m.fecha).toLocaleString('es-CO'), rol: m.rol, texto: m.texto }));
}

// ---- LID -> número real (privacidad WhatsApp) ----
function guardarLidMap(lid, telefono) {
  if (!lid || !telefono) return;
  lid = String(lid).split('@')[0].replace(/\D/g, '');
  db.prepare(`INSERT INTO lid_map (lid, telefono, actualizado) VALUES (?, ?, ?)
    ON CONFLICT(lid) DO UPDATE SET telefono=excluded.telefono, actualizado=excluded.actualizado`)
    .run(lid, telefono, new Date().toISOString());
}

function leerLidMaps() {
  return db.prepare('SELECT lid, telefono FROM lid_map').all().reduce((m, r) => {
    m[String(r.lid).split('@')[0].replace(/\D/g, '')] = r.telefono;
    return m;
  }, {});
}

function resolverLid(lid) {
  if (!lid) return null;
  const r = db.prepare('SELECT telefono FROM lid_map WHERE lid=?').get(String(lid).split('@')[0].replace(/\D/g, ''));
  return r ? r.telefono : null;
}

function lidsPendientes() {
  const rows = db.prepare(`
    SELECT telefono FROM clientes WHERE tenant_id=? AND telefono GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
    UNION
    SELECT hilo AS telefono FROM conversaciones WHERE tenant_id=? AND hilo GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
    UNION
    SELECT telefono FROM pedidos WHERE tenant_id=? AND telefono GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
  `).all(tenantId, tenantId, tenantId);
  return rows.map(r => r.telefono).filter((v, i, a) => a.indexOf(v) === i);
}

function aplicarMapeoLid(lid, telefono) {
  if (!lid || !telefono) return 0;
  lid = String(lid).split('@')[0].replace(/\D/g, '');
  guardarLidMap(lid, telefono);
  let n = 0;
  n += db.prepare('UPDATE pedidos SET telefono=? WHERE tenant_id=? AND telefono=?').run(telefono, tenantId, lid).changes;
  n += db.prepare('UPDATE clientes SET telefono=? WHERE tenant_id=? AND telefono=?').run(telefono, tenantId, lid).changes;
  n += db.prepare('UPDATE conversaciones SET hilo=? WHERE tenant_id=? AND hilo=?').run(telefono, tenantId, lid).changes;
  return n;
}

// ---- Migración de datos legacy (JSONL) a SQLite ----
function migrarLegacy() {
  const pedFile = path.join(config.dataDir, 'pedidos.jsonl');
  if (fs.existsSync(pedFile)) {
    const existentes = db.prepare('SELECT COUNT(*) AS n FROM pedidos WHERE tenant_id=?').get(tenantId).n;
    if (existentes === 0) {
      const lineas = fs.readFileSync(pedFile, 'utf8').split('\n').filter(l => l.trim());
      let migrados = 0;
      for (const l of lineas) {
        try {
          const p = JSON.parse(l);
          guardarPedido({
            id: p.id, fecha: p.fecha, dia: p.dia, remitente: p.remitente, telefono: p.telefono,
            items: p.items, total: p.total, crudo: p.crudo, direccion: p.direccion, lat: p.lat, lng: p.lng,
            estado: p.estado || 'recibido', tipo: p.tipo || 'domicilio', estado_pago: p.estado_pago || 'pendiente'
          });
          migrados++;
        } catch {}
      }
      console.log(`[DB] Migrados ${migrados} pedidos legacy a SQLite.`);
    }
    fs.renameSync(pedFile, pedFile + '.migrado');
  }
  const convFile = path.join(config.dataDir, 'conversaciones.jsonl');
  if (fs.existsSync(convFile)) {
    const existentes = db.prepare('SELECT COUNT(*) AS n FROM conversaciones WHERE tenant_id=?').get(tenantId).n;
    if (existentes === 0) {
      const lineas = fs.readFileSync(convFile, 'utf8').split('\n').filter(l => l.trim());
      for (const l of lineas) {
        try {
          const m = JSON.parse(l);
          registrarConversacion(m.telefono || m.hilo || 'desconocido', m.remitente, m.rol, m.texto);
        } catch {}
      }
      console.log(`[DB] Migradas conversaciones legacy a SQLite.`);
    }
    fs.renameSync(convFile, convFile + '.migrado');
  }
}

migrarLegacy();

// ---- Seed usuarios: admin inicial (evita import circular de src/auth) ----
// Usuario: admin@localhost  |  Password: Admin123!
const ADMIN_EMAIL = 'admin@localhost';
const ADMIN_PASS = 'Admin123!';
const adminExiste = db.prepare('SELECT id FROM users WHERE tenant_id=? AND email=?').get(tenantId, ADMIN_EMAIL);
if (!adminExiste) {
  let hash;
  try {
    hash = require('bcryptjs').hashSync(ADMIN_PASS, 12);
  } catch {
    // bcryptjs no disponible: hash plano (solo arranque inicial)
    hash = '$2a$12$nativo.no.disponible.admin.default$';
  }
  db.prepare('INSERT INTO users (tenant_id, email, password_hash, nombre, role, activo) VALUES (?,?,?,?,?,1)')
    .run(tenantId, ADMIN_EMAIL, hash, 'Administrador', 'admin');
}

// ---- Consumo IA (cuotas por rol: chatbot / asistentes / vision) ----
function registrarUsoIA(rol, modelo, proveedor, tokensPrompt, tokensCompletados) {
  try {
    db.prepare(`INSERT INTO uso_ia (tenant_id, rol, modelo, proveedor, tokens_prompt, tokens_completados, fecha)
      VALUES (?,?,?,?,?,?,?)`)
      .run(tenantId, rol || 'chatbot', modelo || '', proveedor || '', tokensPrompt || 0, tokensCompletados || 0, new Date().toISOString());
  } catch (e) {
    console.error('[CONSUMO] No pude registrar:', e.message);
  }
}

function consumoIADia(rol) {
  const hoy = new Date().toISOString().slice(0, 10);
  const r = db.prepare(`
    SELECT COUNT(*) AS llamadas, COALESCE(SUM(tokens_prompt+tokens_completados),0) AS tokens
    FROM uso_ia WHERE tenant_id=? AND rol=? AND substr(fecha,1,10)=?`)
    .get(tenantId, rol || 'chatbot', hoy);
  return { llamadas: r.llamadas, tokens: r.tokens };
}

function consumoIAMes(rol) {
  const mes = new Date().toISOString().slice(0, 7);
  const r = db.prepare(`
    SELECT COUNT(*) AS llamadas, COALESCE(SUM(tokens_prompt+tokens_completados),0) AS tokens
    FROM uso_ia WHERE tenant_id=? AND rol=? AND substr(fecha,1,7)=?`)
    .get(tenantId, rol || 'chatbot', mes);
  return { llamadas: r.llamadas, tokens: r.tokens };
}

// ---- Citas (segmento salud) ----
function siguienteCitaId() {
  const row = db.prepare('SELECT COALESCE(MAX(id),0)+1 AS n FROM citas WHERE tenant_id=?').get(tenantId);
  return row.n;
}

function guardarCita(datos) {
  db.prepare(`INSERT INTO citas
    (id, tenant_id, fecha, hora, servicio, profesional, paciente, telefono, estado, confirmada, creado)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
    datos.id, tenantId,
    datos.fecha || '',
    datos.hora || '',
    datos.servicio || '',
    datos.profesional || '',
    datos.paciente || '',
    datos.telefono || '',
    datos.estado || 'reservada',
    datos.confirmada ? 1 : 0,
    new Date().toISOString()
  );
}

function leerCitas(estadoFiltro) {
  const rows = estadoFiltro
    ? db.prepare('SELECT * FROM citas WHERE tenant_id=? AND estado=? ORDER BY fecha, hora ASC').all(tenantId, estadoFiltro)
    : db.prepare('SELECT * FROM citas WHERE tenant_id=? ORDER BY fecha, hora ASC').all(tenantId);
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
  const cols = Object.keys(campos).filter(k => ['fecha','hora','servicio','profesional','paciente','telefono','estado','confirmada'].includes(k));
  if (!cols.length) return;
  const set = cols.map(c => `${c}=?`).join(', ');
  const vals = cols.map(c => c === 'confirmada' ? (campos[c] ? 1 : 0) : campos[c]);
  db.prepare(`UPDATE citas SET ${set} WHERE tenant_id=? AND id=?`).run(...vals, tenantId, id);
}

function cambiarEstadoCita(id, estado) {
  patchCita(id, { estado });
  return leerCitas().find(c => c.id === id) || null;
}

function ping() {
  try {
    db.prepare('SELECT 1').get();
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  db, tenantId,
  siguienteId, guardarPedido, leerPedidos, patchPedido, cambiarEstado,
  actualizarPerfil, obtenerCliente, listarClientes,
  registrarConversacion, hilosConversacion, leerHiloConversacion,
  guardarLidMap, leerLidMaps, resolverLid, aplicarMapeoLid, lidsPendientes,
  registrarUsoIA, consumoIADia, consumoIAMes,
  siguienteCitaId, guardarCita, leerCitas, patchCita, cambiarEstadoCita,
  migrarLegacy,
  ping
};
