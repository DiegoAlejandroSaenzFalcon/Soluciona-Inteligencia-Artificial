'use strict';
/**
 * Transport Adapter - WhatsApp Cloud API (Official)
 * Implementa la interfaz de transporte compatible con la app existente
 * Permite wechsel entre Baileys (dev) y Cloud API (prod) via WHATSAPP_TRANSPORT=cloud|baileys
 */

const { CloudApiClient } = require('./client.cjs');
const { spawn } = require('child_process');
const crypto = require('crypto');

class CloudTransport {
  constructor(config = {}) {
    this.config = config;
    this.client = new CloudApiClient(config);
    this.webhookVerifyToken = config.webhookVerifyToken || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    this.messageHandlers = new Map();
    this.statusHandlers = new Map();
    this.callingSidecar = null;
    this.isConnected = false;
  }

  /**
   * Inicializa el transporte
   */
  async initialize() {
    try {
      // Verificar credenciales
      if (!this.config.phoneId || !this.config.accessToken) {
        throw new Error('Credenciales Cloud API incompletas');
      }

      // Verificar conectividad
      await this.client._request(`/${this.config.phoneId}`);
      this.isConnected = true;
      console.log('[CloudTransport] Conectado a WhatsApp Cloud API');

      // Iniciar sidecar de llamadas si está configurado
      if (process.env.WHATSAPP_CLOUD_CALLING_SIDECAR_URL) {
        await this._startCallingSidecar();
      }

      return { ok: true };
    } catch (e) {
      console.error('[CloudTransport] Error inicializando:', e.message);
      this.isConnected = false;
      throw e;
    }
  }

  async _startCallingSidecar() {
    try {
      // El sidecar corre en proceso separado (puerto 8081)
      // Solo registramos la URL para reenvío de webhooks
      this.callingSidecarUrl = process.env.WHATSAPP_CLOUD_CALLING_SIDECAR_URL;
      console.log('[CloudTransport] Calling sidecar configurado:', this.callingSidecarUrl);
    } catch (e) {
      console.warn('[CloudTransport] No se pudo iniciar sidecar:', e.message);
    }
  }

  /**
   * Registra handler para mensajes entrantes
   */
  onMessage(handler) {
    this.messageHandlers.set('message', handler);
  }

  /**
   * Registra handler para estados de mensaje
   */
  onStatus(handler) {
    this.statusHandlers.set('status', handler);
  }

  /**
   * Registra handler para llamadas
   */
  onCall(handler) {
    this.messageHandlers.set('call', handler);
  }

  /**
   * Procesa webhook entrante de Meta
   */
  async handleWebhook(req, res) {
    try {
      // Verificar firma HMAC
      const signature = req.headers['x-hub-signature-256'];
      if (this.config.appSecret && signature) {
        const rawBody = req.rawBody || JSON.stringify(req.body);
        const expected = 'sha256=' + crypto
          .createHmac('sha256', this.config.appSecret)
          .update(rawBody, 'utf8')
          .digest('hex');
        
        if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
          return res.status(403).json({ error: 'Invalid signature' });
        }
      }

      const body = req.body;
      
      if (!body.entry) {
        return res.status(200).json({ status: 'ok' });
      }

      for (const entry of body.entry) {
        if (!entry.changes) continue;
        
        for (const change of entry.changes) {
          if (change.field === 'messages' && change.value) {
            await this._handleMessages(change.value);
          }
        }
      }

      res.status(200).json({ status: 'ok' });
    } catch (e) {
      console.error('[CloudTransport] Error en webhook:', e);
      res.status(500).json({ error: 'Internal error' });
    }
  }

  async _handleMessages(value) {
    const { messages, contacts, statuses } = value;

    // Mensajes entrantes
    if (messages) {
      for (const msg of messages) {
        const normalized = this._normalizeMessage(msg, contacts);
        
        for (const handler of this.messageHandlers.values()) {
          try {
            await handler(normalized);
          } catch (e) {
            console.error('[CloudTransport] Error en handler mensaje:', e);
          }
        }
      }
    }

    // Estados de mensaje (sent, delivered, read)
    if (statuses) {
      for (const status of statuses) {
        for (const handler of this.statusHandlers.values()) {
          try {
            await handler(status);
          } catch (e) {
            console.error('[CloudTransport] Error en handler status:', e);
          }
        }
      }
    }
  }

  _normalizeMessage(msg, contacts) {
    const contact = contacts?.find(c => c.wa_id === msg.from);
    
    return {
      id: msg.id,
      from: msg.from,
      to: msg.to,
      timestamp: parseInt(msg.timestamp) * 1000,
      type: msg.type,
      text: msg.text?.body,
      media: msg.image || msg.document || msg.audio || msg.video || msg.sticker,
      location: msg.location,
      contacts: msg.contacts,
      interactive: msg.interactive,
      button: msg.button,
      order: msg.order,
      contacts: msg.contacts,
      contactName: contact?.profile?.name,
      _raw: msg
    };
  }

  // ============ MÉTODOS DE ENVÍO (compatibles con interfaz existente) ============

  async sendText(to, text) {
    return this.client.sendText(to, text);
  }

  async sendImage(to, mediaId, caption) {
    return this.client.sendImage(to, mediaId, caption);
  }

  async sendDocument(to, mediaId, filename, caption) {
    return this.client.sendDocument(to, mediaId, filename, caption);
  }

  async sendAudio(to, mediaId) {
    return this.client.sendAudio(to, mediaId);
  }

  async sendLocation(to, latitude, longitude, name, address) {
    return this.client.sendLocation(to, latitude, longitude, name, address);
  }

  async sendContact(to, contacts) {
    return this.client.sendContact(to, contacts);
  }

  async sendInteractive(to, interactive) {
    return this.client.sendInteractive(to, interactive);
  }

  async sendTemplate(to, templateName, languageCode, components) {
    return this.client.sendTemplate(to, templateName, languageCode, components);
  }

  async sendButtons(to, bodyText, buttons, headerText, footerText) {
    const interactive = {
      type: 'button',
      header: headerText ? { type: 'text', text: headerText } : undefined,
      body: { text: bodyText },
      footer: footerText ? { text: footerText } : undefined,
      action: {
        buttons: buttons.map((btn, i) => ({
          type: 'reply',
          reply: { id: btn.id || `btn_${i}`, title: btn.title }
        }))
      }
    };
    return this.client.sendInteractive(to, interactive);
  }

  async sendList(to, bodyText, sections, headerText, footerText, buttonText) {
    const interactive = {
      type: 'list',
      header: headerText ? { type: 'text', text: headerText } : undefined,
      body: { text: bodyText },
      footer: footerText ? { text: footerText } : undefined,
      action: {
        button: buttonText || 'Ver opciones',
        sections
      }
    };
    return this.client.sendInteractive(to, interactive);
  }

  async sendLocationRequest(to, bodyText) {
    const interactive = {
      type: 'location_request_message',
      body: { text: bodyText },
      action: { name: 'send_location' }
    };
    return this.client.sendInteractive(to, interactive);
  }

  async markAsRead(messageId) {
    return this.client.markAsRead(messageId);
  }

  async uploadMedia(buffer, mimeType, filename) {
    return this.client.uploadMedia(buffer, mimeType, filename);
  }

  async downloadMedia(mediaId) {
    return this.client.downloadMedia(mediaId);
  }

  // ============ LLAMADAS (via sidecar) ============

  async makeCall(to, options = {}) {
    if (!this.callingSidecarUrl) {
      throw new Error('Calling sidecar no configurado');
    }
    
    const response = await fetch(`${this.callingSidecarUrl}/calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, ...options })
    });
    
    return response.json();
  }

  // ============ ESTADO ============

  isReady() {
    return this.isConnected;
  }

  getPhoneId() {
    return this.config.phoneId;
  }

  // ============ GRACEFUL SHUTDOWN ============

  async shutdown() {
    this.isConnected = false;
    console.log('[CloudTransport] Cerrado correctamente');
  }
}

/**
 * Factory function para crear transporte según configuración
 */
function createTransport(config) {
  const transportType = process.env.WHATSAPP_TRANSPORT || 'baileys';
  
  if (transportType === 'cloud') {
    return new CloudTransport(config);
  }
  
  // Fallback a Baileys (existente)
  const BaileysTransport = require('../transports/whatsapp.cjs');
  return new BaileysTransport(config);
}

module.exports = { CloudTransport, createTransport, CloudApiClient };