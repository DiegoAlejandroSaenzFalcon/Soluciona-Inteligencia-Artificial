#!/usr/bin/env node
/**
 * index.js - Punto de entrada único y modular
 * SOLUCIA INTELIGENCIA ARTIFICIAL - Sistema de pedidos por WhatsApp
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

// Rotación de logs (diario, 7 días, 10MB max)
require('./kernel/src/common/logger/file-transport');

// El bot NUNCA debe morir por un error puntual de red/WhatsApp:
// se registra y se sigue escuchando (baileys se reconecta solo).
process.on('unhandledRejection', (e) => {
  __realConsoleError('[WARN] Rechazo no capturado (se ignora):', e && e.message ? e.message : e);
});
process.on('uncaughtException', (e) => {
  __realConsoleError('[WARN] Excepción no capturada (se ignora):', e && e.message ? e.message : e);
});


console.log('\n==========================================');
console.log('  SOLUCIA INTELIGENCIA ARTIFICIAL');
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
if (!process.env.DISABLE_WHATSAPP) {
  if (process.env.WHATSAPP_TRANSPORT === 'cloud') {
    try {
      const { createTransport } = require('./src/whatsapp/cloud/transport');
      const transportConfig = {
        phoneId: process.env.WHATSAPP_CLOUD_PHONE_ID,
        accessToken: process.env.WHATSAPP_CLOUD_TOKEN,
        wabaId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
        appSecret: process.env.WHATSAPP_APP_SECRET,
        webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
      };

      const transport = createTransport(transportConfig);

      transport.initialize().then(() => {
        console.log('[INIT] WhatsApp Cloud API conectado');
        global.whatsappTransport = transport;
      }).catch(e => {
        console.error('[ERROR] WhatsApp Cloud API:', e.message);
        process.exit(1);
      });
    } catch (e) {
      console.warn('[WARN] Error iniciando WhatsApp Cloud:', e.message);
    }
  } else {
    // Modo estándar (Baileys): flujo original con QR en el panel
    try {
      const { iniciarWhatsApp } = require('./transports/whatsapp');
      iniciarWhatsApp().catch(e => console.error('[ERROR] WhatsApp:', e.message));
    } catch (e) {
      console.warn('[WARN] Error iniciando WhatsApp:', e.message);
    }
  }
} else {
  console.log('[INIT] WhatsApp deshabilitado (DISABLE_WHATSAPP=true)');
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

// Iniciar limpieza automática de sesiones expiradas (legacy + Cloud API)
try {
  const { iniciarLimpiezaSesiones } = require('./core/db-sqlite');
  const cleanupInterval = iniciarLimpiezaSesiones();
  console.log('[INIT] Limpieza de sesiones expiradas programada (cada hora)');
} catch (e) {
  console.warn('[WARN] No se pudo iniciar limpieza de sesiones:', e.message);
}

const { config } = require('./config');
console.log(`\n[OK] Sistema iniciado. Panel: http://localhost:${config.puerto}`);
console.log('[INFO] Para detener: Ctrl+C\n');
