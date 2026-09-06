#!/usr/bin/env node
/**
 * WhatsApp Lite - Production Mode
 * Para microempresarios de Colombia
 */

const { loadLicense, isTrialActive, getFeatures, esPedido, esPersonal } = require('./core/modules.js');

console.log('\n================================================');
console.log('  WhatsApp Lite - Production');
console.log('  Microempresario Service');
console.log('================================================\n');

const license = loadLicense();
const trialActive = isTrialActive();

console.log('[INFO] Estado:', trialActive ? 'Trial activo' : 'Trial expirado');
console.log('[INFO] Trial restante:', license.trialDaysRemaining || 'N/A', 'dias');
console.log('[INFO] Features:', Object.keys(getFeatures()).join(', '));

console.log('\n[INFO] Caracteristicas principales:');
console.log('  ✓ Toma de pedidos por WhatsApp');
console.log('  ✓ Diferenciacion intelecual');
console.log('  ✓ Gestion de pedidos y ventas');
console.log('  ✓ Budget-friendly para microempresas');

console.log('\n[INFO] Servidor iniciando en: http://localhost:8080');
console.log('[INFO] Presiona Ctrl+C para detener\n');

require('./transports/whatsapp.js').iniciarWhatsApp().catch(e => {
  console.error('[ERROR] WhatsApp:', e.message);
});

require('./transports/web.js').iniciarWeb();
