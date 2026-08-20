'use strict';
// ============================================================
// Panel Empresarial — Contabilidad (CxC/CxP)
// ============================================================
const CONT_TABS = [
  { id: 'clientes', label: '👥 Clientes' },
  { id: 'facturas', label: '🧾 Facturas' },
  { id: 'pagos', label: '💵 Pagos' },
  { id: 'aging', label: '⏳ Aging' },
  { id: 'asientos', label: '📒 Asientos' },
  { id: 'conciliacion', label: '🔄 Conciliación' },
];
const METODOS = ['efectivo', 'tarjeta', 'transferencia', 'nequi', 'daviplata', 'pse', 'credito'];
const EST_FACT = { borrador: 'b-warn', emitida: 'b-ac', anulada: 'b-err', rechazada_dian: 'b-err' };

async function cargarContabilidad() {
  const cont = document.getElementById('viewContent');
  cont.innerHTML = `
    <div class="sec-tabs">${CONT_TABS.map(t => `<button id="ctTab-${t.id}" onclick="ctTab('${t.id}')">${t.label}</button>`).join('')}</div>
    <div id="ctBody"><div class="empty">Cargando…</div></div>`;
  ctTab('facturas');
}
function ctTab(id) {
  CONT_TABS.forEach(t => { const b = document.getElementById('ctTab-' + t.id); if (b) b.classList.toggle('active', t.id === id); });
  const body = document.getElementById('ctBody');
  if (id === 'clientes') ctClientes(body);
  if (id === 'facturas') ctFacturas(body);
  if (id === 'pagos') ctPagos(body);
  if (id === 'aging') ctAging(body);
  if (id === 'asientos') ctAsientos(body);
  if (id === 'conciliacion') ctConciliacion(body);
}

// ============ CLIENTES ============
async function ctClientes(body) {
  body.innerHTML = '<div class="empty">Cargando…</div>';
  try {
    const r = await api('GET', '/api/accounting/customers');
    if (r.status !== 200) throw new Error(r.data && r.data.error || 'error');
    const cs = r.data.customers || [];
    body.innerHTML = `
      <div class="toolbar">
        ${tiene('accounting:write') ? '<button class="btn2 primary" onclick="ctNuevoCliente()">+ Nuevo cliente</button>' : ''}
        <span class="sub" style="margin:0">${cs.length} clientes</span>
      </div>
      <table><tr><th>NIT</th><th>Nombre</th><th>Teléfono</th><th>Días crédito</th><th>Cupo</th><th>Estado</th><th></th></tr>
      ${cs.map(c => `<tr><td class="mono">${escH(c.identificacion || '—')}</td><td>${escH(c.nombre)}</td>
        <td>${escH(c.telefono || '—')}</td><td>${c.diasCredito}</td><td>${moneda(c.cupoCredito)}</td>
        <td>${c.activo ? badge('Activo', 'b-ok') : badge('Inactivo', 'b-err')}</td>
        <td>${tiene('accounting:write') ? `<button class="btn2" onclick="ctEditarCliente(${c.id})">Editar</button>` : ''}</td></tr>`).join('')}</table>`;
  } catch (e) { body.innerHTML = '<div class="empty">' + escH(e.message) + '</div>'; }
}

function ctNuevoCliente() {
  abrirDialogo(`
    <h3>Nuevo cliente</h3>
    <div class="frm">
      <label class="full">Nombre<input id="ccNombre"></label>
      <label>NIT<input id="ccNit"></label>
      <label>Régimen<select id="ccRegimen"><option>común</option><option>simplificado</option></select></label>
      <label>Teléfono<input id="ccTel"></label>
      <label>Correo<input id="ccEmail"></label>
      <label>Días crédito<input id="ccDias" type="number" value="0"></label>
      <label>Cupo crédito<input id="ccCupo" type="number" step="0.01" value="0"></label>
    </div>
    <div class="toolbar"><button class="btn2 primary" onclick="ctGuardarCliente()">💾 Guardar</button></div>
    <div class="err" id="ccErr" style="color:var(--err);font-size:.85rem"></div>`);
}
async function ctGuardarCliente() {
  const nombre = document.getElementById('ccNombre').value.trim();
  if (!nombre) { document.getElementById('ccErr').textContent = 'Nombre requerido'; return; }
  const r = await api('POST', '/api/accounting/customers', {
    nombre, identificacion: document.getElementById('ccNit').value.trim() || null,
    regimen: document.getElementById('ccRegimen').value,
    telefono: document.getElementById('ccTel').value.trim() || null,
    email: document.getElementById('ccEmail').value.trim() || null,
    diasCredito: Number(document.getElementById('ccDias').value) || 0,
    cupoCredito: Number(document.getElementById('ccCupo').value) || 0,
  });
  if (r.status !== 201) { document.getElementById('ccErr').textContent = (r.data && r.data.error) || 'error'; return; }
  cerrarDialogo();
  toast('Cliente creado', 'ok');
  ctTab('clientes');
}
async function ctEditarCliente(id) {
  const r = await api('GET', '/api/accounting/customers/' + id);
  const c = r.data.customer;
  abrirDialogo(`
    <h3>Editar ${escH(c.nombre)}</h3>
    <div class="frm">
      <label class="full">Nombre<input id="ceNombre" value="${escH(c.nombre)}"></label>
      <label>Teléfono<input id="ceTel" value="${escH(c.telefono || '')}"></label>
      <label>Correo<input id="ceEmail" value="${escH(c.email || '')}"></label>
      <label>Días crédito<input id="ceDias" type="number" value="${c.diasCredito}"></label>
      <label>Cupo crédito<input id="ceCupo" type="number" step="0.01" value="${c.cupoCredito}"></label>
      <label>Activo<select id="ceActivo"><option value="true" ${c.activo ? 'selected' : ''}>Sí</option><option value="false" ${!c.activo ? 'selected' : ''}>No</option></select></label>
    </div>
    <div class="toolbar"><button class="btn2 primary" onclick="ctGuardarEdicionCliente(${c.id})">💾 Guardar</button></div>
    <div class="err" id="ceErr" style="color:var(--err);font-size:.85rem"></div>`);
}
async function ctGuardarEdicionCliente(id) {
  const r = await api('PUT', '/api/accounting/customers/' + id, {
    nombre: document.getElementById('ceNombre').value.trim(),
    telefono: document.getElementById('ceTel').value.trim() || null,
    email: document.getElementById('ceEmail').value.trim() || null,
    diasCredito: Number(document.getElementById('ceDias').value) || 0,
    cupoCredito: Number(document.getElementById('ceCupo').value) || 0,
    activo: document.getElementById('ceActivo').value === 'true',
  });
  if (r.status !== 200) { document.getElementById('ceErr').textContent = (r.data && r.data.error) || 'error'; return; }
  cerrarDialogo();
  toast('Cliente actualizado', 'ok');
  ctTab('clientes');
}

// ============ FACTURAS ============
async function ctFacturas(body) {
  body.innerHTML = '<div class="empty">Cargando…</div>';
  try {
    const r = await api('GET', '/api/accounting/invoices?estado=emitida');
    if (r.status !== 200) throw new Error(r.data && r.data.error || 'error');
    const invs = r.data.invoices || [];
    body.innerHTML = `
      <div class="toolbar">
        ${tiene('accounting:write') ? '<button class="btn2 primary" onclick="ctNuevaFactura()">+ Nueva factura</button>' : ''}
        <span class="sub" style="margin:0">${invs.length} facturas emitidas</span>
      </div>
      <table><tr><th>Número</th><th>Cliente</th><th>Fecha</th><th>Total</th><th>Saldo</th><th>Vence</th><th></th></tr>
      ${invs.map(f => `<tr>
        <td class="mono">${escH(f.numero)}</td><td>${escH(f.clienteNombre || '—')}</td>
        <td>${fmtDate(f.fecha)}</td><td>${moneda(f.total)}</td>
        <td style="${f.saldoPendiente > 0 ? 'color:var(--warn);font-weight:700' : ''}">${moneda(f.saldoPendiente)}</td>
        <td>${fmtDate(f.fechaVencimiento)}</td>
        <td class="flex"><button class="btn2" onclick="ctVerFactura(${f.id})">Ver</button></td></tr>`).join('')}</table>`;
  } catch (e) { body.innerHTML = '<div class="empty">' + escH(e.message) + '</div>'; }
}

async function ctNuevaFactura() {
  const cl = await api('GET', '/api/accounting/customers');
  const pr = await api('GET', '/api/inventory/products');
  const clientes = (cl.data.customers || []).filter(c => c.activo);
  window._ctClientes = clientes;
  window._ctProductos = pr.data.products || [];
  abrirDialogo(`
    <h3>Nueva factura de venta</h3>
    <div class="frm">
      <label class="full">Cliente<select id="fcCliente">${clientes.map(c => `<option value="${c.id}">${escH(c.nombre)}</option>`).join('')}</select></label>
      <label class="full">Observación<input id="fcObs"></label>
    </div>
    <h4 style="margin:.6rem 0">Ítems</h4>
    <table id="fcItems"><tr><th>Producto</th><th>Descripción</th><th>Cant.</th><th>P. unit.</th><th>IVA %</th><th></th></tr></table>
    <div class="toolbar">
      <button class="btn2" onclick="fcAddItem()">+ Ítem</button>
      <button class="btn2 primary" onclick="ctGuardarFactura()">💾 Emitir factura</button>
    </div>
    <div class="err" id="fcErr" style="color:var(--err);font-size:.85rem"></div>`);
  fcAddItem();
}
function fcAddItem() {
  const tb = document.getElementById('fcItems');
  const prods = window._ctProductos || [];
  const opts = prods.map(p => `<option value="${p.id}" data-precio="${p.precio}">${escH(p.nombre)}</option>`).join('') +
    `<option value="">(Otro)</option>`;
  const tr = document.createElement('tr');
  tr.innerHTML = `<td><select class="sel fc-p" onchange="fcSelProducto(this)">${opts}</select></td>
    <td><input class="sel fc-d" placeholder="Descripción" style="width:130px"></td>
    <td><input class="sel fc-c" type="number" step="0.01" value="1" style="width:70px"></td>
    <td><input class="sel fc-u" type="number" step="0.01" value="0" style="width:90px"></td>
    <td><input class="sel fc-i" type="number" step="0.01" value="19" style="width:65px"></td>
    <td><button class="btn2 danger" onclick="this.closest('tr').remove()">✕</button></td>`;
  tb.appendChild(tr);
}
function fcSelProducto(sel) {
  const opt = sel.selectedOptions[0];
  const tr = sel.closest('tr');
  if (opt.value) {
    tr.querySelector('.fc-u').value = opt.dataset.precio || '0';
    tr.querySelector('.fc-d').value = opt.textContent.trim();
  }
}
async function ctGuardarFactura() {
  const customerId = Number(document.getElementById('fcCliente').value);
  const rows = [...document.querySelectorAll('#fcItems tr:not(:first-child)')];
  const items = rows.map(r => ({
    productId: r.querySelector('.fc-p').value ? Number(r.querySelector('.fc-p').value) : null,
    descripcion: r.querySelector('.fc-d').value.trim(),
    cantidad: Number(r.querySelector('.fc-c').value) || 0,
    precioUnitario: Number(r.querySelector('.fc-u').value) || 0,
    impuestoPorcentaje: Number(r.querySelector('.fc-i').value) || 0,
  })).filter(it => it.cantidad > 0);
  if (!customerId || !items.length) { document.getElementById('fcErr').textContent = 'Cliente y al menos un ítem'; return; }
  const r = await api('POST', '/api/accounting/invoices', { customerId, observacion: document.getElementById('fcObs').value.trim() || null, items });
  if (r.status !== 201) { document.getElementById('fcErr').textContent = (r.data && r.data.error) || 'error'; return; }
  cerrarDialogo();
  toast('Factura emitida con asiento contable', 'ok');
  ctTab('facturas');
}

async function ctVerFactura(id) {
  try {
    const r = await api('GET', '/api/accounting/invoices/' + id);
    if (r.status !== 200) throw new Error(r.data && r.data.error || 'error');
    const f = r.data.invoice;
    abrirDialogo(`
      <h3>Factura ${escH(f.numero)}</h3>
      <table>
        <tr><th>Cliente</th><td>${escH(f.clienteNombre || '—')}</td><th>Estado</th><td>${badge(f.estado, EST_FACT[f.estado] || 'b-ac')}</td></tr>
        <tr><th>Subtotal</th><td>${moneda(f.subtotal)}</td><th>IVA</th><td>${moneda(f.impuestos)}</td></tr>
        <tr><th>Total</th><td>${moneda(f.total)}</td><th>Saldo</th><td style="color:${f.saldoPendiente > 0 ? 'var(--warn)' : 'var(--ok)'}">${moneda(f.saldoPendiente)}</td></tr>
        <tr><th>Vence</th><td>${fmtDate(f.fechaVencimiento)}</td><th>Asientos</th><td>${(f.asientos || []).length}</td></tr>
      </table>
      <h4 style="margin:.8rem 0 .4rem">Ítems</h4>
      <table><tr><th>Descripción</th><th>Cant.</th><th>P. unit.</th><th>IVA %</th><th>Total</th></tr>
      ${f.items.map(it => `<tr><td>${escH(it.descripcion)}</td><td>${it.cantidad}</td><td>${moneda(it.precioUnitario)}</td><td>${it.impuestoPorcentaje}</td><td>${moneda(it.total)}</td></tr>`).join('')}</table>
      ${f.pagos.length ? `<h4 style="margin:.8rem 0 .4rem">Pagos</h4>
      <table><tr><th>Método</th><th>Monto</th><th>Referencia</th><th>Fecha</th><th>Estado</th></tr>
      ${f.pagos.map(p => `<tr><td>${escH(p.metodo)}</td><td>${moneda(p.monto)}</td><td class="mono">${escH(p.referencia || '—')}</td><td>${fmtDate(p.fecha)}</td><td>${p.estado === 'aplicado' ? badge('Aplicado', 'b-ok') : badge(p.estado, 'b-warn')}</td></tr>`).join('')}</table>` : ''}
      <div class="toolbar" style="margin-top:1rem">
        ${f.estado === 'emitida' && f.saldoPendiente > 0 ? `<button class="btn2" onclick="ctCobrarFactura(${f.id})">💵 Cobrar</button>` : ''}
        ${f.estado === 'emitida' ? `<button class="btn2" onclick="ctNotaCredito(${f.id})">🧾 Nota crédito</button>` : ''}
        ${f.estado === 'emitida' ? `<button class="btn2 danger" onclick="ctAnularFactura(${f.id})">Anular</button>` : ''}
        <button class="btn2" onclick="cerrarDialogo()">Cerrar</button>
      </div>`);
  } catch (e) { toast(e.message, 'err'); }
}

function ctCobrarFactura(id) {
  abrirDialogo(`
    <h3>💵 Registrar cobro</h3>
    <div class="frm">
      <label>Monto<input id="pgMonto" type="number" step="0.01"></label>
      <label>Método<select id="pgMetodo">${METODOS.map(m => `<option>${m}</option>`).join('')}</select></label>
      <label class="full">Referencia<input id="pgRef"></label>
    </div>
    <div class="toolbar"><button class="btn2 primary" onclick="ctGuardarPago('cobro', ${id})">Registrar</button></div>
    <div class="err" id="pgErr" style="color:var(--err);font-size:.85rem"></div>`);
}

function ctNotaCredito(id) {
  abrirDialogo(`
    <h3>🧾 Nota crédito</h3>
    <div class="frm">
      <label>Subtotal<input id="ncSub" type="number" step="0.01"></label>
      <label>IVA<input id="ncIva" type="number" step="0.01"></label>
      <label class="full">Motivo<select id="ncMotivo"><option>devolución</option><option>descuento</option><option>error</option><option>otros</option></select></label>
    </div>
    <div class="toolbar"><button class="btn2 primary" onclick="ctGuardarNC(${id})">Emitir NC</button></div>
    <div class="err" id="ncErr" style="color:var(--err);font-size:.85rem"></div>`);
}
async function ctGuardarNC(id) {
  const body = {
    motivo: document.getElementById('ncMotivo').value,
    subtotal: Number(document.getElementById('ncSub').value) || 0,
    impuestos: Number(document.getElementById('ncIva').value) || 0,
  };
  const r = await api('POST', `/api/accounting/invoices/${id}/nota-credito`, body);
  if (r.status !== 201) { document.getElementById('ncErr').textContent = (r.data && r.data.error) || 'error'; return; }
  cerrarDialogo();
  toast('Nota crédito emitida', 'ok');
  ctVerFactura(id);
}
async function ctAnularFactura(id) {
  if (!confirm('¿Anular la factura?')) return;
  const r = await api('POST', `/api/accounting/invoices/${id}/anular`);
  if (r.status !== 200) { toast((r.data && r.data.error) || 'error', 'err'); return; }
  toast('Factura anulada con asiento de reversa', 'ok');
  cerrarDialogo();
  ctTab('facturas');
}

// ============ PAGOS ============
async function ctPagos(body) {
  body.innerHTML = '<div class="empty">Cargando…</div>';
  try {
    const r = await api('GET', '/api/accounting/payments');
    if (r.status !== 200) throw new Error(r.data && r.data.error || 'error');
    const ps = r.data.payments || [];
    body.innerHTML = `
      <div class="toolbar">
        ${tiene('accounting:write') ? '<button class="btn2 primary" onclick="ctNuevoPago()">+ Registrar pago</button>' : ''}
        <span class="sub" style="margin:0">${ps.length} movimientos</span>
      </div>
      <table><tr><th>Tipo</th><th>Método</th><th>Monto</th><th>Referencia</th><th>Contraparte</th><th>Fecha</th><th>Estado</th><th></th></tr>
      ${ps.map(p => `<tr>
        <td>${p.tipo === 'cobro' ? badge('Cobro', 'b-ok') : badge('Pago', 'b-warn')}</td>
        <td>${escH(p.metodo)}</td><td>${moneda(p.monto)}</td>
        <td class="mono">${escH(p.referencia || '—')}</td>
        <td>${escH(p.clienteNombre || p.proveedorNombre || (p.facturaNumero || p.poNumero || '—'))}</td>
        <td>${fmtDate(p.fecha)}</td>
        <td>${p.estado === 'aplicado' ? badge('Aplicado', 'b-ok') : badge(p.estado, 'b-err')}</td>
        <td>${p.estado === 'aplicado' && tiene('accounting:write') ? `<button class="btn2 danger" onclick="ctAnularPago(${p.id})">Anular</button>` : ''}</td></tr>`).join('')}</table>`;
  } catch (e) { body.innerHTML = '<div class="empty">' + escH(e.message) + '</div>'; }
}

async function ctNuevoPago() {
  const fact = await api('GET', '/api/accounting/invoices?estado=emitida');
  const ocs = await api('GET', '/api/inventory/purchase-orders');
  const facturas = (fact.data.invoices || []).filter(f => f.saldoPendiente > 0);
  const ordenes = (ocs.data.purchaseOrders || []).filter(o => ['enviada', 'parcial', 'recibida'].includes(o.estado));
  abrirDialogo(`
    <h3>Registrar pago</h3>
    <div class="frm">
      <label>Tipo<select id="pgTipo"><option value="cobro">Cobro (de cliente)</option><option value="pago">Pago (a proveedor)</option></select></label>
      <label>Monto<input id="pgMonto2" type="number" step="0.01"></label>
      <label>Método<select id="pgMetodo2">${METODOS.map(m => `<option>${m}</option>`).join('')}</select></label>
      <label class="full" id="pgRefWrap">Factura<select id="pgRef">${facturas.map(f => `<option value="inv:${f.id}">${escH(f.numero)} — ${escH(f.clienteNombre || '')} (saldo ${moneda(f.saldoPendiente)})</option>`).join('')}${facturas.length ? '' : '<option disabled>Sin facturas con saldo</option>'}</select></label>
    </div>
    <div class="toolbar"><button class="btn2 primary" onclick="ctGuardarPago2()">Registrar</button></div>
    <div class="err" id="pgErr2" style="color:var(--err);font-size:.85rem"></div>`);
  window._ctOCs = ordenes;
  window._ctFacturas = facturas;
  document.getElementById('pgTipo').addEventListener('change', () => {
    const ref = document.getElementById('pgRef');
    const tipo = document.getElementById('pgTipo').value;
    const ocs = window._ctOCs || [];
    const invs = window._ctFacturas || [];
    if (tipo === 'pago') {
      ref.innerHTML = ocs.map(o => `<option value="po:${o.id}">OC ${escH(o.numero)} — ${escH(o.proveedor_nombre || '')} (${moneda(o.total)})</option>`).join('') +
        (ocs.length ? '' : '<option disabled>Sin OC pendientes</option>');
    } else {
      ref.innerHTML = invs.map(f => `<option value="inv:${f.id}">${escH(f.numero)} — ${escH(f.clienteNombre || '')} (saldo ${moneda(f.saldoPendiente)})</option>`).join('') +
        (invs.length ? '' : '<option disabled>Sin facturas con saldo</option>');
    }
  });
}
async function ctGuardarPago2() {
  const tipo = document.getElementById('pgTipo').value;
  const monto = Number(document.getElementById('pgMonto2').value);
  const metodo = document.getElementById('pgMetodo2').value;
  const ref = document.getElementById('pgRef').value;
  if (!monto || !ref) { document.getElementById('pgErr2').textContent = 'Monto y referencia requeridos'; return; }
  const [kind, id] = ref.split(':');
  const body = { tipo, monto, metodo, ...(kind === 'inv' ? { invoiceId: Number(id) } : { purchaseOrderId: Number(id) }) };
  const r = await api('POST', '/api/accounting/payments', body);
  if (r.status !== 201) { document.getElementById('pgErr2').textContent = (r.data && r.data.error) || 'error'; return; }
  cerrarDialogo();
  toast('Pago registrado', 'ok');
  ctTab('pagos');
}
async function ctAnularPago(id) {
  if (!confirm('¿Anular este pago?')) return;
  const r = await api('POST', `/api/accounting/payments/${id}/anular`);
  if (r.status !== 200) { toast((r.data && r.data.error) || 'error', 'err'); return; }
  toast('Pago anulado con reversa', 'ok');
  ctTab('pagos');
}
async function ctGuardarPago(tipo, id) {
  const body = {
    tipo,
    monto: Number(document.getElementById('pgMonto').value),
    metodo: document.getElementById('pgMetodo').value,
    referencia: document.getElementById('pgRef').value.trim() || null,
    ...(tipo === 'cobro' ? { invoiceId: id } : { purchaseOrderId: id }),
  };
  if (!body.monto) { document.getElementById('pgErr').textContent = 'Monto requerido'; return; }
  const r = await api('POST', '/api/accounting/payments', body);
  if (r.status !== 201) { document.getElementById('pgErr').textContent = (r.data && r.data.error) || 'error'; return; }
  cerrarDialogo();
  toast('Cobro registrado', 'ok');
  ctVerFactura(id);
}

// ============ AGING ============
async function ctAging(body) {
  body.innerHTML = '<div class="empty">Cargando…</div>';
  try {
    const [cx, cp] = await Promise.all([
      api('GET', '/api/accounting/aging/cxc'),
      api('GET', '/api/accounting/aging/cxp'),
    ]);
    const A = cx.data.aging;
    const B = cp.data.aging;
    function tablaPor(por, tipo) {
      return `<table><tr><th>${tipo === 'cxc' ? 'Cliente' : 'Proveedor'}</th><th>Al día</th><th>0-30</th><th>31-60</th><th>61-90</th><th>90+</th><th>Saldo</th></tr>
      ${por.map(g => `<tr><td>${escH(g.nombre)}</td><td>${moneda(g.alDia)}</td><td>${moneda(g.r0_30)}</td><td>${moneda(g.r31_60)}</td><td>${moneda(g.r61_90)}</td><td>${moneda(g.r91_mas)}</td><td style="font-weight:700">${moneda(g.saldo)}</td></tr>`).join('')}</table>`;
    }
    const BKS = k => `<tr><th>Al día</th><td>${moneda(k.alDia)}</td><th>0-30</th><td>${moneda(k.r0_30)}</td><th>31-60</th><td>${moneda(k.r31_60)}</td><th>61-90</th><td>${moneda(k.r61_90)}</td><th>90+</th><td>${moneda(k.r91_mas)}</td><th>Total</th><td>${moneda(k.total)}</td></tr>`;
    body.innerHTML = `
      <div class="card"><h3>CxC — Cuentas por cobrar</h3><table>${BKS(A.buckets)}</table>
        ${A.porCliente.length ? tablaPor(A.porCliente, 'cxc') : '<div class="empty">Sin saldos por cobrar</div>'}</div>
      <div class="card"><h3>CxP — Cuentas por pagar</h3><table>${BKS(B.buckets)}</table>
        ${B.porProveedor.length ? tablaPor(B.porProveedor, 'cxp') : '<div class="empty">Sin saldos por pagar</div>'}</div>`;
  } catch (e) { body.innerHTML = '<div class="empty">' + escH(e.message) + '</div>'; }
}

// ============ ASIENTOS ============
async function ctAsientos(body) {
  body.innerHTML = '<div class="empty">Cargando…</div>';
  try {
    const r = await api('GET', '/api/accounting/journal-entries');
    if (r.status !== 200) throw new Error(r.data && r.data.error || 'error');
    const es = r.data.entries || [];
    body.innerHTML = `
      <div class="toolbar">
        ${tiene('accounting:write') ? '<button class="btn2 primary" onclick="ctNuevoAsiento()">+ Asiento manual</button>' : ''}
        <span class="sub" style="margin:0">${es.length} asientos</span>
      </div>
      <table><tr><th>Número</th><th>Fecha</th><th>Concepto</th><th>Débito</th><th>Crédito</th><th>Estado</th><th></th></tr>
      ${es.map(e => `<tr>
        <td class="mono">${escH(e.numero)}</td><td>${fmtDate(e.fecha)}</td><td>${escH(e.concepto)}</td>
        <td>${moneda(e.totalDebito)}</td><td>${moneda(e.totalCredito)}</td>
        <td>${e.estado === 'contabilizado' ? badge('Contabilizado', 'b-ok') : e.estado === 'borrador' ? badge('Borrador', 'b-warn') : badge(e.estado, 'b-err')}</td>
        <td class="flex"><button class="btn2" onclick="ctVerAsiento(${e.id})">Ver</button>
        ${e.estado !== 'anulado' && tiene('accounting:write') ? `<button class="btn2 danger" onclick="ctAnularAsiento(${e.id})">Anular</button>` : ''}</td></tr>`).join('')}</table>`;
  } catch (e) { body.innerHTML = '<div class="empty">' + escH(e.message) + '</div>'; }
}

function ctNuevoAsiento() {
  abrirDialogo(`
    <h3>Asiento manual</h3>
    <div class="frm">
      <label class="full">Concepto<input id="jaConc" value="Ajuste contable"></label>
    </div>
    <table id="jaLines"><tr><th>Cuenta (PUC)</th><th>Débito</th><th>Crédito</th><th></th></tr></table>
    <div class="toolbar">
      <button class="btn2" onclick="jaAddLine()">+ Línea</button>
      <button class="btn2 primary" onclick="ctGuardarAsiento()">💾 Contabilizar</button>
    </div>
    <div class="err" id="jaErr" style="color:var(--err);font-size:.85rem"></div>`);
  jaAddLine(); jaAddLine();
}
function jaAddLine() {
  const tb = document.getElementById('jaLines');
  const tr = document.createElement('tr');
  tr.innerHTML = `<td><input class="sel ja-a" placeholder="ej: 1105" style="width:110px"></td>
    <td><input class="sel ja-d" type="number" step="0.01" value="0" style="width:100px"></td>
    <td><input class="sel ja-c" type="number" step="0.01" value="0" style="width:100px"></td>
    <td><button class="btn2 danger" onclick="this.closest('tr').remove()">✕</button></td>`;
  tb.appendChild(tr);
}
async function ctGuardarAsiento() {
  const concepto = document.getElementById('jaConc').value.trim() || 'Asiento manual';
  const lines = [...document.querySelectorAll('#jaLines tr:not(:first-child)')].map(r => ({
    codigo: r.querySelector('.ja-a').value.trim(),
    debito: Number(r.querySelector('.ja-d').value) || 0,
    credito: Number(r.querySelector('.ja-c').value) || 0,
  })).filter(l => l.codigo && (l.debito || l.credito));
  if (!lines.length) { document.getElementById('jaErr').textContent = 'Agrega al menos una línea con cuenta'; return; }
  const r = await api('POST', '/api/accounting/journal-entries', { concepto, lines });
  if (r.status !== 201) { document.getElementById('jaErr').textContent = (r.data && r.data.error) || 'error'; return; }
  cerrarDialogo();
  toast('Asiento contabilizado', 'ok');
  ctTab('asientos');
}
async function ctVerAsiento(id) {
  try {
    const r = await api('GET', '/api/accounting/journal-entries/' + id);
    if (r.status !== 200) throw new Error(r.data && r.data.error || 'error');
    const e = r.data.entry;
    abrirDialogo(`
      <h3>Asiento ${escH(e.numero)}</h3>
      <p class="sub">${escH(e.concepto)} — ${fmtDate(e.fecha)} — ${badge(e.estado, e.estado === 'contabilizado' ? 'b-ok' : 'b-warn')}</p>
      <table><tr><th>Cuenta</th><th>Nombre</th><th>Débito</th><th>Crédito</th></tr>
      ${e.lines.map(l => `<tr><td class="mono">${escH(l.codigo)}</td><td>${escH(l.cuenta)}</td><td>${l.debito ? moneda(l.debito) : ''}</td><td>${l.credito ? moneda(l.credito) : ''}</td></tr>`).join('')}
      <tr style="font-weight:700"><td colspan="2">Totales</td><td>${moneda(e.totalDebito)}</td><td>${moneda(e.totalCredito)}</td></tr></table>
      <div class="toolbar" style="margin-top:1rem"><button class="btn2" onclick="cerrarDialogo()">Cerrar</button></div>`);
  } catch (e) { toast(e.message, 'err'); }
}
async function ctAnularAsiento(id) {
  if (!confirm('¿Anular este asiento?')) return;
  const r = await api('POST', `/api/accounting/journal-entries/${id}/anular`);
  if (r.status !== 200) { toast((r.data && r.data.error) || 'error', 'err'); return; }
  toast('Asiento anulado');
  ctTab('asientos');
}

// ============ CONCILIACIÓN ============
async function ctConciliacion(body) {
  body.innerHTML = '<div class="empty">Cargando…</div>';
  try {
    const r = await api('GET', '/api/accounting/conciliacion');
    if (r.status !== 200) throw new Error(r.data && r.data.error || 'error');
    const C = r.data.resumen;
    body.innerHTML = `
      <div class="grid">
        <div class="stat"><div class="k">Total facturado</div><div class="v ok">${moneda(C.totalFacturado)}</div></div>
        <div class="stat"><div class="k">Total cobrado</div><div class="v">${moneda(C.totalCobrado)}</div></div>
        <div class="stat"><div class="k">Saldo CxC</div><div class="v warn">${moneda(C.saldoCxC)}</div></div>
        <div class="stat"><div class="k">Pagado a proveedores</div><div class="v">${moneda(C.totalPagadoProveedores)}</div></div>
      </div>
      <div class="card"><h3>Desglose por método de pago</h3>
        <table><tr><th>Método</th><th>Cantidad</th><th>Total</th></tr>
        ${(C.porMetodo || []).map(m => `<tr><td>${escH(m.metodo)}</td><td>${m.cantidad}</td><td>${moneda(m.total)}</td></tr>`).join('')}</table></div>`;
  } catch (e) { body.innerHTML = '<div class="empty">' + escH(e.message) + '</div>'; }
}