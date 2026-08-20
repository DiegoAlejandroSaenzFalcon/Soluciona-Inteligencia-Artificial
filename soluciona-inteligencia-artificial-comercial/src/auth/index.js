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
const TWO_FA_TTL = '5m';
const JWT_ISSUER = 'soluciona-inteligencia-artificial-comercial';
const JWT_AUDIENCE = 'dashboard';

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

function verifyToken(token) {
  try {
    return jwt.verify(token, getSecret(), { issuer: JWT_ISSUER, audience: JWT_AUDIENCE });
  } catch { return null; }
}

async function createRefreshToken(user, meta) {
  const raw = crypto.randomBytes(48).toString('hex');
  const hashed = crypto.createHash('sha256').update(raw).digest('hex');
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
  const hashed = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const c = getClient();
  await c.unsafe('DELETE FROM sessions WHERE id = $1', [hashed]);
}

async function findSession(refreshToken) {
  const hashed = crypto.createHash('sha256').update(refreshToken).digest('hex');
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
};