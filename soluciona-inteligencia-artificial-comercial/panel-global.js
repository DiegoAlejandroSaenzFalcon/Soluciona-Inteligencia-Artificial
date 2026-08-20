const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const central = require('./core/central');

const PANEL_CFG = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'panel-global.json'), 'utf8'));
  } catch { return {}; }
})();

const PUERTO = Number(process.env.GLOBAL_PORT || PANEL_CFG.puerto || 5000);
const PANEL_HTML = path.join(__dirname, 'panel-global.html');
const SESIONES = new Set();

const PANEL_PASSWORD = PANEL_CFG.password || '';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": "'" }[c]));
}

function paginaLogin(error) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Panel Global — Acceso</title>
<style>body{font-family:Arial,Segoe UI,sans-serif;background:#1a2a4a;color:#fff;display:flex;height:100vh;align-items:center;justify-content:center}
form{background:#fff;color:#333;padding:2rem 2.5rem;border-radius:10px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,.3)}
h2{margin-top:0;color:#1a2a4a}input{padding:.6rem;width:220px;margin:.6rem 0;border:1px solid #ccc;border-radius:6px;font-size:1rem}
button{background:#25D366;color:#fff;border:none;padding:.6rem 1.4rem;border-radius:6px;cursor:pointer;font-weight:700;font-size:1rem}
.msg{color:#c00;margin-top:.4rem;font-size:.9rem}</style></head>
<body><form method="post" action="/login"><h2>Panel Global</h2>
<input name="password" type="password" placeholder="Contraseña" autofocus><br>
<button type="submit">Entrar</button>${error ? `<div class="msg">${esc(error)}</div>` : ''}</form></body></html>`;
}

function tokenValido(req) {
  const c = req.headers.cookie || '';
  const m = c.match(/(?:^|;\s*)panel_token=([^;]+)/);
  return m && SESIONES.has(m[1]);
}

function tenantsConDatos() {
  const tenants = central.listarTenants();
  return tenants.map(t => ({ ...t, resumen: central.resumenTenant(t) }));
}

async function delegarPOST(tenant, endpoint, data) {
  const p = tenant.puerto || 3000;
  try {
    const resp = await fetch(`http://localhost:${p}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await resp.json();
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];

  if (PANEL_PASSWORD) {
    if (url === '/login' && req.method === 'POST') {
      let body = '';
      req.on('data', c => { body += c; });
      req.on('end', () => {
        const params = new URLSearchParams(body);
        if (params.get('password') === PANEL_PASSWORD) {
          const t = crypto.randomBytes(16).toString('hex');
          SESIONES.add(t);
          res.writeHead(302, { 'Set-Cookie': `panel_token=${t}; HttpOnly; Path=/; SameSite=Lax`, 'Location': '/' });
          res.end();
        } else {
          res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(paginaLogin('Contraseña incorrecta'));
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

  const u = new URL(req.url, 'http://localhost');
  const negocioId = u.searchParams.get('negocio') || '';

  if (url === '/api/tenants') {
    const tenants = tenantsConDatos();
    const estados = await central.estadoTodos(tenants);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(tenants.map(t => ({ ...t, estado: estados[t.id] || { online: false } }))));
    return;
  }

  if (url === '/api/pedidos') {
    const tenants = central.listarTenants();
    const targets = negocioId ? tenants.filter(t => t.id === negocioId) : tenants;
    const todos = [];
    for (const t of targets) {
      todos.push(...central.leerPedidosTenant(t, 100).map(p => ({ ...p, negocio: t.negocio, negocioId: t.id })));
    }
    todos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(todos.slice(0, 500)));
    return;
  }

  if (url === '/api/citas') {
    const t = central.listarTenants().find(x => x.id === negocioId);
    if (!t) { res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify([])); return; }
    const dbPath = path.join(t.dataDir, 'neurallgo.db');
    if (!fs.existsSync(dbPath)) { res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify([])); return; }
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(dbPath, { readOnly: true });
    try {
      const rows = db.prepare('SELECT * FROM citas ORDER BY fecha, hora ASC').all();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(rows.map(r => ({ ...r, negocio: t.negocio, negocioId: t.id }))));
    } finally {
      db.close();
    }
    return;
  }

  if (url === '/api/clientes') {
    const t = central.listarTenants().find(x => x.id === negocioId);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(t ? central.clientesTenant(t) : []));
    return;
  }

  if (url === '/api/conversaciones') {
    const t = central.listarTenants().find(x => x.id === negocioId);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(t ? central.conversacionesTenant(t) : []));
    return;
  }

  if (url === '/api/conversacion') {
    const hilo = u.searchParams.get('tel') || '';
    const t = central.listarTenants().find(x => x.id === negocioId);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(t ? central.leerHiloTenant(t, hilo) : []));
    return;
  }

  if (url === '/api/comparativa') {
    const tenants = central.listarTenants();
    const datos = [];
    for (const t of tenants) {
      const r = central.resumenTenant(t);
      const pedidos = central.leerPedidosTenant(t, 200);
      const domicilio = pedidos.filter(p => p.tipo === 'domicilio');
      const recoger = pedidos.filter(p => p.tipo === 'recoger');
      const distancias = domicilio.filter(p => p.distancia_km != null).map(p => p.distancia_km);
      const costos = domicilio.filter(p => p.costo_domicilio != null).map(p => p.costo_domicilio);
      const promedioDist = distancias.length ? distancias.reduce((a,b)=>a+b,0)/distancias.length : 0;
      const promedioCost = costos.length ? costos.reduce((a,b)=>a+b,0)/costos.length : 0;
      datos.push({
        id: t.id,
        negocio: t.negocio,
        segmento: t.segmento || 'comidas',
        ...r,
        domicilio: domicilio.length,
        recoger: recoger.length,
        promedioDistanciaKm: Number(promedioDist.toFixed(2)),
        promedioCostoDomicilio: Number(promedioCost.toFixed(0))
      });
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(datos));
    return;
  }

  if (url === '/api/domicilios') {
    const tenants = central.listarTenants();
    const targets = negocioId ? tenants.filter(t => t.id === negocioId) : tenants;
    const configs = [];
    for (const t of targets) {
      const cfgPath = path.join(__dirname, t.archivo);
      if (!fs.existsSync(cfgPath)) continue;
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      configs.push({
        id: t.id,
        negocio: t.negocio,
        segmento: cfg.segmento || 'comidas',
        domicilios: cfg.domicilios || {},
        ubicacion_negocio: cfg.ubicacion_negocio || {}
      });
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(configs));
    return;
  }

  if (url === '/api/delegar' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const { negocioId: targetId, endpoint, payload } = data;
        if (!targetId || !endpoint) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, error: 'negocioId y endpoint requeridos' }));
          return;
        }
        const t = central.listarTenants().find(x => x.id === targetId);
        if (!t) {
          res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, error: 'Negocio no encontrado' }));
          return;
        }
        const result = await delegarPOST(t, endpoint, payload);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  if (url === '/') {
    let html = fs.readFileSync(PANEL_HTML, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404');
});

server.listen(PUERTO, () => {
  console.log(`[OK] Panel Global multi-negocio: http://localhost:${PUERTO}`);
}).on('error', (e) => {
  console.log('[!] Error del panel global:', e.message);
});