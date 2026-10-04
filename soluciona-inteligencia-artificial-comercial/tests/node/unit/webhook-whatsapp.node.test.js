// tests/node/unit/webhook-whatsapp.node.test.js
// Runner nativo de Node (`node --test`). Verifica el endpoint público firmado.
// Evidencia de T2 (recepción de mensajes vía WhatsApp Cloud API webhook).

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const {
  verifyWebhookHandshake,
  verifySignature,
} = require('../../../transports/webhook-whatsapp.js');

describe('webhook whatsapp — handshake (GET)', () => {
  const token = 'mi-token-de-prueba';

  it('responde con la challenge cuando el token es correcto', () => {
    const r = verifyWebhookHandshake({ 'hub.mode': 'subscribe', 'hub.verify_token': token, 'hub.challenge': 'ABC123' }, token);
    assert.equal(r, 'ABC123');
  });

  it('rechaza cuando el token no coincide', () => {
    const r = verifyWebhookHandshake({ 'hub.mode': 'subscribe', 'hub.verify_token': 'otro', 'hub.challenge': 'ABC123' }, token);
    assert.equal(r, null);
  });

  it('rechaza cuando falta challenge', () => {
    const r = verifyWebhookHandshake({ 'hub.mode': 'subscribe', 'hub.verify_token': token }, token);
    assert.equal(r, null);
  });
});

describe('webhook whatsapp — firma HMAC (POST)', () => {
  const secreto = 'app_secret_test';
  const raw = Buffer.from(JSON.stringify({ entry: [{ changes: [{ field: 'messages', value: { messages: [] } }] }] }));
  const firmaValida = 'sha256=' + crypto.createHmac('sha256', secreto).update(raw).digest('hex');

  it('acepta la firma válida', () => {
    assert.equal(verifySignature(raw, firmaValida, secreto).ok, true);
  });

  it('rechaza firma alterada', () => {
    const mala = firmaValida.slice(0, -1) + (firmaValida.endsWith('0') ? '1' : '0');
    assert.equal(verifySignature(raw, mala, secreto).ok, false);
  });

  it('rechaza sin secreto configurado', () => {
    assert.equal(verifySignature(raw, firmaValida, null).ok, false);
  });

  it('rechaza firma malformada', () => {
    assert.equal(verifySignature(raw, 'basura', secreto).ok, false);
  });

  it('rechaza cuando falta el header', () => {
    assert.equal(verifySignature(raw, undefined, secreto).ok, false);
  });
});
