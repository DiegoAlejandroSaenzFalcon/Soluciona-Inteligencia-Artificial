/**
 * Builder principal para Factura de Venta (Invoice) UBL 2.1 DIAN
 * Integra: Party, Tax, Line, Allowances, LegalMonetaryTotal
 */

import { generateXmlHeader, generateUblVersionInfo, getProfileId, getDocumentTypeCode } from '../namespaces.js';
import { buildAccountingSupplierParty, buildAccountingCustomerParty } from './party.builder.js';
import { buildDocumentTaxTotal, calculateDocumentTaxTotals, buildAllowanceCharge } from './tax.builder.js';
import { buildInvoiceLine, validateInvoiceLine } from './line.builder.js';
import { escapeXml } from '../../utils/xml.utils.js';

/**
 * Construye Factura de Venta completa (Invoice)
 * @param {Object} data - Datos de la factura
 * @returns {string} XML completo de la factura
 */
export function buildInvoice(data) {
  const {
    // Identificación
    id,
    issueDate,
    issueTime,
    invoiceTypeCode,
    documentCurrencyCode = 'COP',

    // Partes
    supplier,
    customer,

    // Líneas
    lines,

    // Totales monetarios
    lineExtensionAmount,
    taxExclusiveAmount,
    taxInclusiveAmount,
    payableAmount,

    // Descuentos/Cargos globales
    allowancesCharges = [],

    // Referencias
    orderReference,
    billingReference,
    despatchDocumentReference,
    receiptDocumentReference,
    additionalDocumentReference,

    // Observaciones
    note = '',

    // Configuración DIAN
    profileId = getProfileId('Invoice'),
    documentTypeCode = getDocumentTypeCode('Invoice', { tipoFactura: invoiceTypeCode })
  } = data;

  // Validar líneas
  for (const line of lines) {
    const validation = validateInvoiceLine(line);
    if (!validation.valid) {
      throw new Error(`Línea ${line.lineNumber} inválida: ${validation.errors.join(', ')}`);
    }
  }

  // Calcular totales de impuestos si no vienen
  const taxTotals = calculateDocumentTaxTotals(lines);

  const xmlHeader = generateXmlHeader('Invoice');
  const ublVersion = generateUblVersionInfo();

  // Construir secciones
  const supplierXml = buildAccountingSupplierParty(supplier);
  const customerXml = buildAccountingCustomerParty(customer);
  const linesXml = lines.map(line => buildInvoiceLine(line)).join('');

  // Allowances/Charges globales
  let allowancesXml = '';
  for (const ac of allowancesCharges) {
    allowancesXml += buildAllowanceCharge({ ...ac, chargeIndicator: false });
  }

  // Referencias
  let referencesXml = '';
  if (orderReference) {
    referencesXml += `
    <cac:OrderReference>
      <cbc:ID>${escapeXml(orderReference.id)}</cbc:ID>
      ${orderReference.uuid ? `<cbc:UUID>${orderReference.uuid}</cbc:UUID>` : ''}
      ${orderReference.issueDate ? `<cbc:IssueDate>${orderReference.issueDate}</cbc:IssueDate>` : ''}
    </cac:OrderReference>`;
  }

  // AdditionalDocumentReference (para QR, PDF, etc.)
  let additionalDocRefs = '';
  if (additionalDocumentReference) {
    for (const ref of additionalDocumentReference) {
      additionalDocRefs += `
      <cac:AdditionalDocumentReference>
        <cbc:ID>${escapeXml(ref.id)}</cbc:ID>
        <cbc:DocumentTypeCode>${ref.typeCode || ''}</cbc:DocumentTypeCode>
        ${ref.attachment ? `
        <cac:Attachment>
          <cbc:EmbeddedDocumentBinaryObject mimeCode="${ref.mimeCode || 'application/pdf'}"
            filename="${escapeXml(ref.filename || 'documento.pdf')}">${ref.content}</cbc:EmbeddedDocumentBinaryObject>
        </cac:Attachment>` : ''}
      </cac:AdditionalDocumentReference>`;
    }
  }

  return `${xmlHeader}
  ${ublVersion}
  <cbc:ID>${escapeXml(id)}</cbc:ID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${issueTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>${documentTypeCode}</cbc:InvoiceTypeCode>
  <cbc:Note>${escapeXml(note)}</cbc:Note>
  <cbc:DocumentCurrencyCode>${documentCurrencyCode}</cbc:DocumentCurrencyCode>
  <cbc:CustomizationID>10</cbc:CustomizationID>
  <cbc:ProfileID>${profileId}</cbc:ProfileID>
  <cbc:ProfileExecutionID>1</cbc:ProfileExecutionID>

  ${supplierXml}
  ${customerXml}

  ${referencesXml}

  ${additionalDocRefs}

  ${linesXml}

  ${taxTotals.map(t => buildDocumentTaxTotal([t])).join('')}

  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${documentCurrencyCode}">${lineExtensionAmount.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${documentCurrencyCode}">${taxExclusiveAmount.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${documentCurrencyCode}">${taxInclusiveAmount.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="${documentCurrencyCode}">${allowancesCharges.filter(a => !a.chargeIndicator).reduce((s, a) => s + (a.amount || 0), 0).toFixed(2)}</cbc:AllowanceTotalAmount>
    <cbc:ChargeTotalAmount currencyID="${documentCurrencyCode}">${allowancesCharges.filter(a => a.chargeIndicator).reduce((s, a) => s + (a.amount || 0), 0).toFixed(2)}</cbc:ChargeTotalAmount>
    <cbc:PayableAmount currencyID="${documentCurrencyCode}">${payableAmount.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  ${allowancesXml}
</Invoice>`;
}

/**
 * Construye Nota Crédito (CreditNote)
 * @param {Object} data - Datos de la nota crédito
 * @returns {string} XML CreditNote
 */
export function buildCreditNote(data) {
  const {
    id,
    issueDate,
    issueTime,
    noteTypeCode = '1', // 1=Devolución, 2=Descuento, 3=Rebaja, 4=Anulación
    documentCurrencyCode = 'COP',
    supplier,
    customer,
    lines,
    lineExtensionAmount,
    taxExclusiveAmount,
    taxInclusiveAmount,
    payableAmount,
    allowancesCharges = [],
    reason = '',
    reasonCode = '',
    billingReference, // Factura referenciada obligatoria
    additionalDocumentReference,
    profileId = getProfileId('CreditNote'),
    documentTypeCode = getDocumentTypeCode('CreditNote', { tipoNota: noteTypeCode })
  } = data;

  if (!billingReference) {
    throw new Error('billingReference (factura origen) es obligatorio para Nota Crédito');
  }

  const taxTotals = calculateDocumentTaxTotals(lines);

  const xmlHeader = generateXmlHeader('CreditNote');
  const ublVersion = generateUblVersionInfo();

  const supplierXml = buildAccountingSupplierParty(supplier);
  const customerXml = buildAccountingCustomerParty(customer);
  const linesXml = lines.map(line => buildInvoiceLine(line)).join('');

  let allowancesXml = '';
  for (const ac of allowancesCharges) {
    allowancesXml += buildAllowanceCharge({ ...ac, chargeIndicator: false });
  }

  // BillingReference obligatoria
  const billingRefXml = `
    <cac:BillingReference>
      <cac:InvoiceDocumentReference>
        <cbc:ID>${escapeXml(billingReference.id)}</cbc:ID>
        ${billingReference.uuid ? `<cbc:UUID>${billingReference.uuid}</cbc:UUID>` : ''}
        <cbc:IssueDate>${billingReference.issueDate}</cbc:IssueDate>
        <cbc:DocumentTypeCode>01</cbc:DocumentTypeCode>
      </cac:InvoiceDocumentReference>
    </cac:BillingReference>`;

  return `${xmlHeader}
  ${ublVersion}
  <cbc:ID>${escapeXml(id)}</cbc:ID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${issueTime}</cbc:IssueTime>
  <cbc:CreditNoteTypeCode>${documentTypeCode}</cbc:CreditNoteTypeCode>
  <cbc:Note>${escapeXml(reason)}</cbc:Note>
  <cbc:DocumentCurrencyCode>${documentCurrencyCode}</cbc:DocumentCurrencyCode>
  <cbc:CustomizationID>10</cbc:CustomizationID>
  <cbc:ProfileID>${profileId}</cbc:ProfileID>
  <cbc:ProfileExecutionID>1</cbc:ProfileExecutionID>

  ${supplierXml}
  ${customerXml}

  ${billingRefXml}

  ${linesXml}

  ${taxTotals.map(t => buildDocumentTaxTotal([t])).join('')}

  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${documentCurrencyCode}">${lineExtensionAmount.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${documentCurrencyCode}">${taxExclusiveAmount.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${documentCurrencyCode}">${taxInclusiveAmount.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${documentCurrencyCode}">${payableAmount.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  ${allowancesXml}
</CreditNote>`;
}

/**
 * Construye Nota Débito (DebitNote)
 * @param {Object} data - Datos de la nota débito
 * @returns {string} XML DebitNote
 */
export function buildDebitNote(data) {
  const {
    id,
    issueDate,
    issueTime,
    noteTypeCode = '1', // 1=Intereses, 2=Gastos, 3=Corrección precio, 4=Otros
    documentCurrencyCode = 'COP',
    supplier,
    customer,
    lines,
    lineExtensionAmount,
    taxExclusiveAmount,
    taxInclusiveAmount,
    payableAmount,
    allowancesCharges = [],
    reason = '',
    reasonCode = '',
    billingReference, // Factura referenciada obligatoria
    additionalDocumentReference,
    profileId = getProfileId('DebitNote'),
    documentTypeCode = getDocumentTypeCode('DebitNote', { tipoNota: noteTypeCode })
  } = data;

  if (!billingReference) {
    throw new Error('billingReference (factura origen) es obligatorio para Nota Débito');
  }

  const taxTotals = calculateDocumentTaxTotals(lines);

  const xmlHeader = generateXmlHeader('DebitNote');
  const ublVersion = generateUblVersionInfo();

  const supplierXml = buildAccountingSupplierParty(supplier);
  const customerXml = buildAccountingCustomerParty(customer);
  const linesXml = lines.map(line => buildInvoiceLine(line)).join('');

  let allowancesXml = '';
  for (const ac of allowancesCharges) {
    allowancesXml += buildAllowanceCharge({ ...ac, chargeIndicator: false });
  }

  // BillingReference obligatoria
  const billingRefXml = `
    <cac:BillingReference>
      <cac:InvoiceDocumentReference>
        <cbc:ID>${escapeXml(billingReference.id)}</cbc:ID>
        ${billingReference.uuid ? `<cbc:UUID>${billingReference.uuid}</cbc:UUID>` : ''}
        <cbc:IssueDate>${billingReference.issueDate}</cbc:IssueDate>
        <cbc:DocumentTypeCode>01</cbc:DocumentTypeCode>
      </cac:InvoiceDocumentReference>
    </cac:BillingReference>`;

  return `${xmlHeader}
  ${ublVersion}
  <cbc:ID>${escapeXml(id)}</cbc:ID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${issueTime}</cbc:IssueTime>
  <cbc:DebitNoteTypeCode>${documentTypeCode}</cbc:DebitNoteTypeCode>
  <cbc:Note>${escapeXml(reason)}</cbc:Note>
  <cbc:DocumentCurrencyCode>${documentCurrencyCode}</cbc:DocumentCurrencyCode>
  <cbc:CustomizationID>10</cbc:CustomizationID>
  <cbc:ProfileID>${profileId}</cbc:ProfileID>
  <cbc:ProfileExecutionID>1</cbc:ProfileExecutionID>

  ${supplierXml}
  ${customerXml}

  ${billingRefXml}

  ${linesXml}

  ${taxTotals.map(t => buildDocumentTaxTotal([t])).join('')}

  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${documentCurrencyCode}">${lineExtensionAmount.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${documentCurrencyCode}">${taxExclusiveAmount.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${documentCurrencyCode}">${taxInclusiveAmount.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${documentCurrencyCode}">${payableAmount.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  ${allowancesXml}
</DebitNote>`;
}

export default {
  buildInvoice,
  buildCreditNote,
  buildDebitNote
};