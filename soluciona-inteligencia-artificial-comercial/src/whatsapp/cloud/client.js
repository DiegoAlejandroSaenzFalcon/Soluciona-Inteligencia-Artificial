'use strict';
/**
 * WhatsApp Business Cloud API Client (Official Meta API)
 * Replaces Baileys for 100% official, ban-free messaging
 * @module src/whatsapp/cloud/client
 */

const crypto = require('crypto');

class CloudApiClient {
  constructor(config = {}) {
    this.phoneId = config.phoneId || process.env.WHATSAPP_CLOUD_PHONE_ID;
    this.accessToken = config.accessToken || process.env.WHATSAPP_CLOUD_TOKEN;
    this.wabaId = config.wabaId || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    this.appSecret = config.appSecret || process.env.WHATSAPP_APP_SECRET;
    this.baseUrl = config.baseUrl || 'https://graph.facebook.com/v20.0';
    this.webhookVerifyToken = config.webhookVerifyToken || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    
    if (!this.phoneId || !this.accessToken) {
      throw new Error('WHATSAPP_CLOUD_PHONE_ID y WHATSAPP_CLOUD_TOKEN son requeridos');
    }
  }

  /**
   * Genera firma HMAC-SHA256 para verificación de webhook
   */
  generateWebhookSignature(payload) {
    return 'sha256=' + crypto
      .createHmac('sha256', this.appSecret)
      .update(payload, 'utf8')
      .digest('hex');
  }

  /**
   * Verifica firma de webhook entrante
   */
  verifyWebhookSignature(payload, signature) {
    const expected = this.generateWebhookSignature(payload);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }

  /**
   * Request genérico a Graph API
   */
  async _request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      const error = new Error(`Cloud API ${response.status}: ${data.error?.message || JSON.stringify(data)}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  // ============ MENSAJERÍA ============

  /**
   * Envía mensaje de texto
   */
  async sendText(to, body, options = {}) {
    return this._request(`/${this.phoneId}/messages`, {
      method: 'POST',
      body: {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
        ...options
      }
    });
  }

  /**
   * Envía mensaje de imagen
   */
  async sendImage(to, mediaId, caption = '', options = {}) {
    return this._request(`/${this.phoneId}/messages`, {
      method: 'POST',
      body: {
        messaging_product: 'whatsapp',
        to,
        type: 'image',
        image: { id: mediaId, caption },
        ...options
      }
    });
  }

  /**
   * Envía mensaje de documento
   */
  async sendDocument(to, mediaId, filename, caption = '', options = {}) {
    return this._request(`/${this.phoneId}/messages`, {
      method: 'POST',
      body: {
        messaging_product: 'whatsapp',
        to,
        type: 'document',
        document: { id: mediaId, filename, caption },
        ...options
      }
    });
  }

  /**
   * Envía mensaje de audio
   */
  async sendAudio(to, mediaId, options = {}) {
    return this._request(`/${this.phoneId}/messages`, {
      method: 'POST',
      body: {
        messaging_product: 'whatsapp',
        to,
        type: 'audio',
        audio: { id: mediaId },
        ...options
      }
    });
  }

  /**
   * Envía mensaje de video
   */
  async sendVideo(to, mediaId, caption = '', options = {}) {
    return this._request(`/${this.phoneId}/messages`, {
      method: 'POST',
      body: {
        messaging_product: 'whatsapp',
        to,
        type: 'video',
        video: { id: mediaId, caption },
        ...options
      }
    });
  }

  /**
   * Envía mensaje de ubicación
   */
  async sendLocation(to, latitude, longitude, name = '', address = '', options = {}) {
    return this._request(`/${this.phoneId}/messages`, {
      method: 'POST',
      body: {
        messaging_product: 'whatsapp',
        to,
        type: 'location',
        location: { latitude, longitude, name, address },
        ...options
      }
    });
  }

  /**
   * Envía mensaje de contacto
   */
  async sendContact(to, contacts, options = {}) {
    return this._request(`/${this.phoneId}/messages`, {
      method: 'POST',
      body: {
        messaging_product: 'whatsapp',
        to,
        type: 'contacts',
        contacts,
        ...options
      }
    });
  }

  /**
   * Envía mensaje interactivo (botones, lista, CTA)
   */
  async sendInteractive(to, interactive, options = {}) {
    return this._request(`/${this.phoneId}/messages`, {
      method: 'POST',
      body: {
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive,
        ...options
      }
    });
  }

  /**
   * Envía plantilla (template)
   */
  async sendTemplate(to, templateName, languageCode = 'es', components = [], options = {}) {
    return this._request(`/${this.phoneId}/messages`, {
      method: 'POST',
      body: {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components
        },
        ...options
      }
    });
  }

  /**
   * Marca mensaje como leído
   */
  async markAsRead(messageId) {
    return this._request(`/${this.phoneId}/messages`, {
      method: 'POST',
      body: {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      }
    });
  }

  // ============ MEDIA ============

  /**
   * Sube archivo multimedia
   */
  async uploadMedia(fileBuffer, mimeType, filename = 'file') {
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: mimeType });
    formData.append('file', blob, filename);
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', mimeType.startsWith('image/') ? 'image' : 
                     mimeType.startsWith('audio/') ? 'audio' :
                     mimeType.startsWith('video/') ? 'video' : 'document');

    const response = await fetch(`${this.baseUrl}/${this.phoneId}/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: formData
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Upload media failed: ${JSON.stringify(data)}`);
    }
    return data; // { id: "media_id" }
  }

  /**
   * Descarga multimedia por ID
   */
  async downloadMedia(mediaId) {
    // 1. Obtener URL de descarga
    const mediaInfo = await this._request(`/${mediaId}`);
    const downloadUrl = mediaInfo.url;

    // 2. Descargar archivo
    const response = await fetch(downloadUrl, {
      headers: { 'Authorization': `Bearer ${this.accessToken}` }
    });

    if (!response.ok) {
      throw new Error(`Download media failed: ${response.status}`);
    }

    return {
      buffer: await response.arrayBuffer(),
      mimeType: mediaInfo.mime_type,
      filename: mediaInfo.filename || mediaId
    };
  }

  /**
   * Elimina multimedia
   */
  async deleteMedia(mediaId) {
    return this._request(`/${mediaId}`, { method: 'DELETE' });
  }

  // ============ TEMPLATES ============

  /**
   * Lista plantillas
   */
  async listTemplates() {
    return this._request(`/${this.wabaId}/message_templates`);
  }

  /**
   * Crea plantilla
   */
  async createTemplate(template) {
    return this._request(`/${this.wabaId}/message_templates`, {
      method: 'POST',
      body: template
    });
  }

  /**
   * Elimina plantilla
   */
  async deleteTemplate(templateName) {
    return this._request(`/${this.wabaId}/message_templates?name=${encodeURIComponent(templateName)}`, {
      method: 'DELETE'
    });
  }

  // ============ WEBHOOKS ============

  /**
   * Suscribe app a webhook
   */
  async subscribeWebhook(callbackUrl, fields = ['messages', 'message_status']) {
    return this._request(`/${this.wabaId}/subscribed_apps`, {
      method: 'POST',
      body: {
        subscribed_fields: fields,
        callback_url: callbackUrl
      }
    });
  }

  /**
   * Obtiene suscripciones actuales
   */
  async getSubscriptions() {
    return this._request(`/${this.wabaId}/subscribed_apps`);
  }

  // ============ PHONE NUMBERS ============

  /**
   * Lista números de teléfono
   */
  async listPhoneNumbers() {
    return this._request(`/${this.wabaId}/phone_numbers`);
  }

  /**
   * Obtiene configuración de llamada
   */
  async getCallingSettings() {
    return this._request(`/${this.phoneId}/settings`);
  }

  /**
   * Habilita/deshabilita llamadas
   */
  async setCallingEnabled(enabled) {
    return this._request(`/${this.phoneId}/settings`, {
      method: 'POST',
      body: { calling: { status: enabled ? 'ENABLED' : 'DISABLED' } }
    });
  }

  // ============ UTILIDADES ============

  /**
   * Normaliza número a formato internacional
   */
  static normalizePhone(phone) {
    let cleaned = phone.replace(/\D/g, '');
    if (!cleaned.startsWith('57') && cleaned.length === 10) {
      cleaned = '57' + cleaned; // Colombia
    }
    return cleaned;
  }

  /**
   * Parsea webhook entrante
   */
  parseWebhook(body) {
    const events = [];
    
    if (!body.entry) return events;

    for (const entry of body.entry) {
      if (!entry.changes) continue;
      
      for (const change of entry.changes) {
        if (change.field === 'messages' && change.value) {
          const { messages, contacts, metadata } = change.value;
          
          if (messages) {
            for (const msg of messages) {
              events.push({
                type: 'message',
                message: msg,
                contacts,
                metadata,
                timestamp: Date.now()
              });
            }
          }
          
          if (metadata?.display_phone_number) {
            events.push({
              type: 'status',
              statuses: change.value.statuses,
              timestamp: Date.now()
            });
          }
        }
      }
    }

    return events;
  }
}

module.exports = { CloudApiClient };