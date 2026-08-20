/**
 * UBL 2.1 Builder - Punto de entrada principal
 * Facturación Electrónica DIAN Colombia
 */

export { buildInvoice, buildCreditNote, buildDebitNote } from './builders/invoice.builder.js';
export { buildAccountingSupplierParty, buildAccountingCustomerParty, buildParty } from './builders/party.builder.js';
export { buildTaxTotal, buildDocumentTaxTotal, calculateDocumentTaxTotals, buildAllowanceCharge } from './builders/tax.builder.js';
export { buildInvoiceLine, buildCreditNoteLines, buildDebitNoteLines, validateInvoiceLine } from './builders/line.builder.js';
export { NAMESPACES, generateXmlHeader, generateUblVersionInfo, getProfileId, getDocumentTypeCode } from './namespaces.js';

// Tipos: ver src/types/dian.types.js (JSDoc)