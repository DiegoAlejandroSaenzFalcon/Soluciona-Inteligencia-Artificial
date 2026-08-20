/**
 * DIAN Validator - Validaciones según Anexo Técnico 1.9 y Resolución 000042
 * Validaciones aritméticas, estructura UBL, reglas de negocio
 */

import { DOMParser } from 'xmldom';
import xpath from 'xpath';

/**
 * Valida factura completa según reglas DIAN
 * @param {Object} invoiceData - Datos de factura
 * @returns {Object} { valid: boolean, errors: string[], warnings: string[] }
 */
export function validateInvoice(invoiceData) {
  const errors = [];
  const warnings = [];

  // 1. Validaciones de identificación
  validateIdentification(invoiceData, errors, warnings);

  // 2. Validaciones de fechas
  validateDates(invoiceData, errors, warnings);

  // 3. Validaciones de partes (emisor, adquiriente)
  validateParties(invoiceData, errors, warnings);

  // 4. Validaciones de líneas
  validateLines(invoiceData, errors, warnings);

  // 5. Validaciones aritméticas
  validateArithmetic(invoiceData, errors, warnings);

  // 6. Validaciones de tributos
  validateTaxes(invoiceData, errors, warnings);

  // 7. Validaciones de totales
  validateTotals(invoiceData, errors, warnings);

  // 8. Validaciones de referencias
  validateReferences(invoiceData, errors, warnings);

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validaciones de identificación del documento
 */
function validateIdentification(data, errors, warnings) {
  if (!data.id) errors.push('ID de factura requerido');
  if (!data.id?.match(/^[A-Z]{2,4}\d{1,10}$/)) {
    warnings.push('ID debe seguir patrón: PREFIJO + CONSECUTIVO (ej: SETP123)');
  }

  if (!data.issueDate) errors.push('Fecha emisión requerida');
  if (!data.issueTime) errors.push('Hora emisión requerida');

  // Validar formato fecha
  if (data.issueDate && !/^\d{4}-\d{2}-\d{2}$/.test(data.issueDate)) {
    errors.push('Fecha emisión debe ser YYYY-MM-DD');
  }

  // Validar formato hora
  if (data.issueTime && !/^\d{2}:\d{2}:\d{2}$/.test(data.issueTime)) {
    errors.push('Hora emisión debe ser HH:MM:SS');
  }

  // Validar tipo documento
  const validTypes = ['01', '02', '03', '04'];
  if (data.invoiceTypeCode && !validTypes.includes(data.invoiceTypeCode)) {
    errors.push(`Tipo documento inválido: ${data.invoiceTypeCode}. Válidos: ${validTypes.join(', ')}`);
  }

  if (!data.documentCurrencyCode) errors.push('Moneda requerida (COP)');
  if (data.documentCurrencyCode !== 'COP') warnings.push('Moneda debería ser COP para Colombia');
}

/**
 * Validaciones de fechas (no futura, rango razonable)
 */
function validateDates(data, errors, warnings) {
  if (data.issueDate) {
    const issueDate = new Date(data.issueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (issueDate > today) {
      errors.push('Fecha emisión no puede ser futura');
    }

    // Validar que no sea muy antigua (> 30 días para habilitación, > 90 para producción)
    const diffDays = (today - issueDate) / (1000 * 60 * 60 * 24);
    if (diffDays > 90) {
      warnings.push('Factura con más de 90 días de antigüedad');
    }
  }
}

/**
 * Validaciones de partes (emisor y adquiriente)
 */
function validateParties(data, errors, warnings) {
  // Emisor (Supplier)
  if (!data.supplier) {
    errors.push('Datos del emisor requeridos');
  } else {
    if (!data.supplier.identification) errors.push('NIT emisor requerido');
    if (!data.supplier.name) errors.push('Razón social emisor requerida');
    if (!data.supplier.direccion) errors.push('Dirección emisor requerida');
    if (!data.supplier.municipio) errors.push('Municipio emisor requerido (código DANE)');
    if (!data.supplier.departamento) errors.push('Departamento emisor requerido (código DANE)');
    if (!data.supplier.tipoIdentificacion) warnings.push('Tipo identificación emisor recomendado (31=NIT)');
    if (!data.supplier.email) warnings.push('Email emisor recomendado');
  }

  // Adquiriente (Customer)
  if (!data.customer) {
    errors.push('Datos del adquiriente requeridos');
  } else {
    if (!data.customer.identification) errors.push('Identificación adquiriente requerida');
    if (!data.customer.name) errors.push('Nombre adquiriente requerido');
    if (!data.customer.tipoIdentificacion) warnings.push('Tipo identificación adquiriente recomendado');

    // Validar tipo identificación adquiriente
    const validTipos = ['13', '22', '31', '41', '42', '43', '50', '91'];
    if (data.customer.tipoIdentificacion && !validTipos.includes(data.customer.tipoIdentificacion)) {
      warnings.push(`Tipo identificación adquiriente ${data.customer.tipoIdentificacion} puede no ser válido`);
    }
  }
}

/**
 * Validaciones de líneas de factura
 */
function validateLines(data, errors, warnings) {
  if (!data.lines || data.lines.length === 0) {
    errors.push('Debe haber al menos una línea de factura');
    return;
  }

  const lineNumbers = new Set();
  for (let i = 0; i < data.lines.length; i++) {
    const line = data.lines[i];
    const lineNum = i + 1;

    if (!line.description) errors.push(`Línea ${lineNum}: Descripción requerida`);
    if (!line.quantity || line.quantity <= 0) errors.push(`Línea ${lineNum}: Cantidad debe ser > 0`);
    if (!line.unitPrice || line.unitPrice < 0) errors.push(`Línea ${lineNum}: Precio unitario inválido`);
    if (!line.unitCode) errors.push(`Línea ${lineNum}: Código unidad medida requerido`);

    // Validar unidades de medida DIAN
    const validUnits = ['94', 'KG', 'LT', 'MT', 'M2', 'M3', 'PR', 'SET', 'CJ', 'PA'];
    if (line.unitCode && !validUnits.includes(line.unitCode)) {
      warnings.push(`Línea ${lineNum}: Unidad medida ${line.unitCode} puede no ser estándar DIAN`);
    }

    // Validar número de línea secuencial
    if (line.lineNumber && lineNumbers.has(line.lineNumber)) {
      errors.push(`Línea ${lineNum}: Número de línea duplicado`);
    }
    if (line.lineNumber) lineNumbers.add(line.lineNumber);

    // Validar subtotal
    const expectedSubtotal = line.quantity * line.unitPrice;
    if (line.lineExtensionAmount && Math.abs(line.lineExtensionAmount - expectedSubtotal) > 0.01) {
      errors.push(`Línea ${lineNum}: Subtotal no coincide (esperado: ${expectedSubtotal}, recibido: ${line.lineExtensionAmount})`);
    }

    // Validar IVA
    if (line.taxRate !== undefined && (line.taxRate < 0 || line.taxRate > 100)) {
      errors.push(`Línea ${lineNum}: Tasa IVA inválida (0-100)`);
    }

    if (line.taxId === '01' && line.taxRate !== 19 && line.taxRate !== 5 && line.taxRate !== 0) {
      warnings.push(`Línea ${lineNum}: Tasa IVA ${line.taxRate}% no estándar (válidas: 0, 5, 19)`);
    }
  }
}

/**
 * Validaciones aritméticas principales
 */
function validateArithmetic(data, errors, warnings) {
  const lines = data.lines || [];

  // 1. Subtotal total = suma de subtotales de líneas
  const calculatedSubtotal = lines.reduce((sum, l) => sum + (l.lineExtensionAmount || l.quantity * l.unitPrice), 0);
  const declaredSubtotal = data.lineExtensionAmount || data.taxExclusiveAmount;

  if (declaredSubtotal && Math.abs(calculatedSubtotal - declaredSubtotal) > 0.02) {
    errors.push(`Subtotal no coincide: calculado ${calculatedSubtotal.toFixed(2)} vs declarado ${declaredSubtotal.toFixed(2)}`);
  }

  // 2. Total IVA = suma de IVA de líneas
  const calculatedTax = lines.reduce((sum, l) => sum + (l.taxAmount || Math.round((l.quantity * l.unitPrice) * (l.taxRate || 19) / 100)), 0);
  const declaredTax = data.totalTax || data.totalIva;

  if (declaredTax && Math.abs(calculatedTax - declaredTax) > 0.02) {
    errors.push(`Total IVA no coincide: calculado ${calculatedTax.toFixed(2)} vs declarado ${declaredTax.toFixed(2)}`);
  }

  // 3. Total = Subtotal + IVA + Otros impuestos - Descuentos + Cargos
  const discounts = (data.allowancesCharges || []).filter(a => !a.chargeIndicator).reduce((s, a) => s + (a.amount || 0), 0);
  const charges = (data.allowancesCharges || []).filter(a => a.chargeIndicator).reduce((s, a) => s + (a.amount || 0), 0);

  const expectedTotal = calculatedSubtotal + calculatedTax - discounts + charges;
  const declaredTotal = data.taxInclusiveAmount || data.payableAmount;

  if (declaredTotal && Math.abs(expectedTotal - declaredTotal) > 0.02) {
    errors.push(`Total factura no coincide: esperado ${expectedTotal.toFixed(2)} vs declarado ${declaredTotal.toFixed(2)}`);
  }

  // 4. PayableAmount = TaxInclusiveAmount
  if (data.payableAmount && data.taxInclusiveAmount && Math.abs(data.payableAmount - data.taxInclusiveAmount) > 0.01) {
    errors.push('PayableAmount debe ser igual a TaxInclusiveAmount');
  }
}

/**
 * Validaciones de tributos
 */
function validateTaxes(data, errors, warnings) {
  const lines = data.lines || [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Validar que si hay IVA, la categoría sea S (Gravado)
    if ((line.taxRate || 19) > 0 && line.taxId === '01') {
      if (line.taxCategoryId !== 'S') {
        warnings.push(`Línea ${lineNum}: Categoría tributaria debería ser 'S' para IVA gravado`);
      }
    }

    // Validar que si es excluido, la tasa sea 0
    if (line.taxCategoryId === 'Z' && line.taxRate > 0) {
      errors.push(`Línea ${lineNum}: Categoría 'Z' (exento) no puede tener tasa > 0`);
    }

    // Validar coherencia taxAmount
    if (line.taxAmount !== undefined && line.taxRate !== undefined && line.lineExtensionAmount) {
      const expectedTax = Math.round(line.lineExtensionAmount * (line.taxRate / 100) * 100) / 100;
      if (Math.abs(line.taxAmount - expectedTax) > 0.02) {
        errors.push(`Línea ${lineNum}: IVA calculado ${expectedTax.toFixed(2)} vs declarado ${line.taxAmount.toFixed(2)}`);
      }
    }
  }
}

/**
 * Validaciones de totales del documento
 */
function validateTotals(data, errors, warnings) {
  if (!data.legalMonetaryTotal) {
    warnings.push('LegalMonetaryTotal recomendado');
    return;
  }

  const totals = data.legalMonetaryTotal;

  if (totals.lineExtensionAmount !== undefined && data.lineExtensionAmount !== undefined) {
    if (Math.abs(totals.lineExtensionAmount - data.lineExtensionAmount) > 0.02) {
      errors.push('LineExtensionAmount en LegalMonetaryTotal no coincide con cabecera');
    }
  }

  if (totals.taxExclusiveAmount !== undefined && data.taxExclusiveAmount !== undefined) {
    if (Math.abs(totals.taxExclusiveAmount - data.taxExclusiveAmount) > 0.02) {
      errors.push('TaxExclusiveAmount en LegalMonetaryTotal no coincide con cabecera');
    }
  }

  if (totals.taxInclusiveAmount !== undefined && data.taxInclusiveAmount !== undefined) {
    if (Math.abs(totals.taxInclusiveAmount - data.taxInclusiveAmount) > 0.02) {
      errors.push('TaxInclusiveAmount en LegalMonetaryTotal no coincide con cabecera');
    }
  }

  if (totals.payableAmount !== undefined && data.payableAmount !== undefined) {
    if (Math.abs(totals.payableAmount - data.payableAmount) > 0.02) {
      errors.push('PayableAmount en LegalMonetaryTotal no coincide con cabecera');
    }
  }
}

/**
 * Validaciones de referencias (orden, despacho, etc.)
 */
function validateReferences(data, errors, warnings) {
  // Para NC/ND validar que exista billingReference
  if (data.documentType && ['CreditNote', 'DebitNote'].includes(data.documentType)) {
    if (!data.billingReference) {
      errors.push('billingReference obligatorio para Nota Crédito/Débito');
    } else {
      if (!data.billingReference.id) errors.push('billingReference.id requerido');
      if (!data.billingReference.issueDate) errors.push('billingReference.issueDate requerido');
    }
  }
}

/**
 * Valida XML UBL contra esquema XSD (si disponible)
 * @param {string} xml - XML a validar
 * @returns {Promise<Object>} Resultado validación
 */
export async function validateXmlSchema(xml) {
  try {
    // En producción: usar libxmljs o xmllint con esquemas XSD UBL 2.1 + DIAN
    // Por ahora validación básica de estructura
    const parser = new DOMParser();
    const doc = new DOMParser().parseFromString(xml, 'text/xml');

    const errors = [];
    const parseErrors = doc.getElementsByTagName('parsererror');
    if (parseErrors.length > 0) {
      for (const err of parseErrors) {
        errors.push(err.textContent);
      }
    }

    // Validar estructura mínima requerida
    const requiredElements = [
      'cbc:ID', 'cbc:IssueDate', 'cbc:IssueTime', 'cbc:InvoiceTypeCode',
      'cac:AccountingSupplierParty', 'cac:AccountingCustomerParty',
      'cac:InvoiceLine', 'cac:LegalMonetaryTotal'
    ];

    for (const el of requiredElements) {
      const nodes = xpath.select(`//${el}`, doc);
      if (nodes.length === 0) {
        errors.push(`Elemento requerido faltante: ${el}`);
      }
    }

    return { valid: errors.length === 0, errors };
  } catch (e) {
    return { valid: false, errors: [`Error parseando XML: ${e.message}`] };
  }
}

/**
 * Valida set de habilitación según modo de operación
 * Modos: software-propio (60F/20NC/20ND), proveedor-tecnologico (6F/2NC/2ND), facturacion-gratuita (2F/1NC/1ND)
 * @param {Object} testSet - Set de pruebas
 * @param {Object} counts - Conteos esperados { invoices, creditNotes, debitNotes } (default software propio)
 * @returns {Object} Resultado validación
 */
export function validateHabilitacionSet(testSet, counts = {}) {
  const errors = [];
  const warnings = [];

  const expected = {
    invoices: counts.invoices ?? 60,
    creditNotes: counts.creditNotes ?? 20,
    debitNotes: counts.debitNotes ?? 20
  };

  const invoices = testSet.invoices || [];
  const creditNotes = testSet.creditNotes || [];
  const debitNotes = testSet.debitNotes || [];

  if (invoices.length < expected.invoices) errors.push(`Facturas: ${invoices.length}/${expected.invoices} (mínimo ${expected.invoices})`);
  if (creditNotes.length < expected.creditNotes) errors.push(`Notas Crédito: ${creditNotes.length}/${expected.creditNotes} (mínimo ${expected.creditNotes})`);
  if (debitNotes.length < expected.debitNotes) errors.push(`Notas Débito: ${debitNotes.length}/${expected.debitNotes} (mínimo ${expected.debitNotes})`);

  if (invoices.length > expected.invoices) warnings.push(`${invoices.length} facturas (excede mínimo ${expected.invoices})`);
  if (creditNotes.length > expected.creditNotes) warnings.push(`${creditNotes.length} NC (excede mínimo ${expected.creditNotes})`);
  if (debitNotes.length > expected.debitNotes) warnings.push(`${debitNotes.length} ND (excede mínimo ${expected.debitNotes})`);

  // Validar consecutivos únicos
  const allIds = [...invoices, ...creditNotes, ...debitNotes].map(d => d.id);
  const uniqueIds = new Set(allIds);
  if (allIds.length !== uniqueIds.size) {
    errors.push('IDs duplicados en set de habilitación');
  }

  return { valid: errors.length === 0, errors, warnings, counts: { invoices: invoices.length, creditNotes: creditNotes.length, debitNotes: debitNotes.length } };
}

export default {
  validateInvoice,
  validateXmlSchema,
  validateHabilitacionSet
};