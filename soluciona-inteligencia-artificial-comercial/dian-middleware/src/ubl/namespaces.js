/**
 * Namespaces UBL 2.1 y DIAN para Facturación Electrónica Colombia
 * Basado en Anexo Técnico 1.9 y Resolución 000042
 */

export const NAMESPACES = {
  // UBL 2.1 Core
  ubl: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
  ublCredit: 'urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2',
  ublDebit: 'urn:oasis:names:specification:ubl:schema:xsd:DebitNote-2',

  // UBL Common
  cac: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
  cbc: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
  ccts: 'urn:oasis:names:specification:ubl:schema:xsd:CoreComponentParameters-2',
  udt: 'urn:oasis:names:specification:ubl:schema:xsd:UnqualifiedDataTypes-2',
  qdt: 'urn:oasis:names:specification:ubl:schema:xsd:QualifiedDataTypes-2',

  // Extensiones DIAN
  ext: 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
  ds: 'http://www.w3.org/2000/09/xmldsig#',
  xsi: 'http://www.w3.org/2001/XMLSchema-instance',
  xsd: 'http://www.w3.org/2001/XMLSchema',

  // DIAN Specific
  dian: 'https://facturaelectronica.dian.gov.co',
  ubl_dian: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2'
};

/**
 * Genera la declaración XML con namespaces
 * @param {string} documentType - 'Invoice' | 'CreditNote' | 'DebitNote'
 * @returns {string} Declaración XML con namespaces
 */
export function generateXmlHeader(documentType = 'Invoice') {
  const ublNs = documentType === 'CreditNote' ? NAMESPACES.ublCredit :
                documentType === 'DebitNote' ? NAMESPACES.ublDebit :
                NAMESPACES.ubl;

  return `<?xml version="1.0" encoding="UTF-8"?>
<${documentType}
    xmlns="${ublNs}"
    xmlns:cac="${NAMESPACES.cac}"
    xmlns:cbc="${NAMESPACES.cbc}"
    xmlns:ccts="${NAMESPACES.ccts}"
    xmlns:udt="${NAMESPACES.udt}"
    xmlns:qdt="${NAMESPACES.qdt}"
    xmlns:ext="${NAMESPACES.ext}"
    xmlns:ds="${NAMESPACES.ds}"
    xmlns:xsi="${NAMESPACES.xsi}"
    xmlns:xsd="${NAMESPACES.xsd}">`;
}

/**
 * Genera el UBLVersionID y CustomizationID requeridos por DIAN
 * @returns {string} XML con versiones
 */
export function generateUblVersionInfo() {
  return `
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>10</cbc:CustomizationID>
  <cbc:ProfileID>FACTURA_VENTA</cbc:ProfileID>
  <cbc:ProfileExecutionID>1</cbc:ProfileExecutionID>`;
}

/**
 * Genera la información de ProfileID según tipo de documento
 * @param {string} documentType - 'Invoice' | 'CreditNote' | 'DebitNote'
 * @returns {string} ProfileID
 */
export function getProfileId(documentType) {
  const profiles = {
    Invoice: 'FACTURA_VENTA',
    CreditNote: 'NOTA_CREDITO',
    DebitNote: 'NOTA_DEBITO'
  };
  return profiles[documentType] || 'FACTURA_VENTA';
}

/**
 * Genera el InvoiceTypeCode / CreditNoteTypeCode / DebitNoteTypeCode
 * @param {string} documentType - Tipo documento
 * @param {Object} options - Opciones adicionales
 * @returns {string} Código tipo documento
 */
export function getDocumentTypeCode(documentType, options = {}) {
  // Factura de venta
  if (documentType === 'Invoice') {
    // 01 = Factura de venta, 02 = Factura exportación, 03 = Factura contado, etc.
    return options.tipoFactura || '01';
  }
  // Nota crédito
  if (documentType === 'CreditNote') {
    // 1=Devolución, 2=Descuento, 3=Rebaja, 4=Anulación
    return options.tipoNota || '1';
  }
  // Nota débito
  if (documentType === 'DebitNote') {
    // 1=Intereses, 2=Gastos, 3=Corrección precio, 4=Otros
    return options.tipoNota || '1';
  }
  return '01';
}

export default NAMESPACES;