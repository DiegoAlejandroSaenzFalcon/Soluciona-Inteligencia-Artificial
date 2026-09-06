const db = require('./db.js');

function registrar(hilo, remitente, rol, texto) {
  db.registrarConversacion(hilo, remitente, rol, texto);
}

function hilos() {
  return db.hilosConversacion();
}

function leerHilo(hilo) {
  return db.leerHiloConversacion(hilo);
}

module.exports = { registrar, hilos, leerHilo };

