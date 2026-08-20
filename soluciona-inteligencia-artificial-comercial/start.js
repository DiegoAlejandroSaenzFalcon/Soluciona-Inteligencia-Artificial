#!/usr/bin/env node
/**
 * WhatsApp Lite - Punto de Entrada Simplificado
 * Productivo para microempresas Colombias
 */

console.log('\n==========================================');
console.log('  WhatsApp Lite - Sistema de Pedidos');
console.log('  Microempresario Service');
console.log('==========================================\n');

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

// Verificar y cargar módulos necesarios
try {
  const modules = require('./core/modules');

  console.log('[OK] Modulo de linguas cargado');
  console.log('[OK] Principal Funcionalidades:', Object.keys(modules.getFeatures()).join(', '));
  console.log('[OK] Trial activo:', modules.isTrialActive());

  console.log('\n[INF] Iniciando servidores...');

  // Iniciar WhatsApp (async, no bloquea si hay error)
  try {
    const ws = require('./transports/whatsapp');
    if (typeof ws.iniciarWhatsApp === 'function') {
      ws.iniciarWhatsApp().catch(e => {
        console.warn('[WARN] Error iniciando WhatsApp:', e.message);
      });
    } else {
      console.warn('[WARN] transports/whatsapp no exporta iniciarWhatsApp');
    }
  } catch (e) {
    console.warn('[WARN] Error cargando WhatsApp:', e.message);
  }

  // Iniciar Web (síncrono: retorna void, NO es promesa)
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

  console.log('\n[INFO] Servidor activo en http://localhost:8080');
  console.log('[INFO] Para detener: Ctrl+C\n');

} catch (e) {
  console.error('\n[INFO] Error de inicializacion:', e.message);
  console.log('[INFO] Continuando con modo basico...');

  // Intentar iniciar solo el servidor web
  try {
    require('./transports/web').iniciarWeb();
  } catch (e2) {
    console.error('[ERROR] Fallo al iniciar:', e2.message);
    process.exit(1);
  }
}