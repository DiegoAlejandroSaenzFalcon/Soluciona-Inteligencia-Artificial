const { config, normalizar } = require('../../config.js');

// Motor de flujos por segmento de negocio (DIAN/CIIU).
// El segmento 'comidas' es el flujo por defecto y vive integrado en el
// transport (transports/whatsapp.js). 'salud' y 'retail' tienen su propio
// módulo de flujo que despacha la conversación completa.
const FLUJOS = {
  comidas: null,
  salud: () => require('./salud.js'),
  retail: () => require('./retail.js'),
  belleza: () => require('./belleza.js')
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
