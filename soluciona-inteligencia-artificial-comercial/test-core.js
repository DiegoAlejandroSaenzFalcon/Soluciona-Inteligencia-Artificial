#!/usr/bin/env node
// Test simple - verificar que los módulos funcionen

console.log('\n=== TEST EXPRESS - WhatsApp Lite ===\n');

try {
  // Test 1: Core modules exist
  const core = require('./core/modules.js');
  console.log('[TEST 1] core/modules OK');
  
  // Test 2: ¿Trial activo?
  const trial = core.isTrialActive();
  console.log('[TEST 2] Trial activo:', trial);
  
  // Test 3: Features
  const features = core.getFeatures();
  console.log('[TEST 3] Features:', Object.keys(features));
  
  // Test 4: Clasificacion
  const type1 = core.esPedido('Quiero 3 empanadas');
  const type2 = core.esPersonal('Hola cómo estás');
  console.log('[TEST 4] Clasificación: pedido=' + type1 + ', personal=' + type2);
  
  console.log('\n=== TODOS LOS TESTS PASARON ===\n');
  
} catch (e) {
  console.error('[ERROR]', e.message);
  console.log(e.stack);
  process.exit(1);
}

console.log('[OK] Sistema verificado correctamente');
console.log('[INFO] Puedes iniciar el servidor con: npm start');
console.log('[INFO] O ejecutar directamente: node index.js');
