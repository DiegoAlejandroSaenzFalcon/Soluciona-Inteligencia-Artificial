'use strict';
// ============================================================
// Sistema de Mensajes Personalizados
// Gestiona diferenciacion mensajes personales vs negocio
// Control de respuestas segun configuracion de licencia
// Para Node.js - Sin uso de browser APIs
// ============================================================

class MessageSystem {
  constructor(config = {}) {
    this.personalMode = config.personalMode || 'respond';
    this.allowedTopics = config.allowedTopics || ['pedido', 'orden', 'venta', 'compra', 'precio', 'mesa'];
    this.outOfScopeResponse = config.outOfScopeResponse || 'No puedo ayudarte con eso, soy un asistente especializado en pedidos y ventas.';
    this.greetingResponse = config.greetingResponse || '¡Hola! Soy el asistente de pedidos. ¿Cómo puedo ayudarte?';
    this.intervalCheck = config.intervalCheck || 60000;
    this.messages = new Map();
    this.filters = {
      skipPersonal: true,
      skipOffTopic: true,
      detectIntent: true
    };
  }

  classifyMessage(message) {
    if (!message) return { type: 'unknown', confidence: 0 };
    const msg = message.toLowerCase();
    let scorePedidos = 0;
    let scorePersonal = 0;
    
    this.allowedTopics.forEach(topic => {
      if (msg.includes(topic)) scorePedidos += 1;
    });
    
    const personalIndicators = ['hola', 'gracias', 'familia', 'familiar', 'amigo', 'qué haces', 'hola amigo', 'hola hijo', 'hola hija'];
    personalIndicators.forEach(indicator => {
      if (msg.includes(indicator)) scorePersonal += 1;
    });
    
    const hasSocialGreeting = msg.startsWith('hola') || msg.startsWith('hola ') || msg.startsWith('hey');
    if (hasSocialGreeting && !msg.includes('pedido') && !msg.includes('quiero')) {
      scorePersonal += 0.5;
    }
    
    if (scorePedidos > scorePersonal) {
      return { type: 'pedido', confidence: Math.min(0.9, 0.6 + scorePedidos * 0.1) };
    }
    
    if (scorePersonal > 0 || hasSocialGreeting) {
      return { type: 'personal', confidence: Math.min(0.9, 0.5 + scorePersonal * 0.1) };
    }
    
    return { type: 'unknown', confidence: 0.3 };
  }

  shouldRespond(message, personalModeOverride = null) {
    const classification = this.classifyMessage(message);
    const mode = personalModeOverride || this.personalMode;
    
    if (classification.type === 'pedido') return true;
    
    if (classification.type === 'personal' && mode === 'ignore') {
      return false;
    }
    
    return mode === 'respond';
  }

  processMessage(message, personalModeOverride = null) {
    const mode = personalModeOverride || this.personalMode;
    const classification = this.classifyMessage(message);
    
    if (classification.type === 'pedido') {
      return {
        type: 'pedido',
        response: this.handlePedido(message),
        confidence: classification.confidence,
        shouldLog: true
      };
    }
    
    if (classification.type === 'personal') {
      if (mode === 'ignore') {
        return {
          type: 'personal',
          response: null,
          confidence: classification.confidence,
          shouldLog: false,
          action: 'ignore'
        };
      }
      
      if (mode === 'respond') {
        return {
          type: 'personal',
          response: this.outOfScopeResponse,
          confidence: classification.confidence,
          action: 'out_of_scope'
        };
      }
    }
    
    return {
      type: 'unknown',
      response: this.greetingResponse,
      confidence: classification.confidence,
      action: 'greeting'
    };
  }

  handlePedido(message) {
    const msg = message.toLowerCase();
    
    if (msg.includes('precio') || msg.includes('cuanto')) {
      return 'Para ver precios, necesito que me des los productos específicos que deseas.';
    }
    
    if (msg.includes('gracias') || msg.includes('thank')) {
      return 'De nada. Estoy aquí para ayudarte con pedidos.';
    }
    
    if (msg.includes('hola') || msg.includes('help')) {
      return '¡Hola! Puedes escribirme los items que deseas ordenar con las cantidades.';
    }
    
    return 'Por favor, descríbeme el pedido con los productos y cantidades deseadas.';
  }

  processWithFallback(message, fallbackFunc, personalMode = null) {
    const result = this.processMessage(message, personalMode);
    if (result.response) {
      return result;
    }
    return fallbackFunc ? fallbackFunc(message) : result;
  }

  static createWithPersonalMode(mode = 'respond') {
    return new MessageSystem({ personalMode: mode });
  }
}

module.exports = { MessageSystem };