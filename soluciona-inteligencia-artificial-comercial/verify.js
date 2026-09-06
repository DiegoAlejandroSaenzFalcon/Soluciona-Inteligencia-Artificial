'use strict';
const { loadLicense, isTrialActive, getFeatures, esPedido, esPersonal, detectMessageType } = require('./core/modules.cjs');

console.log('=== Verificación de Sistema WhatsApp Lite ===');

const license = loadLicense();
console.log('\n[1] Licencia:', license);

console.log('\n[2] Trial activo:', isTrialActive());

console.log('\n[3] Features:', getFeatures());

console.log('\n[4] Pruebas de clasificación:');
const tests = [
  'Hola, cómo estás?',
  'Quiero 3 empanadas de carne',
  'Gracias por la ayuda',
  'Me gustaría hacer un pedido',
  'Precio del plato especial'
];

tests.forEach(msg => {
  const type = detectMessageType(msg);
  const isPed = esPedido(msg);
  const isPers = esPersonal(msg);
  console.log(`   "${msg}" => ${type.type} (pedido: ${isPed}, personal: ${isPers})`);
});

console.log('\n=== Verificación Completa ===');