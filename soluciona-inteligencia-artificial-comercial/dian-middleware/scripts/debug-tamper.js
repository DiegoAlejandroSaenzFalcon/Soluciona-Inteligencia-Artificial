import { createDianMiddleware } from '../src/index.js';
import { verifyXmlSignature } from '../src/security/signature.js';

const mw = createDianMiddleware({});
await mw.initialize();

const invoiceData = {
  id: 'SETP00000000001', issueDate: '2026-08-29', issueTime: '14:30:00', invoiceTypeCode: '01', documentCurrencyCode: 'COP',
  supplier: { identification: '900123456', dv: '7', name: 'Soluciona FE Test', tipoIdentificacion: '31', direccion: 'Calle 123 #45-67', municipio: '11001', departamento: '11', codigoPostal: '110111', telefono: '6012345678', email: 'fe@soluciona.local', responsabilidadFiscal: ['O-13'], regimenFiscal: 'Regimen Comun' },
  customer: { identification: '79456789', dv: '9', name: 'Cliente Prueba SAS', tipoIdentificacion: '31', direccion: 'Carrera 45 #67-89', municipio: '11001', departamento: '11', codigoPostal: '110111', telefono: '6018765432', email: 'cliente@prueba.local', responsabilidadFiscal: ['R-99-PN'], regimenFiscal: 'Regimen Comun' },
  lines: [{ lineNumber: 1, itemCode: 'PROD001', description: 'Producto A', quantity: 2, unitCode: '94', unitPrice: 50000, lineExtensionAmount: 100000, taxRate: 19, taxAmount: 19000, taxId: '01' }],
  uuid: 'abc12345-0000-0000-0000-000000000001',
};

const result = await mw.processInvoice(invoiceData, { submit: false, generatePdf: false });

console.log('Original PayableAmount:');
const match = result.xml.match(/<cbc:PayableAmount[^>]*>(\d+)<\/cbc:PayableAmount>/);
console.log(match ? match[0] : 'NOT FOUND');

const tampered = result.xml.replace(/<cbc:PayableAmount[^>]*>(\d+)<\/cbc:PayableAmount>/, (_, n) =>
  `<cbc:PayableAmount currencyID="COP">${Number(n) + 1}</cbc:PayableAmount>`);

console.log('Tampered PayableAmount:');
const match2 = tampered.match(/<cbc:PayableAmount[^>]*>(\d+)<\/cbc:PayableAmount>/);
console.log(match2 ? match2[0] : 'NOT FOUND');

const vt = verifyXmlSignature(tampered);
console.log('Tampered valid:', vt.valid);
console.log('Tampered errors:', vt.errors);