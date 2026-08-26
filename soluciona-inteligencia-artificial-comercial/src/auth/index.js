'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { config } = require('../../config');
const { getClient } = require('../db/connection');

const ACCESS_TTL = '15m';
const REFRESH_TTL_DAYS = 30;
const TWO_FA_TTL = '10m'; // Aumentado de 5m a 10m para mejor UX
const JWT_ISSUER = config.jwt_issuer || 'soluciona-inteligencia-artificial-comercial';
const JWT_AUDIENCE = config.jwt_audience || 'dashboard';
const REFRESH_PEPPER = process.env.REFRESH_PEPPER || crypto.randomBytes(32).toString('hex'); // Pepper para refresh tokens

// ============================================================
// SECRETO JWT (env → archivo persistente → auto-generado)
// ============================================================
let secretCache = null;
function getSecret() {
  if (secretCache) return secretCache;
  const env = process.env.JWT_SECRET;
  if (env && env.length >= 16) {
    secretCache = env;
    return secretCache;
  }
  const file = path.join(config.dataDir, 'jwt_secret');
  if (fs.existsSync(file)) {
    secretCache = fs.readFileSync(file, 'utf8').trim();
    return secretCache;
  }
  secretCache = crypto.randomBytes(48).toString('hex');
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, secretCache, { mode: 0o600 });
  } catch (e) { /* sin permisos: se regenera cada arranque */ }
  return secretCache;
}

// ============================================================
// JWT SECRET ROTATION (cada 30 días, invalida refresh tokens)
// ============================================================
const JWT_ROTATION_DAYS = 30;
let secretVersions = []; // [{ version, secret, createdAt, active }]

function loadSecretVersions() {
  const file = path.join(config.dataDir, 'jwt_secrets.json');
  if (fs.existsSync(file)) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(data) && data.length) secretVersions = data;
    } catch (e) { /* ignore */ }
  }
  if (!secretVersions.length) {
    // Usar getSecret() original (legacy) ANTES de que secretVersions exista
    const legacySecret = (() => {
      const env = process.env.JWT_SECRET;
      if (env && env.length >= 16) return env;
      const file = path.join(config.dataDir, 'jwt_secret');
      if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
      return crypto.randomBytes(48).toString('hex');
    })();
    secretVersions = [{ version: 1, secret: legacySecret, createdAt: Date.now(), active: true }];
    saveSecretVersions();
  }
  // Asegurar al menos una activa
  if (!secretVersions.some(v => v.active)) secretVersions[0].active = true;
  return secretVersions;
}

function saveSecretVersions() {
  const file = path.join(config.dataDir, 'jwt_secrets.json');
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(secretVersions, null, 2), { mode: 0o600 });
  } catch (e) { /* ignore */ }
}

function getCurrentSecret() {
  const active = secretVersions.find(v => v.active);
  return active ? active.secret : secretVersions[0].secret;
}

function getAllSecrets() {
  const now = Date.now();
  return secretVersions
    .filter(v => v.active || (v.expiresAt && now < v.expiresAt))
    .map(v => v.secret);
}

// Rotar secreto: genera nuevo, marca anterior como en transición
// Período de gracia: 24h donde ambos secretos son válidos para no forzar re-login inmediato
async function rotateJwtSecret() {
  const newSecret = crypto.randomBytes(48).toString('hex');
  const version = (secretVersions[0]?.version || 0) + 1;
  const now = Date.now();
  // Marcar secreto actual como "en transición" - sigue válido por 24h más
  secretVersions.forEach(v => { v.active = false; v.expiresAt = now + 24 * 60 * 60 * 1000; });
  secretVersions.unshift({ version, secret: newSecret, createdAt: now, active: true, expiresAt: now + JWT_ROTATION_DAYS * 24 * 60 * 60 * 1000 });
  // Mantener solo últimos 2 secretos (actual + anterior para transición)
  if (secretVersions.length > 2) secretVersions = secretVersions.slice(0, 2);
  saveSecretVersions();
  secretCache = newSecret; // actualizar cache de getSecret()
  // NO invalidar refresh tokens inmediatamente - expiran naturalmente
  console.log('[JWT] Secreto rotado v' + version + '. Período de gracia 24h para transición suave.');
  return version;
}

// Programar rotación cada 30 días
let jwtRotationTimer = null;
function scheduleJwtRotation() {
  if (jwtRotationTimer) return;
  const runAt = () => {
    const now = new Date();
    const target = new Date(now);
    target.setHours(3, 0, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const ms = target - now;
    setTimeout(() => {
      rotateJwtSecret().catch(e => console.error('[JWT] Error rotando secreto:', e));
      jwtRotationTimer = setInterval(() => rotateJwtSecret().catch(e => console.error('[JWT] Error rotando secreto:', e)), JWT_ROTATION_DAYS * 24 * 60 * 60 * 1000);
    }, ms);
  };
  runAt();
}

// Cargar versiones al iniciar
loadSecretVersions();
scheduleJwtRotation();

// verifyToken prueba el secreto actual y todas las versiones (transición suave).
// NOTA: signAccessToken firma con getSecret(); si jwt_secret y jwt_secrets.json
// divergen (regeneración/rotación), sin getSecret() aquí todo token nuevo daría 401.
const _verifyToken = verifyToken;
function verifyToken(token) {
  const candidatos = [...new Set([getSecret(), ...getAllSecrets()])];
  for (const secret of candidatos) {
    try {
      return jwt.verify(token, secret, { issuer: JWT_ISSUER, audience: JWT_AUDIENCE });
    } catch (e) { /* probar siguiente */ }
  }
  return null;
}

// ============================================================
// PASSWORDS
// ============================================================
async function hashPassword(pw) {
  return bcrypt.hash(String(pw), 12);
}

async function verifyPassword(pw, hash) {
  if (!hash) return false;
  try { return await bcrypt.compare(String(pw), hash); }
  catch { return false; }
}

// ============================================================
// TOKENS
// ============================================================
function signAccessToken(user, extra) {
  return jwt.sign({
    sub: String(user.id),
    tenantId: user.tenant_id,
    role: user.role,
    nombre: user.nombre,
    email: user.email,
    ...extra,
  }, getSecret(), { expiresIn: ACCESS_TTL, issuer: JWT_ISSUER, audience: JWT_AUDIENCE });
}

async function createRefreshToken(user, meta) {
  const raw = crypto.randomBytes(48).toString('hex');
  // Añadir pepper para defensa en profundidad si BD se filtra
  const peppered = crypto.createHmac('sha256', REFRESH_PEPPER).update(raw).digest('hex');
  const hashed = crypto.createHash('sha256').update(peppered).digest('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 864e5);
  const c = await getClient();
  await c.unsafe(
    `INSERT INTO sessions (id, user_id, tenant_id, ip, user_agent, expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())`,
    [hashed, user.id, user.tenant_id, (meta && meta.ip) || null, (meta && meta.userAgent) || null, expiresAt]
  );
  return { token: raw, expiresAt };
}

async function revokeRefreshToken(refreshToken) {
  const peppered = crypto.createHmac('sha256', REFRESH_PEPPER).update(refreshToken).digest('hex');
  const hashed = crypto.createHash('sha256').update(peppered).digest('hex');
  const c = getClient();
  await c.unsafe('DELETE FROM sessions WHERE id = $1', [hashed]);
}

async function findSession(refreshToken) {
  const peppered = crypto.createHmac('sha256', REFRESH_PEPPER).update(refreshToken).digest('hex');
  const hashed = crypto.createHash('sha256').update(peppered).digest('hex');
  const c = getClient();
  const rows = await c.unsafe(
    'SELECT * FROM sessions WHERE id = $1 AND expires_at > now()',
    [hashed]
  );
  return rows.length ? rows[0] : null;
}

// ============================================================
// LOGIN / REFRESH / LOGOUT
// ============================================================
async function login(email, password, meta) {
  const tenantId = (meta && meta.tenantId) || 'default';
  const c = getClient();
  const rows = await c.unsafe(
    `SELECT * FROM users WHERE email = $1 AND tenant_id = $2 LIMIT 1`,
    [String(email || '').toLowerCase().trim(), tenantId]
  );
  if (!rows.length) return { error: 'credentials' };
  const user = rows[0];
  if (!user.activo) return { error: 'inactive' };
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return { error: 'credentials' };

  await c.unsafe('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);

  if (user.two_factor_enabled) {
    const twoFactorToken = jwt.sign({ sub: String(user.id), purpose: '2fa' },
      getSecret(), { expiresIn: TWO_FA_TTL, issuer: JWT_ISSUER, audience: JWT_AUDIENCE });
    return { requiresTwoFactor: true, twoFactorToken };
  }

  const refresh = await createRefreshToken(user, meta);
  return {
    accessToken: signAccessToken(user),
    refreshToken: refresh.token,
    expiresIn: 15 * 60,
    user: toPublicUser(user),
  };
}

async function verifyTwoFactor(twoFactorToken, code, meta) {
  const payload = verifyToken(twoFactorToken);
  if (!payload || payload.purpose !== '2fa') return { error: 'invalid_token' };
  const c = getClient();
  const rows = await c.unsafe('SELECT * FROM users WHERE id = $1 LIMIT 1', [Number(payload.sub)]);
  if (!rows.length) return { error: 'invalid_token' };
  const user = rows[0];
  if (!verifyTotp(user.two_factor_secret, code)) return { error: 'invalid_code' };
  const refresh = await createRefreshToken(user, meta);
  return {
    accessToken: signAccessToken(user),
    refreshToken: refresh.token,
    expiresIn: 15 * 60,
    user: toPublicUser(user),
  };
}

async function refresh(refreshToken, meta) {
  if (!refreshToken) return { error: 'invalid_token' };
  const session = await findSession(refreshToken);
  if (!session) return { error: 'invalid_token' };
  const c = getClient();
  const rows = await c.unsafe('SELECT * FROM users WHERE id = $1 AND activo = true LIMIT 1', [session.user_id]);
  if (!rows.length) return { error: 'invalid_token' };
  const user = rows[0];
  // Rotación de sesión
  await c.unsafe('DELETE FROM sessions WHERE id = $1', [session.id]);
  const nuevo = await createRefreshToken(user, meta || { ip: session.ip, userAgent: session.user_agent });
  return {
    accessToken: signAccessToken(user),
    refreshToken: nuevo.token,
    expiresIn: 15 * 60,
    user: toPublicUser(user),
  };
}

async function logout(refreshToken) {
  if (refreshToken) await revokeRefreshToken(refreshToken);
  return { ok: true };
}

function toPublicUser(u) {
  return {
    id: u.id,
    email: u.email,
    nombre: u.nombre,
    telefono: u.telefono,
    role: u.role,
    tenantId: u.tenant_id,
    twoFactorEnabled: !!u.two_factor_enabled,
    mustChangePassword: !!u.must_change_password,
  };
}

// ============================================================
// PERMISOS (RBAC)
// ============================================================
async function getPermissionsForUser(user) {
  if (!user) return [];
  if (user.role === 'admin') return ['*'];
  const c = getClient();
  const rows = await c.unsafe(
    `SELECT p.code FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id
     WHERE rp.role = $1`,
    [user.role]
  );
  const codes = new Set(rows.map(r => r.code));
  const overrides = await c.unsafe(
    `SELECT p.code, up.granted FROM user_permissions up
     JOIN permissions p ON p.id = up.permission_id
     WHERE up.user_id = $1`,
    [user.id]
  );
  for (const o of overrides) {
    if (o.granted) codes.add(o.code);
    else codes.delete(o.code);
  }
  return [...codes];
}

function hasPermission(codes, code) {
  return codes.includes('*') || codes.includes(code);
}

// ============================================================
// 2FA TOTP (RFC 6238, HMAC-SHA1, 6 dígitos, ventana 30s)
// ============================================================
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf) {
  let bits = 0, value = 0, out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(s) {
  const clean = String(s).toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0, value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = BASE32.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function generateTotpSecret() {
  return base32Encode(crypto.randomBytes(20));
}

function hotp(secret, counter, digits) {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = h[h.length - 1] & 0x0f;
  const bin = ((h[offset] & 0x7f) << 24) | (h[offset + 1] << 16) | (h[offset + 2] << 8) | h[offset + 3];
  return (bin % Math.pow(10, digits || 6)).toString().padStart(digits || 6, '0');
}

function currentTotp(secret) {
  return hotp(secret, Math.floor(Date.now() / 1000 / 30));
}

function verifyTotp(secret, token, window) {
  if (!secret || !token) return false;
  const w = window || 1;
  const counter = Math.floor(Date.now() / 1000 / 30);
  const candidate = String(token).replace(/\D/g, '').padStart(6, '0');
  for (let i = -w; i <= w; i++) {
    if (hotp(secret, counter + i) === candidate) return true;
  }
  return false;
}

function totpUri(secret, account, issuer) {
  const enc = encodeURIComponent;
  return `otpauth://totp/${enc(issuer)}:${enc(account)}?secret=${secret}&issuer=${enc(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

module.exports = {
  hashPassword,
  verifyPassword,
  signAccessToken,
  verifyToken,
  login,
  verifyTwoFactor,
  refresh,
  logout,
  revokeRefreshToken,
  getPermissionsForUser,
  hasPermission,
  generateTotpSecret,
  verifyTotp,
  currentTotp,
  totpUri,
  toPublicUser,
  ACCESS_TTL,
  REFRESH_TTL_DAYS,
  rotateJwtSecret,
  scheduleJwtRotation,
};