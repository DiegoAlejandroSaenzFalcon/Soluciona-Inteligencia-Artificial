'use strict';
// ============================================================
// Panel Empresarial — Inventario / Compras
// ============================================================
const INV_TABS = [
  { id: 'productos', label: '📦 Productos' },
  { id: 'categorias', label: '🗂 Categorías' },
  { id: 'proveedores', label: '🚚 Proveedores' },
  { id: 'oc', label: '🧾 Órdenes de compra' },
  { id: 'stockbajo', label: '⚠️ Stock bajo' },
];

async function cargarInventario() {
  const cont = document.getElementById('viewContent');
  cont.innerHTML = `
    <div class="sec-tabs">${INV_TABS.map(t => `<button id="invTab-${t.id}" onclick="invTab('${t.id}')">${t.label}</button>`).join('')}</div>
    <div id="invBody"><div class="empty">Cargando…</div></div>`;
  invTab('productos');
}
function invTab(id) {
  INV_TABS.forEach(t => { const b = document.getElementById('invTab-' + t.id); if (b) b.classList.toggle('active', t.id === id); });
  const body = document.getElementById('invBody');
  if (id === 'productos') invProductos(body);
  if (id === 'categorias') invCategorias(body);
  if (id === 'proveedores') invProveedores(body);
  if (id === 'oc') invOCs(body);
  if (id === 'stockbajo') invStockBajo(body);
}

// ============ PRODUCTOS ============
async function invProductos(body) {
  body.innerHTML = '<div class="empty">Cargando…</div>';
  try {
    const q = await api('GET', '/api/inventory/products');
    const cats = await api('GET', '/api/inventory/categories');
    if (q.status !== 200) throw new Error(q.data && q.data.error || 'error');
    const prods = q.data.products || [];
    const catsMap = new Map((cats.data.categories || []).map(c => [c.id, c.nombre]));
    body.innerHTML = `
      <div class="toolbar">
        ${tiene('inventory:write') ? '<button class="btn2 primary" onclick="invNuevoProducto()">+ Nuevo producto</button>' : ''}
        <span class="sub" style="margin:0">${prods.length} productos</span>
      </div>
      <table>
        <tr><th>Código</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Costo</th><th>Stock</th><th>Estado</th><th></th></tr>
        ${prods.map(p => `<tr>
          <td class="mono">${escH(p.codigo || '—')}</td><td>${escH(p.nombre)}</td>
          <td>${escH(catsMap.get(p.category_id) || '—')}</td>
          <td>${moneda(p.precio)}</td><td>${p.costo != null ? moneda(p.costo) : '—'}</td>
          <td>${p.stock_total != null ? p.stock_total : (p.stock || 0)}</td>
          <td>${p.activo ? badge('Activo', 'b-ok') : badge('Inactivo', 'b-err')}</td>
          <td class="flex">
            <button class="btn2" onclick="invVerProducto(${p.id})">Ver</button>
            ${tiene('inventory:write') ? `<button class="btn2 danger" onclick="invBorrarProducto(${p.id}, '${escH(p.nombre)}')">Eliminar</button>` : ''}
          </td></tr>`).join('')}
      </table>`;
  } catch (e) { body.innerHTML = '<div class="empty">' + escH(e.message) + '</div>'; }
}

function invNuevoProducto() {
  abrirDialogo(`
    <div class="toolbar" style="margin:0 0 .6rem"><button class="btn2" onclick="invProductos(document.getElementById('invBody'))">← Productos</button></div>
    <div class="frm">
      <label>Nombre<input id="npNombre"></label>
      <label>Código<input id="npCodigo" placeholder="SKU"></label>
      <label>Código de barras<input id="npBarras"></label>
      <label>Categoría<select id="npCategoria"><option value="">—</option></select></label>
      <label>Precio<input id="npPrecio" type="number" step="0.01" value="0"></label>
      <label>Costo<input id="npCosto" type="number" step="0.01"></label>
      <label>Unidad<input id="npUnidad" value="unidad"></label>
      <label>Stock inicial<input id="npStock" type="number" step="0.01" value="0"></label>
      <label>Stock mínimo<input id="npMin" type="number" step="0.01" value="0"></label>
      <label class="full">Descripción<input id="npDesc"></label>
    </div>
    <div class="toolbar"><button class="btn2 primary" onclick="invGuardarProducto()">💾 Guardar</button></div>
    <div class="err" id="npErr" style="color:var(--err);font-size:.85rem"></div>`);
  (async () => {
    const r = await api('GET', '/api/inventory/categories');
    const opts = (r.data.categories || []).map(c => `<option value="${c.id}">${escH(c.nombre)}</option>`).join('');
    const sel = document.getElementById('npCategoria');
    if (sel) sel.insertAdjacentHTML('beforeend', opts);
  })();
}

async function invGuardarProducto() {
  const body = {
    nombre: document.getElementById('npNombre').value.trim(),
    codigo: document.getElementById('npCodigo').value.trim() || null,
    codigoBarras: document.getElementById('npBarras').value.trim() || null,
    categoryId: document.getElementById('npCategoria').value || null,
    precio: Number(document.getElementById('npPrecio').value) || 0,
    costo: document.getElementById('npCosto').value === '' ? null : Number(document.getElementById('npCosto').value),
    unidadMedida: document.getElementById('npUnidad').value.trim() || 'unidad',
    stockInicial: Number(document.getElementById('npStock').value) || 0,
    stockMinimo: Number(document.getElementById('npMin').value) || 0,
    descripcion: document.getElementById('npDesc').value.trim() || null,
  };
  if (!body.nombre) { document.getElementById('npErr').textContent = 'Nombre requerido'; return; }
  const r = await api('POST', '/api/inventory/products', body);
  if (r.status !== 201) { document.getElementById('npErr').textContent = (r.data && r.data.error) || 'error'; return; }
  cerrarDialogo();
  toast('Producto creado', 'ok');
  invTab('productos');
}

async function invVerProducto(id) {
  try {
    const r = await api('GET', '/api/inventory/products/' + id);
    if (r.status !== 200) throw new Error(r.data && r.data.error || 'error');
    const p = r.data.product;
    abrirDialogo(`
      <h3>${escH(p.nombre)}</h3>
      <table>
        <tr><th>Código</th><td class="mono">${escH(p.codigo || '—')}</td><th>Precio</th><td>${moneda(p.precio)}</td></tr>
        <tr><th>Costo</th><td>${p.costo != null ? moneda(p.costo) : '—'}</td><th>Unidad</th><td>${escH(p.unidad_medida || 'unidad')}</td></tr>
        <tr><th>Mínimo</th><td>${p.stock_minimo != null ? p.stock_minimo : 0}</td><th>Máximo</th><td>${p.stock_maximo != null ? p.stock_maximo : '—'}</td></tr>
      </table>
      ${p.variants && p.variants.length ? `<h4 style="margin:.8rem 0 .4rem">Variantes</h4>
      <table><tr><th>Nombre</th><th>SKU</th><th>Precio adic.</th><th>Stock</th></tr>
        ${p.variants.map(v => `<tr><td>${escH(v.nombre)}</td><td class="mono">${escH(v.sku || '—')}</td><td>${moneda(v.precio_adicional)}</td><td>${v.stock != null ? v.stock : '—'}</td></tr>`).join('')}</table>` : ''}
      ${p.stock && p.stock.length ? `<h4 style="margin:.8rem 0 .4rem">Stock por bodega</h4>
      <table><tr><th>Bodega</th><th>Cantidad</th></tr>${p.stock.map(s => `<tr><td>${escH(s.bodega)}</td><td>${s.cantidad != null ? s.cantidad : s}</td></tr>`).join('')}</table>` : ''}
      <div class="toolbar" style="margin-top:1rem">
        ${tiene('inventory:adjust') ? `<button class="btn2" onclick="invAjustarStock(${p.id})">⚖ Ajustar stock</button>` : ''}
        <button class="btn2" onclick="invKardex(${p.id})">📒 Kardex</button>
        ${tiene('inventory:write') ? `<button class="btn2" onclick="invEditarProducto(${p.id})">✏️ Editar</button>` : ''}
        <button class="btn2" onclick="cerrarDialogo()">Cerrar</button>
      </div>`);
  } catch (e) { toast(e.message, 'err'); }
}

async function invAjustarStock(productId) {
  abrirDialogo(`
    <h3>⚖ Ajustar stock</h3>
    <div class="frm">
      <label>Variante (opcional)<select id="ajVariant"><option value="">Sin variante</option></select></label>
      <label>Bodega<input id="ajBodega" value="principal"></label>
      <label>Cantidad (negativo para reducir)<input id="ajCant" type="number" step="0.01"></label>
      <label class="full">Motivo<input id="ajMotivo" value="Ajuste manual"></label>
    </div>
    <div class="toolbar"><button class="btn2 primary" onclick="invGuardarAjuste(${productId})">Aplicar</button></div>
    <div class="err" id="ajErr" style="color:var(--err);font-size:.85rem"></div>`);
  const r = await api('GET', '/api/inventory/products/' + productId);
  const p = r.data.product;
  const sel = document.getElementById('ajVariant');
  if (sel && p.variants) sel.insertAdjacentHTML('beforeend', p.variants.map(v => `<option value="${v.id}">${escH(v.nombre)}</option>`).join(''));
}

async function invGuardarAjuste(productId) {
  const body = {
    variantId: document.getElementById('ajVariant').value || null,
    bodega: document.getElementById('ajBodega').value.trim() || 'principal',
    cantidad: Number(document.getElementById('ajCant').value),
    motivo: document.getElementById('ajMotivo').value.trim() || 'Ajuste manual',
  };
  if (!body.cantidad) { document.getElementById('ajErr').textContent = 'Cantidad requerida'; return; }
  const r = await api('PUT', '/api/inventory/products/' + productId + '/stock', body);
  if (r.status !== 200) { document.getElementById('ajErr').textContent = (r.data && r.data.error) || 'error'; return; }
  cerrarDialogo();
  toast('Stock ajustado', 'ok');
  invVerProducto(productId);
}

async function invKardex(productId) {
  try {
    const r = await api('GET', '/api/inventory/products/' + productId + '/kardex');
    const k = r.data.kardex || [];
    abrirDialogo(`
      <h3>📒 Kardex</h3>
      <table>
        <tr><th>Fecha</th><th>Tipo</th><th>Cant.</th><th>Costo unit.</th><th>Bodega</th><th>Referencia</th></tr>
        ${k.map(m => `<tr><td>${fmtDate(m.created_at)}</td>
          <td>${badge(m.tipo, m.tipo.indexOf('salida') >= 0 || m.tipo.indexOf('negativo') >= 0 ? 'b-err' : 'b-ok')}</td>
          <td>${m.cantidad}</td><td>${m.costo_unitario != null ? moneda(m.costo_unitario) : '—'}</td>
          <td>${escH(m.bodega)}</td><td class="mono">${escH(m.referencia_tipo || '—')} ${escH(m.referencia_id || '')}</td></tr>`).join('')}
      </table>
      <div class="toolbar"><button class="btn2" onclick="cerrarDialogo()">Cerrar</button></div>`);
  } catch (e) { toast(e.message, 'err'); }
}

async function invEditarProducto(id) {
  const r = await api('GET', '/api/inventory/products/' + id);
  const p = r.data.product;
  const cats = await api('GET', '/api/inventory/categories');
  abrirDialogo(`
    <h3>✏️ Editar ${escH(p.nombre)}</h3>
    <div class="frm">
      <label>Nombre<input id="epNombre" value="${escH(p.nombre)}"></label>
      <label>Precio<input id="epPrecio" type="number" step="0.01" value="${p.precio}"></label>
      <label>Costo<input id="epCosto" type="number" step="0.01" value="${p.costo != null ? p.costo : ''}"></label>
      <label>Categoría<select id="epCat">${(cats.data.categories || []).map(c => `<option value="${c.id}" ${c.id === p.category_id ? 'selected' : ''}>${escH(c.nombre)}</option>`).join('')}</select></label>
      <label>Stock mínimo<input id="epMin" type="number" step="0.01" value="${p.stock_minimo != null ? p.stock_minimo : 0}"></label>
      <label>Ubicación<input id="epUbic" value="${escH(p.ubicacion || '')}"></label>
    </div>
    <div class="toolbar"><button class="btn2 primary" onclick="invGuardarEdicion(${p.id})">💾 Guardar</button></div>
    <div class="err" id="epErr" style="color:var(--err);font-size:.85rem"></div>`);
}

async function invGuardarEdicion(id) {
  const body = {
    nombre: document.getElementById('epNombre').value.trim(),
    precio: Number(document.getElementById('epPrecio').value) || 0,
    costo: document.getElementById('epCosto').value === '' ? null : Number(document.getElementById('epCosto').value),
    categoryId: document.getElementById('epCat').value || null,
    stockMinimo: Number(document.getElementById('epMin').value) || 0,
    ubicacion: document.getElementById('epUbic').value.trim() || null,
  };
  const r = await api('PUT', '/api/inventory/products/' + id, body);
  if (r.status !== 200) { document.getElementById('epErr').textContent = (r.data && r.data.error) || 'error'; return; }
  cerrarDialogo();
  toast('Producto actualizado', 'ok');
  invTab('productos');
}

async function invBorrarProducto(id, nombre) {
  if (!confirm('¿Eliminar "' + nombre + '"?')) return;
  const r = await api('DELETE', '/api/inventory/products/' + id);
  if (r.status !== 200) { toast((r.data && r.data.error) || 'error', 'err'); return; }
  toast('Producto eliminado');
  invTab('productos');
}

// ============ CATEGORÍAS ============
async function invCategorias(body) {
  body.innerHTML = '<div class="empty">Cargando…</div>';
  try {
    const r = await api('GET', '/api/inventory/categories');
    if (r.status !== 200) throw new Error(r.data && r.data.error || 'error');
    const cats = r.data.categories || [];
    body.innerHTML = `
      <div class="toolbar">
        ${tiene('inventory:write') ? '<button class="btn2 primary" onclick="invNuevaCategoria()">+ Nueva categoría</button>' : ''}
        <span class="sub" style="margin:0">${cats.length} categorías</span>
      </div>
      <table><tr><th>Nombre</th><th>Descripción</th><th>Orden</th><th>Productos</th><th>Estado</th><th></th></tr>
      ${cats.map(c => `<tr><td>${escH(c.nombre)}</td><td>${escH(c.descripcion || '—')}</td>
        <td>${c.orden}</td><td>${c.productos != null ? c.productos : '—'}</td>
        <td>${c.activo ? badge('Activo', 'b-ok') : badge('Inactivo', 'b-err')}</td>
        <td>${tiene('inventory:write') ? `<button class="btn2 danger" onclick="invBorrarCategoria(${c.id}, '${escH(c.nombre)}')">Eliminar</button>` : ''}</td></tr>`).join('')}</table>`;
  } catch (e) { body.innerHTML = '<div class="empty">' + escH(e.message) + '</div>'; }
}

function invNuevaCategoria() {
  abrirDialogo(`
    <h3>Nueva categoría</h3>
    <div class="frm">
      <label class="full">Nombre<input id="ncNombre"></label>
      <label class="full">Descripción<input id="ncDesc"></label>
    </div>
    <div class="toolbar"><button class="btn2 primary" onclick="invGuardarCategoria()">💾 Guardar</button></div>
    <div class="err" id="ncErr" style="color:var(--err);font-size:.85rem"></div>`);
}
async function invGuardarCategoria() {
  const nombre = document.getElementById('ncNombre').value.trim();
  if (!nombre) { document.getElementById('ncErr').textContent = 'Nombre requerido'; return; }
  const r = await api('POST', '/api/inventory/categories', { nombre, descripcion: document.getElementById('ncDesc').value.trim() || null });
  if (r.status !== 201) { document.getElementById('ncErr').textContent = (r.data && r.data.error) || 'error'; return; }
  cerrarDialogo();
  toast('Categoría creada', 'ok');
  invTab('categorias');
}
async function invBorrarCategoria(id, nombre) {
  if (!confirm('¿Eliminar la categoría "' + nombre + '"?')) return;
  const r = await api('DELETE', '/api/inventory/categories/' + id);
  if (r.status !== 200) { toast((r.data && r.data.error) || 'error', 'err'); return; }
  toast('Categoría eliminada');
  invTab('categorias');
}

// ============ PROVEEDORES ============
async function invProveedores(body) {
  body.innerHTML = '<div class="empty">Cargando…</div>';
  try {
    const r = await api('GET', '/api/inventory/suppliers');
    if (r.status !== 200) throw new Error(r.data && r.data.error || 'error');
    const sups = r.data.suppliers || [];
    body.innerHTML = `
      <div class="toolbar">
        ${tiene('inventory:write') ? '<button class="btn2 primary" onclick="invNuevoProveedor()">+ Nuevo proveedor</button>' : ''}
        <span class="sub" style="margin:0">${sups.length} proveedores</span>
      </div>
      <table><tr><th>NIT</th><th>Nombre</th><th>Teléfono</th><th>Correo</th><th>Estado</th><th></th></tr>
      ${sups.map(s => `<tr><td class="mono">${escH(s.identificacion || '—')}</td><td>${escH(s.nombre)}</td>
        <td>${escH(s.telefono || '—')}</td><td>${escH(s.email || '—')}</td>
        <td>${s.activo ? badge('Activo', 'b-ok') : badge('Inactivo', 'b-err')}</td>
        <td>${tiene('inventory:write') ? `<button class="btn2 danger" onclick="invBorrarProveedor(${s.id}, '${escH(s.nombre)}')">Desactivar</button>` : ''}</td></tr>`).join('')}</table>`;
  } catch (e) { body.innerHTML = '<div class="empty">' + escH(e.message) + '</div>'; }
}
function invNuevoProveedor() {
  abrirDialogo(`
    <h3>Nuevo proveedor</h3>
    <div class="frm">
      <label class="full">Nombre<input id="spNombre"></label>
      <label>NIT / ID<input id="spNit"></label>
      <label>Teléfono<input id="spTel"></label>
      <label>Correo<input id="spEmail"></label>
    </div>
    <div class="toolbar"><button class="btn2 primary" onclick="invGuardarProveedor()">💾 Guardar</button></div>
    <div class="err" id="spErr" style="color:var(--err);font-size:.85rem"></div>`);
}
async function invGuardarProveedor() {
  const nombre = document.getElementById('spNombre').value.trim();
  if (!nombre) { document.getElementById('spErr').textContent = 'Nombre requerido'; return; }
  const r = await api('POST', '/api/inventory/suppliers', {
    nombre, identificacion: document.getElementById('spNit').value.trim() || null,
    telefono: document.getElementById('spTel').value.trim() || null,
    email: document.getElementById('spEmail').value.trim() || null,
  });
  if (r.status !== 201) { document.getElementById('spErr').textContent = (r.data && r.data.error) || 'error'; return; }
  cerrarDialogo();
  toast('Proveedor creado', 'ok');
  invTab('proveedores');
}
async function invBorrarProveedor(id, nombre) {
  if (!confirm('¿Desactivar al proveedor "' + nombre + '"?')) return;
  const r = await api('DELETE', '/api/inventory/suppliers/' + id);
  if (r.status !== 200) { toast((r.data && r.data.error) || 'error', 'err'); return; }
  toast('Proveedor desactivado');
  invTab('proveedores');
}

// ============ ÓRDENES DE COMPRA ============
async function invOCs(body) {
  body.innerHTML = '<div class="empty">Cargando…</div>';
  try {
    const r = await api('GET', '/api/inventory/purchase-orders');
    if (r.status !== 200) throw new Error(r.data && r.data.error || 'error');
    const ocs = r.data.purchaseOrders || [];
    const estCls = { borrador: 'b-warn', enviada: 'b-ac', parcial: 'b-ok', recibida: 'b-ok', cancelada: 'b-err' };
    body.innerHTML = `
      <div class="toolbar">
        ${tiene('purchases:create') ? '<button class="btn2 primary" onclick="invNuevaOC()">+ Nueva OC</button>' : ''}
        <span class="sub" style="margin:0">${ocs.length} órdenes</span>
      </div>
      <table><tr><th>Número</th><th>Proveedor</th><th>Fecha</th><th>Total</th><th>Estado</th><th></th></tr>
      ${ocs.map(o => `<tr><td class="mono">${escH(o.numero)}</td><td>${escH(o.proveedor_nombre || '—')}</td>
        <td>${fmtDate(o.fecha)}</td><td>${moneda(o.total)}</td>
        <td>${badge(o.estado, estCls[o.estado] || 'b-ac')}</td>
        <td class="flex"><button class="btn2" onclick="invVerOC(${o.id})">Ver</button></td></tr>`).join('')}</table>`;
  } catch (e) { body.innerHTML = '<div class="empty">' + escH(e.message) + '</div>'; }
}

async function invNuevaOC() {
  const prods = await api('GET', '/api/inventory/products');
  const sups = await api('GET', '/api/inventory/suppliers');
  const productos = prods.data.products || [];
  const proveedores = (sups.data.suppliers || []).filter(s => s.activo);
  abrirDialogo(`
    <h3>Nueva orden de compra</h3>
    <div class="frm">
      <label class="full">Proveedor<select id="ocSup">${proveedores.map(s => `<option value="${s.id}">${escH(s.nombre)}</option>`).join('')}</select></label>
      <label class="full">Fecha esperada<input id="ocFecha" type="date"></label>
    </div>
    <h4 style="margin:.6rem 0">Ítems</h4>
    <table id="ocItems">
      <tr><th>Producto</th><th>Cant.</th><th>Precio unit.</th><th>IVA %</th><th></th></tr>
    </table>
    <div class="toolbar">
      <button class="btn2" onclick="ocAddItem()">+ Ítem</button>
      <button class="btn2 primary" onclick="invGuardarOC()">💾 Crear OC</button>
    </div>
    <div class="err" id="ocErr" style="color:var(--err);font-size:.85rem"></div>`);
  window._ocProductos = productos;
  ocAddItem();
}
function ocAddItem() {
  const tb = document.getElementById('ocItems');
  const opts = (window._ocProductos || []).map(p => `<option value="${p.id}">${escH(p.nombre)}</option>`).join('');
  const tr = document.createElement('tr');
  tr.innerHTML = `<td><select class="sel oc-p">${opts}</select></td>
    <td><input class="sel oc-c" type="number" step="0.01" value="1" style="width:80px"></td>
    <td><input class="sel oc-u" type="number" step="0.01" value="0" style="width:100px"></td>
    <td><input class="sel oc-i" type="number" step="0.01" value="19" style="width:70px"></td>
    <td><button class="btn2 danger" onclick="this.closest('tr').remove()">✕</button></td>`;
  tb.appendChild(tr);
}
async function invGuardarOC() {
  const rows = [...document.querySelectorAll('#ocItems tr:not(:first-child)')];
  const items = rows.map(r => ({
    productId: Number(r.querySelector('.oc-p').value),
    descripcion: (window._ocProductos || []).find(p => p.id === Number(r.querySelector('.oc-p').value))?.nombre || '',
    cantidad: Number(r.querySelector('.oc-c').value) || 0,
    precioUnitario: Number(r.querySelector('.oc-u').value) || 0,
    impuestoPorcentaje: Number(r.querySelector('.oc-i').value) || 0,
  })).filter(it => it.cantidad > 0);
  const supplierId = Number(document.getElementById('ocSup').value);
  if (!supplierId || !items.length) { document.getElementById('ocErr').textContent = 'Proveedor y al menos un ítem con cantidad > 0'; return; }
  const body = { supplierId, items };
  const fecha = document.getElementById('ocFecha').value;
  if (fecha) body.fechaEntregaEsperada = new Date(fecha + 'T12:00:00').toISOString();
  const r = await api('POST', '/api/inventory/purchase-orders', body);
  if (r.status !== 201) { document.getElementById('ocErr').textContent = (r.data && r.data.error) || 'error'; return; }
  cerrarDialogo();
  toast('OC creada', 'ok');
  invTab('oc');
}

async function invVerOC(id) {
  try {
    const r = await api('GET', '/api/inventory/purchase-orders/' + id);
    if (r.status !== 200) throw new Error(r.data && r.data.error || 'error');
    const o = r.data.purchaseOrder;
    const estCls = { borrador: 'b-warn', enviada: 'b-ac', parcial: 'b-ok', recibida: 'b-ok', cancelada: 'b-err' };
    abrirDialogo(`
      <h3>OC ${escH(o.numero)}</h3>
      <table>
        <tr><th>Proveedor</th><td>${escH(o.proveedor_nombre || '—')}</td><th>Estado</th><td>${badge(o.estado, estCls[o.estado] || 'b-ac')}</td></tr>
        <tr><th>Subtotal</th><td>${moneda(o.subtotal)}</td><th>Impuestos</th><td>${moneda(o.impuestos)}</td></tr>
        <tr><th>Total</th><td>${moneda(o.total)}</td><th>F. esperada</th><td>${fmtDate(o.fecha_entrega_esperada)}</td></tr>
      </table>
      <h4 style="margin:.8rem 0 .4rem">Ítems</h4>
      <table><tr><th>Descripción</th><th>Cant.</th><th>Recibida</th><th>P. unit.</th><th>Total</th></tr>
      ${o.items.map(it => `<tr><td>${escH(it.descripcion)}</td><td>${it.cantidad}</td><td>${it.cantidad_recibida}</td><td>${moneda(it.precio_unitario)}</td><td>${moneda(it.total)}</td></tr>`).join('')}</table>
      <div class="toolbar" style="margin-top:1rem">
        ${o.estado === 'borrador' && tiene('purchases:approve') ? `<button class="btn2 primary" onclick="invEstadoOC(${o.id}, 'enviada')">Enviar</button>` : ''}
        ${(o.estado === 'borrador' || o.estado === 'enviada') && tiene('purchases:create') ? `<button class="btn2 danger" onclick="invEstadoOC(${o.id}, 'cancelada')">Cancelar</button>` : ''}
        ${['enviada', 'parcial'].includes(o.estado) && tiene('purchases:receive') ? `<button class="btn2" onclick="invRecibirOC(${o.id})">📥 Recibir</button>` : ''}
        <button class="btn2" onclick="cerrarDialogo()">Cerrar</button>
      </div>`);
  } catch (e) { toast(e.message, 'err'); }
}
async function invEstadoOC(id, estado) {
  const r = await api('POST', `/api/inventory/purchase-orders/${id}/estado`, { estado });
  if (r.status !== 200) { toast((r.data && r.data.error) || 'error', 'err'); return; }
  toast('OC → ' + estado, 'ok');
  cerrarDialogo();
  invTab('oc');
}
async function invRecibirOC(id) {
  const r = await api('GET', '/api/inventory/purchase-orders/' + id);
  const o = r.data.purchaseOrder;
  abrirDialogo(`
    <h3>📥 Recibir OC ${escH(o.numero)}</h3>
    <p class="sub">Ingresa la cantidad recibida por ítem (parcial o total).</p>
    <table><tr><th>Ítem</th><th>Pendiente</th><th>Recibir</th></tr>
    ${o.items.map(it => `<tr>
      <td>${escH(it.descripcion)}</td>
      <td>${it.cantidad - it.cantidad_recibida}</td>
      <td><input class="sel rc-q" data-id="${it.id}" type="number" step="0.01" value="${it.cantidad - it.cantidad_recibida}" style="width:90px"></td></tr>`).join('')}</table>
    <div class="toolbar"><button class="btn2 primary" onclick="invGuardarRecepcion(${o.id})">Registrar recepción</button></div>
    <div class="err" id="rcErr" style="color:var(--err);font-size:.85rem"></div>`);
}
async function invGuardarRecepcion(id) {
  const items = [...document.querySelectorAll('.rc-q')].map(i => ({ poItemId: Number(i.dataset.id), cantidad: Number(i.value) || 0 })).filter(i => i.cantidad > 0);
  if (!items.length) { document.getElementById('rcErr').textContent = 'Indica al menos una cantidad a recibir'; return; }
  const r = await api('POST', `/api/inventory/purchase-orders/${id}/recibir`, { items });
  if (r.status !== 200) { document.getElementById('rcErr').textContent = (r.data && r.data.error) || 'error'; return; }
  cerrarDialogo();
  toast('Recepción registrada', 'ok');
  invTab('oc');
}

// ============ STOCK BAJO ============
async function invStockBajo(body) {
  body.innerHTML = '<div class="empty">Cargando…</div>';
  try {
    const r = await api('GET', '/api/inventory/stock/bajo');
    if (r.status !== 200) throw new Error(r.data && r.data.error || 'error');
    const rows = r.data.bajoStock || [];
    body.innerHTML = `
      <table><tr><th>Producto</th><th>Código</th><th>Stock</th><th>Mínimo</th></tr>
      ${rows.map(b => `<tr><td>${escH(b.nombre)}</td><td class="mono">${escH(b.codigo || '—')}</td>
        <td style="color:var(--err);font-weight:700">${b.stock_total}</td><td>${b.stock_minimo}</td></tr>`).join('')}</table>`;
  } catch (e) { body.innerHTML = '<div class="empty">' + escH(e.message) + '</div>'; }
}

// ============ DIÁLOGO (compartido) ============
function abrirDialogo(html) {
  const o = document.getElementById('dlgOverlay');
  o.innerHTML = `<div class="dlg"><button class="close" onclick="cerrarDialogo()">✕</button>${html}</div>`;
  o.classList.remove('hidden');
}
function cerrarDialogo() {
  document.getElementById('dlgOverlay').classList.add('hidden');
  document.getElementById('dlgOverlay').innerHTML = '';
}
document.getElementById('dlgOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'dlgOverlay') cerrarDialogo();
});