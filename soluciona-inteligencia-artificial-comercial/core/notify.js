const { config } = require('../config.cjs');

let sockActivo = null;
let conectado = false;
let ultimoCambio = null;
let ultimoAviso = 0;
let botNumero = '';
let botNombre = '';

// Extrae el número y nombre del WhatsApp del bot desde el socket de Baileys.
function capturarInfoSock(s) {
  if (!s) return;
  try {
    const uid = (s.user && (s.user.id || s.user.me || '')) || '';
    const numero = String(uid).split('@')[0].split(':')[0].replace(/\D/g, '');
    if (numero) botNumero = numero;
    const nombre = (s.user && (s.user.name || '')) || '';
    if (nombre) botNombre = nombre;
  } catch (e) {
    console.error('[NOTIFY] No pude leer datos del socket:', e && e.message ? e.message : e);
  }
}

function setSock(s) {
  sockActivo = s;
  capturarInfoSock(s);
}

function setConectado(v) {
  conectado = !!v;
  global.conectado = !!v;
  ultimoCambio = new Date().toISOString();
  if (v) capturarInfoSock(sockActivo);
}

function haySock() {
  return !!sockActivo;
}

function estadoBot() {
  return { conectado, ultimoCambio, numero: botNumero, nombre: botNombre };
}

async function notificar(jid, texto) {
  if (!sockActivo) return false;
  try {
    await sockActivo.sendMessage(jid, { text: texto });
    return true;
  } catch (e) {
    console.error('[NOTIFY] No pude avisar al cliente:', e && e.message ? e.message : e);
    return false;
  }
}

// Alerta al dueño por canal alterno (Telegram) cuando el bot NO puede responder
// por WhatsApp. Config en config.json -> "alertas": { "telegram": { "token", "chat_id" } }.
async function alertarDueno(texto) {
  const cfg = config.alertas && config.alertas.telegram;
  if (!cfg || !cfg.token || !cfg.chat_id) return false;
  const ahora = Date.now();
  if (ahora - ultimoAviso < 30000) return false;
  ultimoAviso = ahora;
  try {
    const resp = await fetch(`https://api.telegram.org/bot${cfg.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: cfg.chat_id, text: `⚠️ ${config.nombreNegocio()}: ${texto}` })
    });
    if (!resp.ok) console.error('[ALERTA] telegram devolvió', resp.status);
    else console.log('[ALERTA] Aviso enviado al dueño por Telegram.');
    return resp.ok;
  } catch (e) {
    console.error('[ALERTA] No pude avisar por Telegram:', e && e.message ? e.message : e);
    return false;
  }
}

module.exports = { setSock, setConectado, haySock, estadoBot, notificar, alertarDueno };