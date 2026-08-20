const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const BASE = path.join(__dirname, '..');
const CLIENTES_DIR = path.join(BASE, 'clientes');

function listarTenants() {
  const tenants = [];
  const porId = {};
  const push = (t) => {
    if (porId[t.id]) return;
    porId[t.id] = t;
    tenants.push(t);
  };
  const cfgDef = path.join(BASE, 'config.json');
  if (fs.existsSync(cfgDef)) {
    try {
      const c = JSON.parse(fs.readFileSync(cfgDef, 'utf8'));
      if (c.negocio) {
        push({
          id: 'default',
          negocio: c.negocio,
          puerto: c.puerto,
          archivo: 'config.json',
          dataDir: path.join(BASE, 'data'),
          authDir: path.join(BASE, 'auth_info')
        });
      }
    } catch (e) {
      console.error('[CENTRAL] config.json ilegible:', e.message);
    }
  }
  if (fs.existsSync(CLIENTES_DIR)) {
    const archivos = fs.readdirSync(CLIENTES_DIR).filter(f => f.endsWith('.json'))
      .sort((a, b) => (a === 'EJEMPLO.json' ? 1 : 0) - (b === 'EJEMPLO.json' ? 1 : 0));
    for (const f of archivos) {
      try {
        const c = JSON.parse(fs.readFileSync(path.join(CLIENTES_DIR, f), 'utf8'));
        if (!c.negocio) continue;
        const id = c.id || path.basename(f, '.json');
        push({
          id,
          negocio: c.negocio,
          puerto: c.puerto,
          archivo: path.join('clientes', f),
          dataDir: path.join(BASE, 'data', id),
          authDir: c.auth_dir ? path.resolve(BASE, c.auth_dir) : path.join(BASE, 'auth_info_' + id)
        });
      } catch (e) {
        console.error(`[CENTRAL] ${f} ilegible:`, e.message);
      }
    }
  }
  return tenants;
}

function abrirDb(tenant) {
  const p = path.join(tenant.dataDir, 'neurallgo.db');
  if (!fs.existsSync(p)) return null;
  try {
    return new DatabaseSync(p, { readOnly: true });
  } catch (e) {
    console.error(`[CENTRAL] No pude abrir DB de ${tenant.id}:`, e.message);
    return null;
  }
}

function leerPedidosTenant(tenant, limite) {
  const db = abrirDb(tenant);
  if (!db) return [];
  try {
    const rows = db.prepare('SELECT * FROM pedidos ORDER BY fecha DESC LIMIT ?').all(limite || 100);
    return rows.map(r => ({
      id: r.id,
      fecha: r.fecha,
      dia: r.dia,
      remitente: r.remitente,
      telefono: r.telefono,
      items: JSON.parse(r.items || '[]'),
      total: r.total,
      direccion: r.direccion,
      lat: r.lat,
      lng: r.lng,
      estado: r.estado,
      tipo: r.tipo,
      estado_pago: r.estado_pago
    }));
  } finally {
    db.close();
  }
}

function resumenTenant(tenant) {
  const db = abrirDb(tenant);
  if (!db) return { pedidosHoy: 0, ventasHoy: 0, totalHistorico: 0, totalPedidos: 0 };
  try {
    const hoy = new Date().toISOString().slice(0, 10);
    const hoyRow = db.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(total),0) AS s FROM pedidos WHERE dia=?").get(hoy);
    const totRow = db.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(total),0) AS s FROM pedidos').get();
    return {
      pedidosHoy: hoyRow.n,
      ventasHoy: hoyRow.s,
      totalHistorico: totRow.s,
      totalPedidos: totRow.n
    };
  } finally {
    db.close();
  }
}

async function estadoTenant(tenant) {
  const p = tenant.puerto || 3000;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 2500);
  try {
    const resp = await fetch(`http://localhost:${p}/api/estado`, { signal: controller.signal });
    if (!resp.ok) return { online: false, conectado: false };
    const data = await resp.json();
    return { online: true, conectado: !!data.conectado, ultimoCambio: data.ultimoCambio || null };
  } catch {
    return { online: false, conectado: false };
  } finally {
    clearTimeout(t);
  }
}

async function estadoTodos(tenants) {
  const r = {};
  await Promise.all(tenants.map(async t => {
    r[t.id] = await estadoTenant(t);
  }));
  return r;
}

function clientesTenant(tenant) {
  const db = abrirDb(tenant);
  if (!db) return [];
  try {
    return db.prepare('SELECT telefono, nombre, total_pedidos, ultima_compra FROM clientes ORDER BY ultima_compra DESC LIMIT 200').all();
  } finally {
    db.close();
  }
}

function conversacionesTenant(tenant) {
  const db = abrirDb(tenant);
  if (!db) return [];
  try {
    const rows = db.prepare(`SELECT hilo AS telefono, MAX(remitente) AS remitente, COUNT(*) AS total, MAX(fecha) AS ultima
      FROM conversaciones GROUP BY hilo ORDER BY ultima DESC LIMIT 100`).all();
    return rows;
  } finally {
    db.close();
  }
}

function leerHiloTenant(tenant, hilo) {
  const db = abrirDb(tenant);
  if (!db) return [];
  try {
    return db.prepare('SELECT fecha, rol, texto FROM conversaciones WHERE hilo=? ORDER BY id ASC').all(hilo)
      .map(m => ({ fecha: new Date(m.fecha).toLocaleString('es-CO'), rol: m.rol, texto: m.texto }));
  } finally {
    db.close();
  }
}

module.exports = {
  listarTenants, leerPedidosTenant, resumenTenant, estadoTenant, estadoTodos,
  clientesTenant, conversacionesTenant, leerHiloTenant
};