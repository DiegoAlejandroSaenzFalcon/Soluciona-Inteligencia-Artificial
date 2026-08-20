'use strict';
// ============================================================
// Sistema de Configuracion de Mensajes
// Configuracion de mensajes y respuestas predefinidas
// Para Node.js - Sin uso de browser APIs
// ============================================================

class MessageConfig {
  constructor(options = {}) {
    this.allowOutOfScope = options.allowOutOfScope !== false;
    this.personalMode = options.personalMode || 'respond';
    this.saleMode = options.saleMode !== false;
    this.customerServiceMode = options.customerServiceMode !== false;
    this.outOfScopeResponse = options.outOfScopeResponse || 'No puedo ayudarte con eso, soy un asistente especializado en pedidos y ventas.';
    this.greetingMessages = options.greetingMessages || [
      '¡Hola! Soy el asistente de pedidos. ¿Cómo puedo ayudarte?',
      '¡Buen día! ¿Tienes alguna orden para realizar?'
    ];
    this.helpMessages = options.helpMessages || ['Puedes escribir "pedido" para empezar a hacer un pedido, o "ayuda" para ver las opciones.'];
    this.errorMessages = options.errorMessages || [
      'Hubo un error al procesar tu mensaje. Por favor intenta de nuevo.',
      'Disculpa, ocurrió un problema. Por favor contacta con soporte.'
    ];
  }

  shouldRespondTo(message) {
    if (!this.allowOutOfScope) return false;
    
    const classifier = {
      isPedido: (msg) => (msg || '').toLowerCase().includes('pedido') || (msg || '').toLowerCase().includes('comprar') || (msg || '').toLowerCase().includes('orden'),
      isPersonal: (msg) => {
        const m = (msg || '').toLowerCase();
        return m.includes('hola') || m.includes('gracias') || m.includes('familia') || m.includes('amigo');
      }
    };
    
    const type = classifier.isPedido(message) ? 'pedido' : (classifier.isPersonal(message) ? 'personal' : 'unknown');
    
    if (type === 'pedido') return true;
    
    return this.personalMode === 'respond';
  }

  getResponse(message) {
    const classifier = {
      isPedido: (msg) => (msg || '').toLowerCase().includes('pedido') || (msg || '').toLowerCase().includes('comprar') || (msg || '').toLowerCase().includes('orden'),
      isPersonal: (msg) => {
        const m = (msg || '').toLowerCase();
        return m.includes('hola') || m.includes('gracias') || m.includes('familia') || m.includes('amigo');
      }
    };
    
    const type = classifier.isPedido(message) ? 'pedido' : (classifier.isPersonal(message) ? 'personal' : 'unknown');
    
    if (type === 'pedido') {
      return { type: 'pedido', response: this.getNextStep(message), confidence: 0.9 };
    }
    
    if (type === 'personal') {
      if (this.personalMode === 'ignore') {
        return { type: 'personal', response: null, confidence: 0.8, action: 'ignore' };
      }
      
      return { type: 'personal', response: this.outOfScopeResponse, confidence: 0.8, action: 'out_of_scope' };
    }
    
    return { type: 'unknown', response: this.getGreeting(), confidence: 0.3, action: 'greeting' };
  }

  getNextStep(message) {
    const msgLower = (message || '').toLowerCase();
    
    if (msgLower.includes('carta') || msgLower.includes('carta caro')) {
      return 'Por favor, indícame los productos que deseas ordenar con sus cantidades.';
    }
    
    if (msgLower.includes('precio') || msgLower.includes('cuanto')) {
      return 'Para ver precios, primero necesito que me des los productos o platos que deseas.';
    }
    
    if (msgLower.includes('gracias') || msgLower.includes('thank')) {
      return '¡De nada! Estoy aquí para ayudarte con pedidos.';
    }
    
    if (msgLower.includes('hola') || msgLower.includes('help')) {
      return '¡Hola! Puedes escribirme los items que deseas ordenar con las cantidades.';
    }
    
    return 'Por favor, descríbeme el pedido con los productos y cantidades que deseas.';
  }

  getGreeting() {
    return this.greetingMessages[Math.floor(Math.random() * this.greetingMessages.length)];
  }

  getHelp() {
    return this.helpMessages[0];
  }

  getError() {
    return this.errorMessages[Math.floor(Math.random() * this.errorMessages.length)];
  }

  static createDefault() {
    return new MessageConfig();
  }
}

module.exports = { MessageConfig };