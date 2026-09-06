'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { config } = require('../../config');
const { getClient } = require('../db/connection');
const { validateSection, getSectionKeys, SECTIONS } = require('./schemas');

const CONFIG_PATH = path.join(__dirname, '..', '..', 'config.json');
const TENANT_ID = 'default';

// ============================================================
// LECTURA / ESCRITURA DEL ARCHIVO ACTIVO (config.json)
// ============================================================
function readConfigFile() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function writeConfigFile(cfg) {
  const tmp = CONFIG_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2) + '\n');
  fs.renameSync(tmp, CONFIG_PATH);
}

function mergeDeep(base, patch) {
  if (Array.isArray(patch)) return patch;
  if (patch && typeof patch === 'object') {
    const out = { ...(base && typeof base === 'object' ? base : {}) };
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) continue;
      out[k] = mergeDeep(out[k], v);
    }
    return out;
  }
  return patch;
}

function extractSection(cfg, section) {
  const out = {};
  for (const key of getSectionKeys(section)) {
    if (cfg[key] !== undefined) out[key] = cfg[key];
  }
  return sanitizeSection(out, section);
}

function sanitizeSection(obj, section) {
  if (!obj || typeof obj !== 'object') return obj;
  const sensitiveKeys = ['api_key', 'access_key', 'token', 'password', 'secret', 'cert_pass', 'pin_software', 'codigo_software'];
  const out = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (sensitiveKeys.includes(k.toLowerCase())) {
      out[k] = v ? '••••••••' : '';
    } else if (v && typeof v === 'object') {
      out[k] = sanitizeSection(v, section);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function applySection(cfg, section, payload) {
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) continue;
    cfg[key] = mergeDeep(cfg[key], value);
  }
  return cfg;
}

function syncLiveConfig(section, payload) {
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) continue;
    config[key] = mergeDeep(config[key], value);
  }
}

// ============================================================
// OBTENER CONFIGURACIÓN
// ============================================================
function getFullConfig() {
  const cfg = readConfigFile();
  return cfg;
}

function getSection(section) {
  if (!SECTIONS.includes(section)) return null;
  const cfg = readConfigFile();
  return { section, payload: extractSection(cfg, section) };
}

function getSections() {
  const cfg = readConfigFile();
  return SECTIONS.map(section => ({
    section,
    keys: getSectionKeys(section),
    payload: extractSection(cfg, section),
  }));
}

// ============================================================
// ACTUALIZAR SECCIÓN (versionado + auditoría)
// ============================================================
async function updateSection(section, payload, user, meta) {
  if (!SECTIONS.includes(section)) return { error: 'seccion_invalida' };

  const validado = validateSection(section, payload);
  if (validado.error) return validado;

  const cfg = readConfigFile();
  const antes = extractSection(cfg, section);
  const nuevo = applySection(cfg, section, validado.data);

  writeConfigFile(nuevo);
  syncLiveConfig(section, validado.data);

  const c = getClient();
  const ip = (meta && meta.ip) || null;
  const ua = (meta && meta.userAgent) || null;
  const userId = user ? user.id : null;

  await c.unsafe(
    `INSERT INTO config_versions (tenant_id, section, payload, changed_by, ip, user_agent, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, now()) RETURNING id`,
    [TENANT_ID, section, JSON.stringify(validado.data), userId, ip, ua]
  );

  await c.unsafe(
    `INSERT INTO audit_logs (tenant_id, user_id, accion, entidad, entidad_id, antes, despues, ip, user_agent, created_at)
     VALUES ($1, $2, 'CONFIG_CHANGE', 'config', $3, $4, $5, $6, $7, now())`,
    [TENANT_ID, userId, section, JSON.stringify(antes), JSON.stringify(validado.data), ip, ua]
  );

  return { ok: true, section, versionGuardada: true };
}

// ============================================================
// HISTORIAL DE VERSIONES + ROLLBACK
// ============================================================
async function listVersions(section, limit) {
  if (!SECTIONS.includes(section)) return { error: 'seccion_invalida' };
  const c = getClient();
  const rows = await c.unsafe(
    `SELECT cv.id, cv.section, cv.payload, cv.changed_by, u.email AS changed_by_email, cv.ip, cv.user_agent, cv.created_at
     FROM config_versions cv
     LEFT JOIN users u ON u.id = cv.changed_by
     WHERE cv.tenant_id = $1 AND cv.section = $2
     ORDER BY cv.id DESC
     LIMIT $3`,
    [TENANT_ID, section, Math.min(limit || 50, 200)]
  );
  return { section, versions: rows };
}

async function rollback(section, versionId, user, meta) {
  if (!SECTIONS.includes(section)) return { error: 'seccion_invalida' };
  const c = getClient();
  const rows = await c.unsafe(
    'SELECT * FROM config_versions WHERE id = $1 AND tenant_id = $2 AND section = $3',
    [Number(versionId), TENANT_ID, section]
  );
  if (!rows.length) return { error: 'version_no_encontrada' };

  const payload = rows[0].payload;
  const cfg = readConfigFile();
  const antes = extractSection(cfg, section);
  const nuevo = applySection(cfg, section, payload);

  writeConfigFile(nuevo);
  syncLiveConfig(section, payload);

  const ip = (meta && meta.ip) || null;
  const ua = (meta && meta.userAgent) || null;
  const userId = user ? user.id : null;

  await c.unsafe(
    `INSERT INTO config_versions (tenant_id, section, payload, changed_by, ip, user_agent, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())`,
    [TENANT_ID, section, JSON.stringify(payload), userId, ip, ua]
  );
  await c.unsafe(
    `INSERT INTO audit_logs (tenant_id, user_id, accion, entidad, entidad_id, antes, despues, ip, user_agent, created_at)
     VALUES ($1, $2, 'CONFIG_ROLLBACK', 'config', $3, $4, $5, $6, $7, now())`,
    [TENANT_ID, userId, section, JSON.stringify(antes), JSON.stringify(payload), ip, ua]
  );

  return { ok: true, section, rollbackVersion: Number(versionId) };
}

// ============================================================
// SECRETS VAULT (AES-256-GCM)
// ============================================================
let vaultKeyCache = null;
function getVaultKey() {
  if (vaultKeyCache) return vaultKeyCache;
  const env = process.env.CONFIG_VAULT_KEY;
  if (env && env.length >= 32) {
    vaultKeyCache = env;
    return vaultKeyCache;
  }
  const file = path.join(config.dataDir, 'vault_key');
  if (fs.existsSync(file)) {
    vaultKeyCache = fs.readFileSync(file, 'utf8').trim();
    return vaultKeyCache;
  }
  vaultKeyCache = crypto.randomBytes(32).toString('hex');
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, vaultKeyCache, { mode: 0o600 });
  } catch { /* regenerar en cada arranque */ }
  return vaultKeyCache;
}

function encryptSecret(value) {
  const key = Buffer.from(getVaultKey(), 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join(':');
}

function decryptSecret(blob) {
  try {
    const parts = String(blob).split(':');
    if (parts.length !== 3) return null;
    const key = Buffer.from(getVaultKey(), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(parts[0], 'base64'));
    decipher.setAuthTag(Buffer.from(parts[1], 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(parts[2], 'base64')), decipher.final()]).toString('utf8');
  } catch { return null; }
}

async function listSecrets(includeValues) {
  const c = getClient();
  const rows = await c.unsafe(
    'SELECT id, key, description, created_at, updated_at FROM config_secrets WHERE tenant_id = $1 ORDER BY key',
    [TENANT_ID]
  );
  if (!includeValues) return rows;
  const c2 = getClient();
  const full = await c2.unsafe('SELECT * FROM config_secrets WHERE tenant_id = $1 ORDER BY key', [TENANT_ID]);
  return full.map(r => ({ ...r, value: decryptSecret(r.value_encrypted) }));
}

async function setSecret(key, value, description, user, meta) {
  if (!key || !String(key).trim()) return { error: 'clave_invalida' };
  const encrypted = encryptSecret(value);
  const c = getClient();
  const exists = await c.unsafe(
    'SELECT id FROM config_secrets WHERE tenant_id = $1 AND key = $2',
    [TENANT_ID, key]
  );
  if (exists.length) {
    await c.unsafe(
      'UPDATE config_secrets SET value_encrypted = $1, description = COALESCE($2, description), updated_at = now() WHERE tenant_id = $3 AND key = $4',
      [encrypted, description || null, TENANT_ID, key]
    );
  } else {
    await c.unsafe(
      'INSERT INTO config_secrets (tenant_id, key, value_encrypted, description, created_at, updated_at) VALUES ($1,$2,$3,$4,now(),now())',
      [TENANT_ID, key, encrypted, description || null]
    );
  }
  await auditLog({
    accion: exists.length ? 'SECRET_UPDATE' : 'SECRET_CREATE',
    entidad: 'config_secrets',
    entidadId: key,
    despues: { key },
    user, meta,
  });
  return { ok: true, key };
}

async function deleteSecret(key, user, meta) {
  const c = getClient();
  await c.unsafe(
    'DELETE FROM config_secrets WHERE tenant_id = $1 AND key = $2',
    [TENANT_ID, key]
  );
  await auditLog({ accion: 'SECRET_DELETE', entidad: 'config_secrets', entidadId: key, despues: { key }, user, meta });
  return { ok: true, key };
}

// ============================================================
// AUDITORÍA GENÉRICA
// ============================================================
async function auditLog({ accion, entidad, entidadId, antes, despues, user, meta }) {
  const c = getClient();
  await c.unsafe(
    `INSERT INTO audit_logs (tenant_id, user_id, accion, entidad, entidad_id, antes, despues, ip, user_agent, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())`,
    [TENANT_ID, (user && user.id) || null, accion, entidad, entidadId || null,
     antes ? JSON.stringify(antes) : null, despues ? JSON.stringify(despues) : null,
     (meta && meta.ip) || null, (meta && meta.userAgent) || null]
  );
}

async function listAudit(limit) {
  const c = getClient();
  const rows = await c.unsafe(
    `SELECT al.id, al.accion, al.entidad, al.entidad_id, u.email AS user_email, al.ip, al.antes, al.despues, al.created_at
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     WHERE al.tenant_id = $1
     ORDER BY al.id DESC
     LIMIT $2`,
    [TENANT_ID, Math.min(limit || 50, 200)]
  );
  return rows;
}

module.exports = {
  CONFIG_PATH,
  getFullConfig,
  getSection,
  getSections,
  updateSection,
  listVersions,
  rollback,
  listSecrets,
  setSecret,
  deleteSecret,
  decryptSecret,
  listAudit,
  auditLog,
};