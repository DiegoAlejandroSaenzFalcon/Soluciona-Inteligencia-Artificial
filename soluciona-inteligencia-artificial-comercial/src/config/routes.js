'use strict';
const ccfg = require('./v2.js');
const { currentUser, json } = require('../auth/routes.js');
const auth = require('../auth/index.js');
const { SECTIONS } = require('./schemas.js');

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

function metaOf(req) {
  return { ip: req.socket.remoteAddress, userAgent: req.headers['user-agent'] };
}

async function autenticarYPermitir(req, res, permiso) {
  const user = await currentUser(req);
  if (!user) return { error: json(res, 401, { error: 'no_autenticado' }) };
  const perms = await auth.getPermissionsForUser(user);
  if (!auth.hasPermission(perms, permiso)) return { error: json(res, 403, { error: 'sin_permiso' }) };
  return { user, perms };
}

/**
 * Maneja /api/configv2/* y /api/audit. Devuelve true si consumió la petición.
 */
async function handleConfigRequest(req, res, url) {
  const parts = url.split('/').filter(Boolean); // ['api','configv2', ...]

  // ---- GET /api/configv2/sections ----
  if (url === '/api/configv2/sections' && req.method === 'GET') {
    const { user, perms, error } = await autenticarYPermitir(req, res, 'config:read');
    if (error) return true;
    const sections = ccfg.getSections();
    return json(res, 200, {
      sections: sections.map(s => ({
        section: s.section,
        keys: s.keys,
        canWrite: auth.hasPermission(perms, 'config:write'),
        canSecrets: auth.hasPermission(perms, 'config:secrets'),
        payload: s.payload,
      })),
    });
  }

  // ---- GET /api/configv2/:section ----
  if (parts[0] === 'api' && parts[1] === 'configv2' && parts.length === 3 && parts[2] !== 'secrets' && req.method === 'GET') {
    const { error } = await autenticarYPermitir(req, res, 'config:read');
    if (error) return true;
    const section = parts[2];
    if (!SECTIONS.includes(section)) return json(res, 400, { error: 'seccion_invalida' });
    return json(res, 200, ccfg.getSection(section));
  }

  // ---- PUT /api/configv2/:section ----
  if (parts[0] === 'api' && parts[1] === 'configv2' && parts.length === 3 && parts[2] !== 'secrets' && req.method === 'PUT') {
    const { user, error } = await autenticarYPermitir(req, res, 'config:write');
    if (error) return true;
    const section = parts[2];
    if (!SECTIONS.includes(section)) return json(res, 400, { error: 'seccion_invalida' });
    const body = await leerCuerpo(req);
    if (!body) return json(res, 400, { error: 'json_invalido' });
    try {
      const result = await ccfg.updateSection(section, body, user, metaOf(req));
      if (result.error) {
        if (result.error === 'validacion') return json(res, 400, { error: 'validacion', issues: result.issues });
        return json(res, 400, { error: result.error });
      }
      return json(res, 200, result);
    } catch (e) {
      return json(res, 500, { error: e.message });
    }
  }

  // ---- GET /api/configv2/:section/versions ----
  if (parts.length === 4 && parts[1] === 'configv2' && parts[3] === 'versions' && req.method === 'GET') {
    const { error } = await autenticarYPermitir(req, res, 'config:read');
    if (error) return true;
    const section = parts[2];
    const result = await ccfg.listVersions(section, req.headers['x-limit'] ? parseInt(req.headers['x-limit'], 10) : 50);
    if (result.error) return json(res, 400, { error: result.error });
    return json(res, 200, result);
  }

  // ---- POST /api/configv2/:section/rollback ----
  if (parts.length === 4 && parts[1] === 'configv2' && parts[3] === 'rollback' && req.method === 'POST') {
    const { user, error } = await autenticarYPermitir(req, res, 'config:write');
    if (error) return true;
    const section = parts[2];
    const body = await leerCuerpo(req);
    if (!body || !body.versionId) return json(res, 400, { error: 'version_id_requerido' });
    try {
      const result = await ccfg.rollback(section, body.versionId, user, metaOf(req));
      if (result.error) return json(res, 400, { error: result.error });
      return json(res, 200, result);
    } catch (e) {
      return json(res, 500, { error: e.message });
    }
  }

  // ---- GET /api/configv2/secrets ----
  if (url === '/api/configv2/secrets' && req.method === 'GET') {
    const { user, perms, error } = await autenticarYPermitir(req, res, 'config:secrets');
    if (error) return true;
    const includeValues = req.headers['x-include-values'] === 'true';
    const rows = await ccfg.listSecrets(includeValues);
    return json(res, 200, { secrets: rows, includeValues });
  }

  // ---- POST /api/configv2/secrets ----
  if (url === '/api/configv2/secrets' && req.method === 'POST') {
    const { user, error } = await autenticarYPermitir(req, res, 'config:secrets');
    if (error) return true;
    const body = await leerCuerpo(req);
    if (!body || !body.key || body.value === undefined) return json(res, 400, { error: 'datos_incompletos' });
    const result = await ccfg.setSecret(body.key, body.value, body.description, user, metaOf(req));
    if (result.error) return json(res, 400, { error: result.error });
    return json(res, 200, result);
  }

  // ---- DELETE /api/configv2/secrets/:key ----
  if (parts.length === 4 && parts[1] === 'configv2' && parts[2] === 'secrets' && req.method === 'DELETE') {
    const { user, error } = await autenticarYPermitir(req, res, 'config:secrets');
    if (error) return true;
    const key = decodeURIComponent(parts[3]);
    const result = await ccfg.deleteSecret(key, user, metaOf(req));
    return json(res, 200, result);
  }

  // ---- GET /api/audit ----
  if (url === '/api/audit' && req.method === 'GET') {
    const { error } = await autenticarYPermitir(req, res, 'config:read');
    if (error) return true;
    const rows = await ccfg.listAudit(50);
    return json(res, 200, { audit: rows });
  }

  return false;
}

module.exports = { handleConfigRequest };
