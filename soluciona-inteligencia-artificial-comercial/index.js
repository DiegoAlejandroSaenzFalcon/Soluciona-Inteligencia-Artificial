#!/usr/bin/env node
/**
 * index.js - Punto de entrada único y modular
 * SOLUCIONA INTELIGENCIA ARTIFICIAL - Sistema de pedidos por WhatsApp
 *
 * Uso:
 *   node index.js                     -> usa config.json (negocio por defecto, puerto 3000)
 *   node index.js --cliente X.json    -> usa la config de un cliente en clientes/
 */

// Suprimir ruido de libsignal (mensajes viejos que ya no se pueden descifrar).
// Es inofensivo pero llena la consola con "Session error / Bad MAC".
const __realConsoleError = console.error;
console.error = (...args) => {
  const texto = String(args[0] || '');
  const esRuidoLibsignal =
    /Session error|Bad MAC|MessageCounterError|Failed to decrypt message with any known session/.test(texto) &&
    !/\[ERROR\]|\[LOCK\]|\[FACTURA\]|\[!\]/.test(texto);
  if (esRuidoLibsignal) return;
  __realConsoleError.apply(console, args);
};

const path = require('path');
process.chdir(path.resolve(__dirname));

// El bot NUNCA debe morir por un error puntual de red/WhatsApp:
// se registra y se sigue escuchando (baileys se reconecta solo).
process.on('unhandledRejection', (e) => {
  __realConsoleError('[WARN] Rechazo no capturado (se ignora):', e && e.message ? e.message : e);
});
process.on('uncaughtException', (e) => {
  __realConsoleError('[WARN] Excepción no capturada (se ignora):', e && e.message ? e.message : e);
});


console.log('\n==========================================');
console.log('  SOLUCIONA INTELIGENCIA ARTIFICIAL');
console.log('  Sistema de Pedidos por WhatsApp');
console.log('==========================================\n');

console.log('[INIT] Cargando configuracion...');
try {
  const { config } = require('./config');
  console.log(`[INIT] Configuracion cargada: ${config.nombreNegocio()} | puerto ${config.puerto} | software: ${config.softwareNombre}`);
} catch (e) {
  console.error('[ERROR] Fallo al cargar config:', e.message);
}

console.log('[INIT] Cargando modulos...');
try {
  const modules = require('./core/modules');
  const licenseResult = modules.loadLicense();
  console.log('[MODULOS] Estado:', licenseResult.type, '| Features:', Object.keys(modules.getFeatures()).join(', '));
} catch (e) {
  console.error('[ERROR] Fallo al cargar modulos:', e.message);
}

console.log('[INIT] Iniciando WhatsApp...');
try {
  const { iniciarWhatsApp } = require('./transports/whatsapp');
  iniciarWhatsApp().catch(e => console.error('[ERROR] WhatsApp:', e.message));
} catch (e) {
  console.warn('[WARN] Error iniciando WhatsApp:', e.message);
}

console.log('[INIT] Iniciando Web...');
try {
  const web = require('./transports/web');
  if (typeof web.iniciarWeb === 'function') {
    web.iniciarWeb();
  } else {
    console.error('[ERROR] transports/web no exporta iniciarWeb');
    process.exit(1);
  }
} catch (e) {
  console.error('[ERROR] Error iniciando Web:', e.message);
  process.exit(1);
}

const { config } = require('./config');
console.log(`\n[OK] Sistema iniciado. Panel: http://localhost:${config.puerto}`);
console.log('[INFO] Para detener: Ctrl+C\n');
