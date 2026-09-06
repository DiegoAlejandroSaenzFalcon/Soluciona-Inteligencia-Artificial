const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { config } = require('../config.js');

const DB_PATH = path.join(config.dataDir, 'neurallgo.db');
if (!fs.existsSync(config.dataDir)) fs.mkdirSync(config.dataDir, { recursive: true });

// Pool de conexiones SQLite (para distribuir carga)
const POOL_SIZE = Math.max(2, require('os').cpus().length);
const dbPool = [];
for (let i = 0; i < POOL_SIZE; i++) {
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
  db.exec('PRAGMA busy_timeout = 30000;');
  db.exec('PRAGMA synchronous = NORMAL;');
  dbPool.push(db);
}

let poolIndex = 0;
function getDb() {
  const db = dbPool[poolIndex];
  poolIndex = (poolIndex + 1) % dbPool.length;
  return db;
}

// db principal (para compatibilidad)
const db = dbPool[0];
db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
db.exec('PRAGMA busy_timeout = 30000;');
db.exec('PRAGMA synchronous = NORMAL;');

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
  hilo_norm TEXT,
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
  must_change_password INTEGER DEFAULT 0,
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
CREATE TABLE IF NOT EXISTS password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
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
-- Versionado y auditoría de configv2 (usados por src/config/v2.js)
CREATE TABLE IF NOT EXISTS config_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT DEFAULT 'default',
  section TEXT NOT NULL,
  payload TEXT,
  changed_by INTEGER,
  ip TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT DEFAULT 'default',
  user_id INTEGER,
  accion TEXT,
  entidad TEXT,
  entidad_id TEXT,
  antes TEXT,
  despues TEXT,
  ip TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cv_section ON config_versions(tenant_id, section);
CREATE INDEX IF NOT EXISTS idx_pedidos_tenant ON pedidos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conv_tenant ON conversaciones(tenant_id, hilo);
CREATE INDEX IF NOT EXISTS idx_clientes_tenant ON clientes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_citas_tenant ON citas(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  `);

// Tablas de contabilidad / inventario. Los módulos src/accounting e src/inventory
// usan el adaptador getClient() (Postgres) sobre esta misma BD sqlite, pero sus
// tablas no se creaban aquí, lo que provocaba "no such table" y colgaba el panel.
// Se crean con el subconjunto de columnas que leen las consultas del panel.
db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT, nombre TEXT, telefono TEXT, email TEXT,
    dias_credito INTEGER DEFAULT 0, activo INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT, nombre TEXT, activo INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT, customer_id INTEGER, order_id INTEGER,
    numero TEXT, prefijo TEXT, resolucion TEXT,
    fecha TEXT, fecha_vencimiento TEXT, estado TEXT DEFAULT 'borrador',
    subtotal REAL DEFAULT 0, descuento REAL DEFAULT 0, impuestos REAL DEFAULT 0,
    total REAL DEFAULT 0, saldo_pendiente REAL DEFAULT 0, observacion TEXT
  );
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT, purchase_order_id INTEGER,
    monto REAL DEFAULT 0, tipo TEXT, estado TEXT, metodo TEXT, fecha TEXT
  );
  CREATE TABLE IF NOT EXISTS purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT, supplier_id INTEGER, numero TEXT,
    fecha TEXT, fecha_entrega_esperada TEXT, total REAL DEFAULT 0, estado TEXT
  );
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT, nombre TEXT, codigo TEXT,
    stock_minimo REAL DEFAULT 0, stock_maximo REAL DEFAULT 0,
    activo INTEGER DEFAULT 1, maneja_stock INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER, cantidad REAL DEFAULT 0, fecha TEXT
  );
`);

// Esquema completo esperado por src/inventory e src/accounting (superset de
// columnas; SQLite ignora las de más porque las consultas nombran columnas).
function __migrar(tabla, colDef, whereIdx = null) {
  const cols = db.prepare(`PRAGMA table_info(${tabla})`).all().map(c => c.name);
  for (const [col, def] of Object.entries(colDef)) {
    if (!cols.includes(col)) db.exec(`ALTER TABLE ${tabla} ADD COLUMN ${col} ${def}`);
  }
  if (whereIdx) {
    const idxs = db.prepare('SELECT name FROM sqlite_master WHERE type=?').all('index').map(i => i.name);
    for (const idx of whereIdx) if (!idxs.includes(idx.name)) db.exec(`CREATE ${idx.unique ? 'UNIQUE INDEX' : 'INDEX'} IF NOT EXISTS ${idx.name} ON ${tabla}(${idx.cols})`);
  }
}
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    nombre TEXT NOT NULL, descripcion TEXT, orden INTEGER DEFAULT 0,
    activo INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS product_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL, nombre TEXT, sku TEXT,
    precio_adicional REAL DEFAULT 0, stock REAL DEFAULT 0,
    activo INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    product_id INTEGER, variant_id INTEGER,
    bodega TEXT, bodega_destino TEXT, tipo TEXT NOT NULL,
    cantidad REAL NOT NULL, costo_unitario REAL,
    referencia_tipo TEXT, referencia_id INTEGER,
    observacion TEXT, usuario_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT DEFAULT 'default',
    invoice_id INTEGER NOT NULL, product_id INTEGER,
    descripcion TEXT, cantidad REAL DEFAULT 1,
    precio_unitario REAL DEFAULT 0, descuento REAL DEFAULT 0,
    impuesto_porcentaje REAL DEFAULT 0, total REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS credit_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT DEFAULT 'default', invoice_id INTEGER,
    numero TEXT, prefijo TEXT, fecha TEXT, motivo TEXT,
    subtotal REAL DEFAULT 0, impuestos REAL DEFAULT 0, total REAL DEFAULT 0,
    estado TEXT DEFAULT 'emitida'
  );
  CREATE TABLE IF NOT EXISTS journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT DEFAULT 'default', numero TEXT, fecha TEXT,
    concepto TEXT, referencia_tipo TEXT, referencia_id INTEGER,
    total_debito REAL DEFAULT 0, total_credito REAL DEFAULT 0,
    estado TEXT DEFAULT 'contabilizado', creado_por INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL, account_id INTEGER,
    tercero_id INTEGER, tercero_tipo TEXT, centro_costo TEXT,
    debito REAL DEFAULT 0, credito REAL DEFAULT 0, concepto TEXT
  );
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT DEFAULT 'default',
    codigo TEXT NOT NULL, nombre TEXT NOT NULL,
    tipo TEXT, activa INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS purchase_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_order_id INTEGER NOT NULL, product_id INTEGER, variant_id INTEGER,
    descripcion TEXT, cantidad REAL DEFAULT 1, cantidad_recibida REAL DEFAULT 0,
    precio_unitario REAL DEFAULT 0, descuento REAL DEFAULT 0,
    impuesto_porcentaje REAL DEFAULT 0, total REAL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS purchase_receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT DEFAULT 'default', purchase_order_id INTEGER,
    numero TEXT, fecha TEXT, observacion TEXT, recibido_por INTEGER
  );
  CREATE TABLE IF NOT EXISTS purchase_receipt_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_receipt_id INTEGER NOT NULL, po_item_id INTEGER,
    product_id INTEGER, variant_id INTEGER, cantidad REAL DEFAULT 1,
    precio_unitario REAL DEFAULT 0, lote TEXT, fecha_vencimiento TEXT, ubicacion TEXT
  );
`);
__migrar('products', {
  category_id: 'INTEGER', codigo_barras: 'TEXT', descripcion: 'TEXT', ingredientes: 'TEXT',
  precio: 'REAL', costo: 'REAL', unidad_medida: "TEXT DEFAULT 'unidad'", ubicacion: 'TEXT',
  imagen_url: 'TEXT', aliases: 'TEXT', impuestos: 'TEXT', updated_at: 'TEXT',
});
__migrar('customers', {
  tipo_identificacion: "TEXT DEFAULT 'CC'", identificacion: 'TEXT', dv: 'TEXT',
  nombre_comercial: 'TEXT', direccion: 'TEXT', ciudad: 'TEXT', regimen: "TEXT DEFAULT 'común'",
  responsable_iva: 'INTEGER DEFAULT 1', cupo_credito: 'REAL DEFAULT 0',
  vendedor_id: 'INTEGER', created_at: 'TEXT DEFAULT CURRENT_TIMESTAMP',
});
__migrar('suppliers', {
  tipo_identificacion: "TEXT DEFAULT 'CC'", identificacion: 'TEXT', dv: 'TEXT',
  nombre_comercial: 'TEXT', email: 'TEXT', telefono: 'TEXT', direccion: 'TEXT',
  ciudad: 'TEXT', pais: "TEXT DEFAULT 'Colombia'", regimen: "TEXT DEFAULT 'común'",
  responsable_iva: 'INTEGER DEFAULT 1', retencion_fuente: 'REAL DEFAULT 0',
  retencion_iva: 'REAL DEFAULT 0', retencion_ica: 'REAL DEFAULT 0',
  dias_credito: 'INTEGER DEFAULT 0', cupo_credito: 'REAL DEFAULT 0',
  banco: 'TEXT', tipo_cuenta: 'TEXT', numero_cuenta: 'TEXT',
  activo: 'INTEGER DEFAULT 1', created_at: 'TEXT DEFAULT CURRENT_TIMESTAMP', updated_at: 'TEXT',
});
__migrar('payments', {
  invoice_id: 'INTEGER', customer_id: 'INTEGER', supplier_id: 'INTEGER',
  referencia: 'TEXT', observacion: 'TEXT',
});
__migrar('invoices', { cufe: 'TEXT', qr_url: 'TEXT', xml_url: 'TEXT', pdf_url: 'TEXT' });
__migrar('stock', {
  tenant_id: "TEXT DEFAULT 'default'", variant_id: 'INTEGER', bodega: "TEXT DEFAULT 'principal'",
  reservado: 'REAL DEFAULT 0', updated_at: 'TEXT',
}, [
  { name: 'uq_stock_posicion', unique: true, cols: 'tenant_id, product_id, variant_id, bodega' },
]);
__migrar('purchase_orders', {
  subtotal: 'REAL DEFAULT 0', impuestos: 'REAL DEFAULT 0', observacion: 'TEXT',
  descuento: 'REAL DEFAULT 0', created_at: 'TEXT DEFAULT CURRENT_TIMESTAMP', updated_at: 'TEXT',
});
__migrar('product_variants', { tenant_id: "TEXT DEFAULT 'default'" });

// Índices de rendimiento para consultas multi-tenant. Se crean DESPUÉS de las
// migraciones porque dependen de columnas añadidas por __migrar (p.ej.
// stock.tenant_id). Se omiten (con aviso) si la columna aún no existe, para no
// impedir el arranque del servidor en BDs antiguas.
const SQL_INDICES = [
  ['idx_customers_tenant', 'customers', 'tenant_id'],
  ['idx_customers_tenant_nombre', 'customers', 'tenant_id, nombre'],
  ['idx_suppliers_tenant', 'suppliers', 'tenant_id'],
  ['idx_invoices_tenant', 'invoices', 'tenant_id'],
  ['idx_invoices_tenant_fecha', 'invoices', 'tenant_id, fecha'],
  ['idx_invoices_tenant_customer', 'invoices', 'tenant_id, customer_id'],
  ['idx_invoices_tenant_estado', 'invoices', 'tenant_id, estado'],
  ['idx_payments_tenant', 'payments', 'tenant_id'],
  ['idx_payments_tenant_fecha', 'payments', 'tenant_id, fecha'],
  ['idx_payments_tenant_purchase_order', 'payments', 'tenant_id, purchase_order_id'],
  ['idx_purchase_orders_tenant', 'purchase_orders', 'tenant_id'],
  ['idx_purchase_orders_tenant_supplier', 'purchase_orders', 'tenant_id, supplier_id'],
  ['idx_purchase_orders_tenant_estado', 'purchase_orders', 'tenant_id, estado'],
  ['idx_products_tenant', 'products', 'tenant_id'],
  ['idx_products_tenant_codigo', 'products', 'tenant_id, codigo'],
  ['idx_products_tenant_activo', 'products', 'tenant_id, activo'],
  ['idx_stock_tenant_product', 'stock', 'tenant_id, product_id'],
  ['idx_categories_tenant', 'categories', 'tenant_id'],
  ['idx_categories_tenant_activo', 'categories', 'tenant_id, activo'],
  ['idx_product_variants_tenant', 'product_variants', 'tenant_id'],
  ['idx_product_variants_product', 'product_variants', 'product_id'],
  ['idx_stock_movements_tenant', 'stock_movements', 'tenant_id'],
  ['idx_stock_movements_tenant_product', 'stock_movements', 'tenant_id, product_id'],
  ['idx_stock_movements_tenant_fecha', 'stock_movements', 'tenant_id, created_at'],
  ['idx_stock_movements_referencia', 'stock_movements', 'referencia_tipo, referencia_id'],
  ['idx_invoice_items_tenant', 'invoice_items', 'tenant_id'],
  ['idx_invoice_items_invoice', 'invoice_items', 'invoice_id'],
  ['idx_credit_notes_tenant', 'credit_notes', 'tenant_id'],
  ['idx_credit_notes_invoice', 'credit_notes', 'invoice_id'],
  ['idx_journal_entries_tenant', 'journal_entries', 'tenant_id'],
  ['idx_journal_entries_tenant_fecha', 'journal_entries', 'tenant_id, fecha'],
  ['idx_journal_entry_lines_entry', 'journal_entry_lines', 'entry_id'],
  ['idx_journal_entry_lines_account', 'journal_entry_lines', 'account_id'],
  ['idx_accounts_tenant', 'accounts', 'tenant_id'],
  ['idx_accounts_tenant_codigo', 'accounts', 'tenant_id, codigo'],
  ['idx_purchase_order_items_po', 'purchase_order_items', 'purchase_order_id'],
  ['idx_purchase_order_items_product', 'purchase_order_items', 'product_id'],
  ['idx_purchase_receipts_tenant', 'purchase_receipts', 'tenant_id'],
  ['idx_purchase_receipts_po', 'purchase_receipts', 'purchase_order_id'],
  ['idx_purchase_receipt_items_receipt', 'purchase_receipt_items', 'purchase_receipt_id'],
  ['idx_purchase_receipt_items_po_item', 'purchase_receipt_items', 'po_item_id'],
];
for (const [nombre, tabla, cols] of SQL_INDICES) {
  try {
    const tcols = db.prepare(`PRAGMA table_info(${tabla})`).all().map(c => c.name);
    if (cols.split(',').map(s => s.trim()).some(c => !tcols.includes(c))) continue;
    db.exec(`CREATE INDEX IF NOT EXISTS ${nombre} ON ${tabla}(${cols})`);
  } catch (e) {
    console.warn(`[DB] Índice ${nombre} omitido: ${e.message}`);
  }
}

// Tablas de configv2 (versionado + auditoría). src/config/v2.js inserta aquí
// en cada cambio de sección; sin ellas el PUT /api/configv2/* fallaba con
// "no such table: config_versions".
db.exec(`
  CREATE TABLE IF NOT EXISTS config_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT DEFAULT 'default',
    section TEXT NOT NULL,
    payload TEXT NOT NULL,
    changed_by INTEGER,
    ip TEXT, user_agent TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_cfgver_tenant_section ON config_versions(tenant_id, section);
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT DEFAULT 'default',
    user_id INTEGER,
    accion TEXT NOT NULL,
    entidad TEXT, entidad_id TEXT,
    antes TEXT, despues TEXT,
    ip TEXT, user_agent TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_auditlogs_tenant ON audit_logs(tenant_id);
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

const colsUsers = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
if (!colsUsers.includes('must_change_password')) {
  db.exec('ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0');
}

// Normaliza claves de lid_map: si quedaron guardadas como "123...@lid",
// las pasa a solo dígitos (evitando duplicados) para que resolverLid matchee.
db.exec(`UPDATE lid_map SET lid = CASE WHEN instr(lid, '@') > 0 THEN substr(lid, 1, instr(lid, '@') - 1) ELSE lid END
  WHERE lid LIKE '%@%' AND (SELECT COUNT(*) FROM lid_map m WHERE m.lid = substr(lid_map.lid, 1, instr(lid_map.lid, '@') - 1)) = 0`);
db.exec(`DELETE FROM lid_map WHERE lid LIKE '%@%'`);

// ---- Conversaciones: normalizar hilos (fusionar LID + teléfono real) ----
const colsConv = db.prepare('PRAGMA table_info(conversaciones)').all().map(c => c.name);
if (!colsConv.includes('hilo_norm')) {
  db.exec('ALTER TABLE conversaciones ADD COLUMN hilo_norm TEXT');
}

function normalizarHilo(h) {
  if (!h) return 'desconocido';
  const solo = String(h).split('@')[0].replace(/\D/g, '');
  return solo || 'desconocido';
}

function miNumero() {
  return (config.numero_dueno || '').replace(/\D/g, '');
}

// Backfill: llenar hilo_norm para filas existentes usando lid_map cuando aplique.
db.exec(`UPDATE conversaciones
  SET hilo_norm = COALESCE((SELECT lm.telefono FROM lid_map lm WHERE lm.lid = replace(conversaciones.hilo, '@lid', '')), replace(conversaciones.hilo, '@lid', ''))
  WHERE hilo_norm IS NULL OR hilo_norm = ''`);

// Reparar fechas inválidas (evita "Invalid Date" en la UI).
db.exec(`UPDATE conversaciones SET fecha = '2000-01-01T00:00:00.000Z' WHERE fecha IS NULL OR fecha = '' OR datetime(fecha) IS NULL`);

// Eliminar los saludos "está ACTIVO" del número propio (ruido acumulado en reinicios).
const miNum = miNumero();
if (miNum) {
  db.prepare(`DELETE FROM conversaciones WHERE hilo_norm = ? AND texto LIKE '%está ACTIVO%'`).run(miNum);
}

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
  const norm = resolverLid(hilo) || normalizarHilo(hilo);
  db.prepare('INSERT INTO conversaciones (tenant_id, hilo, hilo_norm, remitente, rol, texto, fecha) VALUES (?,?,?,?,?,?,?)')
    .run(tenantId, hilo, norm, remitente || '', rol, String(texto), new Date().toISOString());
}

function hilosConversacion() {
  const mi = miNumero();
  const rows = db.prepare(`
    SELECT c.hilo_norm AS hilo_norm,
           COALESCE(cl.nombre, c.remitente, '') AS remitente,
           COUNT(*) AS total,
           MAX(c.fecha) AS ultima
    FROM conversaciones c
    LEFT JOIN clientes cl ON cl.tenant_id = c.tenant_id AND cl.telefono = c.hilo_norm
    WHERE c.tenant_id = ?
    GROUP BY c.hilo_norm
    ORDER BY ultima DESC`).all(tenantId);
  return rows
    .filter(r => r.hilo_norm && r.hilo_norm !== mi)
    .map(r => ({ telefono: resolverLid(r.hilo_norm) || r.hilo_norm, remitente: r.remitente || 'Cliente', total: r.total, ultima: r.ultima }));
}

function leerHiloConversacion(hilo) {
  if (!hilo) return [];
  const norm = normalizarHilo(hilo);
  return db.prepare('SELECT fecha, rol, texto FROM conversaciones WHERE tenant_id=? AND hilo_norm=? ORDER BY id ASC')
    .all(tenantId, norm)
    .map(m => {
      const d = new Date(m.fecha);
      const fecha = (d instanceof Date && !isNaN(d.getTime())) ? d.toLocaleString('es-CO') : (m.fecha || '—');
      return { fecha, fechaISO: m.fecha, rol: m.rol, texto: m.texto };
    });
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
// Usuario: admin@localhost. SIN contraseña por defecto conocida:
// usa ADMIN_PASSWORD del entorno; si no está definida, se genera una
// aleatoria fuerte y se muestra en consola SOLO en la creación inicial.
const ADMIN_EMAIL = 'admin@localhost';
const adminExiste = db.prepare('SELECT id FROM users WHERE tenant_id=? AND email=?').get(tenantId, ADMIN_EMAIL);
if (!adminExiste) {
  const ADMIN_PASS = process.env.ADMIN_PASSWORD || require('crypto').randomBytes(12).toString('hex');
  let hash;
  try {
    hash = require('bcryptjs').hashSync(ADMIN_PASS, 12);
  } catch (e) {
    // bcryptjs es dependencia obligatoria - fallar si no está disponible
    console.error('[DB] ERROR CRÍTICO: bcryptjs no disponible. Instalar dependencias con npm install.');
    console.error('[DB] Detalle:', e.message);
    process.exit(1);
  }
  db.prepare('INSERT INTO users (tenant_id, email, password_hash, nombre, role, activo) VALUES (?,?,?,?,?,1)')
    .run(tenantId, ADMIN_EMAIL, hash, 'Administrador', 'admin');
  if (process.env.ADMIN_PASSWORD) {
    console.log('[DB] Admin inicial creado con contraseña de ADMIN_PASSWORD.');
  } else {
    console.log('[DB] Admin inicial creado. Contraseña generada (guárdala ahora): ' + ADMIN_PASS);
  }
}

// ---- Seed permisos + roles RBAC (fiel a src/db/init.ts, idempotente) ----
// Sin esto, los usuarios no-admin registrados no tendrian permisos en el panel.
function seedPermissionsRoles() {
  const PERMISOS = [
    ['orders:read', 'Ver pedidos'], ['orders:create', 'Crear pedidos'],
    ['orders:update', 'Actualizar pedidos'], ['orders:delete', 'Eliminar/Cancelar pedidos'],
    ['orders:confirm', 'Confirmar pedidos'], ['orders:status', 'Cambiar estado de pedidos'],
    ['kitchen:read', 'Ver cocina/KDS'], ['kitchen:update', 'Actualizar estados en cocina'],
    ['customers:read', 'Ver clientes'], ['customers:create', 'Crear clientes'],
    ['customers:update', 'Actualizar clientes'], ['customers:delete', 'Eliminar clientes'],
    ['conversations:read', 'Ver conversaciones'], ['conversations:reply', 'Responder conversaciones'],
    ['config:read', 'Ver configuracion'], ['config:write', 'Modificar configuracion'],
    ['config:secrets', 'Gestionar secrets'],
    ['reports:read', 'Ver reportes'], ['reports:export', 'Exportar reportes'],
    ['inventory:read', 'Ver inventario'], ['inventory:write', 'Gestionar inventario'],
    ['inventory:adjust', 'Ajustes de inventario'], ['inventory:transfers', 'Traslados entre bodegas'],
    ['purchases:read', 'Ver ordenes de compra'], ['purchases:create', 'Crear ordenes de compra'],
    ['purchases:approve', 'Aprobar ordenes de compra'], ['purchases:receive', 'Recibir mercancia'],
    ['accounting:read', 'Ver contabilidad'], ['accounting:write', 'Contabilizar asientos'],
    ['accounting:reconcile', 'Conciliar bancos'], ['accounting:close', 'Cierre contable'],
    ['payroll:read', 'Ver nomina'], ['payroll:write', 'Procesar nomina'], ['payroll:approve', 'Aprobar nomina'],
    ['users:read', 'Ver usuarios'], ['users:create', 'Crear usuarios'],
    ['users:update', 'Actualizar usuarios'], ['users:delete', 'Eliminar usuarios'],
    ['users:roles', 'Gestionar roles/permisos'],
  ];
  const ROLE_PERMISOS = {
    operador: [
      'orders:read', 'orders:create', 'orders:update', 'orders:confirm', 'orders:status',
      'kitchen:read', 'kitchen:update',
      'customers:read', 'customers:create', 'customers:update',
      'conversations:read', 'conversations:reply',
      'config:read', 'reports:read',
      'inventory:read', 'inventory:write',
      'purchases:read', 'purchases:create', 'purchases:receive',
      'accounting:read',
    ],
    cocina: ['orders:read', 'orders:status', 'kitchen:read', 'kitchen:update'],
    solo_lectura: [
      'orders:read', 'customers:read', 'conversations:read', 'config:read',
      'reports:read', 'inventory:read', 'purchases:read', 'accounting:read',
    ],
  };
  try {
    const insPerm = db.prepare('INSERT OR IGNORE INTO permissions (code, nombre) VALUES (?, ?)');
    const idPerm = db.prepare('SELECT id FROM permissions WHERE code = ?');
    const insRp = db.prepare('INSERT OR IGNORE INTO role_permissions (role, permission_id) VALUES (?, ?)');
    for (const [code, nombre] of PERMISOS) insPerm.run(code, nombre);
    for (const [role, codes] of Object.entries(ROLE_PERMISOS)) {
      for (const code of codes) {
        const r = idPerm.get(code);
        if (r) insRp.run(role, r.id);
      }
    }
  } catch (e) {
    console.error('[DB] Error sembrando permisos:', e.message);
  }
}
seedPermissionsRoles();

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

// Limpieza automática de sesiones expiradas (JWT legacy + Cloud API)
function limpiarSesionesExpiradas() {
  try {
    const ahora = new Date().toISOString();
    // Limpiar sesiones legacy (cookie panel_token)
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(ahora);
    // Limpiar sesiones JWT (tabla sessions en PostgreSQL/SQLite)
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(ahora);
    console.log('[SESSIONS] Limpieza de sesiones expiradas completada');
  } catch (e) {
    console.error('[SESSIONS] Error en limpieza:', e.message);
  }
}

// Iniciar cron de limpieza de sesiones (cada hora)
function iniciarLimpiezaSesiones(intervaloMs = 60 * 60 * 1000) {
  limpiarSesionesExpiradas(); // Ejecución inmediata al arranque
  return setInterval(limpiarSesionesExpiradas, intervaloMs);
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
  limpiarSesionesExpiradas,
  iniciarLimpiezaSesiones,
  ping
};

