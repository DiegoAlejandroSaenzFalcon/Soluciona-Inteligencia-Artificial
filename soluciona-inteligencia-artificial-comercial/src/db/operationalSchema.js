'use strict';

// DDL para las tablas operativas del runtime (espejo del esquema SQLite).
// Usado por el worker de core/db-pg.js y por el script de migración.
const OPERATIONAL_DDL = `
CREATE TABLE IF NOT EXISTS pedidos (
  id INTEGER NOT NULL,
  tenant_id TEXT NOT NULL,
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
  distancia_km DOUBLE PRECISION,
  costo_domicilio INTEGER,
  PRIMARY KEY (tenant_id, id)
);
CREATE INDEX IF NOT EXISTS idx_pedidos_tenant ON pedidos(tenant_id);

CREATE TABLE IF NOT EXISTS clientes (
  tenant_id TEXT NOT NULL,
  telefono TEXT NOT NULL,
  nombre TEXT,
  total_pedidos INTEGER DEFAULT 0,
  ultima_compra TEXT,
  creado TEXT,
  PRIMARY KEY (tenant_id, telefono)
);
CREATE INDEX IF NOT EXISTS idx_clientes_tenant ON clientes(tenant_id);

CREATE TABLE IF NOT EXISTS conversaciones (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT,
  hilo TEXT,
  remitente TEXT,
  rol TEXT,
  texto TEXT,
  fecha TEXT
);
CREATE INDEX IF NOT EXISTS idx_conv_tenant ON conversaciones(tenant_id, hilo);

CREATE TABLE IF NOT EXISTS lid_map (
  lid TEXT PRIMARY KEY,
  telefono TEXT,
  actualizado TEXT
);

CREATE TABLE IF NOT EXISTS uso_ia (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT,
  rol TEXT,
  modelo TEXT,
  proveedor TEXT,
  tokens_prompt INTEGER DEFAULT 0,
  tokens_completados INTEGER DEFAULT 0,
  fecha TEXT
);

CREATE TABLE IF NOT EXISTS citas (
  id INTEGER NOT NULL,
  tenant_id TEXT NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_citas_tenant ON citas(tenant_id);
`;

module.exports = { OPERATIONAL_DDL };