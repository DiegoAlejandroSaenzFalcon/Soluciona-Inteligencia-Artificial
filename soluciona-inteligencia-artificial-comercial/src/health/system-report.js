'use strict';
/**
 * src/health/system-report.js — V3: "Salud del Sistema".
 *
 * Capa 1 (GRATIS, 100% real): chequeos deterministas del entorno.
 *   Jamás llama a ninguna API. Jamás expone secretos (solo presencia/ausencia).
 * Capa 2 (opcional): src/health/ai-narrator.js pasa los datos duros a un LLM
 *   (si hay key configurada) para que explique en lenguaje simple.
 *   Si no hay key, queda en modo "SIN IA" y lo dice en text plano.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const raiz = path.resolve(__dirname, '..', '..');

function leerEnv() {
  const p = path.join(raiz, '.env');
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const linea of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function clavePresente(v) {
  return !!(v && v.length > 8 && !/^(your-|CHANGE_ME|TODO|REEMPLAZAR)/i.test(v));
}

function inspectFilesystem() {
  const p = path.join(raiz, 'data');
  const existeData = fs.existsSync(p);
  const dbPath = path.join(p, 'neurallgo.db');
  const existeBD = fs.existsSync(dbPath);
  let tamBD = 0;
  if (existeBD) { try { tamBD = fs.statSync(dbPath).size; } catch { /* no-op */ } }
  return { existeData, existeBD, tamBD };
}

async function inspectDisk() {
  try {
    const disk = await fs.promises.statfs(raiz);
    return { size: disk.size, free: disk.bfree * disk.bsize, blockSize: disk.bsize };
  } catch { return null; }
}

function inspectMemory() {
  const total = os.totalmem();
  const free = os.freemem();
  return { total, free, usada: total - free, usadaPct: Math.round(((total - free) / total) * 100) };
}

function inspectUptime() {
  return { proceso: os.uptime(), host: os.hostname() };
}

function collectChecks() {
  const env = leerEnv();
  const fsInfo = inspectFilesystem();
  const mem = inspectMemory();
  const checks = [];

  checks.push({ nombre: 'Archivo .env', estado: fs.existsSync(path.join(raiz, '.env')) ? 'OK' : 'FAIL' });
  checks.push({ nombre: 'JWT_SECRET', estado: clavePresente(env.JWT_SECRET) ? 'OK' : 'FAIL' });
  checks.push({ nombre: 'PANEL_PASSWORD', estado: clavePresente(env.PANEL_PASSWORD) ? 'OK' : 'FAIL' });
  checks.push({ nombre: 'Base de datos operacional', estado: fsInfo.existeBD ? 'OK' : 'WARN', detalle: fsInfo.existeBD ? `${Math.round(fsInfo.tamBD / 1024)} KB` : 'se crea al primer arranque' });
  checks.push({ nombre: 'IA chatbot (LLM)', estado: clavePresente(env.LLM_API_KEY) ? 'OK' : 'WARN', detalle: clavePresente(env.LLM_API_KEY) ? 'key configurada' : 'sin key — modo honesto (sin IA)' });
  checks.push({ nombre: 'IA asistentes', estado: clavePresente(env.ASISTENTES_IA_API_KEY) ? 'OK' : 'WARN' });
  checks.push({ nombre: 'WhatsApp transporte', estado: env.WHATSAPP_TRANSPORT ? 'OK' : 'INFO', detalle: env.WHATSAPP_TRANSPORT || 'baileys (default)' });
  checks.push({ nombre: 'RAM usada', estado: mem.usadaPct < 85 ? 'OK' : mem.usadaPct < 95 ? 'WARN' : 'FAIL', detalle: `${mem.usadaPct}% de ${Math.round(mem.total / 1024 / 1024 / 1024)} GB` });
  checks.push({ nombre: 'Uptime del proceso', estado: 'INFO', detalle: `${Math.floor(inspectUptime().proceso / 60)} min` });

  return checks;
}

function resumir(checks) {
  const ok = checks.filter(c => c.estado === 'OK').length;
  const fail = checks.filter(c => c.estado === 'FAIL').length;
  const warn = checks.filter(c => c.estado === 'WARN').length;
  return { ok, fail, warn };
}

async function obtenerReporteCompleto() {
  const checks = collectChecks();
  const stats = resumir(checks);
  const fecha = new Date().toISOString();
  const iaDisponible = clavePresente(leerEnv().LLM_API_KEY);

  return {
    meta: {
      sistema: 'Soluciona IA — Panel Empresarial',
      fecha,
      versionEsquema: 1,
      iaNarrativaDisponible: iaDisponible,
      notaHonestidad: iaDisponible
        ? 'Si pides la narrativa por IA, la IA ve estos datos y los explica. Los números de arriba son reglas deterministas (sin IA).'
        : 'Sin clave de IA: este es el estado real por reglas, no la interpretación de un modelo.',
    },
    resumen: stats,
    checks,
  };
}

module.exports = { obtenerReporteCompleto };
