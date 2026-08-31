/**
 * Test round-trip: genera XML UBL, lo firma, lo verifica.
 * Si pasa, la cadena criptografica (C14N + SHA-512 + RSA-SHA-512 + KeyInfo)
 * funciona y la DIAN no rechazara por firma mal construida.
 */

import { createDianMiddleware } from '../src/index.js';
import { verifyXmlSignature } from '../src/security/signature.js';

const mw = createDianMiddleware({});
await mw.initialize();

const invoiceData = {
  id: 'SETP00000000001',
  issueDate: '2026-08-29',
  issueTime: '14:30:00',
  invoiceTypeCode: '01',
  documentCurrencyCode: 'COP',
  supplier: {
    identification: '900123456', dv: '7',
    name: 'Soluciona FE Test', tipoIdentificacion: '31',
    direccion: 'Calle 123 #45-67', municipio: '11001',
    departamento: '11', codigoPostal: '110111',
    telefono: '6012345678', email: 'fe@soluciona.local',
    responsabilidadFiscal: ['O-13'], regimenFiscal: 'Regimen Comun',
  },
  customer: {
    identification: '79456789', dv: '9',
    name: 'Cliente Prueba SAS', tipoIdentificacion: '31',
    direccion: 'Carrera 45 #67-89', municipio: '11001',
    departamento: '11', codigoPostal: '110111',
    telefono: '6018765432', email: 'cliente@prueba.local',
    responsabilidadFiscal: ['R-99-PN'], regimenFiscal: 'Regimen Comun',
  },
  lines: [
    {
      lineNumber: 1, itemCode: 'PROD001', description: 'Producto A',
      quantity: 2, unitCode: '94', unitPrice: 50000,
      lineExtensionAmount: 100000, taxRate: 19, taxAmount: 19000, taxId: '01',
    },
  ],
  uuid: 'abc12345-0000-0000-0000-000000000001',
};

const result = await mw.processInvoice(invoiceData, { submit: false, generatePdf: false });
console.log('=== RESULTADO ===');
console.log('success:', result.success);
console.log('id:', result.id);
console.log('cufe:', result.cufe);
console.log('xml length:', result.xml?.length);

console.log('\n=== VERIFICACION DE FIRMA ===');
const v = verifyXmlSignature(result.xml);
console.log('valid:', v.valid);
console.log('expired:', v.expired);
console.log('certificate:', v.certificate);
if (v.errors.length) console.log('errors:', v.errors);

console.log('\n=== TAMPER TEST ===');
const tampered = result.xml.replace(/<cbc:PayableAmount[^>]*>([\d.]+)<\/cbc:PayableAmount>/, (_, n) =>
  `<cbc:PayableAmount currencyID="COP">${Number(n) + 1}</cbc:PayableAmount>`);
const vt = verifyXmlSignature(tampered);
console.log('valid (debe ser false):', vt.valid);
console.log('errors:', vt.errors);

if (!v.valid || vt.valid) {
  console.error('\n[FAIL] firma no pasa round-trip o tamper-test');
  process.exit(1);
}
console.log('\n[OK] firma y verificacion correctas');
