#!/usr/bin/env node
'use strict';
/**
 * vault-client.js — Gestor de bóvedas cifradas por cliente (V1).
 *
 * Principio: CADA cliente tiene su propia bóveda cifrada y SÓLO el PO la abre.
 *
 *   node scripts/vault-client.js <comando> <cliente> [clave] [valor]
 *
 * Comandos:
 *   init <cliente>                     → crea la bóveda vacía del cliente
 *   set <cliente> <CLAVE>              → añade/actualiza un secreto (lee el valor por input oculto)
 *   get <cliente> <CLAVE>              → muestra el secreto (solo consola; NUNCA se guarda en texto plano)
 *   list <cliente>                     → lista claves (sin valores)
 *   delete <cliente> <CLAVE>           → borra un secreto
 *
 * Seguridad:
 *   - AES-256-GCM. Clave por cliente derivada de la clave MAESTRA del PO vía HKDF.
 *   - La clave maestra JAMÁS se guarda en disco: se pide por entrada oculta.
 *   - Vault vive en data/tenants/<slug>/secrets.vault.enc — fuera de git, siempre.
 *   - Auditoría append-only en data/tenants/<slug>/vault-audit.log (sin valores).
 *   - Si el valor en disco está corrupto/manipulado → el tag GCM falla y rechaza.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const raiz = path.resolve(__dirname, '..');
const RAIZ_TENANTS = path.join(raiz, 'data', 'tenants');

function uso() {
  console.error([
    'vault-client.js — gestor de bóvedas cifradas por cliente',
    '',
    'Uso:',
    '  node scripts/vault-client.js init <cliente>',
    '  node scripts/vault-client.js set <cliente> <CLAVE>',
    '  node scripts/vault-client.js get <cliente> <CLAVE>',
    '  node scripts/vault-client.js list <cliente>',
    '  node scripts/vault-client.js delete <cliente> <CLAVE>',
    '',
    'La clave maestra se pide por entrada oculta. NADA se escribe a disco sin cifrar.'
  ].join('\n'));
  process.exit(1);
}

// Entrada oculta en TTY (Windows/Linux). Terminal=true + Writable que mutea stdout.
function leerOculto(prompt) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      let v = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', c => (v += c));
      process.stdin.on('end', () => resolve(v.trim()));
      return;
    }
    const escritorMudo = new (require('stream').Writable)({
      write: (chunk, enc, cb) => cb(),
    });
    const rl = readline.createInterface({ input: process.stdin, output: escritorMudo, terminal: true });
    rl.question(prompt, (resp) => { rl.close(); process.stdout.write('\n'); resolve(resp); });
  });
}

function derivarClaveCliente(claveMaestra, clienteId) {
  const master = Buffer.from(String(claveMaestra).trim(), 'utf8');
  return crypto.hkdfSync('sha256', master, Buffer.from(String(clienteId).trim(), 'utf8'), Buffer.from('soluciona-vault-v1', 'utf8'), 32);
}

function vaultPath(clienteId) {
  return path.join(RAIZ_TENANTS, clienteId, 'secrets.vault.enc');
}
function auditPath(clienteId) {
  return path.join(RAIZ_TENANTS, clienteId, 'vault-audit.log');
}
function asegurarDir(clienteId) {
  fs.mkdirSync(path.dirname(vaultPath(clienteId)), { recursive: true, mode: 0o700 });
}

function auditar(clienteId, accion, detalle) {
  asegurarDir(clienteId);
  const ts = new Date().toISOString();
  fs.appendFileSync(auditPath(clienteId), `${ts} | ${accion} | ${detalle}\n`, 'utf8');
}

function leerVault(clienteId, claveCliente) {
  const p = vaultPath(clienteId);
  if (!fs.existsSync(p)) return {};
  const raw = fs.readFileSync(p, 'utf8');
  const partes = raw.split(':');
  if (partes.length !== 4) throw new Error('boveda_corrupta_o_en_formato_inesperado');
  const [saltB64, ivB64, tagB64, encB64] = partes;
  const iv = Buffer.from(ivB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', claveCliente, iv);
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const claro = Buffer.concat([decipher.update(Buffer.from(encB64, 'base64')), decipher.final()]).toString('utf8');
  return JSON.parse(claro);
}

function escribirVault(clienteId, claveCliente, datos) {
  asegurarDir(clienteId);
  const claro = Buffer.from(JSON.stringify(datos), 'utf8');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', claveCliente, iv);
  const enc = Buffer.concat([cipher.update(claro), cipher.final()]);
  const tag = cipher.getAuthTag();
  const contenido = ['', iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join(':');
  fs.writeFileSync(vaultPath(clienteId), contenido, { mode: 0o600 });
}

async function pedirClaveMaestra() {
  const fromEnv = process.env.SOLUCIONA_MASTER_KEY;
  if (fromEnv && fromEnv.length >= 32) return fromEnv;
  const clave = await leerOculto('Clave maestra del operador (64 chars hex o pásala con SOLUCIONA_MASTER_KEY): ');
  if (!clave || clave.length < 32) throw new Error('clave_maestra_demasiado_corta');
  return clave;
}

async function main() {
  const [comando, clienteId, claveNombre, valorArg] = process.argv.slice(2);
  if (!comando || !clienteId || !/^[a-z0-9-_]+$/i.test(clienteId)) uso();
  if (comando === 'init') {
    const master = await pedirClaveMaestra();
    const claveCliente = derivarClaveCliente(master, clienteId);
    if (fs.existsSync(vaultPath(clienteId))) { console.log(`ya existe bóveda para ${clienteId}`); process.exit(1); }
    escribirVault(clienteId, claveCliente, {});
    auditar(clienteId, 'INIT', 'bóveda creada');
    console.log(`OK bóveda creada para ${clienteId} en ${vaultPath(clienteId)}`);
    return;
  }
  if (comando === 'set') {
    if (!claveNombre) uso();
    const master = await pedirClaveMaestra();
    const claveCliente = derivarClaveCliente(master, clienteId);
    let datos = {};
    try { datos = leerVault(clienteId, claveCliente); } catch { /* nueva bóveda */ }
    let valor = valorArg;
    if (valor === undefined) valor = await leerOculto(`Valor para ${claveNombre}: `);
    datos[claveNombre] = valor;
    escribirVault(clienteId, claveCliente, datos);
    auditar(clienteId, 'SET', `clave=${claveNombre}`);
    console.log(`OK ${claveNombre} guardado en la bóveda de ${clienteId}`);
    return;
  }
  if (comando === 'get') {
    if (!claveNombre) uso();
    const master = await pedirClaveMaestra();
    const claveCliente = derivarClaveCliente(master, clienteId);
    const datos = leerVault(clienteId, claveCliente);
    if (!(claveNombre in datos)) { console.error('no existe la clave'); process.exit(1); }
    console.log(datos[claveNombre]);
    return;
  }
  if (comando === 'list') {
    const master = await pedirClaveMaestra();
    const claveCliente = derivarClaveCliente(master, clienteId);
    const datos = leerVault(clienteId, claveCliente);
    const keys = Object.keys(datos).sort();
    console.log(`Bóveda ${clienteId} (${keys.length} claves):`);
    for (const k of keys) console.log(`  ${k}  [REDACTADO]`);
    return;
  }
  if (comando === 'delete') {
    if (!claveNombre) uso();
    const master = await pedirClaveMaestra();
    const claveCliente = derivarClaveCliente(master, clienteId);
    const datos = leerVault(clienteId, claveCliente);
    if (!(claveNombre in datos)) { console.error('no existe la clave'); process.exit(1); }
    delete datos[claveNombre];
    escribirVault(clienteId, claveCliente, datos);
    auditar(clienteId, 'DELETE', `clave=${claveNombre}`);
    console.log(`OK ${claveNombre} eliminado de la bóveda de ${clienteId}`);
    return;
  }
  uso();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
