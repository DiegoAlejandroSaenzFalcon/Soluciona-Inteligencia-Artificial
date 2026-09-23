'use strict';
/**
 * Endpoint público y FIRMADO para el webhook de WhatsApp Cloud API (Meta).
 *
 * Razón de ser (auditoría T2 — PR #11): el cliente y transporte Cloud existían
 * pero no había endpoint HTTP donde Meta pudiera empujar mensajes. Este módulo
 * es el único punto público del sistema que no requiere login; su autenticación
 * NO es una sesión, es la verificación HMAC-SHA256 contra el App Secret.
 *
 * Rutas montadas en transports/web.js ANTES del gate de autenticación:
 *   GET  /webhook/whatsapp  → handshake de Meta (hub.mode/hub.verify_token/hub.challenge)
 *   POST /webhook/whatsapp  → recepción de mensajes (firma hub.signature256)
 */

const crypto = require('crypto');

/**
 * Verificación del handshake GET. Meta espera la challenge en texto plano 200.
 */
function verifyWebhookHandshake(query, verifyToken) {
  const mode = String(query['hub.mode'] || '');
  const token = String(query['hub.verify_token'] || '');
  const challenge = query['hub.challenge'];

  if (mode !== 'subscribe' || !challenge) return null;
  if (!verifyToken || token !== verifyToken) return null;
  return String(challenge);
}

/**
 * Verificación HMAC-SHA256 del cuerpo RAW del POST.
 * timingSafeEqual exige longitudes iguales; se normaliza con un hash intermedio.
 */
function verifySignature(rawBody, signatureHeader, appSecret) {
  if (!appSecret) return { ok: false, reason: 'APP_SECRET_NO_CONFIGURADO' };
  if (!signatureHeader || !/^sha256=[a-f0-9]{64}$/i.test(signatureHeader)) {
    return { ok: false, reason: 'FIRMA_AUSENTE_O_MALFORMADA' };
  }
  const esperado = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const a = Buffer.from(signatureHeader, 'utf8');
  const b = Buffer.from(esperado, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b)
    ? { ok: true }
    : { ok: false, reason: 'FIRMA_NO_COINCIDE' };
}

/**
 * Recolecta el cuerpo crudo (la firma HMAC se calcula sobre los bytes exactos).
 */
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/**
 * Handler principal para POST /webhook/whatsapp.
 * Devuelve { status, payload } — NUNCA deja la petición colgada (Meta reintenta si no hay 200).
 */
async function handleWebhookPost(req, cloudTransport, opts = {}) {
  const raw = await readRawBody(req);
  const appSecret = opts.appSecret || cloudTransport?.config?.appSecret;

  if (appSecret) {
    const firma = verifySignature(raw, req.headers['x-hub-signature-256'], appSecret);
    if (!firma.ok) return { status: 403, payload: { error: firma.reason } };
  }

  let body;
  try { body = JSON.parse(raw.toString('utf8')); }
  catch { return { status: 400, payload: { error: 'cuerpo_no_json' } }; }

  if (!body.entry) return { status: 200, payload: { status: 'ok' } };

  if (!cloudTransport) return { status: 503, payload: { error: 'transporte_cloud_no_activo' } };

  for (const entry of body.entry) {
    for (const change of (entry.changes || [])) {
      if (change.field === 'messages' && change.value) {
        await cloudTransport._handleMessages(change.value);
      }
    }
  }
  return { status: 200, payload: { status: 'ok' } };
}

/**
 * Registro del endpoint en web.js (envoltura hacia handlers Node nativos).
 */
function registerWhatsAppWebhook(req, res, cloudTransport) {
  const urlObj = new URL(req.url, 'http://localhost');
  if (urlObj.pathname !== '/webhook/whatsapp') return false;

  if (req.method === 'GET') {
    const challenge = verifyWebhookHandshake(
      Object.fromEntries(urlObj.searchParams),
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
    );
    if (challenge === null) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'verificacion_fallida' }));
    } else {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(challenge);
    }
    return true;
  }

  if (req.method === 'POST') {
    handleWebhookPost(req, cloudTransport)
      .then(r => {
        res.writeHead(r.status, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(r.payload));
      })
      .catch(e => {
        console.error('[WEBHOOK_WA]', e && e.message ? e.message : e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'error_interno' }));
      });
    return true;
  }

  res.writeHead(405, { 'Allow': 'GET, POST' });
  res.end(JSON.stringify({ error: 'metodo_no_permitido' }));
  return true;
}

module.exports = {
  registerWhatsAppWebhook,
  verifyWebhookHandshake,
  verifySignature,
  handleWebhookPost
};
