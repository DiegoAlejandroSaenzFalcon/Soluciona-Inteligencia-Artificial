/**
 * Configuración de producción para WhatsApp Lite
 * Microempresario food vendor (Colombia)
 */
module.exports = {
  // ========================================
  // SERVIDOR
  // ========================================
  puerto: process.env.PORT || 8080,
  host: '0.0.0.0',
  
  // ========================================
  // TRIAL
  // ========================================
  trial: {
    duracionDias: 10,
    activo: true,
    features: {
      whatsapp: true,
      orders: true,
      inventory: true,
      accounting: true,
      fullPanel: true
    }
  },
  
  // ========================================
  // MENSAJES PERSONALES VS PEDIDOS
  // ========================================
  messageControl: {
    // Modo personal: 'respond' (responder), 'ignore' (ignorar)
    personalMode: process.env.PERSONAL_MODE || 'respond',
    // Mensaje cuando el contexto no es pedido
    outOfScopeResponse: 'Lo siento, solo puedo ayudarte con pedidos y ventas. Contacto al gerente para otras consultas.',
    // Habilitar filtro de mensajes
    allowOutOfScope: true
  },
  
  // ========================================
  // WHATSAPP CONFIGURATION
  // ========================================
  whatsapp: {
    // Agregar aquí el número de WhatsApp del negocio
    numeroNegocio: process.env.BUSINESS_PHONE || null,
    // Modo de respuesta automática
    autoResponder: true,
    // Tiempo de espera para respuesta (ms)
    responseDelay: 300
  },
  
  // ========================================
  // MONEDA COLOMBIANA
  // ========================================
  moneda: 'COP',
  monedaSimbolo: '$',
  
  // ========================================
  // FORMATO FECHA
  // ========================================
  locale: 'es-CO',
  
  // ========================================
  // NOMBRE NEGOCIO
  // ========================================
  negocio: 'Micro Emprendimiento',
  
  // ========================================
  // ARCHIVOS
  // ========================================
  dataDir: process.env.DATA_DIR || './data',
  
  // ========================================
  // DEBUG
  // ========================================
  debug: process.env.DEBUG === 'true'
};