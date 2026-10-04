'use strict';
/**
 * verify-environment.js — Inspector de entorno para Soluciona IA Comercial.
 *
 * Propósito: que cualquier instalación/actualización PRIMERO se verifique, NUNCA se asuma.
 * Inspirado en el bloqueo real de este proyecto: "no sabíamos si la app estaba viva o rota".
 *
 * Uso:
 *   node scripts/verify-environment.js              → reporte en consola
 *   node scripts/verify-environment.js --json       → JSON (para CI)
 *   node scripts/verify-environment.js --fail-on-missing  → exit 1 si hay bloqueadores FAIL
 *
 * Reglas:
 *   - NUNCA imprime secretos. Los valores sensibles se reportan como [PRESENTE]/[AUSENTE].
 *   - Código de salida 0 = operativo; 1 = hay bloqueadores; 2 = error del inspector.
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const raiz = path.resolve(__dirname, '..');
const salidaJson = process.argv.includes('--json');
const failOnMissing = process.argv.includes('--fail-on-missing');

const checks = [];
function agregar(nombre, estado, detalle, recomendacion) {
  checks.push({ nombre, estado, detalle: detalle || '', recomendacion: recomendacion || '' });
}

function leerEnv(ruta) {
  if (!fs.existsSync(ruta)) return {};
  const out = {};
  for (const linea of fs.readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function clavePresente(v) {
  return !!(v && v.length > 8 && !/^(your-|CHANGE_ME|TODO|REEMPLAZAR)/i.test(v));
}

function verificar() {
  const envPath = path.join(raiz, '.env');
  const env = leerEnv(envPath);

  // 1. En torno
  agregar(
    'Archivo .env',
    fs.existsSync(envPath) ? 'OK' : 'FAIL',
    fs.existsSync(envPath) ? 'existe' : 'no existe',
    fs.existsSync(envPath) ? '' : 'Copiar .env.example → .env y llenar'
  );

  // 2. Secretos base (sin exponer valores)
  agregar('JWT_SECRET', clavePresente(env.JWT_SECRET) ? 'OK' : 'FAIL', clavePresente(env.JWT_SECRET) ? 'presente' : 'vacío', 'Generar: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  agregar('PANEL_PASSWORD', clavePresente(env.PANEL_PASSWORD) ? 'OK' : 'FAIL', clavePresente(env.PANEL_PASSWORD) ? 'presente' : 'vacío', 'reset-admin.js para primera contraseña');

  // 3. Base de datos
  const dbPath = path.join(raiz, 'data', 'neurallgo.db');
  const engine = (env.DB_ENGINE || 'sqlite').toLowerCase();
  let dbOk = false; let dbDetalle = '';
  if (engine === 'sqlite') {
    const existeDb = fs.existsSync(dbPath);
    if (existeDb) {
      try {
        const db = new DatabaseSync(dbPath, { readOnly: true });
        const tablas = db.prepare("SELECT COUNT(*) as n FROM sqlite_master WHERE type='table'").get();
        db.close();
        dbOk = true; dbDetalle = `sqlite OK, tablas: ${tablas.n}`;
      } catch (e) { dbDetalle = `sqlite existe pero no abre: ${e.message}`; }
    } else {
      dbDetalle = 'no existe data/neurallgo.db (se crea al primer arranque)';
    }
    agregar('Base de datos (sqlite)', dbOk ? 'OK' : 'FAIL', dbDetalle, dbOk ? '' : 'node index.js (primera vez la crea)');
  } else {
    agregar('Base de datos (postgres)', 'WARN', `engine=${engine}; comprobación de conectividad no incluida en este verificador`, 'Configurar conexión PG');
  }

  // 4. Proveedores de IA (leer claves, no exponer)
  agregar('IA chatbot (LLM)', clavePresente(env.LLM_API_KEY) ? 'OK' : 'WARN', clavePresente(env.LLM_API_KEY) ? 'api key presente' : 'no configurada', 'Sin esta el bot no razona por IA (se responde con mensaje honesto)');
  agregar('IA asistentes', clavePresente(env.ASISTENTES_IA_API_KEY) ? 'OK' : 'WARN', clavePresente(env.ASISTENTES_IA_API_KEY) ? 'api key presente' : 'no configurada', 'Sin esta no hay panel-asistentes');
  agregar('IA visión', clavePresente(env.VISION_API_KEY) ? 'OK' : 'WARN', clavePresente(env.VISION_API_KEY) ? 'api key presente' : 'no configurada', 'Extracción de menú por foto desactivada');
  agregar('Gemini fallback', clavePresente(env.GEMINI_API_KEY) ? 'OK' : 'WARN', clavePresente(env.GEMINI_API_KEY) ? 'api key presente' : 'no configurada', 'Fallback opcional');

  // 5. WhatsApp
  const transporte = (env.WHATSAPP_TRANSPORT || 'baileys').toLowerCase();
  agregar('WhatsApp transporte', 'INFO', `WHATSAPP_TRANSPORT=${transporte}`, "baileys = legacy QR; cloud = Meta oficial");
  if (transporte === 'cloud') {
    agregar('WhatsApp Cloud credenciales',
      ['WHATSAPP_CLOUD_PHONE_ID', 'WHATSAPP_CLOUD_TOKEN', 'WHATSAPP_BUSINESS_ACCOUNT_ID', 'WHATSAPP_APP_SECRET'].every(k => clavePresente(env[k])) ? 'OK' : 'FAIL',
      'phone_id/token/waba/app_secret', 'Solo conlas 4 → transporte conecta; sin ellas el bot no arranca en cloud');
    agregar('WhatsApp webhook verify token', clavePresente(env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) ? 'OK' : 'WARN', 'token de verificación del webhook', 'Necesario para que Meta verifique el endpoint (cualquier cadena larga inventada por TI)');
  }

  // 6. Web/API
  agregar('HTTP puerto', 'INFO', `PORT=${env.PORT || 3000}`, 'Si está ocupado: PORT=3001 node index.js');

  return checks;
}

function imprimirTabla(checks) {
  const pad = (s, n) => String(s).padEnd(n);
  console.log('\n  ENTORNO SOLUCIONA IA — VERIFICACIÓN PREVIA AL ARRANQUE');
  console.log('  ' + '='.repeat(72));
  console.log('  ' + pad('CHEQUEO', 34) + pad('ESTADO', 10) + pad('DETALLE', 26) + 'SI NO →');
  console.log('  ' + '-'.repeat(72));
  for (const c of checks) {
    const estado = c.estado === 'OK' ? 'OK' : c.estado === 'FAIL' ? 'FAIL' : c.estado === 'WARN' ? 'WARN' : 'INFO';
    console.log('  ' + pad(c.nombre, 34) + pad(estado, 10) + pad(c.detalle, 26) + c.recomendacion);
  }
  const nOk = checks.filter(c => c.estado === 'OK').length;
  const nFail = checks.filter(c => c.estado === 'FAIL').length;
  const nWarn = checks.filter(c => c.estado === 'WARN').length;
  console.log('  ' + '-'.repeat(72));
  console.log(`  OK: ${nOk}  FAIL: ${nFail}  WARN: ${nWarn}`);
  if (nFail > 0) console.log('\n  🚫 HAY BLOQUEADORES. Resuelve FAIL antes de levantar.');
  else if (nWarn > 0) console.log('\n  ⚠️  Sin bloqueadores críticos, pero hay WARN. Puedes arrancar (parcial).');
  else console.log('\n  ✅ Todo listo para arrancar.');
}

function main() {
  const checks = verificar();
  if (salidaJson) { console.log(JSON.stringify(checks, null, 2)); return; }
  imprimirTabla(checks);
  if (failOnMissing && checks.some(c => c.estado === 'FAIL')) process.exit(1);
  process.exit(0);
}

main();
