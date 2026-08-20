const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const central = require('./core/central');

const PANEL_CFG = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'panel-central.json'), 'utf8'));
  } catch { return {}; }
})();
const PUERTO = Number(process.env.CENTRAL_PORT || PANEL_CFG.puerto || 4000);
const PANEL_HTML = path.join(__dirname, 'panel-central.html');
const SESIONES = new Set();

const PANEL_PASSWORD = PANEL_CFG.password || '';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function paginaLogin(error) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Panel Central — Acceso</title>
<style>body{font-family:Arial,Segoe UI,sans-serif;background:#0d3b35;color:#fff;display:flex;height:100vh;align-items:center;justify-content:center}
form{background:#fff;color:#333;padding:2rem 2.5rem;border-radius:10px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,.3)}
h2{margin-top:0;color:#0d3b35}input{padding:.6rem;width:220px;margin:.6rem 0;border:1px solid #ccc;border-radius:6px;font-size:1rem}
button{background:#25D366;color:#fff;border:none;padding:.6rem 1.4rem;border-radius:6px;cursor:pointer;font-weight:700;font-size:1rem}
.msg{color:#c00;margin-top:.4rem;font-size:.9rem}</style></head>
<body><form method="post" action="/login"><h2>Panel Central</h2>
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
  const id = u.searchParams.get('negocio') || '';

  if (url === '/api/tenants') {
    const tenants = tenantsConDatos();
    const estados = await central.estadoTodos(tenants);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(tenants.map(t => ({ ...t, estado: estados[t.id] || { online: false } }))));
    return;
  }

  if (url === '/api/pedidos') {
    const tenants = central.listarTenants();
    const targets = id ? tenants.filter(t => t.id === id) : tenants;
    const todos = [];
    for (const t of targets) {
      todos.push(...central.leerPedidosTenant(t, 50).map(p => ({ ...p, negocio: t.negocio, negocioId: t.id })));
    }
    todos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(todos.slice(0, 200)));
    return;
  }

  if (url === '/api/clientes') {
    const t = central.listarTenants().find(x => x.id === id);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(t ? central.clientesTenant(t) : []));
    return;
  }

  if (url === '/api/conversaciones') {
    const t = central.listarTenants().find(x => x.id === id);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(t ? central.conversacionesTenant(t) : []));
    return;
  }

  if (url === '/api/conversacion') {
    const hilo = u.searchParams.get('tel') || '';
    const t = central.listarTenants().find(x => x.id === id);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(t ? central.leerHiloTenant(t, hilo) : []));
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
  console.log(`[OK] Panel Central multi-cliente: http://localhost:${PUERTO}`);
}).on('error', (e) => {
  console.log('[!] Error del panel central:', e.message);
});