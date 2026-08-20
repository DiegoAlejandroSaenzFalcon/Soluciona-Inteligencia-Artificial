'use strict';
const acc = require('./index');
const auth = require('../auth/index');
const { currentUser, json } = require('../auth/routes');

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

function queryMap(url) {
  return new URLSearchParams(url.split('?')[1] || '');
}

/**
 * Maneja /api/accounting/*. Devuelve true si consumió la petición.
 */
async function handleAccountingRequest(req, res, url) {
  const parts = url.split('/').filter(Boolean); // ['api','accounting', ...]

  // ============ CLIENTES ============
  if (parts[0] === 'api' && parts[1] === 'accounting' && parts[2] === 'customers' && parts.length === 3) {
    if (req.method === 'GET') {
      const { error } = await autenticarYPermitir(req, res, 'accounting:read');
      if (error) return true;
      const q = queryMap(url);
      return json(res, 200, { customers: await acc.listCustomers({ q: q.get('q'), activo: q.get('activo') == null ? null : q.get('activo') === 'true' }) });
    }
    if (req.method === 'POST') {
      const { error } = await autenticarYPermitir(req, res, 'accounting:write');
      if (error) return true;
      const body = await leerCuerpo(req);
      try { return json(res, 201, { customer: await acc.createCustomer(body) }); }
      catch (e) { return wrapError(res, e); }
    }
  }
  if (parts[0] === 'api' && parts[1] === 'accounting' && parts[2] === 'customers' && parts.length === 4) {
    const id = idParam(parts, 3);
    if (!id) return json(res, 400, { error: 'id_invalido' });
    if (req.method === 'GET') {
      const { error } = await autenticarYPermitir(req, res, 'accounting:read');
      if (error) return true;
      try { return json(res, 200, { customer: await acc.getCustomer(id) }); }
      catch (e) { return wrapError(res, e); }
    }
    if (req.method === 'PUT') {
      const { error } = await autenticarYPermitir(req, res, 'accounting:write');
      if (error) return true;
      const body = await leerCuerpo(req);
      try { return json(res, 200, { customer: await acc.updateCustomer(id, body || {}) }); }
      catch (e) { return wrapError(res, e); }
    }
  }

  // ============ FACTURAS ============
  if (parts[0] === 'api' && parts[1] === 'accounting' && parts[2] === 'invoices' && parts.length === 3) {
    if (req.method === 'GET') {
      const { error } = await autenticarYPermitir(req, res, 'accounting:read');
      if (error) return true;
      const q = queryMap(url);
      return json(res, 200, { invoices: await acc.listInvoices({
        estado: q.get('estado'), clienteId: q.get('clienteId') ? Number(q.get('clienteId')) : null,
        desde: q.get('desde'), hasta: q.get('hasta'),
      }) });
    }
    if (req.method === 'POST') {
      const { user, error } = await autenticarYPermitir(req, res, 'accounting:write');
      if (error) return true;
      const body = await leerCuerpo(req);
      try { return json(res, 201, { invoice: await acc.createInvoice(body, user.id) }); }
      catch (e) { return wrapError(res, e); }
    }
  }
  if (parts[0] === 'api' && parts[1] === 'accounting' && parts[2] === 'invoices' && parts.length === 4) {
    const id = idParam(parts, 3);
    if (!id) return json(res, 400, { error: 'id_invalido' });
    if (req.method === 'GET') {
      const { error } = await autenticarYPermitir(req, res, 'accounting:read');
      if (error) return true;
      try { return json(res, 200, { invoice: await acc.getInvoice(id) }); }
      catch (e) { return wrapError(res, e); }
    }
  }
  if (parts[0] === 'api' && parts[1] === 'accounting' && parts[2] === 'invoices' && parts.length === 5 && parts[4] === 'anular') {
    const id = idParam(parts, 3);
    if (!id) return json(res, 400, { error: 'id_invalido' });
    if (req.method === 'POST') {
      const { user, error } = await autenticarYPermitir(req, res, 'accounting:write');
      if (error) return true;
      try { return json(res, 200, { invoice: await acc.anularInvoice(id, user.id) }); }
      catch (e) { return wrapError(res, e); }
    }
  }
  if (parts[0] === 'api' && parts[1] === 'accounting' && parts[2] === 'invoices' && parts.length === 5 && parts[4] === 'nota-credito') {
    const id = idParam(parts, 3);
    if (!id) return json(res, 400, { error: 'id_invalido' });
    if (req.method === 'POST') {
      const { user, error } = await autenticarYPermitir(req, res, 'accounting:write');
      if (error) return true;
      const body = await leerCuerpo(req);
      try { return json(res, 201, { creditNote: await acc.createCreditNote({ ...(body || {}), invoiceId: id }, user.id) }); }
      catch (e) { return wrapError(res, e); }
    }
  }

  // ============ PAGOS ============
  if (parts[0] === 'api' && parts[1] === 'accounting' && parts[2] === 'payments' && parts.length === 3) {
    if (req.method === 'GET') {
      const { error } = await autenticarYPermitir(req, res, 'accounting:read');
      if (error) return true;
      const q = queryMap(url);
      return json(res, 200, { payments: await acc.listPayments({ tipo: q.get('tipo'), desde: q.get('desde'), hasta: q.get('hasta') }) });
    }
    if (req.method === 'POST') {
      const { user, error } = await autenticarYPermitir(req, res, 'accounting:write');
      if (error) return true;
      const body = await leerCuerpo(req);
      try { return json(res, 201, { payment: await acc.registrarPago(body, user.id) }); }
      catch (e) { return wrapError(res, e); }
    }
  }
  if (parts[0] === 'api' && parts[1] === 'accounting' && parts[2] === 'payments' && parts.length === 4) {
    const id = idParam(parts, 3);
    if (!id) return json(res, 400, { error: 'id_invalido' });
    if (req.method === 'GET') {
      const { error } = await autenticarYPermitir(req, res, 'accounting:read');
      if (error) return true;
      try { return json(res, 200, { payment: await acc.getPayment(id) }); }
      catch (e) { return wrapError(res, e); }
    }
  }
  if (parts[0] === 'api' && parts[1] === 'accounting' && parts[2] === 'payments' && parts.length === 5 && parts[4] === 'anular') {
    const id = idParam(parts, 3);
    if (!id) return json(res, 400, { error: 'id_invalido' });
    if (req.method === 'POST') {
      const { user, error } = await autenticarYPermitir(req, res, 'accounting:write');
      if (error) return true;
      try { return json(res, 200, { payment: await acc.anularPago(id, user.id) }); }
      catch (e) { return wrapError(res, e); }
    }
  }

  // ============ AGING ============
  if (url === '/api/accounting/aging/cxc' && req.method === 'GET') {
    const { error } = await autenticarYPermitir(req, res, 'accounting:read');
    if (error) return true;
    return json(res, 200, { aging: await acc.agingCxC() });
  }
  if (url === '/api/accounting/aging/cxp' && req.method === 'GET') {
    const { error } = await autenticarYPermitir(req, res, 'accounting:read');
    if (error) return true;
    return json(res, 200, { aging: await acc.agingCxP() });
  }

  // ============ ASIENTOS ============
  if (parts[0] === 'api' && parts[1] === 'accounting' && parts[2] === 'journal-entries' && parts.length === 3) {
    if (req.method === 'GET') {
      const { error } = await autenticarYPermitir(req, res, 'accounting:read');
      if (error) return true;
      const q = queryMap(url);
      return json(res, 200, { entries: await acc.listarAsientos({ desde: q.get('desde'), hasta: q.get('hasta'), estado: q.get('estado') }) });
    }
    if (req.method === 'POST') {
      const { user, error } = await autenticarYPermitir(req, res, 'accounting:write');
      if (error) return true;
      const body = await leerCuerpo(req);
      try { return json(res, 201, { entry: await acc.crearAsientoManual(body, user.id) }); }
      catch (e) { return wrapError(res, e); }
    }
  }
  if (parts[0] === 'api' && parts[1] === 'accounting' && parts[2] === 'journal-entries' && parts.length === 4) {
    const id = idParam(parts, 3);
    if (!id) return json(res, 400, { error: 'id_invalido' });
    if (req.method === 'GET') {
      const { error } = await autenticarYPermitir(req, res, 'accounting:read');
      if (error) return true;
      try { return json(res, 200, { entry: await acc.getAsiento(id) }); }
      catch (e) { return wrapError(res, e); }
    }
  }
  if (parts[0] === 'api' && parts[1] === 'accounting' && parts[2] === 'journal-entries' && parts.length === 5 && parts[4] === 'anular') {
    const id = idParam(parts, 3);
    if (!id) return json(res, 400, { error: 'id_invalido' });
    if (req.method === 'POST') {
      const { user, error } = await autenticarYPermitir(req, res, 'accounting:write');
      if (error) return true;
      try { return json(res, 200, { entry: await acc.anularAsiento(id, user.id) }); }
      catch (e) { return wrapError(res, e); }
    }
  }

  // ============ CONCILIACIÓN ============
  if (url === '/api/accounting/conciliacion' && req.method === 'GET') {
    const { error } = await autenticarYPermitir(req, res, 'accounting:read');
    if (error) return true;
    const q = queryMap(url);
    return json(res, 200, { resumen: await acc.conciliacionResumen({ desde: q.get('desde'), hasta: q.get('hasta') }) });
  }

  return false;
}

module.exports = { handleAccountingRequest };