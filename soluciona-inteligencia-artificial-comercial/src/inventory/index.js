'use strict';
const { getClient } = require('../db/connection');

const num = v => (v == null || v === '' ? 0 : Number(v));
const tenantId = 'default';

async function tx(fn) {
  const c = getClient();
  return c.begin(async t => fn(t));
}

// ============================================================
// CATEGORÍAS
// ============================================================
async function listCategories(activo) {
  const c = getClient();
  const rows = await c.unsafe(
    `SELECT c.id, c.nombre, c.descripcion, c.orden, c.activo,
       (SELECT COUNT(*)::int FROM products p WHERE p.category_id = c.id) AS productos
     FROM categories c WHERE c.tenant_id = $1 ${activo == null ? '' : 'AND c.activo = $2'}
     ORDER BY c.orden, c.nombre`,
    activo == null ? [tenantId] : [tenantId, !!activo]
  );
  return rows;
}

async function createCategory(data) {
  if (!data || !data.nombre) throw Object.assign(new Error('nombre_requerido'), { status: 400 });
  const c = getClient();
  try {
    const rows = await c.unsafe(
      `INSERT INTO categories (tenant_id, nombre, descripcion, orden, activo)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre, descripcion, orden, activo`,
      [tenantId, String(data.nombre).trim(), data.descripcion || null, num(data.orden), data.activo !== false]
    );
    return rows[0];
  } catch (e) {
    if (e && e.code === '23505') throw Object.assign(new Error('categoria_existe'), { status: 409 });
    throw e;
  }
}

async function updateCategory(id, data) {
  const c = getClient();
  const rows = await c.unsafe(
    `UPDATE categories SET
       nombre = COALESCE($1, nombre),
       descripcion = COALESCE($2, descripcion),
       orden = COALESCE($3, orden),
       activo = COALESCE($4, activo)
     WHERE tenant_id = $5 AND id = $6
     RETURNING id, nombre, descripcion, orden, activo`,
    [
      data.nombre != null ? String(data.nombre).trim() : null,
      data.descripcion != null ? data.descripcion : null,
      data.orden != null ? num(data.orden) : null,
      data.activo != null ? !!data.activo : null,
      tenantId, Number(id)
    ]
  );
  if (!rows.length) throw Object.assign(new Error('no_encontrado'), { status: 404 });
  return rows[0];
}

async function deleteCategory(id) {
  const c = getClient();
  const n = await c.unsafe(
    'UPDATE categories SET activo = false WHERE tenant_id = $1 AND id = $2 RETURNING 1',
    [tenantId, Number(id)]
  );
  if (!n.length) throw Object.assign(new Error('no_encontrado'), { status: 404 });
  return { ok: true };
}

// ============================================================
// PRODUCTOS
// ============================================================
const PRODUCT_SELECT = `
  SELECT p.*, c.nombre AS categoria_nombre,
    COALESCE(SUM(s.cantidad)::numeric, 0) AS stock_total,
    COALESCE((SELECT COUNT(*)::int FROM product_variants pv WHERE pv.product_id = p.id), 0) AS variantes
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN stock s ON s.product_id = p.id
`;

async function listProducts(opts = {}) {
  const c = getClient();
  const where = ['p.tenant_id = $1'];
  const params = [tenantId];
  if (opts.categoria) { params.push(Number(opts.categoria)); where.push(`p.category_id = $${params.length}`); }
  if (opts.activo != null) { params.push(!!opts.activo); where.push(`p.activo = $${params.length}`); }
  if (opts.q) { params.push(`%${String(opts.q).toLowerCase()}%`); where.push(`(LOWER(p.nombre) LIKE $${params.length} OR p.codigo ILIKE $${params.length} OR p.codigo_barras ILIKE $${params.length})`); }
  const rows = await c.unsafe(
    `${PRODUCT_SELECT} WHERE ${where.join(' AND ')}
     GROUP BY p.id, c.nombre
     ORDER BY p.nombre ASC LIMIT 500`,
    params
  );
  return rows.map(mapaProducto);
}

function mapaProducto(r) {
  return {
    ...r,
    id: num(r.id),
    precio: r.precio == null ? null : num(r.precio),
    costo: r.costo == null ? null : num(r.costo),
    stockMinimo: r.stock_minimo == null ? null : num(r.stock_minimo),
    stockMaximo: r.stock_maximo == null ? null : num(r.stock_maximo),
    stock_total: num(r.stock_total),
    variantes: num(r.variantes),
  };
}

async function getProduct(id) {
  const c = getClient();
  const rows = await c.unsafe(`${PRODUCT_SELECT} WHERE p.tenant_id = $1 AND p.id = $2 GROUP BY p.id, c.nombre`, [tenantId, Number(id)]);
  if (!rows.length) throw Object.assign(new Error('no_encontrado'), { status: 404 });
  const producto = mapaProducto(rows[0]);
  producto.variants = await listVariants(id);
  producto.stock = await getStock(id);
  return producto;
}

async function createProduct(data) {
  if (!data || !data.nombre) throw Object.assign(new Error('nombre_requerido'), { status: 400 });
  if (data.precio == null) throw Object.assign(new Error('precio_requerido'), { status: 400 });
  let productId;
  await tx(async c => {
    const rows = await c.unsafe(
      `INSERT INTO products
        (tenant_id, category_id, codigo, codigo_barras, nombre, descripcion, ingredientes,
         precio, costo, unidad_medida, maneja_stock, stock_minimo, stock_maximo, ubicacion,
         imagen_url, aliases, impuestos, activo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING id`,
      [
        tenantId,
        data.categoryId != null ? Number(data.categoryId) : null,
        data.codigo || null,
        data.codigoBarras || null,
        String(data.nombre).trim(),
        data.descripcion || null,
        data.ingredientes || null,
        String(num(data.precio)),
        data.costo != null ? String(num(data.costo)) : null,
        data.unidadMedida || 'unidad',
        data.manejaStock !== false,
        data.stockMinimo != null ? String(num(data.stockMinimo)) : '0',
        data.stockMaximo != null ? String(num(data.stockMaximo)) : null,
        data.ubicacion || null,
        data.imagenUrl || null,
        JSON.stringify(Array.isArray(data.aliases) ? data.aliases : []),
        JSON.stringify(Array.isArray(data.impuestos) ? data.impuestos : []),
        data.activo !== false
      ]
    );
    productId = rows[0].id;

    const variants = Array.isArray(data.variants) ? data.variants : [];
    for (const v of variants) {
      await c.unsafe(
        `INSERT INTO product_variants (product_id, nombre, sku, precio_adicional, stock, activo)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [productId, String(v.nombre), v.sku || null, String(num(v.precioAdicional)), String(num(v.stock)), v.activo !== false]
      );
    }

    const bodegas = Array.isArray(data.bodegas) && data.bodegas.length ? data.bodegas : ['principal'];
    if (variants.length) {
      const variantesDb = await c.unsafe('SELECT id FROM product_variants WHERE product_id = $1 ORDER BY id', [productId]);
      for (let i = 0; i < variantesDb.length; i++) {
        for (const b of bodegas) {
          await c.unsafe(
            `INSERT INTO stock (tenant_id, product_id, variant_id, bodega, cantidad)
             VALUES ($1,$2,$3,$4,$5) ON CONFLICT (tenant_id, product_id, variant_id, bodega) DO NOTHING`,
            [tenantId, productId, variantesDb[i].id, b, String(num(variants[i].stock))]
          );
        }
      }
    } else {
      for (const b of bodegas) {
        await c.unsafe(
          `INSERT INTO stock (tenant_id, product_id, variant_id, bodega, cantidad)
           VALUES ($1,$2,NULL,$3,$4) ON CONFLICT (tenant_id, product_id, variant_id, bodega) DO NOTHING`,
          [tenantId, productId, b, String(num(data.stockInicial))]
        );
      }
    }
  });
  return getProduct(productId);
}

async function updateProduct(id, data) {
  const cols = ['category_id','codigo','codigo_barras','nombre','descripcion','ingredientes','precio','costo','unidad_medida','maneja_stock','stock_minimo','stock_maximo','ubicacion','imagen_url','aliases','impuestos','activo'];
  const sets = [];
  const params = [];
  const push = (col, val) => { if (val !== undefined) { params.push(val); sets.push(`${col}=$${params.length}`); } };
  if (data.categoryId !== undefined) push('category_id', data.categoryId == null ? null : Number(data.categoryId));
  if (data.codigo !== undefined) push('codigo', data.codigo || null);
  if (data.codigoBarras !== undefined) push('codigo_barras', data.codigoBarras || null);
  if (data.nombre !== undefined) push('nombre', String(data.nombre).trim());
  if (data.descripcion !== undefined) push('descripcion', data.descripcion || null);
  if (data.ingredientes !== undefined) push('ingredientes', data.ingredientes || null);
  if (data.precio !== undefined) push('precio', String(num(data.precio)));
  if (data.costo !== undefined) push('costo', data.costo == null ? null : String(num(data.costo)));
  if (data.unidadMedida !== undefined) push('unidad_medida', data.unidadMedida || 'unidad');
  if (data.manejaStock !== undefined) push('maneja_stock', !!data.manejaStock);
  if (data.stockMinimo !== undefined) push('stock_minimo', data.stockMinimo == null ? '0' : String(num(data.stockMinimo)));
  if (data.stockMaximo !== undefined) push('stock_maximo', data.stockMaximo == null ? null : String(num(data.stockMaximo)));
  if (data.ubicacion !== undefined) push('ubicacion', data.ubicacion || null);
  if (data.imagenUrl !== undefined) push('imagen_url', data.imagenUrl || null);
  if (data.aliases !== undefined) push('aliases', JSON.stringify(Array.isArray(data.aliases) ? data.aliases : []));
  if (data.impuestos !== undefined) push('impuestos', JSON.stringify(Array.isArray(data.impuestos) ? data.impuestos : []));
  if (data.activo !== undefined) push('activo', !!data.activo);
  if (!sets.length) throw Object.assign(new Error('sin_cambios'), { status: 400 });
  params.push(Number(id), tenantId);
  const c = getClient();
  const rows = await c.unsafe(
    `UPDATE products SET ${sets.join(', ')}, updated_at = now() WHERE id = $${params.length - 1} AND tenant_id = $${params.length} RETURNING id`,
    params
  );
  if (!rows.length) throw Object.assign(new Error('no_encontrado'), { status: 404 });
  return getProduct(id);
}

async function deleteProduct(id) {
  const c = getClient();
  const n = await c.unsafe('UPDATE products SET activo = false WHERE tenant_id = $1 AND id = $2 RETURNING 1', [tenantId, Number(id)]);
  if (!n.length) throw Object.assign(new Error('no_encontrado'), { status: 404 });
  return { ok: true };
}

// ============================================================
// VARIANTES
// ============================================================
async function listVariants(productId) {
  const c = getClient();
  const rows = await c.unsafe(
    'SELECT id, product_id, nombre, sku, precio_adicional, stock, activo FROM product_variants WHERE product_id = $1 ORDER BY id',
    [Number(productId)]
  );
  return rows.map(r => ({ ...r, precio_adicional: num(r.precio_adicional), stock: num(r.stock) }));
}

async function addVariant(productId, data) {
  if (!data || !data.nombre) throw Object.assign(new Error('nombre_requerido'), { status: 400 });
  return tx(async c => {
    const rows = await c.unsafe(
      `INSERT INTO product_variants (product_id, nombre, sku, precio_adicional, stock, activo)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [Number(productId), String(data.nombre).trim(), data.sku || null, String(num(data.precioAdicional)), String(num(data.stock)), data.activo !== false]
    );
    const variantId = rows[0].id;
    const bodega = data.bodega || 'principal';
    await c.unsafe(
      `INSERT INTO stock (tenant_id, product_id, variant_id, bodega, cantidad)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (tenant_id, product_id, variant_id, bodega) DO NOTHING`,
      [tenantId, Number(productId), variantId, bodega, String(num(data.stock))]
    );
    return { id: variantId };
  });
}

async function updateVariant(id, data) {
  const sets = [];
  const params = [];
  const push = (col, val) => { if (val !== undefined) { params.push(val); sets.push(`${col}=$${params.length}`); } };
  if (data.nombre !== undefined) push('nombre', String(data.nombre).trim());
  if (data.sku !== undefined) push('sku', data.sku || null);
  if (data.precioAdicional !== undefined) push('precio_adicional', String(num(data.precioAdicional)));
  if (data.stock !== undefined) push('stock', String(num(data.stock)));
  if (data.activo !== undefined) push('activo', !!data.activo);
  if (!sets.length) throw Object.assign(new Error('sin_cambios'), { status: 400 });
  params.push(Number(id));
  const c = getClient();
  const rows = await c.unsafe(`UPDATE product_variants SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING id`, params);
  if (!rows.length) throw Object.assign(new Error('no_encontrado'), { status: 404 });
  return { ok: true };
}

async function deleteVariant(id) {
  const c = getClient();
  const n = await c.unsafe('UPDATE product_variants SET activo = false WHERE id = $1 RETURNING 1', [Number(id)]);
  if (!n.length) throw Object.assign(new Error('no_encontrado'), { status: 404 });
  return { ok: true };
}

// ============================================================
// STOCK + KARDEX
// ============================================================
async function getStock(productId) {
  const c = getClient();
  const rows = await c.unsafe(
    `SELECT s.id, s.product_id, s.variant_id, s.bodega, s.cantidad, s.reservado, s.updated_at,
       pv.nombre AS variante_nombre, p.nombre AS producto_nombre
     FROM stock s
     LEFT JOIN product_variants pv ON pv.id = s.variant_id
     JOIN products p ON p.id = s.product_id
     WHERE s.tenant_id = $1 AND s.product_id = $2
     ORDER BY s.bodega, pv.nombre`,
    [tenantId, Number(productId)]
  );
  return rows.map(r => ({ ...r, cantidad: num(r.cantidad), reservado: num(r.reservado) }));
}

async function ajustarStock(productId, opts = {}) {
  const { variantId = null, bodega = 'principal', cantidad, usuarioId = null, observacion = '' } = opts;
  if (cantidad == null) throw Object.assign(new Error('cantidad_requerida'), { status: 400 });
  const nueva = num(cantidad);
  return tx(async c => {
    const existente = await c.unsafe(
      'SELECT cantidad FROM stock WHERE tenant_id=$1 AND product_id=$2 AND variant_id IS NOT DISTINCT FROM $3 AND bodega=$4',
      [tenantId, Number(productId), variantId, bodega]
    );
    const anterior = existente.length ? num(existente[0].cantidad) : 0;
    const delta = nueva - anterior;
    await c.unsafe(
      `INSERT INTO stock (tenant_id, product_id, variant_id, bodega, cantidad)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (tenant_id, product_id, variant_id, bodega)
       DO UPDATE SET cantidad = $5, updated_at = now()`,
      [tenantId, Number(productId), variantId, bodega, String(nueva)]
    );
    if (delta !== 0) {
      await c.unsafe(
        `INSERT INTO stock_movements (tenant_id, product_id, variant_id, bodega, tipo, cantidad, costo_unitario, referencia_tipo, referencia_id, observacion, usuario_id)
         VALUES ($1,$2,$3,$4,$5,$6,NULL,'adjustment',NULL,$7,$8)`,
        [tenantId, Number(productId), variantId, bodega, delta > 0 ? 'ajuste_positivo' : 'ajuste_negativo', String(Math.abs(delta)), observacion || `Ajuste a ${nueva}`, usuarioId]
      );
    }
    return { productId: Number(productId), variantId, bodega, cantidad: nueva, anterior };
  });
}

async function trasladarStock(opts = {}) {
  const { productId, variantId = null, origen = 'principal', destino, cantidad, usuarioId = null, observacion = '' } = opts;
  if (!destino) throw Object.assign(new Error('destino_requerido'), { status: 400 });
  if (cantidad == null || num(cantidad) <= 0) throw Object.assign(new Error('cantidad_invalida'), { status: 400 });
  const monto = num(cantidad);
  return tx(async c => {
    const actual = await c.unsafe(
      'SELECT cantidad FROM stock WHERE tenant_id=$1 AND product_id=$2 AND variant_id IS NOT DISTINCT FROM $3 AND bodega=$4',
      [tenantId, Number(productId), variantId, origen]
    );
    const actualVal = actual.length ? num(actual[0].cantidad) : 0;
    if (actualVal < monto) throw Object.assign(new Error('stock_insuficiente'), { status: 409 });

    const transferId = num((await c.unsafe('SELECT COALESCE(MAX(id),0)+1 AS n FROM stock_movements WHERE tenant_id=$1 AND referencia_tipo=\'transfer\'', [tenantId]))[0].n);

    await c.unsafe(
      `INSERT INTO stock (tenant_id, product_id, variant_id, bodega, cantidad)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (tenant_id, product_id, variant_id, bodega)
       DO UPDATE SET cantidad = stock.cantidad - $6, updated_at = now()`,
      [tenantId, Number(productId), variantId, origen, String(actualVal - monto), monto]
    );
    await c.unsafe(
      `INSERT INTO stock (tenant_id, product_id, variant_id, bodega, cantidad)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (tenant_id, product_id, variant_id, bodega)
       DO UPDATE SET cantidad = stock.cantidad + $6, updated_at = now()`,
      [tenantId, Number(productId), variantId, destino, String(monto), monto]
    );
    await c.unsafe(
      `INSERT INTO stock_movements (tenant_id, product_id, variant_id, bodega, tipo, cantidad, referencia_tipo, referencia_id, observacion, usuario_id)
       VALUES ($1,$2,$3,$4,'traslado_salida',$5,'transfer',$6,$7,$8)`,
      [tenantId, Number(productId), variantId, origen, String(monto), transferId, observacion || `Traslado a ${destino}`, usuarioId]
    );
    await c.unsafe(
      `INSERT INTO stock_movements (tenant_id, product_id, variant_id, bodega, tipo, cantidad, referencia_tipo, referencia_id, observacion, usuario_id)
       VALUES ($1,$2,$3,$4,'traslado_entrada',$5,'transfer',$6,$7,$8)`,
      [tenantId, Number(productId), variantId, destino, String(monto), transferId, observacion || `Traslado desde ${origen}`, usuarioId]
    );
    return { ok: true, transferId, cantidad: monto, origen, destino };
  });
}

async function kardex(productId, variantId = null) {
  const c = getClient();
  const filtro = variantId == null ? '' : 'AND sm.variant_id IS NOT DISTINCT FROM $3';
  const params = variantId == null ? [tenantId, Number(productId)] : [tenantId, Number(productId), variantId];
  const rows = await c.unsafe(
    `SELECT sm.id, sm.product_id, sm.variant_id, sm.bodega, sm.tipo, sm.cantidad, sm.costo_unitario,
       sm.referencia_tipo, sm.referencia_id, sm.observacion, sm.usuario_id, sm.created_at
     FROM stock_movements sm
     WHERE sm.tenant_id = $1 AND sm.product_id = $2 ${filtro}
     ORDER BY sm.created_at DESC, sm.id DESC LIMIT 500`,
    params
  );
  return rows.map(r => ({
    ...r,
    cantidad: num(r.cantidad),
    costo_unitario: r.costo_unitario == null ? null : num(r.costo_unitario),
    created_at: r.created_at,
  }));
}

async function stockBajo() {
  const c = getClient();
  const rows = await c.unsafe(
    `SELECT p.id, p.nombre, p.codigo, p.stock_minimo, p.stock_maximo,
       COALESCE(SUM(s.cantidad)::numeric, 0) AS stock_total
     FROM products p
     LEFT JOIN stock s ON s.product_id = p.id
     WHERE p.tenant_id = $1 AND p.activo = true AND p.maneja_stock = true AND p.stock_minimo > 0
     GROUP BY p.id
     HAVING COALESCE(SUM(s.cantidad)::numeric, 0) <= p.stock_minimo
     ORDER BY p.nombre`,
    [tenantId]
  );
  return rows.map(r => ({ ...r, stock_minimo: num(r.stock_minimo), stock_total: num(r.stock_total) }));
}

// ============================================================
// PROVEEDORES
// ============================================================
const SUPPLIER_SELECT = `
  SELECT id, tipo_identificacion, identificacion, dv, nombre, nombre_comercial, email, telefono,
    direccion, ciudad, pais, regimen, responsable_iva, retencion_fuente, retencion_iva, retencion_ica,
    dias_credito, cupo_credito, banco, tipo_cuenta, numero_cuenta, activo, created_at, updated_at
  FROM suppliers`;

async function listSuppliers(activo) {
  const c = getClient();
  const rows = await c.unsafe(
    `${SUPPLIER_SELECT} WHERE tenant_id = $1 ${activo == null ? '' : 'AND activo = $2'} ORDER BY nombre`,
    activo == null ? [tenantId] : [tenantId, !!activo]
  );
  return rows.map(mapaProveedor);
}

function mapaProveedor(r) {
  return {
    ...r,
    retencion_fuente: r.retencion_fuente == null ? null : num(r.retencion_fuente),
    retencion_iva: r.retencion_iva == null ? null : num(r.retencion_iva),
    retencion_ica: r.retencion_ica == null ? null : num(r.retencion_ica),
    cupo_credito: r.cupo_credito == null ? null : num(r.cupo_credito),
  };
}

async function createSupplier(data) {
  if (!data || !data.nombre || !data.identificacion) throw Object.assign(new Error('datos_incompletos'), { status: 400 });
  const c = getClient();
  try {
    const rows = await c.unsafe(
      `INSERT INTO suppliers (tenant_id, tipo_identificacion, identificacion, dv, nombre, nombre_comercial, email, telefono,
        direccion, ciudad, pais, regimen, responsable_iva, retencion_fuente, retencion_iva, retencion_ica,
        dias_credito, cupo_credito, banco, tipo_cuenta, numero_cuenta, activo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
       RETURNING id`,
      [
        tenantId, data.tipoIdentificacion || 'NIT', String(data.identificacion).trim(), data.dv || null,
        String(data.nombre).trim(), data.nombreComercial || null, data.email || null, data.telefono || null,
        data.direccion || null, data.ciudad || null, data.pais || 'CO', data.regimen || 'común',
        data.responsableIva !== false,
        data.retencionFuente != null ? String(num(data.retencionFuente)) : '0',
        data.retencionIva != null ? String(num(data.retencionIva)) : '0',
        data.retencionIca != null ? String(num(data.retencionIca)) : '0',
        num(data.diasCredito), data.cupoCredito != null ? String(num(data.cupoCredito)) : '0',
        data.banco || null, data.tipoCuenta || null, data.numeroCuenta || null, data.activo !== false
      ]
    );
    return (await listSuppliers()).find(s => s.id === rows[0].id);
  } catch (e) {
    if (e && e.code === '23505') throw Object.assign(new Error('proveedor_existe'), { status: 409 });
    throw e;
  }
}

async function updateSupplier(id, data) {
  const sets = [];
  const params = [];
  const push = (col, val) => { if (val !== undefined) { params.push(val); sets.push(`${col}=$${params.length}`); } };
  if (data.tipoIdentificacion !== undefined) push('tipo_identificacion', data.tipoIdentificacion || 'NIT');
  if (data.identificacion !== undefined) push('identificacion', String(data.identificacion).trim());
  if (data.dv !== undefined) push('dv', data.dv || null);
  if (data.nombre !== undefined) push('nombre', String(data.nombre).trim());
  if (data.nombreComercial !== undefined) push('nombre_comercial', data.nombreComercial || null);
  if (data.email !== undefined) push('email', data.email || null);
  if (data.telefono !== undefined) push('telefono', data.telefono || null);
  if (data.direccion !== undefined) push('direccion', data.direccion || null);
  if (data.ciudad !== undefined) push('ciudad', data.ciudad || null);
  if (data.pais !== undefined) push('pais', data.pais || 'CO');
  if (data.regimen !== undefined) push('regimen', data.regimen || 'común');
  if (data.responsableIva !== undefined) push('responsable_iva', !!data.responsableIva);
  if (data.retencionFuente !== undefined) push('retencion_fuente', data.retencionFuente == null ? '0' : String(num(data.retencionFuente)));
  if (data.retencionIva !== undefined) push('retencion_iva', data.retencionIva == null ? '0' : String(num(data.retencionIva)));
  if (data.retencionIca !== undefined) push('retencion_ica', data.retencionIca == null ? '0' : String(num(data.retencionIca)));
  if (data.diasCredito !== undefined) push('dias_credito', num(data.diasCredito));
  if (data.cupoCredito !== undefined) push('cupo_credito', data.cupoCredito == null ? '0' : String(num(data.cupoCredito)));
  if (data.banco !== undefined) push('banco', data.banco || null);
  if (data.tipoCuenta !== undefined) push('tipo_cuenta', data.tipoCuenta || null);
  if (data.numeroCuenta !== undefined) push('numero_cuenta', data.numeroCuenta || null);
  if (data.activo !== undefined) push('activo', !!data.activo);
  if (!sets.length) throw Object.assign(new Error('sin_cambios'), { status: 400 });
  params.push(Number(id), tenantId);
  const c = getClient();
  const rows = await c.unsafe(
    `UPDATE suppliers SET ${sets.join(', ')}, updated_at = now() WHERE id = $${params.length - 1} AND tenant_id = $${params.length} RETURNING id`,
    params
  );
  if (!rows.length) throw Object.assign(new Error('no_encontrado'), { status: 404 });
  return (await listSuppliers()).find(s => s.id === Number(id));
}

// ============================================================
// ÓRDENES DE COMPRA
// ============================================================
async function calcularTotales(items) {
  let subtotal = 0, descuento = 0, impuestos = 0;
  for (const it of items) {
    const cant = num(it.cantidad);
    const pu = num(it.precioUnitario);
    const desc = num(it.descuento);
    const pct = num(it.impuestoPorcentaje) || 0;
    const base = cant * pu - desc;
    subtotal += cant * pu;
    descuento += desc;
    impuestos += base * pct / 100;
  }
  return {
    subtotal: Number(subtotal.toFixed(2)),
    descuento: Number(descuento.toFixed(2)),
    impuestos: Number(impuestos.toFixed(2)),
    total: Number((subtotal - descuento + impuestos).toFixed(2)),
  };
}

function sanitizarItems(items) {
  if (!Array.isArray(items) || !items.length) throw Object.assign(new Error('items_requeridos'), { status: 400 });
  return items.map(it => {
    if (!it.cantidad || it.precioUnitario == null) throw Object.assign(new Error('item_incompleto'), { status: 400 });
    return {
      productId: it.productId != null ? Number(it.productId) : null,
      variantId: it.variantId != null ? Number(it.variantId) : null,
      descripcion: it.descripcion || 'Producto',
      cantidad: num(it.cantidad),
      cantidadRecibida: 0,
      precioUnitario: num(it.precioUnitario),
      descuento: num(it.descuento),
      impuestoPorcentaje: it.impuestoPorcentaje != null ? num(it.impuestoPorcentaje) : 19,
    };
  });
}

async function siguienteNumero(prefix) {
  const c = getClient();
  const row = await c.unsafe(
    `SELECT COALESCE(MAX(id),0)+1 AS n FROM purchase_orders WHERE tenant_id = $1`,
    [tenantId]
  );
  const n = num(row[0].n);
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `${prefix}-${ymd}-${String(n).padStart(4, '0')}`;
}

async function createPurchaseOrder(data, usuarioId = null) {
  if (!data || !data.supplierId) throw Object.assign(new Error('proveedor_requerido'), { status: 400 });
  const items = sanitizarItems(data.items);
  const totals = await calcularTotales(items);
  const numero = await siguienteNumero('PO');
  let poId;
  await tx(async c => {
    const rows = await c.unsafe(
      `INSERT INTO purchase_orders
        (tenant_id, supplier_id, numero, estado, fecha, fecha_entrega_esperada,
         subtotal, descuento, impuestos, total, observacion, creado_por)
       VALUES ($1,$2,$3,'borrador',now(),$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [
        tenantId, Number(data.supplierId), numero,
        data.fechaEntregaEsperada || null,
        String(totals.subtotal), String(totals.descuento), String(totals.impuestos), String(totals.total),
        data.observacion || null, usuarioId
      ]
    );
    poId = rows[0].id;
    for (const it of items) {
      await c.unsafe(
        `INSERT INTO purchase_order_items
          (purchase_order_id, product_id, variant_id, descripcion, cantidad, cantidad_recibida,
           precio_unitario, descuento, impuesto_porcentaje, total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [poId, it.productId, it.variantId, it.descripcion, String(it.cantidad), '0',
         String(it.precioUnitario), String(it.descuento), String(it.impuestoPorcentaje),
         String(Number((it.cantidad * it.precioUnitario - it.descuento).toFixed(2)))]
      );
    }
  });
  return getPurchaseOrder(poId);
}

async function listPurchaseOrders(estado) {
  const c = getClient();
  const params = [tenantId];
  const where = ['po.tenant_id = $1'];
  if (estado) { params.push(estado); where.push(`po.estado = $${params.length}`); }
  const rows = await c.unsafe(
    `SELECT po.*, s.nombre AS proveedor_nombre,
       (SELECT COUNT(*)::int FROM purchase_order_items i WHERE i.purchase_order_id = po.id) AS items,
       (SELECT COALESCE(SUM(i.cantidad_recibida)::numeric,0) FROM purchase_order_items i WHERE i.purchase_order_id = po.id) AS total_recibido,
       (SELECT COALESCE(SUM(i.cantidad)::numeric,0) FROM purchase_order_items i WHERE i.purchase_order_id = po.id) AS total_pedido
     FROM purchase_orders po
     JOIN suppliers s ON s.id = po.supplier_id
     WHERE ${where.join(' AND ')}
     ORDER BY po.created_at DESC LIMIT 500`,
    params
  );
  return rows.map(r => ({
    ...r,
    subtotal: num(r.subtotal), descuento: num(r.descuento), impuestos: num(r.impuestos), total: num(r.total),
    total_recibido: num(r.total_recibido), total_pedido: num(r.total_pedido),
  }));
}

async function getPurchaseOrder(id) {
  const c = getClient();
  const rows = await c.unsafe(
    `SELECT po.*, s.nombre AS proveedor_nombre, s.identificacion AS proveedor_identificacion
     FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id
     WHERE po.tenant_id = $1 AND po.id = $2`,
    [tenantId, Number(id)]
  );
  if (!rows.length) throw Object.assign(new Error('no_encontrado'), { status: 404 });
  const po = rows[0];
  const items = await c.unsafe(
    `SELECT i.id, i.product_id, i.variant_id, i.descripcion, i.cantidad, i.cantidad_recibida,
       i.precio_unitario, i.descuento, i.impuesto_porcentaje, i.total,
       p.nombre AS producto_nombre, p.codigo AS producto_codigo, pv.nombre AS variante_nombre
     FROM purchase_order_items i
     LEFT JOIN products p ON p.id = i.product_id
     LEFT JOIN product_variants pv ON pv.id = i.variant_id
     WHERE i.purchase_order_id = $1 ORDER BY i.id`,
    [Number(id)]
  );
  return {
    ...po,
    subtotal: num(po.subtotal), descuento: num(po.descuento), impuestos: num(po.impuestos), total: num(po.total),
    items: items.map(it => ({
      ...it,
      cantidad: num(it.cantidad), cantidad_recibida: num(it.cantidad_recibida),
      precio_unitario: num(it.precio_unitario), descuento: num(it.descuento),
      impuesto_porcentaje: num(it.impuesto_porcentaje), total: num(it.total),
    })),
  };
}

async function updatePurchaseOrder(id, data, usuarioId = null) {
  const po = await getPurchaseOrder(id);
  if (po.estado !== 'borrador') throw Object.assign(new Error('solo_borrador'), { status: 409 });
  const items = data.items ? sanitizarItems(data.items) : null;
  const totals = items ? await calcularTotales(items) : null;
  await tx(async c => {
    const sets = ['updated_at = now()'];
    const params = [];
    const push = (col, val) => { if (val !== undefined) { params.push(val); sets.push(`${col}=$${params.length}`); } };
    if (data.supplierId !== undefined) push('supplier_id', Number(data.supplierId));
    if (data.fechaEntregaEsperada !== undefined) push('fecha_entrega_esperada', data.fechaEntregaEsperada || null);
    if (data.observacion !== undefined) push('observacion', data.observacion || null);
    if (totals) {
      push('subtotal', String(totals.subtotal));
      push('descuento', String(totals.descuento));
      push('impuestos', String(totals.impuestos));
      push('total', String(totals.total));
    }
    params.push(Number(id), tenantId);
    await c.unsafe(`UPDATE purchase_orders SET ${sets.join(', ')} WHERE id = $${params.length - 1} AND tenant_id = $${params.length}`, params);
    if (items) {
      await c.unsafe('DELETE FROM purchase_order_items WHERE purchase_order_id = $1', [Number(id)]);
      for (const it of items) {
        await c.unsafe(
          `INSERT INTO purchase_order_items
            (purchase_order_id, product_id, variant_id, descripcion, cantidad, cantidad_recibida,
             precio_unitario, descuento, impuesto_porcentaje, total)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [Number(id), it.productId, it.variantId, it.descripcion, String(it.cantidad), '0',
           String(it.precioUnitario), String(it.descuento), String(it.impuestoPorcentaje),
           String(Number((it.cantidad * it.precioUnitario - it.descuento).toFixed(2)))]
        );
      }
    }
  });
  return getPurchaseOrder(id);
}

async function cambiarEstadoPurchaseOrder(id, estado, usuarioId = null) {
  const validos = ['enviada', 'cancelada'];
  if (!validos.includes(estado)) throw Object.assign(new Error('estado_invalido'), { status: 400 });
  const po = await getPurchaseOrder(id);
  if (!['borrador', 'enviada'].includes(po.estado)) throw Object.assign(new Error('transicion_invalida'), { status: 409 });
  if (estado === 'cancelada' && po.estado === 'cancelada') throw Object.assign(new Error('transicion_invalida'), { status: 409 });
  if (estado === 'enviada' && po.estado !== 'borrador') throw Object.assign(new Error('transicion_invalida'), { status: 409 });
  if (!po.items.length) throw Object.assign(new Error('sin_items'), { status: 400 });
  const c = getClient();
  if (estado === 'enviada') {
    await c.unsafe(
      `UPDATE purchase_orders SET estado = 'enviada', aprobado_por = $1, fecha_aprobacion = now(), updated_at = now()
       WHERE tenant_id = $2 AND id = $3`,
      [usuarioId, tenantId, Number(id)]
    );
  } else {
    await c.unsafe(
      `UPDATE purchase_orders SET estado = 'cancelada', updated_at = now() WHERE tenant_id = $1 AND id = $2`,
      [tenantId, Number(id)]
    );
  }
  return getPurchaseOrder(id);
}

async function recibirPurchaseOrder(id, data, usuarioId = null) {
  const po = await getPurchaseOrder(id);
  if (!['enviada', 'parcial'].includes(po.estado)) throw Object.assign(new Error('estado_invalido'), { status: 409 });
  const body = data || {};
  const recibidos = body.items;
  if (!Array.isArray(recibidos) || !recibidos.length) throw Object.assign(new Error('items_requeridos'), { status: 400 });

  const porItem = {};
  for (const r of recibidos) {
    if (r.poItemId == null || num(r.cantidad) <= 0) throw Object.assign(new Error('item_incompleto'), { status: 400 });
    porItem[Number(r.poItemId)] = num(r.cantidad);
  }

  return tx(async c => {
    // Crear remisión
    const numero = await siguienteNumero('RC');
    const rows = await c.unsafe(
      `INSERT INTO purchase_receipts (tenant_id, purchase_order_id, numero, fecha, observacion, recibido_por)
       VALUES ($1,$2,$3,now(),$4,$5) RETURNING id`,
      [tenantId, Number(id), numero, body.observacion || null, usuarioId]
    );
    const receiptId = rows[0].id;

    let completo = true;
    for (const it of po.items) {
      const recibir = porItem[it.id] || 0;
      if (recibir <= 0) continue;
      const nuevaRecibida = it.cantidad_recibida + recibir;
      if (nuevaRecibida > it.cantidad) throw Object.assign(new Error('cantidad_excede'), { status: 409 });

      await c.unsafe(
        `INSERT INTO purchase_receipt_items (purchase_receipt_id, po_item_id, product_id, variant_id, cantidad, precio_unitario, lote, fecha_vencimiento, ubicacion)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [receiptId, it.id, it.product_id, it.variant_id, String(recibir), String(it.precio_unitario),
         null, null, null]
      );
      await c.unsafe(
        'UPDATE purchase_order_items SET cantidad_recibida = $1 WHERE id = $2',
        [String(nuevaRecibida), it.id]
      );
      if (nuevaRecibida < it.cantidad) completo = false;

      // Entrada a stock (kardex) + actualizar costo
      if (it.product_id) {
        const stockRow = await c.unsafe(
          `INSERT INTO stock (tenant_id, product_id, variant_id, bodega, cantidad)
           VALUES ($1,$2,$3,'principal',$4)
           ON CONFLICT (tenant_id, product_id, variant_id, bodega)
           DO UPDATE SET cantidad = stock.cantidad + $5, updated_at = now()
           RETURNING id`,
          [tenantId, it.product_id, it.variant_id, String(recibir), recibir]
        );
        await c.unsafe(
          `INSERT INTO stock_movements (tenant_id, product_id, variant_id, bodega, tipo, cantidad, costo_unitario, referencia_tipo, referencia_id, observacion, usuario_id)
           VALUES ($1,$2,$3,'principal','entrada',$4,$5,'purchase_order',$6,$7,$8)`,
          [tenantId, it.product_id, it.variant_id, String(recibir), String(it.precio_unitario), Number(id),
           `Recepción ${numero}`, usuarioId]
        );
        await c.unsafe(
          'UPDATE products SET costo = $1, updated_at = now() WHERE id = $2',
          [String(it.precio_unitario), it.product_id]
        );
      }
    }

    await c.unsafe(
      `UPDATE purchase_orders SET estado = $1, updated_at = now() WHERE tenant_id = $2 AND id = $3`,
      [completo ? 'recibida' : 'parcial', tenantId, Number(id)]
    );
    return { ok: true, receiptId, numero, estado: completo ? 'recibida' : 'parcial' };
  });
}

async function deletePurchaseOrder(id) {
  const po = await getPurchaseOrder(id);
  if (po.estado !== 'borrador') throw Object.assign(new Error('solo_borrador'), { status: 409 });
  const c = getClient();
  await c.unsafe('DELETE FROM purchase_orders WHERE tenant_id = $1 AND id = $2', [tenantId, Number(id)]);
  return { ok: true };
}

module.exports = {
  listCategories, createCategory, updateCategory, deleteCategory,
  listProducts, getProduct, createProduct, updateProduct, deleteProduct,
  listVariants, addVariant, updateVariant, deleteVariant,
  getStock, ajustarStock, trasladarStock, kardex, stockBajo,
  listSuppliers, createSupplier, updateSupplier,
  listPurchaseOrders, getPurchaseOrder, createPurchaseOrder, updatePurchaseOrder,
  cambiarEstadoPurchaseOrder, recibirPurchaseOrder, deletePurchaseOrder,
};