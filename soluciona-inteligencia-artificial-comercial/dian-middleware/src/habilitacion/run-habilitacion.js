/**
 * CLI de Habilitación DIAN
 * Uso: node src/habilitacion/run-habilitacion.js [--mode proveedor-tecnologico] [--submit] [--no-pdf]
 * Modos: software-propio (default) | proveedor-tecnologico | facturacion-gratuita
 */

import { runHabilitacion, MODOS_HABILITACION, MODO_DEFAULT } from './manager.js';

const args = process.argv.slice(2);

function getArg(name, fallback = null) {
  const idx = args.indexOf(name);
  if (idx === -1) return fallback;
  const value = args[idx + 1];
  if (value === undefined || value.startsWith('--')) return true;
  return value;
}

const mode = getArg('--mode', MODO_DEFAULT);
const submit = getArg('--submit', false) === true;
const generatePdf = !(getArg('--no-pdf', false) === true);

if (!MODOS_HABILITACION[mode]) {
  console.error(`Modo inválido: ${mode}`);
  console.error(`Modos disponibles: ${Object.keys(MODOS_HABILITACION).join(', ')}`);
  process.exit(1);
}

console.log('========================================');
console.log(` HABILITACIÓN DIAN - ${MODOS_HABILITACION[mode].label}`);
console.log(` Set: ${MODOS_HABILITACION[mode].invoices}F + ${MODOS_HABILITACION[mode].creditNotes}NC + ${MODOS_HABILITACION[mode].debitNotes}ND`);
console.log(` Submit: ${submit ? 'SI (envía a DIAN)' : 'NO (solo genera)'}`);
console.log('========================================');

try {
  const report = await runHabilitacion({ mode, submit, generatePdf });
  console.log('========================================');
  console.log(' RESULTADO:');
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(' Validación:', report.validation.valid ? 'OK' : 'FALLÓ');
  if (!report.validation.valid) {
    console.error(report.validation.errors.join('\n'));
    process.exit(2);
  }
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}