'use strict';
// ============================================================
// Clasificador de Mensajes - Diferenciación Personal vs Pedido
// Compatible con Node.js - exporta module.exports
// ============================================================

const PERSONAL_TRIGGERS = [
  'hola', 'cómo estás', 'como estás', 'como va', 'qué tal',
  'gracias', 'familia', 'familiar', 'hijo', 'hija',
  'hola papá', 'hola mamá', 'hola hijo', 'hola hija',
  'qué onda', 'qué hubo', 'qué haces'
];

const PEDIDO_TRIGGERS = [
  'pedido', 'orden', 'comprar', 'quiero', 'necesito',
  'cuánto', 'cuanto', 'precio', 'costo', 'cantidad', 'total',
  'factura', 'mesa', 'plato', 'bebida', 'comida',
  'pago', 'efectivo', 'tarjeta', 'enviar', 'entregar', 'domicilio'
];

const OUT_OF_SCOPE_RESPONSES = [
  'No estoy programado para ayudar con consultas personales. Soy un asistente especializado en pedidos y ventas.',
  'Disculpa, pero mi propósito es ayudarte con pedidos y ventas. Por favor contacta al gerente para otras consultas.',
  'Lo siento, solo puedo ayudarte con pedidos y seguimiento de ventas.',
  'No tengo capacidad para responder eso. Estoy optimizado para procesar pedidos.'
];

class MessageClassifier {
  constructor(options = {}) {
    this.allowOutOfScopeResponses = options.allowOutOfScopeResponses !== false;
    this.personalConfidence = options.personalConfidence ?? 0.5;
    this.pedidoConfidence = options.pedidoConfidence ?? 0.7;
  }

  classify(message) {
    if (!message || typeof message !== 'string') return 'unknown';
    
    const msg = message.toLowerCase().trim();

    let personalScore = 0;
    let pedidoScore = 0;

    PERSONAL_TRIGGERS.forEach(trigger => {
      if (msg.includes(trigger)) personalScore += 1;
    });

    PEDIDO_TRIGGERS.forEach(trigger => {
      if (msg.includes(trigger)) pedidoScore += 1;
    });

    const hasSocialGreeting = msg.startsWith('hola') || msg.startsWith('hey');
    if (hasSocialGreeting && pedidoScore < 2) {
      personalScore += 0.5;
    }

    if (pedidoScore >= 2 && pedidoScore > personalScore) {
      return 'pedido';
    }

    if (personalScore >= 2 && !msg.includes('pedido') && !msg.includes('compra') && !msg.includes('quiero')) {
      return 'personal';
    }

    if (msg.includes('pedido') || msg.includes('orden') || msg.includes('compra')) {
      return 'pedido';
    }

    const socialPatterns = [/^hola/i, /^que hacer/i, /^cómo estás/i, /^bien/i, /^gracias/i];
    if (socialPatterns.some(p => p.test(message))) {
      return 'personal';
    }

    if (!hasSocialGreeting) {
      return 'unknown';
    }

    return 'personal';
  }

  isPedido(message) {
    return this.classify(message) === 'pedido';
  }

  isPersonal(message) {
    return this.classify(message) === 'personal';
  }

  shouldRespond(message) {
    const type = this.classify(message);
    
    if (type === 'pedido') return true;
    if (type === 'personal') {
      return this.allowOutOfScopeResponses;
    }
    return false;
  }

  getOutOfScopeResponse() {
    if (!this.allowOutOfScopeResponses) return null;
    const idx = Math.floor(Math.random() * OUT_OF_SCOPE_RESPONSES.length);
    return OUT_OF_SCOPE_RESPONSES[idx];
  }

  getConfidence(message) {
    const type = this.classify(message);
    const msg = (message || '').toLowerCase();
    if (type === 'pedido') return Math.min(0.9, 0.7 + (PEDIDO_TRIGGERS.filter(t => msg.includes(t)).length * 0.05));
    if (type === 'personal') return Math.min(0.9, 0.5 + (PERSONAL_TRIGGERS.filter(t => msg.includes(t)).length * 0.03));
    return 0.3;
  }
}

const messageClassifier = new MessageClassifier();

if (typeof globalThis !== 'undefined') {
  globalThis.messageClassifier = messageClassifier;
}

function esPedido(mensaje) {
  return messageClassifier.isPedido(mensaje);
}

function esPersonal(mensaje) {
  return messageClassifier.isPersonal(mensaje);
}

module.exports = {
  MessageClassifier,
  messageClassifier,
  esPedido,
  esPersonal,
  PERSONAL_TRIGGERS,
  PEDIDO_TRIGGERS,
  OUT_OF_SCOPE_RESPONSES
};