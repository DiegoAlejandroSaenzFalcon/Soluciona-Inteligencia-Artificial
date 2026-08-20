'use strict';
const { getClient } = require('../db/connection');

const num = v => (v == null || v === '' ? 0 : Number(v));
const red2 = v => Math.round(num(v) * 100) / 100;
const tenantId = 'default';

async function tx(fn) {
  const c = getClient();
  return c.begin(async t => fn(t));
}

// ============================================================
// HELPERS
// ============================================================
async function cuentaCodigo(codigo, c = getClient()) {
  const rows = await c.unsafe(`SELECT id, codigo, nombre FROM accounts WHERE tenant_id = $1 AND codigo = $2`, [tenantId, codigo]);
  if (!rows.length) throw Object.assign(new Error('cuenta_no_existe:' + codigo), { status: 500 });
  return rows[0];
}

async function siguienteNumero(prefix, tabla) {
  const c = getClient();
  const rows = await c.unsafe(`SELECT COALESCE(MAX(id),0)+1 AS n FROM ${tabla} WHERE tenant_id = $1`, [tenantId]);
  const n = num(rows[0].n);
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `${prefix}-${ymd}-${String(n).padStart(4, '0')}`;
}

function cuentaPago(metodo) {
  return metodo === 'efectivo' ? '1105' : '1110';
}

function sanitizarItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map(it => ({
    productId: it.productId != null ? Number(it.productId) : null,
    descripcion: String(it.descripcion || 'Producto'),
    cantidad: num(it.cantidad),
    precioUnitario: num(it.precioUnitario),
    descuento: num(it.descuento),
    impuestoCodigo: it.impuestoCodigo || '01',
    impuestoPorcentaje: it.impuestoPorcentaje != null ? num(it.impuestoPorcentaje) : 19,
  }));
}

function calcularTotales(items) {
  let subtotal = 0, impuestos = 0;
  for (const it of items) {
    const base = it.cantidad * it.precioUnitario - it.descuento;
    subtotal += base;
    impuestos += base * it.impuestoPorcentaje / 100;
  }
  subtotal = red2(subtotal);
  impuestos = red2(impuestos);
  return { subtotal, impuestos, total: red2(subtotal + impuestos) };
}

async function crearAsiento(opts, usuarioId = null, c = getClient()) {
  const lines = opts.lines || [];
  let totalDebito = 0, totalCredito = 0;
  for (const l of lines) { totalDebito += num(l.debito); totalCredito += num(l.credito); }
  if (red2(totalDebito) !== red2(totalCredito)) {
    throw Object.assign(new Error('asiento_desbalanceado'), { status: 400 });
  }
  const numero = await siguienteNumero(opts.prefijo || 'CJ', 'journal_entries');
  const estado = opts.estado || 'contabilizado';
  const rows = await c.unsafe(
    `INSERT INTO journal_entries
       (tenant_id, numero, fecha, concepto, referencia_tipo, referencia_id,
        total_debito, total_credito, estado, creado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [tenantId, numero, opts.fecha || new Date(), opts.concepto, opts.referenciaTipo || null,
     opts.referenciaId != null ? Number(opts.referenciaId) : null,
     String(totalDebito), String(totalCredito), estado, usuarioId || null]
  );
  const entryId = rows[0].id;
  for (const l of lines) {
    const acc = await cuentaCodigo(l.codigo, c);
    await c.unsafe(
      `INSERT INTO journal_entry_lines
         (entry_id, account_id, tercero_id, tercero_tipo, centro_costo, debito, credito, concepto)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [entryId, acc.id, l.terceroId != null ? Number(l.terceroId) : null, l.terceroTipo || null,
       l.centroCosto || null, String(num(l.debito)), String(num(l.credito)), l.concepto || null]
    );
  }
  return entryId;
}

// ============================================================
// CLIENTES (CxC)
// ============================================================
async function listCustomers({ q, activo } = {}) {
  const c = getClient();
  const params = [tenantId];
  let cond = 'tenant_id = $1';
  if (q) { params.push(`%${String(q).toLowerCase()}%`); cond += ` AND (lower(nombre) LIKE $${params.length} OR identificacion LIKE $${params.length})`; }
  if (activo != null) { params.push(!!activo); cond += ` AND activo = $${params.length}`; }
  const rows = await c.unsafe(
    `SELECT id, tipo_identificacion, identificacion, dv, nombre, nombre_comercial, email, telefono,
       direccion, ciudad, regimen, responsable_iva, cupo_credito, dias_credito, vendedor_id, activo, created_at
     FROM customers WHERE ${cond} ORDER BY nombre`,
    params
  );
  return rows.map(r => ({
    id: num(r.id), tipoIdentificacion: r.tipo_identificacion, identificacion: r.identificacion, dv: r.dv,
    nombre: r.nombre, nombreComercial: r.nombre_comercial, email: r.email, telefono: r.telefono,
    direccion: r.direccion, ciudad: r.ciudad, regimen: r.regimen, responsableIva: !!r.responsable_iva,
    cupoCredito: num(r.cupo_credito), diasCredito: num(r.dias_credito), vendedorId: r.vendedor_id,
    activo: !!r.activo,
  }));
}

async function getCustomer(id) {
  const c = getClient();
  const rows = await c.unsafe(`SELECT * FROM customers WHERE tenant_id = $1 AND id = $2`, [tenantId, Number(id)]);
  if (!rows.length) throw Object.assign(new Error('cliente_no_encontrado'), { status: 404 });
  const r = rows[0];
  return {
    id: num(r.id), tipoIdentificacion: r.tipo_identificacion, identificacion: r.identificacion, dv: r.dv,
    nombre: r.nombre, nombreComercial: r.nombre_comercial, email: r.email, telefono: r.telefono,
    direccion: r.direccion, ciudad: r.ciudad, regimen: r.regimen, responsableIva: !!r.responsable_iva,
    cupoCredito: num(r.cupo_credito), diasCredito: num(r.dias_credito), vendedorId: r.vendedor_id,
    activo: !!r.activo,
  };
}

async function createCustomer(data) {
  if (!data || !data.nombre) throw Object.assign(new Error('nombre_requerido'), { status: 400 });
  const c = getClient();
  try {
    const rows = await c.unsafe(
      `INSERT INTO customers
         (tenant_id, tipo_identificacion, identificacion, dv, nombre, nombre_comercial, email, telefono,
          direccion, ciudad, regimen, responsable_iva, cupo_credito, dias_credito, vendedor_id, activo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING id`,
      [tenantId, data.tipoIdentificacion || 'CC', data.identificacion || null, data.dv || null,
       String(data.nombre).trim(), data.nombreComercial || null, data.email || null, data.telefono || null,
       data.direccion || null, data.ciudad || null, data.regimen || 'común',
       data.responsableIva !== false,
       data.cupoCredito != null ? String(num(data.cupoCredito)) : '0',
       num(data.diasCredito) || 0, data.vendedorId != null ? Number(data.vendedorId) : null,
       data.activo !== false]
    );
    return getCustomer(rows[0].id);
  } catch (e) {
    if (e && e.code === '23505') throw Object.assign(new Error('cliente_ya_existe'), { status: 409 });
    throw e;
  }
}

async function updateCustomer(id, data) {
  const c = getClient();
  const sets = ['updated_at = now()'];
  const params = [];
  const push = (col, val) => { if (val !== undefined) { params.push(val); sets.push(`${col}=$${params.length}`); } };
  if (data.tipoIdentificacion !== undefined) push('tipo_identificacion', data.tipoIdentificacion);
  if (data.identificacion !== undefined) push('identificacion', data.identificacion || null);
  if (data.dv !== undefined) push('dv', data.dv || null);
  if (data.nombre !== undefined) push('nombre', String(data.nombre).trim());
  if (data.nombreComercial !== undefined) push('nombre_comercial', data.nombreComercial || null);
  if (data.email !== undefined) push('email', data.email || null);
  if (data.telefono !== undefined) push('telefono', data.telefono || null);
  if (data.direccion !== undefined) push('direccion', data.direccion || null);
  if (data.ciudad !== undefined) push('ciudad', data.ciudad || null);
  if (data.regimen !== undefined) push('regimen', data.regimen);
  if (data.responsableIva !== undefined) push('responsable_iva', !!data.responsableIva);
  if (data.cupoCredito !== undefined) push('cupo_credito', data.cupoCredito == null ? null : String(num(data.cupoCredito)));
  if (data.diasCredito !== undefined) push('dias_credito', num(data.diasCredito) || 0);
  if (data.vendedorId !== undefined) push('vendedor_id', data.vendedorId == null ? null : Number(data.vendedorId));
  if (data.activo !== undefined) push('activo', !!data.activo);
  if (!params.length) return getCustomer(id);
  params.push(Number(id), tenantId);
  await c.unsafe(`UPDATE customers SET ${sets.join(', ')} WHERE id = $${params.length - 1} AND tenant_id = $${params.length}`, params);
  return getCustomer(id);
}

// ============================================================
// FACTURAS (CxC)
// ============================================================
async function getInvoice(id) {
  const c = getClient();
  const rows = await c.unsafe(
    `SELECT i.*, cu.nombre AS cliente_nombre FROM invoices i
     LEFT JOIN customers cu ON cu.id = i.customer_id
     WHERE i.tenant_id = $1 AND i.id = $2`,
    [tenantId, Number(id)]
  );
  if (!rows.length) throw Object.assign(new Error('factura_no_encontrada'), { status: 404 });
  const i = rows[0];
  const items = await c.unsafe(
    `SELECT id, invoice_id, product_id, descripcion, cantidad, precio_unitario, descuento,
       impuesto_codigo, impuesto_porcentaje, total
     FROM invoice_items WHERE invoice_id = $1 ORDER BY id`,
    [Number(id)]
  );
  const pagos = await c.unsafe(
    `SELECT id, metodo, referencia, monto, fecha, estado, observacion
     FROM payments WHERE invoice_id = $1 AND tenant_id = $2 ORDER BY fecha`,
    [Number(id), tenantId]
  );
  const asiento = await c.unsafe(
    `SELECT id, numero, total_debito, total_credito, estado, fecha FROM journal_entries
     WHERE tenant_id = $1 AND referencia_tipo = 'invoice' AND referencia_id = $2 ORDER BY id`,
    [tenantId, Number(id)]
  );
  return {
    id: num(i.id), customerId: i.customer_id, clienteNombre: i.cliente_nombre, orderId: i.order_id,
    numero: i.numero, prefijo: i.prefijo, resolucion: i.resolucion,
    fecha: i.fecha, fechaVencimiento: i.fecha_vencimiento, estado: i.estado,
    subtotal: num(i.subtotal), descuento: num(i.descuento), impuestos: num(i.impuestos),
    total: num(i.total), saldoPendiente: num(i.saldo_pendiente),
    cufe: i.cufe, qrUrl: i.qr_url, xmlUrl: i.xml_url, pdfUrl: i.pdf_url,
    observacion: i.observacion,
    items: items.map(it => ({
      id: num(it.id), productId: it.product_id, descripcion: it.descripcion,
      cantidad: num(it.cantidad), precioUnitario: num(it.precio_unitario), descuento: num(it.descuento),
      impuestoCodigo: it.impuesto_codigo, impuestoPorcentaje: num(it.impuesto_porcentaje), total: num(it.total),
    })),
    pagos: pagos.map(p => ({
      id: num(p.id), metodo: p.metodo, referencia: p.referencia, monto: num(p.monto),
      fecha: p.fecha, estado: p.estado, observacion: p.observacion,
    })),
    asientos: asiento.map(a => ({ id: num(a.id), numero: a.numero, totalDebito: num(a.total_debito), totalCredito: num(a.total_credito), estado: a.estado, fecha: a.fecha })),
  };
}

async function listInvoices({ estado, clienteId, desde, hasta } = {}) {
  const c = getClient();
  const params = [tenantId];
  let cond = 'i.tenant_id = $1';
  if (estado) { params.push(estado); cond += ` AND i.estado = $${params.length}`; }
  if (clienteId) { params.push(Number(clienteId)); cond += ` AND i.customer_id = $${params.length}`; }
  if (desde) { params.push(new Date(desde)); cond += ` AND i.fecha >= $${params.length}`; }
  if (hasta) { params.push(new Date(hasta)); cond += ` AND i.fecha <= $${params.length}`; }
  const rows = await c.unsafe(
    `SELECT i.id, i.numero, i.prefijo, i.fecha, i.fecha_vencimiento, i.estado, i.subtotal, i.descuento,
       i.impuestos, i.total, i.saldo_pendiente, i.customer_id, cu.nombre AS cliente_nombre
     FROM invoices i LEFT JOIN customers cu ON cu.id = i.customer_id
     WHERE ${cond} ORDER BY i.fecha DESC, i.id DESC LIMIT 500`,
    params
  );
  return rows.map(r => ({
    id: num(r.id), numero: r.numero, prefijo: r.prefijo, fecha: r.fecha, fechaVencimiento: r.fecha_vencimiento,
    estado: r.estado, subtotal: num(r.subtotal), descuento: num(r.descuento), impuestos: num(r.impuestos),
    total: num(r.total), saldoPendiente: num(r.saldo_pendiente),
    customerId: r.customer_id, clienteNombre: r.cliente_nombre,
  }));
}

async function createInvoice(data, usuarioId = null) {
  if (!data || !data.customerId) throw Object.assign(new Error('cliente_requerido'), { status: 400 });
  const items = sanitizarItems(data.items);
  if (!items.length) throw Object.assign(new Error('sin_items'), { status: 400 });
  const cust = await getCustomer(Number(data.customerId));
  if (!cust.activo) throw Object.assign(new Error('cliente_inactivo'), { status: 409 });
  const { subtotal, impuestos, total } = calcularTotales(items);
  const fecha = data.fecha ? new Date(data.fecha) : new Date();
  let fechaVencimiento = data.fechaVencimiento ? new Date(data.fechaVencimiento) : null;
  if (!fechaVencimiento && cust.diasCredito > 0) {
    fechaVencimiento = new Date(fecha);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + cust.diasCredito);
  }
  const numero = await siguienteNumero(data.prefijo || 'SETP', 'invoices');
  let invoiceId;
  await tx(async c => {
    const rows = await c.unsafe(
      `INSERT INTO invoices
         (tenant_id, customer_id, order_id, numero, prefijo, resolucion, fecha, fecha_vencimiento,
          estado, subtotal, descuento, impuestos, total, saldo_pendiente, observacion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'emitida',$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [tenantId, cust.id, data.orderId != null ? Number(data.orderId) : null, numero,
       data.prefijo || 'SETP', data.resolucion || null, fecha, fechaVencimiento,
       String(subtotal), '0', String(impuestos), String(total), String(total), data.observacion || null]
    );
    invoiceId = rows[0].id;
    for (const it of items) {
      await c.unsafe(
        `INSERT INTO invoice_items
           (invoice_id, product_id, descripcion, cantidad, precio_unitario, descuento,
            impuesto_codigo, impuesto_porcentaje, total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [invoiceId, it.productId, it.descripcion, String(it.cantidad), String(it.precioUnitario),
         String(it.descuento), it.impuestoCodigo, String(it.impuestoPorcentaje),
         String(red2(it.cantidad * it.precioUnitario - it.descuento))]
      );
    }
    await crearAsiento({
      concepto: `Factura de venta ${numero}`,
      referenciaTipo: 'invoice', referenciaId: invoiceId, fecha,
      lines: [
        { codigo: '1305', debito: total, credito: 0, terceroId: cust.id, terceroTipo: 'customer', concepto: `Factura ${numero}` },
        { codigo: '4105', debito: 0, credito: subtotal, terceroId: cust.id, terceroTipo: 'customer', concepto: 'Ventas nacionales' },
        { codigo: '2320', debito: 0, credito: impuestos, concepto: 'IVA generado' },
      ],
    }, usuarioId, c);
  });
  return getInvoice(invoiceId);
}

async function anularInvoice(id, usuarioId = null) {
  const inv = await getInvoice(id);
  if (inv.estado !== 'emitida') throw Object.assign(new Error('factura_no_emitida'), { status: 409 });
  await tx(async c => {
    await c.unsafe(`UPDATE invoices SET estado = 'anulada', saldo_pendiente = 0 WHERE id = $1 AND tenant_id = $2`, [Number(id), tenantId]);
    await crearAsiento({
      concepto: `Anulación factura ${inv.numero}`,
      referenciaTipo: 'invoice', referenciaId: Number(id),
      lines: [
        { codigo: '4105', debito: inv.subtotal, credito: 0, terceroId: inv.customerId, terceroTipo: 'customer', concepto: `Anulación ${inv.numero}` },
        { codigo: '2320', debito: inv.impuestos, credito: 0, concepto: 'IVA anulado' },
        { codigo: '1305', debito: 0, credito: inv.total, terceroId: inv.customerId, terceroTipo: 'customer', concepto: `Anulación ${inv.numero}` },
      ],
    }, usuarioId, c);
  });
  return getInvoice(id);
}

async function createCreditNote(data, usuarioId = null) {
  if (!data || !data.invoiceId) throw Object.assign(new Error('factura_requerida'), { status: 400 });
  const inv = await getInvoice(Number(data.invoiceId));
  if (inv.estado !== 'emitida') throw Object.assign(new Error('factura_no_emitida'), { status: 409 });
  const subtotal = red2(data.subtotal != null ? num(data.subtotal) : inv.subtotal);
  const impuestos = red2(data.impuestos != null ? num(data.impuestos) : inv.impuestos);
  const total = red2(subtotal + impuestos);
  if (total > inv.saldoPendiente) throw Object.assign(new Error('monto_excede_saldo'), { status: 409 });
  const numero = await siguienteNumero('NC', 'credit_notes');
  let ncId;
  await tx(async c => {
    const rows = await c.unsafe(
      `INSERT INTO credit_notes (tenant_id, invoice_id, numero, prefijo, fecha, motivo, subtotal, impuestos, total, estado)
       VALUES ($1,$2,$3,'NC',now(),$4,$5,$6,$7,'emitida') RETURNING id`,
      [tenantId, Number(data.invoiceId), numero, data.motivo || 'devolución',
       String(subtotal), String(impuestos), String(total)]
    );
    ncId = rows[0].id;
    await c.unsafe(`UPDATE invoices SET saldo_pendiente = $1 WHERE id = $2 AND tenant_id = $3`,
      [String(red2(inv.saldoPendiente - total)), Number(data.invoiceId), tenantId]);
    await crearAsiento({
      concepto: `Nota crédito ${numero} de factura ${inv.numero}`,
      referenciaTipo: 'credit_note', referenciaId: ncId,
      lines: [
        { codigo: '4105', debito: subtotal, credito: 0, terceroId: inv.customerId, terceroTipo: 'customer', concepto: `NC ${numero}` },
        { codigo: '2320', debito: impuestos, credito: 0, concepto: 'IVA NC' },
        { codigo: '1305', debito: 0, credito: total, terceroId: inv.customerId, terceroTipo: 'customer', concepto: `NC ${numero}` },
      ],
    }, usuarioId, c);
  });
  const r = await getClient().unsafe(`SELECT id, numero, fecha, motivo, subtotal, impuestos, total, estado FROM credit_notes WHERE id = $1`, [ncId]);
  return { ...r[0], subtotal: num(r[0].subtotal), impuestos: num(r[0].impuestos), total: num(r[0].total) };
}

// ============================================================
// PAGOS (CxC cobros / CxP pagos)
// ============================================================
async function getPayment(id) {
  const c = getClient();
  const rows = await c.unsafe(
    `SELECT p.*, i.numero AS factura_numero, po.numero AS po_numero,
       cu.nombre AS cliente_nombre, su.nombre AS proveedor_nombre
     FROM payments p
     LEFT JOIN invoices i ON i.id = p.invoice_id
     LEFT JOIN purchase_orders po ON po.id = p.purchase_order_id
     LEFT JOIN customers cu ON cu.id = p.customer_id
     LEFT JOIN suppliers su ON su.id = p.supplier_id
     WHERE p.tenant_id = $1 AND p.id = $2`,
    [tenantId, Number(id)]
  );
  if (!rows.length) throw Object.assign(new Error('pago_no_encontrado'), { status: 404 });
  const p = rows[0];
  return {
    id: num(p.id), invoiceId: p.invoice_id, purchaseOrderId: p.purchase_order_id,
    customerId: p.customer_id, supplierId: p.supplier_id, tipo: p.tipo, metodo: p.metodo,
    referencia: p.referencia, monto: num(p.monto), fecha: p.fecha, estado: p.estado,
    observacion: p.observacion, facturaNumero: p.factura_numero, poNumero: p.po_numero,
    clienteNombre: p.cliente_nombre, proveedorNombre: p.proveedor_nombre,
  };
}

async function listPayments({ tipo, desde, hasta } = {}) {
  const c = getClient();
  const params = [tenantId];
  let cond = 'p.tenant_id = $1';
  if (tipo) { params.push(tipo); cond += ` AND p.tipo = $${params.length}`; }
  if (desde) { params.push(new Date(desde)); cond += ` AND p.fecha >= $${params.length}`; }
  if (hasta) { params.push(new Date(hasta)); cond += ` AND p.fecha <= $${params.length}`; }
  const rows = await c.unsafe(
    `SELECT p.id, p.invoice_id, p.purchase_order_id, p.customer_id, p.supplier_id, p.tipo, p.metodo,
       p.referencia, p.monto, p.fecha, p.estado, p.observacion,
       i.numero AS factura_numero, po.numero AS po_numero, cu.nombre AS cliente_nombre, su.nombre AS proveedor_nombre
     FROM payments p
     LEFT JOIN invoices i ON i.id = p.invoice_id
     LEFT JOIN purchase_orders po ON po.id = p.purchase_order_id
     LEFT JOIN customers cu ON cu.id = p.customer_id
     LEFT JOIN suppliers su ON su.id = p.supplier_id
     WHERE ${cond} ORDER BY p.fecha DESC, p.id DESC LIMIT 500`,
    params
  );
  return rows.map(r => ({
    id: num(r.id), invoiceId: r.invoice_id, purchaseOrderId: r.purchase_order_id,
    customerId: r.customer_id, supplierId: r.supplier_id, tipo: r.tipo, metodo: r.metodo,
    referencia: r.referencia, monto: num(r.monto), fecha: r.fecha, estado: r.estado,
    observacion: r.observacion, facturaNumero: r.factura_numero, poNumero: r.po_numero,
    clienteNombre: r.cliente_nombre, proveedorNombre: r.proveedor_nombre,
  }));
}

async function registrarPago(data, usuarioId = null) {
  if (!data || !data.tipo || !data.monto) throw Object.assign(new Error('datos_incompletos'), { status: 400 });
  const tipo = data.tipo === 'cobro' ? 'cobro' : data.tipo === 'pago' ? 'pago' : null;
  if (!tipo) throw Object.assign(new Error('tipo_invalido'), { status: 400 });
  const monto = red2(num(data.monto));
  if (monto <= 0) throw Object.assign(new Error('monto_invalido'), { status: 400 });
  const metodo = data.metodo || 'efectivo';
  const validos = ['efectivo', 'tarjeta', 'transferencia', 'nequi', 'daviplata', 'pse', 'credito'];
  if (!validos.includes(metodo)) throw Object.assign(new Error('metodo_invalido'), { status: 400 });
  let pagoId;
  await tx(async c => {
    if (tipo === 'cobro') {
      if (!data.invoiceId) throw Object.assign(new Error('factura_requerida'), { status: 400 });
      const inv = await getInvoice(Number(data.invoiceId));
      if (inv.estado !== 'emitida') throw Object.assign(new Error('factura_no_emitida'), { status: 409 });
      const saldo = inv.saldoPendiente;
      if (monto > saldo) throw Object.assign(new Error('monto_excede_saldo'), { status: 409 });
      const rows = await c.unsafe(
        `INSERT INTO payments
           (tenant_id, invoice_id, purchase_order_id, customer_id, supplier_id, tipo, metodo,
            referencia, monto, fecha, estado, observacion, creado_por)
         VALUES ($1,$2,NULL,$3,NULL,$4,$5,$6,$7,now(),'aplicado',$8,$9) RETURNING id`,
        [tenantId, Number(data.invoiceId), inv.customerId, tipo, metodo, data.referencia || null,
         String(monto), data.observacion || null, usuarioId]
      );
      pagoId = rows[0].id;
      await c.unsafe(`UPDATE invoices SET saldo_pendiente = $1 WHERE id = $2`,
        [String(red2(saldo - monto)), Number(data.invoiceId)]);
      await crearAsiento({
        concepto: `Cobro factura ${inv.numero}`,
        referenciaTipo: 'payment', referenciaId: pagoId,
        lines: [
          { codigo: cuentaPago(metodo), debito: monto, credito: 0, concepto: 'Recaudo ' + metodo },
          { codigo: '1305', debito: 0, credito: monto, terceroId: inv.customerId, terceroTipo: 'customer', concepto: `Cobro ${inv.numero}` },
        ],
      }, usuarioId, c);
    } else {
      if (!data.purchaseOrderId) throw Object.assign(new Error('oc_requerida'), { status: 400 });
      const poRows = await c.unsafe(
        `SELECT id, numero, total, supplier_id FROM purchase_orders WHERE tenant_id = $1 AND id = $2`,
        [tenantId, Number(data.purchaseOrderId)]
      );
      if (!poRows.length) throw Object.assign(new Error('oc_no_encontrada'), { status: 404 });
      const po = poRows[0];
      if (po.estado === 'borrador' || po.estado === 'cancelada') throw Object.assign(new Error('oc_no_recepcionada'), { status: 409 });
      const pagado = await c.unsafe(
        `SELECT COALESCE(SUM(monto),0)::text AS total FROM payments WHERE purchase_order_id = $1 AND tenant_id = $2 AND estado = 'aplicado'`,
        [Number(data.purchaseOrderId), tenantId]
      );
      const saldo = red2(num(po.total) - num(pagado[0].total));
      if (monto > saldo) throw Object.assign(new Error('monto_excede_saldo'), { status: 409 });
      const rows = await c.unsafe(
        `INSERT INTO payments
           (tenant_id, invoice_id, purchase_order_id, customer_id, supplier_id, tipo, metodo,
            referencia, monto, fecha, estado, observacion, creado_por)
         VALUES ($1,NULL,$2,NULL,$3,$4,$5,$6,$7,now(),'aplicado',$8,$9) RETURNING id`,
        [tenantId, Number(data.purchaseOrderId), po.supplier_id, tipo, metodo, data.referencia || null,
         String(monto), data.observacion || null, usuarioId]
      );
      pagoId = rows[0].id;
      await crearAsiento({
        concepto: `Pago a proveedor OC ${po.numero}`,
        referenciaTipo: 'payment', referenciaId: pagoId,
        lines: [
          { codigo: '2205', debito: monto, credito: 0, terceroId: po.supplier_id, terceroTipo: 'supplier', concepto: `Pago ${po.numero}` },
          { codigo: cuentaPago(metodo), debito: 0, credito: monto, concepto: 'Desembolso ' + metodo },
        ],
      }, usuarioId, c);
    }
  });
  return getPayment(pagoId);
}

async function anularPago(id, usuarioId = null) {
  const pago = await getPayment(id);
  if (pago.estado !== 'aplicado') throw Object.assign(new Error('pago_no_aplicado'), { status: 409 });
  await tx(async c => {
    await c.unsafe(`UPDATE payments SET estado = 'anulado' WHERE id = $1`, [Number(id)]);
    if (pago.tipo === 'cobro' && pago.invoiceId) {
      const inv = await getClient().unsafe(`SELECT saldo_pendiente FROM invoices WHERE id = $1`, [pago.invoiceId]);
      await c.unsafe(`UPDATE invoices SET saldo_pendiente = $1 WHERE id = $2`,
        [String(red2(num(inv[0].saldo_pendiente) + pago.monto)), pago.invoiceId]);
    }
    await crearAsiento({
      concepto: `Anulación pago #${pago.id}`,
      referenciaTipo: 'payment', referenciaId: Number(id),
      lines: [
        { codigo: '1305', debito: pago.monto, credito: 0, terceroId: pago.customerId, terceroTipo: 'customer', concepto: `Anula pago #${pago.id}` },
        { codigo: cuentaPago(pago.metodo), debito: 0, credito: pago.monto, concepto: 'Reversa ' + pago.metodo },
      ],
    }, usuarioId, c);
  });
  return getPayment(id);
}

// ============================================================
// AGING (CxC / CxP)
// ============================================================
function bucketear(dias) {
  if (dias <= 0) return 'alDia';
  if (dias <= 30) return 'r0_30';
  if (dias <= 60) return 'r31_60';
  if (dias <= 90) return 'r61_90';
  return 'r91_mas';
}

async function agingCxC() {
  const c = getClient();
  const rows = await c.unsafe(
    `SELECT i.id, i.numero, i.fecha, i.fecha_vencimiento, i.total, i.saldo_pendiente,
       i.customer_id, cu.nombre AS cliente_nombre
     FROM invoices i LEFT JOIN customers cu ON cu.id = i.customer_id
     WHERE i.tenant_id = $1 AND i.estado = 'emitida' AND i.saldo_pendiente > 0
     ORDER BY cu.nombre, i.fecha`,
    [tenantId]
  );
  const hoy = new Date();
  const grupos = new Map();
  const buckets = { alDia: 0, r0_30: 0, r31_60: 0, r61_90: 0, r91_mas: 0, total: 0 };
  const detalle = rows.map(r => {
    const venc = r.fecha_vencimiento || r.fecha;
    const dias = Math.floor((hoy - new Date(venc)) / 86400000);
    const b = bucketear(dias);
    const saldo = num(r.saldo_pendiente);
    buckets[b] = red2(buckets[b] + saldo);
    buckets.total = red2(buckets.total + saldo);
    const clave = String(r.customer_id || 'sin_cliente');
    if (!grupos.has(clave)) {
      grupos.set(clave, {
        customerId: r.customer_id, nombre: r.cliente_nombre || 'Sin cliente',
        alDia: 0, r0_30: 0, r31_60: 0, r61_90: 0, r91_mas: 0, saldo: 0,
      });
    }
    const g = grupos.get(clave);
    g[b] = red2(g[b] + saldo);
    g.saldo = red2(g.saldo + saldo);
    return { facturaId: num(r.id), numero: r.numero, fecha: r.fecha, fechaVencimiento: r.fecha_vencimiento, diasVencido: dias, saldo, bucket: b };
  });
  return { buckets, total: buckets.total, porCliente: [...grupos.values()], detalle };
}

async function agingCxP() {
  const c = getClient();
  const rows = await c.unsafe(
    `SELECT po.id, po.numero, po.fecha, po.fecha_entrega_esperada, po.total, po.estado,
       po.supplier_id, s.nombre AS proveedor_nombre,
       COALESCE((SELECT SUM(p.monto) FROM payments p WHERE p.purchase_order_id = po.id AND p.estado = 'aplicado'),0) AS pagado
     FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id
     WHERE po.tenant_id = $1 AND po.estado IN ('enviada','parcial','recibida')
     ORDER BY s.nombre, po.fecha`,
    [tenantId]
  );
  const hoy = new Date();
  const grupos = new Map();
  const buckets = { alDia: 0, r0_30: 0, r31_60: 0, r61_90: 0, r91_mas: 0, total: 0 };
  const detalle = [];
  for (const r of rows) {
    const saldo = red2(num(r.total) - num(r.pagado));
    if (saldo <= 0) continue;
    const venc = r.fecha_entrega_esperada || r.fecha;
    const dias = Math.floor((hoy - new Date(venc)) / 86400000);
    const b = bucketear(dias);
    buckets[b] = red2(buckets[b] + saldo);
    buckets.total = red2(buckets.total + saldo);
    const clave = String(r.supplier_id);
    if (!grupos.has(clave)) {
      grupos.set(clave, {
        supplierId: r.supplier_id, nombre: r.proveedor_nombre,
        alDia: 0, r0_30: 0, r31_60: 0, r61_90: 0, r91_mas: 0, saldo: 0,
      });
    }
    const g = grupos.get(clave);
    g[b] = red2(g[b] + saldo);
    g.saldo = red2(g.saldo + saldo);
    detalle.push({
      purchaseOrderId: num(r.id), numero: r.numero, fecha: r.fecha,
      fechaVencimiento: r.fecha_entrega_esperada, estado: r.estado,
      total: num(r.total), pagado: num(r.pagado), saldo, diasVencido: dias, bucket: b,
    });
  }
  return { buckets, total: buckets.total, porProveedor: [...grupos.values()], detalle };
}

// ============================================================
// ASIENTOS CONTABLES
// ============================================================
async function getAsiento(id) {
  const c = getClient();
  const rows = await c.unsafe(
    `SELECT * FROM journal_entries WHERE tenant_id = $1 AND id = $2`,
    [tenantId, Number(id)]
  );
  if (!rows.length) throw Object.assign(new Error('asiento_no_encontrado'), { status: 404 });
  const e = rows[0];
  const lines = await c.unsafe(
    `SELECT jel.id, jel.account_id, a.codigo, a.nombre, jel.tercero_id, jel.tercero_tipo,
       jel.centro_costo, jel.debito, jel.credito, jel.concepto
     FROM journal_entry_lines jel JOIN accounts a ON a.id = jel.account_id
     WHERE jel.entry_id = $1 ORDER BY jel.id`,
    [Number(id)]
  );
  return {
    id: num(e.id), numero: e.numero, fecha: e.fecha, concepto: e.concepto,
    referenciaTipo: e.referencia_tipo, referenciaId: e.referencia_id,
    totalDebito: num(e.total_debito), totalCredito: num(e.total_credito),
    estado: e.estado, creadoPor: e.creado_por, fechaContabilizacion: e.fecha_contabilizacion,
    lines: lines.map(l => ({
      id: num(l.id), accountId: num(l.account_id), codigo: l.codigo, cuenta: l.nombre,
      terceroId: l.tercero_id, terceroTipo: l.tercero_tipo, centroCosto: l.centro_costo,
      debito: num(l.debito), credito: num(l.credito), concepto: l.concepto,
    })),
  };
}

async function listarAsientos({ desde, hasta, estado } = {}) {
  const c = getClient();
  const params = [tenantId];
  let cond = 'tenant_id = $1';
  if (estado) { params.push(estado); cond += ` AND estado = $${params.length}`; }
  if (desde) { params.push(new Date(desde)); cond += ` AND fecha >= $${params.length}`; }
  if (hasta) { params.push(new Date(hasta)); cond += ` AND fecha <= $${params.length}`; }
  const rows = await c.unsafe(
    `SELECT id, numero, fecha, concepto, referencia_tipo, referencia_id, total_debito, total_credito, estado, creado_por
     FROM journal_entries WHERE ${cond} ORDER BY fecha DESC, id DESC LIMIT 500`,
    params
  );
  return rows.map(r => ({
    id: num(r.id), numero: r.numero, fecha: r.fecha, concepto: r.concepto,
    referenciaTipo: r.referencia_tipo, referenciaId: r.referencia_id,
    totalDebito: num(r.total_debito), totalCredito: num(r.total_credito),
    estado: r.estado, creadoPor: r.creado_por,
  }));
}

async function crearAsientoManual(data, usuarioId = null) {
  if (!data || !Array.isArray(data.lines) || !data.lines.length) {
    throw Object.assign(new Error('sin_lineas'), { status: 400 });
  }
  const lines = data.lines.map(l => ({
    codigo: String(l.codigo),
    debito: num(l.debito),
    credito: num(l.credito),
    terceroId: l.terceroId != null ? Number(l.terceroId) : null,
    terceroTipo: l.terceroTipo || null,
    centroCosto: l.centroCosto || null,
    concepto: l.concepto || null,
  }));
  const entryId = await crearAsiento({
    concepto: data.concepto || 'Asiento manual',
    fecha: data.fecha ? new Date(data.fecha) : new Date(),
    referenciaTipo: data.referenciaTipo || null,
    referenciaId: data.referenciaId || null,
    estado: data.estado === 'borrador' ? 'borrador' : 'contabilizado',
    lines,
  }, usuarioId);
  return getAsiento(entryId);
}

async function anularAsiento(id, usuarioId = null) {
  const a = await getAsiento(id);
  if (a.estado === 'anulado') throw Object.assign(new Error('asiento_anulado'), { status: 409 });
  const c = getClient();
  await c.unsafe(
    `UPDATE journal_entries SET estado = 'anulado', updated_at = now() WHERE id = $1 AND tenant_id = $2`,
    [Number(id), tenantId]
  );
  return getAsiento(id);
}

// ============================================================
// CONCILIACIÓN / RESUMEN
// ============================================================
async function conciliacionResumen({ desde, hasta } = {}) {
  const c = getClient();
  const cond = [];
  const params = [tenantId];
  if (desde) { params.push(new Date(desde)); cond.push(`fecha >= $${params.length}`); }
  if (hasta) { params.push(new Date(hasta)); cond.push(`fecha <= $${params.length}`); }
  const where = cond.length ? ` WHERE tenant_id = $1 AND ${cond.join(' AND ')}` : ` WHERE tenant_id = $1`;
  const inv = await c.unsafe(`SELECT COALESCE(SUM(total),0)::text t, COALESCE(SUM(saldo_pendiente),0)::text s FROM invoices${where}`, params);
  const cobros = await c.unsafe(`SELECT COALESCE(SUM(monto),0)::text t FROM payments${where} AND tipo='cobro' AND estado='aplicado'`, params);
  const pagos = await c.unsafe(`SELECT COALESCE(SUM(monto),0)::text t FROM payments${where} AND tipo='pago' AND estado='aplicado'`, params);
  const porMetodo = await c.unsafe(
    `SELECT metodo, COALESCE(SUM(monto),0)::text total, COUNT(*)::int cantidad FROM payments${where} AND estado='aplicado' GROUP BY metodo ORDER BY total DESC`,
    params
  );
  return {
    totalFacturado: num(inv[0].t),
    saldoCxC: num(inv[0].s),
    totalCobrado: num(cobros[0].t),
    totalPagadoProveedores: num(pagos[0].t),
    porMetodo: porMetodo.map(m => ({ metodo: m.metodo, total: num(m.total), cantidad: num(m.cantidad) })),
  };
}

module.exports = {
  listCustomers, getCustomer, createCustomer, updateCustomer,
  listInvoices, getInvoice, createInvoice, anularInvoice, createCreditNote,
  listPayments, getPayment, registrarPago, anularPago,
  agingCxC, agingCxP,
  listarAsientos, getAsiento, crearAsientoManual, anularAsiento,
  conciliacionResumen,
};