'use strict';
// ============================================================
// Panel Empresarial — núcleo: sesión, API, login, navegación, WS
// ============================================================
let sesion = JSON.parse(localStorage.getItem('panel.sesion') || 'null');
let permisos = [];
let socket = null;
let refreshTimer = null;
let trialMode = false;
let licenseData = null;
let messageConfig = null;

// ============================================================
// Sistema de Licencias y Control de Mensaje
// ============================================================
function initSystem() {
  try {
    const licenseStorage = JSON.parse(localStorage.getItem('license_data') || 'null');
    const trialStorage = JSON.parse(localStorage.getItem('trial_license') || 'null');
    
    const trialStart = trialStorage?.trial_start || new Date().toISOString();
    const trialActive = !trialStorage && (!trialStorage || Date.now() < new Date(trialStorage.trial_start).getTime() + 10 * 24 * 60 * 60 * 1000);
    
    if (!trialStorage) {
      localStorage.setItem('trial_license', JSON.stringify({
        trial_start: trialStart,
        trial_days: 10,
        features: { whatsapp: true, orders: true, inventory: true, accounting: true, full_panel: true }
      }));
    }
    
    trialMode = trialStorage && Date.now() < new Date(trialStorage.trial_start).getTime() + 10 * 24 * 60 * 60 * 1000;
    
    messageConfig = {
      allowOutOfScope: true,
      personalMode: 'respond',
      saleMode: true,
      customerServiceMode: true,
      outOfScopeResponse: 'Lo siento, solo puedo ayudarte con pedidos y ventas.'
    };
    
    licenseData = {
      isValid: true,
      isTrial: trialMode,
      hasWhatsApp: true,
      hasOrders: true,
      hasInventory: trialMode,
      hasAccounting: trialMode,
      fullPanel: trialMode
    };
    
  } catch (e) {
    console.error('Error inicializando sistema:', e);
    trialMode = true;
  }
}

initSystem();

// ============================================================
// Clasificador de Mensajes
// ============================================================
const PERSONAL_KEYWORDS = ['hola', 'gracias', 'familiar', 'familia', 'amigo', 'qué haces', 'hola amigo', 'hola hijo', 'hola hija'];
const PEDIDO_KEYWORDS = ['pedido', 'orden', 'comprar', 'quiero', 'necesito', 'cuanto', 'precio', 'cantidad', 'total', 'factura', 'mesa', 'plato', 'comida', 'bebida'];

function detectMessageType(message) {
  if (!message) return 'unknown';
  const msg = message.toLowerCase();
  
  const pedidoMatches = PEDIDO_KEYWORDS.filter(k => msg.includes(k)).length;
  const personalMatches = PERSONAL_KEYWORDS.filter(k => msg.includes(k)).length;
  
  if (pedidoMatches > 0 && pedidoMatches >= personalMatches) return 'pedido';
  if (personalMatches > 0) return 'personal';
  
  if (msg.includes('hola') || msg.includes('gracias')) return 'personal';
  
  return 'unknown';
}

function shouldRespond(message) {
  if (!messageConfig) return true;
  if (!messageConfig.allowOutOfScope) return false;
  
  const type = detectMessageType(message);
  if (type === 'pedido') return true;
  
  return messageConfig.personalMode === 'respond';
}

function getResponse(message) {
  const type = detectMessageType(message);
  if (type === 'pedido') return { type: 'pedido', response: 'Procesando tu pedido...', confidence: 0.9 };
  if (type === 'personal' && messageConfig.allowOutOfScope) {
    return { type: 'personal', response: messageConfig.outOfScopeResponse, confidence: 0.8 };
  }
  return { type: 'unknown', response: null, confidence: 0.3 };
}

const NAV = [
  { id: 'inicio', icon: '📊', label: 'Inicio', sub: 'Resumen financiero y actividad en vivo' },
  { id: 'config', icon: '⚙️', label: 'Configuración', sub: 'Config v2: editar, versiones, rollback, auditoría' },
  { id: 'inventario', icon: '📦', label: 'Inventario', sub: 'Productos, stock, proveedores y órdenes de compra' },
  { id: 'contabilidad', icon: '🧾', label: 'Contabilidad', sub: 'CxC/CxP, facturas, pagos, aging y asientos' },
  { id: 'seguridad', icon: '🔐', label: 'Seguridad', sub: 'Autenticación 2FA y sesión' },
];

function escH(v) {
  return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function moneda(v) { return '$' + Number(v || 0).toLocaleString('es-CO'); }
function fmtDate(d) { if (!d) return '—'; const x = new Date(d); return x.toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }); }
function badge(txt, cls) { return `<span class="badge ${cls || 'b-ac'}">${escH(txt)}</span>`; }
function toast(msg, tipo) {
  const el = document.createElement('div');
  el.className = tipo || '';
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

// ============================================================
// API con refresh automático
// ============================================================
async function api(method, path, body, intentos) {
  const h = { 'Content-Type': 'application/json' };
  if (sesion) h['Authorization'] = 'Bearer ' + sesion.accessToken;
  let res;
  try {
    res = await fetch(path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch (e) {
    throw Object.assign(new Error('error_red'), { status: 0 });
  }
  let data = null;
  try { data = await res.json(); } catch {}
  if (res.status === 401 && sesion && !intentos) {
    const ok = await refrescar();
    if (ok) return api(method, path, body, 1);
    cerrarSesion();
    throw Object.assign(new Error('no_autenticado'), { status: 401 });
  }
  return { status: res.status, data };
}
async function refrescar() {
  if (!sesion || !sesion.refreshToken) return false;
  const r = await fetch('/api/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: sesion.refreshToken }) });
  if (r.status !== 200) return false;
  const d = await r.json();
  sesion = { ...sesion, ...d };
  localStorage.setItem('panel.sesion', JSON.stringify(sesion));
  programarRefresh();
  return true;
}
function programarRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  const expira = sesion && sesion.expiresIn ? (Number(sesion.expiresIn) - 30) * 1000 : 5 * 60 * 1000;
  refreshTimer = setTimeout(() => refrescar(), Math.max(10000, expira));
}
function tiene(perm) { return permisos.includes('*') || permisos.includes(perm); }

// ============================================================
// LOGIN / 2FA / LOGOUT
// ============================================================
async function hacerLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('lgBtn');
  btn.disabled = true; btn.textContent = 'Verificando…';
  document.getElementById('lgErr').textContent = '';
  const email = document.getElementById('lgEmail').value.trim();
  const password = document.getElementById('lgPass').value;
  const code = document.getElementById('lgCode').value.trim();
  const twoFactorToken = window._twoFactorToken;
  try {
    if (twoFactorToken) {
      const r = await fetch('/api/auth/verify-2fa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ twoFactorToken, code }) });
      const d = await r.json();
      if (r.status !== 200) throw new Error(d.error || 'Código inválido');
      entrar(d);
    } else {
      const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const d = await r.json();
      if (r.status !== 200) throw new Error(d.error || 'Credenciales inválidas');
      if (d.requiresTwoFactor) {
        window._twoFactorToken = d.twoFactorToken;
        document.getElementById('lg2fa').classList.remove('hidden');
        document.getElementById('lgPass').disabled = true;
        document.getElementById('lgErr').textContent = 'Ingresa el código de tu app de autenticación.';
        document.getElementById('lgCode').focus();
      } else {
        entrar(d);
      }
    }
  } catch (err) {
    document.getElementById('lgErr').textContent = err.message;
  }
  btn.disabled = false; btn.textContent = 'Ingresar';
}
function entrar(d) {
  window._twoFactorToken = null;
  sesion = { accessToken: d.accessToken, refreshToken: d.refreshToken, expiresIn: d.expiresIn, user: d.user };
  localStorage.setItem('panel.sesion', JSON.stringify(sesion));
  programarRefresh();
  iniciarApp();
}
function cerrarSesion() {
  if (sesion && sesion.refreshToken) fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: sesion.refreshToken }) }).catch(() => {});
  sesion = null;
  localStorage.removeItem('panel.sesion');
  if (socket) { socket.disconnect(); socket = null; }
  if (refreshTimer) clearTimeout(refreshTimer);
  document.getElementById('appView').classList.add('hidden');
  document.getElementById('loginView').classList.remove('hidden');
  document.getElementById('lgEmail').value = ''; document.getElementById('lgPass').value = ''; document.getElementById('lgCode').value = '';
  document.getElementById('lg2fa').classList.add('hidden');
  document.getElementById('lgPass').disabled = false;
  document.getElementById('lgErr').textContent = '';
}

// ============================================================
// APP: shell y navegación
// ============================================================
async function iniciarApp() {
  try {
    // Verificar licencia de prueba (10 días)
    const trialData = JSON.parse(localStorage.getItem('trial_license') || 'null');
    const trialActive = trialData && Date.now() < new Date(trialData.trial_start).getTime() + 10 * 24 * 60 * 60 * 1000;
    
    if (trialActive) {
      // Trial mode: mostrar panel completo
      trialMode = true;
      // No ocultar loginView aún - ya lo hará iniciarApp
    } else {
      // Trial expirado: modo reduced (solo pedidos + ventas)
      trialMode = false;
    }
    
    const r = await api('GET', '/api/auth/me');
    if (r.status !== 200) throw new Error(r.data && r.data.error);
    permisos = r.data.permissions || [];
    sesion.user = r.data.user;
    localStorage.setItem('panel.sesion', JSON.stringify(sesion));
  } catch (e) {
    cerrarSesion(); return;
  }
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('appView').classList.remove('hidden');
  renderNav();
  conectarSocket();
  ver('inicio');
}
function renderNav() {
  const showTrialFeatures = trialMode;
  const trialText = trialMode ? ' (prueba)' : '';
  document.getElementById('sideTenant').textContent = sesion.user.tenantId || 'default';
  document.getElementById('usNome').textContent = sesion.user.nombre || sesion.user.email;
  document.getElementById('usRole').textContent = sesion.user.role || '';
  document.getElementById('sidebar').style.display = 'block';
  document.getElementById('nav-inicio').style.display = 'block';
  document.getElementById('nav-config').style.display = trialMode ? 'block' : 'none';
  document.getElementById('nav-inventario').style.display = trialMode ? 'block' : 'none';
  document.getElementById('nav-contabilidad').style.display = trialMode ? 'block' : 'none';
  document.getElementById('nav-seguridad').style.display = 'block';
  document.getElementById('usNombre').textContent = sesion.user.nombre || sesion.user.email;
  document.getElementById('usRole').textContent = sesion.user.role || '';
}
function ver(id) {
  NAV.forEach(n => { const b = document.getElementById('nav-' + n.id); if (b) b.classList.toggle('active', n.id === id); });
  const nav = NAV.find(n => n.id === id);
  document.getElementById('viewTitle').textContent = nav ? nav.icon + ' ' + nav.label : id;
  document.getElementById('viewSub').textContent = nav ? nav.sub : '';
  const cont = document.getElementById('viewContent');
  cont.innerHTML = '<div class="empty">Cargando…</div>';
  if (id === 'inicio') {
    if (trialMode) cargarInicio();
    else cargarResumenReducido();
  }
  if (id === 'config') trialMode ? cargarConfig() : null;
  if (id === 'inventario') trialMode ? cargarInventario() : null;
  if (id === 'contabilidad') trialMode ? cargarContabilidad() : null;
  if (id === 'seguridad') trialMode ? renderSeguridad() : null;
  window.scrollTo({ top: 0 });
}

// ============================================================
// WEBSOCKETS
// ============================================================
function conectarSocket() {
  if (!sesion) return;
  if (socket) socket.disconnect();
  socket = io('/', { path: '/socket.io', transports: ['websocket', 'polling'], auth: { token: sesion.accessToken } });
  socket.on('connect', () => toast('🔌 En tiempo real conectado', 'ok'));
  socket.on('connect_error', () => toast('⚠️ Sin conexión en tiempo real', 'warn'));
  socket.on('pedido:nuevo', d => { toast('📦 Nuevo pedido #' + (d && d.id), 'ok'); if (vistaActiva('inicio')) cargarInicio(); });
  socket.on('pedido:estado', d => { toast('📦 Pedido #' + (d && d.id) + ' → ' + (d && d.estado)); if (vistaActiva('inicio')) cargarInicio(); });
  socket.on('cita:estado', d => toast('📅 Cita #' + (d && d.id) + ' → ' + (d && d.estado)));
  socket.on('stock:cambio', () => { toast('📦 Inventario actualizado'); if (vistaActiva('inventario')) cargarInventario(); });
  socket.on('compras:cambio', () => { toast('🧾 Órdenes de compra actualizadas'); if (vistaActiva('inventario')) cargarInventario(); });
  socket.on('venta:nueva', () => { toast('🧾 Nueva venta registrada', 'ok'); if (vistaActiva('inicio') || vistaActiva('contabilidad')) { cargarInicio(); } });
  socket.on('pago:nuevo', () => { toast('💵 Nuevo pago registrado'); if (vistaActiva('contabilidad')) cargarContabilidad(); });
  socket.on('config:cambio', () => toast('⚙️ Configuración modificada'));
}
function vistaActiva(id) {
  const b = document.getElementById('nav-' + id);
  return b && b.classList.contains('active');
}

// ============================================================
// DETECCIÓN DE MENSAJES
// ============================================================
function esPedido(mensaje) {
  const msg = (mensaje || '').toLowerCase();
  const palabrasPedido = ['pedido', 'orden', 'comprar', 'comprar', 'quiero', 'necesito', 'cuanto', 'cuanto cuesta', 'precio', 'cantidad', 'total', 'factura', 'mesa', 'plato', 'comida', 'bebida'];
  return palabrasPedido.some(palabra => msg.includes(palabra));
}

function esPersonal(mensaje) {
  const msg = (mensaje || '').toLowerCase();
  const palabrasPersonal = ['hola', 'hola ', 'cómo estás', 'como estás', 'familiar', 'familia', 'amigo', 'qué haces', 'hola amigo', 'hola hijo', 'hola hija'];
  return palabrasPersonal.some(palabra => msg.includes(palabra));
}

// ============================================================
// WEBSOCKETS
// ============================================================
// INICIO
// ============================================================
async function cargarInicio() {
  const cont = document.getElementById('viewContent');
  let html = '<div class="empty">Cargando…</div>';
  cont.innerHTML = html;
  try {
    const [con, cxc, cxp, bajo, fact] = await Promise.all([
      api('GET', '/api/accounting/conciliacion'),
      api('GET', '/api/accounting/aging/cxc'),
      api('GET', '/api/accounting/aging/cxp'),
      api('GET', '/api/inventory/stock/bajo'),
      api('GET', '/api/accounting/invoices?estado=emitida'),
    ]);
    const C = con.data.resumen || {};
    const B = cxc.data.aging.buckets || {};
    const P = cxp.data.aging.buckets || {};
    const bajoStock = bajo.data.bajoStock || [];
    const facturas = fact.data.invoices || [];
    html = `
      <div class="grid">
        <div class="stat"><div class="k">Total facturado</div><div class="v ok">${moneda(C.totalFacturado)}</div></div>
        <div class="stat"><div class="k">Cobrado</div><div class="v">${moneda(C.totalCobrado)}</div></div>
        <div class="stat"><div class="k">Saldo CxC</div><div class="v ${B.r91_mas > 0 ? 'warn' : ''}">${moneda(C.saldoCxC)}</div></div>
        <div class="stat"><div class="k">Pagado a proveedores</div><div class="v">${moneda(C.totalPagadoProveedores)}</div></div>
        <div class="stat"><div class="k">Aging CxC vencido 90+</div><div class="v ${B.r91_mas > 0 ? 'err' : ''}">${moneda(B.r91_mas)}</div></div>
        <div class="stat"><div class="k">Aging CxP vencido 90+</div><div class="v">${moneda(P.r91_mas)}</div></div>
        <div class="stat"><div class="k">Productos por debajo del mínimo</div><div class="v ${bajoStock.length ? 'warn' : 'ok'}">${bajoStock.length}</div></div>
        <div class="stat"><div class="k">Facturas emitidas abiertas</div><div class="v">${facturas.length}</div></div>
      </div>`;
    if (bajoStock.length) {
      html += `<div class="card"><h3>⚠️ Stock bajo</h3>
        <table><tr><th>Producto</th><th>Código</th><th>Stock</th><th>Mínimo</th></tr>` +
        bajoStock.map(b => `<tr><td>${escH(b.nombre)}</td><td class="mono">${escH(b.codigo || '—')}</td><td>${b.stock_total}</td><td>${b.stock_minimo}</td></tr>`).join('') +
        `</table></div>`;
    }
    html += `<div class="card"><h3>📶 Actividad en vivo</h3><p class="sub"><span class="live-dot"></span>Los eventos de pedidos, ventas, pagos, citas y stock se muestran aquí en tiempo real.</p>
      <table><tr><th>Factura</th><th>Cliente</th><th>Total</th><th>Saldo</th><th>Estado</th><th>Vence</th></tr>` +
      facturas.slice(0, 10).map(f => `<tr>
        <td class="mono">${escH(f.numero)}</td><td>${escH(f.clienteNombre || '—')}</td>
        <td>${moneda(f.total)}</td><td>${moneda(f.saldoPendiente)}</td>
        <td>${badge(f.estado, 'b-ac')}</td><td>${fmtDate(f.fechaVencimiento)}</td></tr>`).join('') +
      (facturas.length ? '' : '<tr><td colspan="6" class="empty">Sin facturas emitidas abiertas</td></tr>') + `</table></div>`;
  } catch (e) {
    html = '<div class="empty">' + escH(e.message) + '</div>';
  }
  cont.innerHTML = html;
}

// ============================================================
// SEGURIDAD (2FA)
// ============================================================
async function renderSeguridad() {
  const cont = document.getElementById('viewContent');
  const u = sesion.user;
  cont.innerHTML = `
    <div class="card">
      <h3>👤 Mi sesión</h3>
      <table>
        <tr><th>Nombre</th><td>${escH(u.nombre || '—')}</td></tr>
        <tr><th>Correo</th><td>${escH(u.email || '—')}</td></tr>
        <tr><th>Rol</th><td>${badge(u.role || '', 'b-ac')}</td></tr>
        <tr><th>Tenant</th><td>${escH(u.tenantId || 'default')}</td></tr>
        <tr><th>2FA activo</th><td>${u.twoFactorEnabled ? badge('SÍ', 'b-ok') : badge('NO', 'b-err')}</td></tr>
      </table>
    </div>
    <div class="card">
      <h3>🔐 Autenticación en dos pasos (2FA)</h3>
      <p class="sub">Si activas 2FA, además de tu contraseña se pedirá un código de 6 dígitos generado por tu app de autenticación (Google Authenticator, etc.).</p>
      <div id="sec2fa"></div>
    </div>`;
  if (u.twoFactorEnabled) {
    document.getElementById('sec2fa').innerHTML = `
      <div class="frm">
        <label class="full">Código actual para desactivar<input id="secDisableCode" inputmode="numeric" placeholder="000000"></label>
      </div>
      <div class="toolbar" style="margin-top:.8rem"><button class="btn2 danger" onclick="desactivar2fa()">Desactivar 2FA</button></div>`;
  } else {
    document.getElementById('sec2fa').innerHTML = `
      <div class="toolbar"><button class="btn2 primary" onclick="iniciarSetup2fa()">Activar 2FA</button></div>
      <div id="secSetup"></div>`;
  }
}
async function iniciarSetup2fa() {
  try {
    const r = await api('POST', '/api/auth/setup-2fa');
    if (r.status !== 200) throw new Error(r.data && r.data.error);
    const s = r.data;
    document.getElementById('secSetup').innerHTML = `
      <p>1. Escanea este QR con tu app de autenticación, o ingresa la clave manualmente:</p>
      <p class="mono" style="background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:.6rem;word-break:break-all">${escH(s.secret)}</p>
      <p>2. Ingresa el código que muestra tu app para confirmar:</p>
      <div class="frm"><label class="full">Código<input id="secSetupCode" inputmode="numeric" placeholder="000000"></label></div>
      <div class="toolbar"><button class="btn2 primary" onclick="activar2fa('${escH(s.secret)}')">Confirmar y activar</button></div>
      <p class="sub">(Si tu app no lee el QR, la clave manual es suficiente.)</p>`;
  } catch (e) { toast(e.message, 'err'); }
}
async function activar2fa(secret) {
  const code = document.getElementById('secSetupCode').value.trim();
  const r = await api('POST', '/api/auth/enable-2fa', { secret, code });
  if (r.status !== 200) { toast((r.data && r.data.error) || 'Código inválido', 'err'); return; }
  toast('2FA activado', 'ok');
  sesion.user.twoFactorEnabled = true;
  renderSeguridad();
}
async function desactivar2fa() {
  const code = document.getElementById('secDisableCode').value.trim();
  const r = await api('POST', '/api/auth/disable-2fa', { code });
  if (r.status !== 200) { toast((r.data && r.data.error) || 'Código inválido', 'err'); return; }
  toast('2FA desactivado');
  sesion.user.twoFactorEnabled = false;
  renderSeguridad();
}

// ============================================================
// BOOT
// ============================================================
document.getElementById('loginForm').addEventListener('submit', hacerLogin);
if (sesion) {
  iniciarApp().catch(() => cerrarSesion());
} else {
  document.getElementById('loginView').classList.remove('hidden');
}