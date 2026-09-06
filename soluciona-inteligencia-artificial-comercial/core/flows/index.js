const { config, normalizar } = require('../../config.cjs');

// Motor de flujos por segmento de negocio (DIAN/CIIU).
// El segmento 'comidas' es el flujo por defecto y vive integrado en el
// transport (transports/whatsapp.js). 'salud' y 'retail' tienen su propio
// módulo de flujo que despacha la conversación completa.
const FLUJOS = {
  comidas: null,
  salud: () => require('./salud.cjs'),
  retail: () => require('./retail.cjs'),
  belleza: () => require('./belleza.cjs')
};

function segmentoActual() {
  return (config.segmento || 'comidas');
}

function obtenerFlujo() {
  const seg = segmentoActual();
  const cargador = FLUJOS[seg];
  return typeof cargador === 'function' ? cargador() : null;
}

module.exports = { obtenerFlujo, segmentoActual, FLUJOS, normalizar };