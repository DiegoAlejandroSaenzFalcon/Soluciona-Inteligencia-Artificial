'use strict';
const QRCode = require('qrcode');
const auth = require('./index');
const { getClient } = require('../db/connection');
const { getRateLimiter } = require('../utils/rateLimiter');
const { config } = require('../../config');

function leerCuerpo(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve(null);
      }
    });
    req.on('error', () => resolve(null));
  });
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
  return true;
}

function bearer(req) {
  const h = req.headers['authorization'] || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

async function currentUser(req) {
  const token = bearer(req);
  if (!token) return null;
  const payload = auth.verifyToken(token);
  if (!payload || payload.purpose) return null;
  const c = getClient();
  try {
    const rows = await c.unsafe(
      'SELECT * FROM users WHERE id = $1 AND activo = true LIMIT 1',
      [Number(payload.sub)]
    );
    return rows.length ? rows[0] : null;
  } catch {
    return null;
  }
}

// Rate limiter unificado
const rateLimiter = getRateLimiter(config);

/**
 * Maneja las rutas /api/auth/*. Devuelve true si consumió la petición.
 */
async function handleAuthRequest(req, res, url) {
  // Rate limiting para endpoints de auth (usando rate limiter unificado)
  const ip = req.socket.remoteAddress;
  if (['/api/auth/login', '/api/auth/verify-2fa', '/api/auth/refresh', '/api/auth/setup-2fa', '/api/auth/change-password', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/reset-password'].includes(url) && req.method === 'POST') {
    const rl = rateLimiter.check(ip, url);
    if (!rl.allowed) {
      return json(res, 429, { error: 'rate_limit', retryAfterMs: rl.retryAfterMs });
    }
  }

  // ---- LOGIN ----
  if (url === '/api/auth/login' && req.method === 'POST') {
    const body = await leerCuerpo(req);
    if (!body) return json(res, 400, { error: 'json_invalido' });
    const result = await auth.login(body.email, body.password, {
      ip: req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      tenantId: body.tenantId,
    });
    if (result.error) {
      const status = result.error === 'inactive' ? 403 : 401;
      return json(res, status, { error: result.error });
    }
    if (result.requiresTwoFactor) {
      return json(res, 200, { requiresTwoFactor: true, twoFactorToken: result.twoFactorToken });
    }
    return json(res, 200, result);
  }

  // ---- REGISTRO DE USUARIO (auto-registro, rol limitado) ----
  if (url === '/api/auth/register' && req.method === 'POST') {
    const body = await leerCuerpo(req);
    if (!body) return json(res, 400, { error: 'json_invalido' });
    const result = await auth.register(body, { ip: req.socket.remoteAddress, tenantId: body.tenantId });
    if (result.error) {
      const status = result.error === 'email_existe' ? 409 : 400;
      return json(res, status, { error: result.error });
    }
    return json(res, 201, { ok: true, user: result.user });
  }

  // ---- SOLICITAR RECUPERACIÓN DE CONTRASEÑA ----
  if (url === '/api/auth/forgot-password' && req.method === 'POST') {
    const body = await leerCuerpo(req);
    if (!body || !body.email) return json(res, 400, { error: 'datos_incompletos' });
    const result = await auth.requestPasswordReset(body.email);
    // NO devolver el token al cliente - solo loguear en servidor para desarrollo
    if (result.resetToken) {
      console.log('[AUTH] Reset solicitado para', String(body.email).toLowerCase().trim(), '| token:', result.resetToken);
    }
    return json(res, 200, {
      ok: true,
      expiresInMin: result.expiresInMin || 30,
    });
  }

  // ---- RESTABLECER CONTRASEÑA CON TOKEN ----
  if (url === '/api/auth/reset-password' && req.method === 'POST') {
    const body = await leerCuerpo(req);
    if (!body || !body.resetToken || !body.newPassword) return json(res, 400, { error: 'datos_incompletos' });
    const result = await auth.resetPassword(body.resetToken, body.newPassword);
    if (result.error) return json(res, 400, { error: result.error });
    return json(res, 200, { ok: true });
  }

  // ---- CAMBIO FORZADO DE CONTRASEÑA (primer inicio / obligatorio) ----
  if (url === '/api/auth/change-password' && req.method === 'POST') {
    const user = await currentUser(req);
    if (!user) return json(res, 401, { error: 'no_autenticado' });
    const body = await leerCuerpo(req);
    if (!body || !body.currentPassword || !body.newPassword) {
      return json(res, 400, { error: 'datos_incompletos' });
    }
    if (String(body.newPassword).length < 8) {
      return json(res, 400, { error: 'password_corto', mensaje: 'La contraseña debe tener al menos 8 caracteres.' });
    }
    const ok = await auth.verifyPassword(body.currentPassword, user.password_hash);
    if (!ok) return json(res, 401, { error: 'password_actual_incorrecta' });
    const passwordHash = await auth.hashPassword(body.newPassword);
    const c = getClient();
    await c.unsafe('UPDATE users SET password_hash = $1, must_change_password = 0 WHERE id = $2', [passwordHash, user.id]);
    return json(res, 200, { ok: true });
  }

  // ---- VERIFICAR 2FA ----
  if (url === '/api/auth/verify-2fa' && req.method === 'POST') {
    const body = await leerCuerpo(req);
    if (!body) return json(res, 400, { error: 'json_invalido' });
    const result = await auth.verifyTwoFactor(body.twoFactorToken, body.code, {
      ip: req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
    if (result.error) return json(res, 401, { error: result.error });
    return json(res, 200, result);
  }

  // ---- REFRESH ----
  if (url === '/api/auth/refresh' && req.method === 'POST') {
    const body = await leerCuerpo(req);
    if (!body) return json(res, 400, { error: 'json_invalido' });
    const result = await auth.refresh(body.refreshToken, {
      ip: req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
    if (result.error) return json(res, 401, { error: result.error });
    return json(res, 200, result);
  }

  // ---- LOGOUT ----
  if (url === '/api/auth/logout' && req.method === 'POST') {
    const body = await leerCuerpo(req);
    await auth.logout(body && body.refreshToken);
    return json(res, 200, { ok: true });
  }

  // ---- ME (requiere token) ----
  if (url === '/api/auth/me' && req.method === 'GET') {
    const user = await currentUser(req);
    if (!user) return json(res, 401, { error: 'no_autenticado' });
    const perms = await auth.getPermissionsForUser(user);
    return json(res, 200, { user: auth.toPublicUser(user), permissions: perms });
  }

  // ---- MIS PERMISOS ----
  if (url === '/api/auth/permissions' && req.method === 'GET') {
    const user = await currentUser(req);
    if (!user) return json(res, 401, { error: 'no_autenticado' });
    const perms = await auth.getPermissionsForUser(user);
    return json(res, 200, { permissions: perms });
  }

  // ---- GENERAR SECRETO 2FA (acepta twoFactorToken de login o sesión normal) ----
  if (url === '/api/auth/setup-2fa' && req.method === 'POST') {
    const token = bearer(req);
    if (!token) return json(res, 401, { error: 'no_autenticado' });
    const payload = auth.verifyToken(token);
    const c = getClient();
    let user = null;
    if (payload && payload.purpose === '2fa') {
      const rows = await c.unsafe('SELECT * FROM users WHERE id = $1 AND activo = true LIMIT 1', [Number(payload.sub)]);
      user = rows[0] || null;
    } else {
      user = await currentUser(req);
    }
    if (!user) return json(res, 401, { error: 'token_invalido' });
    const secret = auth.generateTotpSecret();
    const uri = auth.totpUri(secret, user.email, configNombre());
    const qr = await QRCode.toDataURL(uri, { margin: 1, width: 220, errorCorrectionLevel: 'M' });
    return json(res, 200, { secret, uri, qr, code: auth.currentTotp(secret) });
  }

  // ---- ACTIVAR 2FA (confirma con código) ----
  if (url === '/api/auth/enable-2fa' && req.method === 'POST') {
    const user = await currentUser(req);
    if (!user) return json(res, 401, { error: 'no_autenticado' });
    const body = await leerCuerpo(req);
    if (!body || !body.secret || !body.code) return json(res, 400, { error: 'datos_incompletos' });
    if (!auth.verifyTotp(body.secret, body.code)) return json(res, 400, { error: 'codigo_invalido' });
    const c = getClient();
    await c.unsafe(
      'UPDATE users SET two_factor_enabled = true, two_factor_secret = $1 WHERE id = $2',
      [body.secret, user.id]
    );
    return json(res, 200, { ok: true });
  }

  // ---- DESACTIVAR 2FA (requiere código actual) ----
  if (url === '/api/auth/disable-2fa' && req.method === 'POST') {
    const user = await currentUser(req);
    if (!user) return json(res, 401, { error: 'no_autenticado' });
    const body = await leerCuerpo(req);
    if (!body || !body.code) return json(res, 400, { error: 'datos_incompletos' });
    if (!auth.verifyTotp(user.two_factor_secret, body.code)) return json(res, 400, { error: 'codigo_invalido' });
    const c = getClient();
    await c.unsafe(
      'UPDATE users SET two_factor_enabled = false, two_factor_secret = NULL WHERE id = $1',
      [user.id]
    );
    return json(res, 200, { ok: true });
  }

  // ---- LISTAR USUARIOS (requiere permisos users:read) ----
  if (url === '/api/users' && req.method === 'GET') {
    const user = await currentUser(req);
    if (!user) return json(res, 401, { error: 'no_autenticado' });
    const perms = await auth.getPermissionsForUser(user);
    if (!auth.hasPermission(perms, 'users:read')) return json(res, 403, { error: 'sin_permiso' });
    const c = getClient();
    const rows = await c.unsafe('SELECT id, tenant_id, email, nombre, telefono, role, activo, two_factor_enabled, last_login_at, created_at FROM users ORDER BY id');
    return json(res, 200, { users: rows });
  }

  // ---- CREAR USUARIO (requiere users:create) ----
  if (url === '/api/users' && req.method === 'POST') {
    const user = await currentUser(req);
    if (!user) return json(res, 401, { error: 'no_autenticado' });
    const perms = await auth.getPermissionsForUser(user);
    if (!auth.hasPermission(perms, 'users:create')) return json(res, 403, { error: 'sin_permiso' });
    const body = await leerCuerpo(req);
    if (!body || !body.email || !body.password || !body.nombre || !body.role) {
      return json(res, 400, { error: 'datos_incompletos' });
    }
    const roles = ['admin', 'operador', 'cocina', 'solo_lectura'];
    if (!roles.includes(body.role)) return json(res, 400, { error: 'rol_invalido' });
    const passwordHash = await auth.hashPassword(body.password);
    const c = getClient();
    try {
      const rows = await c.unsafe(
        `INSERT INTO users (tenant_id, email, password_hash, nombre, telefono, role, activo, must_change_password)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
         RETURNING id, tenant_id, email, nombre, telefono, role, activo, two_factor_enabled, must_change_password`,
        ['default', String(body.email).toLowerCase().trim(), passwordHash,
         body.nombre, body.telefono || null, body.role, body.activo !== false]
      );
      return json(res, 201, { user: rows[0] });
    } catch (e) {
      if (e && e.code === '23505') return json(res, 409, { error: 'email_existe' });
      throw e;
    }
  }

  // ---- ACTUALIZAR USUARIO ----
  if (url === '/api/users' && req.method === 'PUT') {
    const user = await currentUser(req);
    if (!user) return json(res, 401, { error: 'no_autenticado' });
    const perms = await auth.getPermissionsForUser(user);
    if (!auth.hasPermission(perms, 'users:update')) return json(res, 403, { error: 'sin_permiso' });
    const body = await leerCuerpo(req);
    if (!body || !body.id) return json(res, 400, { error: 'datos_incompletos' });
    const c = getClient();
    if (body.password) {
      const passwordHash = await auth.hashPassword(body.password);
      await c.unsafe(
        'UPDATE users SET password_hash = $1, nombre = COALESCE($2, nombre), telefono = COALESCE($3, telefono), role = COALESCE($4, role), activo = COALESCE($5, activo) WHERE id = $6',
        [passwordHash, body.nombre || null, body.telefono || null, body.role || null, body.activo == null ? null : !!body.activo, Number(body.id)]
      );
    } else {
      await c.unsafe(
        'UPDATE users SET nombre = COALESCE($1, nombre), telefono = COALESCE($2, telefono), role = COALESCE($3, role), activo = COALESCE($4, activo) WHERE id = $5',
        [body.nombre || null, body.telefono || null, body.role || null, body.activo == null ? null : !!body.activo, Number(body.id)]
      );
    }
    return json(res, 200, { ok: true });
  }

  return false;
}

function configNombre() {
  try {
    const { config } = require('../../config');
    const APP = 'Soluciona IA';
    return config.negocio ? `${APP} · ${config.negocio}` : APP;
  } catch {
    return 'Soluciona IA';
  }
}

module.exports = { handleAuthRequest, currentUser, json };