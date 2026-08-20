/**
 * Builder para Invoice Lines (Líneas de factura) según UBL 2.1 y DIAN
 */

import { escapeXml } from '../../utils/xml.utils.js';
import { buildTaxTotal } from './tax.builder.js';

/**
 * Construye una línea de factura (InvoiceLine)
 * @param {Object} line - Datos de la línea
 * @returns {string} XML InvoiceLine
 */
export function buildInvoiceLine(line) {
  const {
    lineNumber,
    itemCode,
    description,
    quantity,
    unitCode = '94', // UN = Unidad (código UN/ECE 94)
    unitPrice,
    lineExtensionAmount,
    taxRate = 19,
    taxAmount,
    taxId = '01',
    isExcluded = false,
    codigoProducto = '',
    allowancesCharges = [],
    itemDescription = ''
  } = line;

  const subtotal = lineExtensionAmount || (quantity * unitPrice);
  const iva = taxAmount || Math.round(subtotal * (taxRate / 100));

  let allowancesXml = '';
  for (const ac of allowancesCharges) {
    allowancesXml += `
      <cac:AllowanceCharge>
        <cbc:ChargeIndicator>${ac.chargeIndicator || false}</cbc:ChargeIndicator>
        <cbc:AllowanceChargeReason>${escapeXml(ac.reason || '')}</cbc:AllowanceChargeReason>
        <cbc:Amount currencyID="COP">${(ac.amount || 0).toFixed(2)}</cbc:Amount>
        <cbc:BaseAmount currencyID="COP">${(ac.baseAmount || 0).toFixed(2)}</cbc:BaseAmount>
      </cac:AllowanceCharge>`;
  }

  return `
    <cac:InvoiceLine>
      <cbc:ID>${lineNumber}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="${unitCode}">${quantity}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="COP">${subtotal.toFixed(2)}</cbc:LineExtensionAmount>
      ${allowancesXml}
      <cac:Item>
        <cbc:Description>${escapeXml(description)}</cbc:Description>
        <cac:SellersItemIdentification>
          <cbc:ID>${escapeXml(itemCode || codigoProducto)}</cbc:ID>
        </cac:SellersItemIdentification>
        <cac:AdditionalItemProperty>
          <cbc:Name>CodigoProducto</cbc:Name>
          <cbc:Value>${escapeXml(codigoProducto || itemCode)}</cbc:Value>
        </cac:AdditionalItemProperty>
        ${itemDescription ? `
        <cac:AdditionalItemProperty>
          <cbc:Name>DescripcionAdicional</cbc:Name>
          <cbc:Value>${escapeXml(itemDescription)}</cbc:Value>
        </cac:AdditionalItemProperty>` : ''}
        <cac:ClassifiedTaxCategory>
          <cbc:ID>${isExcluded ? 'Z' : 'S'}</cbc:ID>
          <cbc:Percent>${taxRate.toFixed(2)}</cbc:Percent>
          <cac:TaxScheme>
            <cbc:ID>${taxId}</cbc:ID>
            <cbc:Name>${taxId === '01' ? 'IVA' : taxId === '02' ? 'ICA' : 'Impuesto al Consumo'}</cbc:Name>
          </cac:TaxScheme>
        </cac:ClassifiedTaxCategory>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="COP">${unitPrice.toFixed(2)}</cbc:PriceAmount>
        <cbc:BaseQuantity unitCode="${unitCode}">${quantity}</cbc:BaseQuantity>
      </cac:Price>
      ${buildTaxTotal({ taxId, taxRate, taxAmount: iva, taxableAmount: subtotal })}
    </cac:InvoiceLine>`;
}

/**
 * Construye líneas para Nota Crédito (CreditNoteLine)
 * @param {Object[]} lines - Líneas
 * @returns {string} XML CreditNoteLines
 */
export function buildCreditNoteLines(lines) {
  return lines.map((line, idx) => buildInvoiceLine({ ...line, lineNumber: idx + 1 })).join('');
}

/**
 * Construye líneas para Nota Débito (DebitNoteLine)
 * @param {Object[]} lines - Líneas
 * @returns {string} XML DebitNoteLines
 */
export function buildDebitNoteLines(lines) {
  return lines.map((line, idx) => buildInvoiceLine({ ...line, lineNumber: idx + 1 })).join('');
}

/**
 * Valida una línea de factura según reglas DIAN
 * @param {Object} line - Línea a validar
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateInvoiceLine(line) {
  const errors = [];

  if (!line.lineNumber || line.lineNumber < 1) {
    errors.push('lineNumber es requerido y debe ser >= 1');
  }
  if (!line.description || line.description.trim().length === 0) {
    errors.push('description es requerido');
  }
  if (!line.quantity || line.quantity <= 0) {
    errors.push('quantity debe ser > 0');
  }
  if (!line.unitPrice || line.unitPrice < 0) {
    errors.push('unitPrice debe ser >= 0');
  }
  if (!line.unitCode) {
    errors.push('unitCode es requerido (ej: 94=Unidad)');
  }
  if (line.taxRate !== undefined && (line.taxRate < 0 || line.taxRate > 100)) {
    errors.push('taxRate debe estar entre 0 y 100');
  }

  return { valid: errors.length === 0, errors };
}

export default {
  buildInvoiceLine,
  buildCreditNoteLines,
  buildDebitNoteLines,
  validateInvoiceLine
};