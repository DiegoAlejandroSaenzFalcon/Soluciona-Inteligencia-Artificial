'use strict';
const inv = require('./index.js');
const auth = require('../auth/index.js');
const { currentUser, json } = require('../auth/routes.js');

function leerCuerpo(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { resolve(null); }
    });
    req.on('error', () => resolve(null));
  });
}

async function autenticarYPermitir(req, res, permiso) {
  const user = await currentUser(req);
  if (!user) return { error: json(res, 401, { error: 'no_autenticado' }) };
  const perms = await auth.getPermissionsForUser(user);
  if (!auth.hasPermission(perms, permiso)) return { error: json(res, 403, { error: 'sin_permiso' }) };
  return { user, perms };
}

function wrapError(res, e) {
  const status = e.status || 500;
  return json(res, status, { error: e.message });
}

function idParam(parts, idx) {
  const v = parts[idx];
  return v && /^\d+$/.test(v) ? Number(v) : NaN;
}

/**
 * Maneja /api/inventory/*. Devuelve true si consumió la petición.
 */
async function handleInventoryRequest(req, res, url) {
  const parts = url.split('/').filter(Boolean); // ['api','inventory', ...]

  // ============ CATEGORÍAS ============
  if (parts[0] === 'api' && parts[1] === 'inventory' && parts[2] === 'categories') {
    if (req.method === 'GET') {
      const { error } = await autenticarYPermitir(req, res, 'inventory:read');
      if (error) return true;
      const activo = req.headers['x-activo'] === 'true' ? true : req.headers['x-activo'] === 'false' ? false : null;
      return json(res, 200, { categories: await inv.listCategories(activo) });
    }
    if (req.method === 'POST') {
      const { error } = await autenticarYPermitir(req, res, 'inventory:write');
      if (error) return true;
      const body = await leerCuerpo(req);
      try { return json(res, 201, { category: await inv.createCategory(body) }); }
      catch (e) { return wrapError(res, e); }
    }
  }
  if (parts[0] === 'api' && parts[1] === 'inventory' && parts[2] === 'categories' && parts.length === 4) {
    const id = idParam(parts, 3);
    if (!id) return json(res, 400, { error: 'id_invalido' });
    if (req.method === 'PUT') {
      const { error } = await autenticarYPermitir(req, res, 'inventory:write');
      if (error) return true;
      const body = await leerCuerpo(req);
      try { return json(res, 200, { category: await inv.updateCategory(id, body || {}) }); }
      catch (e) { return wrapError(res, e); }
    }
    if (req.method === 'DELETE') {
      const { error } = await autenticarYPermitir(req, res, 'inventory:write');
      if (error) return true;
      try { return json(res, 200, await inv.deleteCategory(id)); }
      catch (e) { return wrapError(res, e); }
    }
  }

  // ============ PRODUCTOS ============
  if (parts[0] === 'api' && parts[1] === 'inventory' && parts[2] === 'products' && parts.length === 3) {
    if (req.method === 'GET') {
      const { error } = await autenticarYPermitir(req, res, 'inventory:read');
      if (error) return true;
      const q = new URLSearchParams(url.split('?')[1] || '');
      const rows = await inv.listProducts({
        q: q.get('q'),
        categoria: q.get('categoria'),
        activo: q.get('activo') == null ? null : q.get('activo') === 'true',
      });
      return json(res, 200, { products: rows });
    }
    if (req.method === 'POST') {
      const { user, error } = await autenticarYPermitir(req, res, 'inventory:write');
      if (error) return true;
      const body = await leerCuerpo(req);
      try { return json(res, 201, { product: await inv.createProduct(body) }); }
      catch (e) { return wrapError(res, e); }
    }
  }
  if (parts[0] === 'api' && parts[1] === 'inventory' && parts[2] === 'products' && parts.length === 4) {
    const id = idParam(parts, 3);
    if (!id) return json(res, 400, { error: 'id_invalido' });
    if (req.method === 'GET') {
      const { error } = await autenticarYPermitir(req, res, 'inventory:read');
      if (error) return true;
      try { return json(res, 200, { product: await inv.getProduct(id) }); }
      catch (e) { return wrapError(res, e); }
    }
    if (req.method === 'PUT') {
      const { error } = await autenticarYPermitir(req, res, 'inventory:write');
      if (error) return true;
      const body = await leerCuerpo(req);
      try { return json(res, 200, { product: await inv.updateProduct(id, body || {}) }); }
      catch (e) { return wrapError(res, e); }
    }
    if (req.method === 'DELETE') {
      const { error } = await autenticarYPermitir(req, res, 'inventory:write');
      if (error) return true;
      try { return json(res, 200, await inv.deleteProduct(id)); }
      catch (e) { return wrapError(res, e); }
    }
  }

  // ============ VARIANTES ============
  if (parts[0] === 'api' && parts[1] === 'inventory' && parts[2] === 'products' && parts.length === 5 && parts[4] === 'variants') {
    const id = idParam(parts, 3);
    if (!id) return json(res, 400, { error: 'id_invalido' });
    if (req.method === 'GET') {
      const { error } = await autenticarYPermitir(req, res, 'inventory:read');
      if (error) return true;
      return json(res, 200, { variants: await inv.listVariants(id) });
    }
    if (req.method === 'POST') {
      const { error } = await autenticarYPermitir(req, res, 'inventory:write');
      if (error) return true;
      const body = await leerCuerpo(req);
      try { return json(res, 201, { variant: await inv.addVariant(id, body) }); }
      catch (e) { return wrapError(res, e); }
    }
  }
  if (parts[0] === 'api' && parts[1] === 'inventory' && parts[2] === 'variants' && parts.length === 4) {
    const id = idParam(parts, 3);
    if (!id) return json(res, 400, { error: 'id_invalido' });
    if (req.method === 'PUT') {
      const { error } = await autenticarYPermitir(req, res, 'inventory:write');
      if (error) return true;
      const body = await leerCuerpo(req);
      try { return json(res, 200, await inv.updateVariant(id, body || {})); }
      catch (e) { return wrapError(res, e); }
    }
    if (req.method === 'DELETE') {
      const { error } = await autenticarYPermitir(req, res, 'inventory:write');
      if (error) return true;
      try { return json(res, 200, await inv.deleteVariant(id)); }
      catch (e) { return wrapError(res, e); }
    }
  }

  // ============ STOCK ============
  if (parts[0] === 'api' && parts[1] === 'inventory' && parts[2] === 'products' && parts.length === 5 && parts[4] === 'stock') {
    const id = idParam(parts, 3);
    if (!id) return json(res, 400, { error: 'id_invalido' });
    if (req.method === 'GET') {
      const { error } = await autenticarYPermitir(req, res, 'inventory:read');
      if (error) return true;
      return json(res, 200, { stock: await inv.getStock(id) });
    }
    if (req.method === 'PUT') {
      const { user, error } = await autenticarYPermitir(req, res, 'inventory:adjust');
      if (error) return true;
      const body = await leerCuerpo(req);
      try {
        return json(res, 200, { resultado: await inv.ajustarStock(id, { ...body, usuarioId: user.id }) });
      } catch (e) { return wrapError(res, e); }
    }
  }
  if (parts[0] === 'api' && parts[1] === 'inventory' && parts[2] === 'products' && parts.length === 5 && parts[4] === 'kardex') {
    const id = idParam(parts, 3);
    if (!id) return json(res, 400, { error: 'id_invalido' });
    if (req.method === 'GET') {
      const { error } = await autenticarYPermitir(req, res, 'inventory:read');
      if (error) return true;
      const q = new URLSearchParams(url.split('?')[1] || '');
      const variantId = q.get('variantId') ? Number(q.get('variantId')) : null;
      return json(res, 200, { kardex: await inv.kardex(id, variantId) });
    }
  }
  if (url === '/api/inventory/stock/bajo' && req.method === 'GET') {
    const { error } = await autenticarYPermitir(req, res, 'inventory:read');
    if (error) return true;
    return json(res, 200, { bajoStock: await inv.stockBajo() });
  }
  if (url === '/api/inventory/stock/traslado' && req.method === 'POST') {
    const { user, error } = await autenticarYPermitir(req, res, 'inventory:transfers');
    if (error) return true;
    const body = await leerCuerpo(req);
    try { return json(res, 200, await inv.trasladarStock({ ...body, usuarioId: user.id })); }
    catch (e) { return wrapError(res, e); }
  }

  // ============ PROVEEDORES ============
  if (parts[0] === 'api' && parts[1] === 'inventory' && parts[2] === 'suppliers' && parts.length === 3) {
    if (req.method === 'GET') {
      const { error } = await autenticarYPermitir(req, res, 'purchases:read');
      if (error) return true;
      const activo = req.headers['x-activo'] === 'true' ? true : req.headers['x-activo'] === 'false' ? false : null;
      return json(res, 200, { suppliers: await inv.listSuppliers(activo) });
    }
    if (req.method === 'POST') {
      const { error } = await autenticarYPermitir(req, res, 'inventory:write');
      if (error) return true;
      const body = await leerCuerpo(req);
      try { return json(res, 201, { supplier: await inv.createSupplier(body) }); }
      catch (e) { return wrapError(res, e); }
    }
  }
  if (parts[0] === 'api' && parts[1] === 'inventory' && parts[2] === 'suppliers' && parts.length === 4) {
    const id = idParam(parts, 3);
    if (!id) return json(res, 400, { error: 'id_invalido' });
    if (req.method === 'PUT') {
      const { error } = await autenticarYPermitir(req, res, 'inventory:write');
      if (error) return true;
      const body = await leerCuerpo(req);
      try { return json(res, 200, { supplier: await inv.updateSupplier(id, body || {}) }); }
      catch (e) { return wrapError(res, e); }
    }
    if (req.method === 'DELETE') {
      const { error } = await autenticarYPermitir(req, res, 'inventory:write');
      if (error) return true;
      try {
        const s = await inv.updateSupplier(id, { activo: false });
        return json(res, 200, { ok: true, supplier: s });
      } catch (e) { return wrapError(res, e); }
    }
  }

  // ============ ÓRDENES DE COMPRA ============
  if (parts[0] === 'api' && parts[1] === 'inventory' && parts[2] === 'purchase-orders' && parts.length === 3) {
    if (req.method === 'GET') {
      const { error } = await autenticarYPermitir(req, res, 'purchases:read');
      if (error) return true;
      const q = new URLSearchParams(url.split('?')[1] || '');
      return json(res, 200, { purchaseOrders: await inv.listPurchaseOrders(q.get('estado')) });
    }
    if (req.method === 'POST') {
      const { user, error } = await autenticarYPermitir(req, res, 'purchases:create');
      if (error) return true;
      const body = await leerCuerpo(req);
      try { return json(res, 201, { purchaseOrder: await inv.createPurchaseOrder(body, user.id) }); }
      catch (e) { return wrapError(res, e); }
    }
  }
  if (parts[0] === 'api' && parts[1] === 'inventory' && parts[2] === 'purchase-orders' && parts.length === 4) {
    const id = idParam(parts, 3);
    if (!id) return json(res, 400, { error: 'id_invalido' });
    if (req.method === 'GET') {
      const { error } = await autenticarYPermitir(req, res, 'purchases:read');
      if (error) return true;
      try { return json(res, 200, { purchaseOrder: await inv.getPurchaseOrder(id) }); }
      catch (e) { return wrapError(res, e); }
    }
    if (req.method === 'PUT') {
      const { user, error } = await autenticarYPermitir(req, res, 'purchases:create');
      if (error) return true;
      const body = await leerCuerpo(req);
      try { return json(res, 200, { purchaseOrder: await inv.updatePurchaseOrder(id, body || {}, user.id) }); }
      catch (e) { return wrapError(res, e); }
    }
    if (req.method === 'DELETE') {
      const { error } = await autenticarYPermitir(req, res, 'purchases:create');
      if (error) return true;
      try { return json(res, 200, await inv.deletePurchaseOrder(id)); }
      catch (e) { return wrapError(res, e); }
    }
  }
  if (parts[0] === 'api' && parts[1] === 'inventory' && parts[2] === 'purchase-orders' && parts.length === 5 && parts[4] === 'estado') {
    const id = idParam(parts, 3);
    if (!id) return json(res, 400, { error: 'id_invalido' });
    if (req.method === 'POST') {
      const body = await leerCuerpo(req);
      const permiso = body && body.estado === 'enviada' ? 'purchases:approve' : 'purchases:create';
      const { user, error } = await autenticarYPermitir(req, res, permiso);
      if (error) return true;
      try { return json(res, 200, { purchaseOrder: await inv.cambiarEstadoPurchaseOrder(id, body && body.estado, user.id) }); }
      catch (e) { return wrapError(res, e); }
    }
  }
  if (parts[0] === 'api' && parts[1] === 'inventory' && parts[2] === 'purchase-orders' && parts.length === 5 && parts[4] === 'recibir') {
    const id = idParam(parts, 3);
    if (!id) return json(res, 400, { error: 'id_invalido' });
    if (req.method === 'POST') {
      const { user, error } = await autenticarYPermitir(req, res, 'purchases:receive');
      if (error) return true;
      const body = await leerCuerpo(req);
      try { return json(res, 200, await inv.recibirPurchaseOrder(id, body, user.id)); }
      catch (e) { return wrapError(res, e); }
    }
  }

  return false;
}

module.exports = { handleInventoryRequest };
