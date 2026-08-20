/**
 * Builder para Tributos (IVA, ICA, Impuesto al Consumo) según UBL 2.1 y DIAN
 */

import { escapeXml } from '../../utils/xml.utils.js';

const TAX_SCHEMES = {
  IVA: { id: '01', name: 'IVA' },
  ICA: { id: '02', name: 'ICA' },
  CONSUMO: { id: '03', name: 'Impuesto al Consumo' }
};

/**
 * Construye un TaxTotal para una línea
 * @param {Object} params - Parámetros del tributo
 * @returns {string} XML TaxTotal
 */
export function buildTaxTotal({ taxId = '01', taxRate = 19, taxAmount, taxableAmount, currency = 'COP' }) {
  const scheme = TAX_SCHEMES[taxId === '01' ? 'IVA' : taxId === '02' ? 'ICA' : 'CONSUMO'] || { id: taxId, name: 'Tax' };

  return `
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="${currency}">${taxAmount.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxAmount currencyID="${currency}">${taxAmount.toFixed(2)}</cbc:TaxAmount>
        <cbc:TaxableAmount currencyID="${currency}">${taxableAmount.toFixed(2)}</cbc:TaxableAmount>
        <cbc:Percent>${taxRate.toFixed(2)}</cbc:Percent>
        <cac:TaxCategory>
          <cbc:ID>${getTaxCategoryId(taxId, taxRate)}</cbc:ID>
          <cbc:Percent>${taxRate.toFixed(2)}</cbc:Percent>
          <cac:TaxScheme>
            <cbc:ID>${scheme.id}</cbc:ID>
            <cbc:Name>${scheme.name}</cbc:Name>
          </cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>`;
}

/**
 * Determina el código de categoría tributaria según DIAN
 * @param {string} taxId - ID tributo (01=IVA, 02=ICA, 03=Consumo)
 * @param {number} taxRate - Tasa porcentual
 * @returns {string} Código categoría
 */
function getTaxCategoryId(taxId, taxRate) {
  // Categorías DIAN: S=Gravado, E=Excluido, Z=Exento, O=No sujeto
  if (taxRate === 0) return 'Z'; // Exento
  if (taxId === '01') return 'S'; // IVA Gravado
  if (taxId === '02') return 'S'; // ICA
  if (taxId === '03') return 'S'; // Consumo
  return 'S';
}

/**
 * Construye TaxTotal a nivel documento (totales)
 * @param {Object[]} taxTotals - Array de totales por tributo
 * @returns {string} XML TaxTotal documento
 */
export function buildDocumentTaxTotal(taxTotals) {
  let xml = '';
  for (const tax of taxTotals) {
    xml += `
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="${tax.currency || 'COP'}">${tax.totalAmount.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxAmount currencyID="${tax.currency || 'COP'}">${tax.totalAmount.toFixed(2)}</cbc:TaxAmount>
        <cbc:TaxableAmount currencyID="${tax.currency || 'COP'}">${tax.taxableAmount.toFixed(2)}</cbc:TaxableAmount>
        <cbc:Percent>${tax.rate.toFixed(2)}</cbc:Percent>
        <cac:TaxCategory>
          <cbc:ID>${getTaxCategoryId(tax.taxId, tax.rate)}</cbc:ID>
          <cbc:Percent>${tax.rate.toFixed(2)}</cbc:Percent>
          <cac:TaxScheme>
            <cbc:ID>${tax.taxId}</cbc:ID>
            <cbc:Name>${TAX_SCHEMES[tax.taxId]?.name || 'Tax'}</cbc:Name>
          </cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>`;
  }
  return xml;
}

/**
 * Calcula y agrupa impuestos para el documento completo
 * @param {Object[]} lines - Líneas de factura
 * @returns {Object[]} Totales agrupados por tributo
 */
export function calculateDocumentTaxTotals(lines) {
  const totals = new Map();

  for (const line of lines) {
    const taxId = line.taxId || '01';
    const rate = line.taxRate || 19;
    const key = `${taxId}-${rate}`;

    if (!totals.has(key)) {
      totals.set(key, { taxId, rate, taxableAmount: 0, totalAmount: 0, currency: 'COP' });
    }

    const total = totals.get(key);
    total.taxableAmount += line.lineExtensionAmount || (line.quantity * line.unitPrice);
    total.totalAmount += line.taxAmount || 0;
  }

  return Array.from(totals.values());
}

/**
 * Construye AllowanceCharge (Descuentos/Cargos)
 * @param {Object} params - Parámetros descuento/cargo
 * @returns {string} XML AllowanceCharge
 */
export function buildAllowanceCharge({ chargeIndicator = false, allowanceChargeReason = '', amount, baseAmount, currency = 'COP', taxCategory }) {
  const tag = chargeIndicator ? 'cac:Charge' : 'cac:Allowance';
  return `
    ${tag}
      <cbc:ChargeIndicator>${chargeIndicator}</cbc:ChargeIndicator>
      <cbc:AllowanceChargeReason>${escapeXml(allowanceChargeReason)}</cbc:AllowanceChargeReason>
      <cbc:Amount currencyID="${currency}">${amount.toFixed(2)}</cbc:Amount>
      <cbc:BaseAmount currencyID="${currency}">${baseAmount.toFixed(2)}</cbc:BaseAmount>
      ${taxCategory ? buildTaxCategory(taxCategory) : ''}
    </${tag}>`;
}

/**
 * Construye TaxCategory para AllowanceCharge
 * @param {Object} taxCategory - Categoría tributaria
 * @returns {string} XML TaxCategory
 */
function buildTaxCategory(taxCategory) {
  return `
    <cac:TaxCategory>
      <cbc:ID>${taxCategory.id || 'S'}</cbc:ID>
      <cbc:Percent>${taxCategory.percent || 19}</cbc:Percent>
      <cac:TaxScheme>
        <cbc:ID>${taxCategory.taxId || '01'}</cbc:ID>
        <cbc:Name>${TAX_SCHEMES[taxCategory.taxId || '01']?.name || 'IVA'}</cbc:Name>
      </cac:TaxScheme>
    </cac:TaxCategory>`;
}

export default {
  buildTaxTotal,
  buildDocumentTaxTotal,
  calculateDocumentTaxTotals,
  buildAllowanceCharge
};