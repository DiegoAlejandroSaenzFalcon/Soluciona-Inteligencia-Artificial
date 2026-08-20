/**
 * DIAN Validation Rules - Reglas de validacion segun Anexo Tecnico Resolucion 000042
 * Implementa codigos VLR, CADE, CAE segun Anexo Tecnico v1.7
 *
 * Codigos de validacion:
 * - VLR: Validaciones de Reglas de Negocio (VLR01-VLR99)
 * - CADE: Codigos de Errores de Estructura (CADE01-CADE99)
 * - CAE: Codigos de Aceptacion/Error de Contenido (CAE01-CAE99)
 */

// ============================================================
// CODIGOS DE ERROR DIAN (CADE) - Estructura XML
// ============================================================
export const CADE_CODES = {
  // Estructura general
  CADE01: { code: 'CADE01', message: 'El documento XML no es valido segun esquema XSD', severity: 'error' },
  CADE02: { code: 'CADE02', message: 'Elemento requerido faltante', severity: 'error' },
  CADE03: { code: 'CADE03', message: 'Valor de atributo invalido', severity: 'error' },
  CADE04: { code: 'CADE04', message: 'Formato de fecha invalido', severity: 'error' },
  CADE05: { code: 'CADE05', message: 'Formato de hora invalido', severity: 'error' },
  CADE06: { code: 'CADE06', message: 'Namespace invalido o faltante', severity: 'error' },
  CADE07: { code: 'CADE07', message: 'Prefijo de namespace no declarado', severity: 'error' },
  CADE08: { code: 'CADE08', message: 'Version UBL no soportada', severity: 'error' },
  CADE09: { code: 'CADE09', message: 'CustomizationID invalido', severity: 'error' },
  CADE10: { code: 'CADE10', message: 'ProfileID invalido', severity: 'error' },
  CADE11: { code: 'CADE11', message: 'ProfileExecutionID invalido', severity: 'error' },

  // Identificacion del documento
  CADE20: { code: 'CADE20', message: 'ID de factura invalido (formato: PREFIJO + CONSECUTIVO)', severity: 'error' },
  CADE21: { code: 'CADE21', message: 'Tipo de documento invalido (InvoiceTypeCode)', severity: 'error' },
  CADE22: { code: 'CADE22', message: 'Codigo de moneda invalido (debe ser COP)', severity: 'error' },
  CADE23: { code: 'CADE23', message: 'Fecha de emision invalida', severity: 'error' },
  CADE24: { code: 'CADE24', message: 'Hora de emision invalida', severity: 'error' },
  CADE25: { code: 'CADE25', message: 'Fecha de emision futura', severity: 'error' },
  CADE26: { code: 'CADE26', message: 'Fecha de emision muy antigua (> 90 dias)', severity: 'warning' },

  // Emisor (Facturador)
  CADE30: { code: 'CADE30', message: 'NIT del emisor requerido', severity: 'error' },
  CADE31: { code: 'CADE31', message: 'DV del emisor invalido', severity: 'error' },
  CADE32: { code: 'CADE32', message: 'Razon social del emisor requerida', severity: 'error' },
  CADE33: { code: 'CADE33', message: 'Direccion del emisor requerida', severity: 'error' },
  CADE34: { code: 'CADE34', message: 'Municipio emisor invalido (codigo DANE)', severity: 'error' },
  CADE35: { code: 'CADE35', message: 'Departamento emisor invalido (codigo DANE)', severity: 'error' },
  CADE36: { code: 'CADE36', message: 'Tipo identificacion emisor invalido (31=NIT)', severity: 'error' },
  CADE37: { code: 'CADE37', message: 'Responsabilidad fiscal emisor invalida', severity: 'error' },
  CADE38: { code: 'CADE38', message: 'Regimen fiscal emisor requerido', severity: 'error' },
  CADE39: { code: 'CADE39', message: 'Email emisor recomendado', severity: 'warning' },

  // Adquiriente
  CADE40: { code: 'CADE40', message: 'Identificacion del adquiriente requerida', severity: 'error' },
  CADE41: { code: 'CADE41', message: 'Tipo identificacion adquiriente invalido', severity: 'error' },
  CADE42: { code: 'CADE42', message: 'Nombre del adquiriente requerido', severity: 'error' },
  CADE43: { code: 'CADE43', message: 'Direccion adquiriente requerida', severity: 'error' },
  CADE44: { code: 'CADE44', message: 'Municipio adquiriente invalido', severity: 'error' },
  CADE45: { code: 'CADE45', message: 'Tipo identificacion adquiriente invalido (13,22,31,41,42,43,50,91)', severity: 'error' },

  // Lineas de factura
  CADE50: { code: 'CADE50', message: 'Debe haber al menos una linea de factura', severity: 'error' },
  CADE51: { code: 'CADE51', message: 'Descripcion de linea requerida', severity: 'error' },
  CADE52: { code: 'CADE52', message: 'Cantidad debe ser mayor a 0', severity: 'error' },
  CADE53: { code: 'CADE53', message: 'Precio unitario invalido', severity: 'error' },
  CADE54: { code: 'CADE54', message: 'Codigo unidad medida invalido (94, KG, LT, MT, M2, M3, PR, SET, CJ, PA)', severity: 'error' },
  CADE55: { code: 'CADE55', message: 'Subtotal de linea no coincide (cantidad x precio)', severity: 'error' },
  CADE56: { code: 'CADE56', message: 'Tasa de IVA invalida (0-100)', severity: 'error' },
  CADE57: { code: 'CADE57', message: 'Tasa IVA no estandar (validas: 0, 5, 19)', severity: 'warning' },
  CADE58: { code: 'CADE58', message: 'IVA de linea no coincide (cantidad x precio x tasa)', severity: 'error' },
  CADE59: { code: 'CADE59', message: 'Categoria tributaria invalida (S=Gravado, E=Excluido, Z=Exento, O=No sujeto)', severity: 'error' },

  // Totales
  CADE70: { code: 'CADE70', message: 'Subtotal no coincide con suma de lineas', severity: 'error' },
  CADE71: { code: 'CADE71', message: 'Total IVA no coincide con suma de lineas', severity: 'error' },
  CADE72: { code: 'CADE72', message: 'Total factura no coincide (Subtotal + IVA - Descuentos + Cargos)', severity: 'error' },
  CADE73: { code: 'CADE73', message: 'PayableAmount debe ser igual a TaxInclusiveAmount', severity: 'error' },
  CADE74: { code: 'CADE74', message: 'LegalMonetaryTotal inconsistente con cabecera', severity: 'error' },

  // Referencias (NC/ND)
  CADE80: { code: 'CADE80', message: 'billingReference obligatorio para Nota Credito/Debito', severity: 'error' },
  CADE81: { code: 'CADE81', message: 'billingReference.id requerido', severity: 'error' },
  CADE82: { code: 'CADE82', message: 'billingReference.issueDate requerido', severity: 'error' },
  CADE83: { code: 'CADE83', message: 'Factura referenciada no existe', severity: 'error' },

  // Firma digital
  CADE90: { code: 'CADE90', message: 'Firma digital faltante (ds:Signature)', severity: 'error' },
  CADE91: { code: 'CADE91', message: 'Certificado digital expirado', severity: 'error' },
  CADE92: { code: 'CADE92', message: 'Firma digital invalida (RSA-SHA384)', severity: 'error' },
  CADE93: { code: 'CADE93', message: 'Certificado digital no corresponde al emisor', severity: 'error' },
  CADE94: { code: 'CADE94', message: 'DigestValue no coincide', severity: 'error' },
  CADE95: { code: 'CADE95', message: 'Certificado revocado', severity: 'error' },

  // CUFE/CUDE
  CADE96: { code: 'CADE96', message: 'CUFE/CUDE faltante', severity: 'error' },
  CADE97: { code: 'CADE97', message: 'CUFE/CUDE invalido (SHA-384)', severity: 'error' },
  CADE98: { code: 'CADE98', message: 'CUFE/CUDE no coincide con datos de factura', severity: 'error' },

  // Contingencia
  CADE99: { code: 'CADE99', message: 'Tipo contingencia invalido (03=Facturador, 04=DIAN)', severity: 'error' }
};

// ============================================================
// REGLAS DE NEGOCIO (VLR) - Validaciones de Reglas de Negocio
// ============================================================
export const VLR_RULES = {
  // Identificacion
  VLR01: { code: 'VLR01', rule: 'ID factura debe seguir patron PREFIJO + CONSECUTIVO', check: (data) => data.id && /^[A-Z]{2,4}\d{1,10}$/.test(data.id) },
  VLR02: { code: 'VLR02', rule: 'Fecha emision no futura', check: (data) => !data.issueDate || new Date(data.issueDate) <= new Date() },
  VLR03: { code: 'VLR03', rule: 'Hora emision formato HH:MM:SS', check: (data) => !data.issueTime || /^\d{2}:\d{2}:\d{2}$/.test(data.issueTime) },
  VLR04: { code: 'VLR04', rule: 'Moneda debe ser COP', check: (data) => data.documentCurrencyCode === 'COP' },
  VLR05: { code: 'VLR05', rule: 'Tipo documento valido (01, 02, 03, 04)', check: (data) => ['01','02','03','04'].includes(data.invoiceTypeCode) },

  // Emisor
  VLR10: { code: 'VLR10', rule: 'NIT emisor con DV valido', check: (data) => data.supplier?.identification && data.supplier?.dv },
  VLR11: { code: 'VLR11', rule: 'Tipo identificacion emisor = 31 (NIT)', check: (data) => data.supplier?.tipoIdentificacion === '31' },
  VLR12: { code: 'VLR12', rule: 'Responsabilidades fiscales validas (O-13, O-14, O-15, etc.)', check: (data) => data.supplier?.responsabilidadFiscal?.length > 0 },

  // Adquiriente
  VLR20: { code: 'VLR20', rule: 'Tipo identificacion adquiriente valido', check: (data) => ['13','22','31','41','42','43','50','91'].includes(data.customer?.tipoIdentificacion) },

  // Lineas
  VLR30: { code: 'VLR30', rule: 'Minimo una linea', check: (data) => data.lines?.length > 0 },
  VLR31: { code: 'VLR31', rule: 'Cantidad > 0', check: (data) => data.lines?.every(l => l.quantity > 0) },
  VLR32: { code: 'VLR32', rule: 'Precio unitario >= 0', check: (data) => data.lines?.every(l => l.unitPrice >= 0) },
  VLR33: { code: 'VLR33', rule: 'Unidad medida valida DIAN', check: (data) => data.lines?.every(l => ['94','KG','LT','MT','M2','M3','PR','SET','CJ','PA'].includes(l.unitCode)) },
  VLR34: { code: 'VLR34', rule: 'Subtotal = cantidad x precio', check: (data) => data.lines?.every(l => Math.abs((l.lineExtensionAmount || 0) - (l.quantity * l.unitPrice)) < 0.02) },
  VLR35: { code: 'VLR35', rule: 'Tasa IVA valida (0, 5, 19)', check: (data) => data.lines?.every(l => [0, 5, 19].includes(l.taxRate || 19)) },

  // Tributos
  VLR40: { code: 'VLR40', rule: 'Categoria tributaria S para IVA gravado', check: (data) => data.lines?.every(l => l.taxRate > 0 && l.taxId === '01' ? l.taxCategoryId === 'S' : true) },
  VLR41: { code: 'VLR41', rule: 'Categoria Z (excluido) implica tasa 0', check: (data) => data.lines?.every(l => l.taxCategoryId !== 'Z' || (l.taxRate || 19) === 0) },

  // Totales
  VLR50: { code: 'VLR50', rule: 'Subtotal = suma subtotales lineas', check: (data) => {
    const lines = data.lines || [];
    const calc = lines.reduce((s, l) => s + (l.lineExtensionAmount || l.quantity * l.unitPrice), 0);
    const decl = data.lineExtensionAmount || data.taxExclusiveAmount;
    return !decl || Math.abs(calc - decl) < 0.02;
  } },
  VLR51: { code: 'VLR51', rule: 'Total IVA = suma IVA lineas', check: (data) => {
    const lines = data.lines || [];
    const calc = lines.reduce((s, l) => s + (l.taxAmount || Math.round(l.quantity * l.unitPrice * (l.taxRate || 19) / 100)), 0);
    const decl = data.totalTax || data.totalIva;
    return !decl || Math.abs(calc - decl) < 0.02;
  } },
  VLR52: { code: 'VLR52', rule: 'Total = Subtotal + IVA - Descuentos + Cargos', check: (data) => {
    const lines = data.lines || [];
    const sub = lines.reduce((s, l) => s + (l.lineExtensionAmount || l.quantity * l.unitPrice), 0);
    const tax = lines.reduce((s, l) => s + (l.taxAmount || Math.round(l.quantity * l.unitPrice * (l.taxRate || 19) / 100)), 0);
    const disc = (data.allowancesCharges || []).filter(a => !a.chargeIndicator).reduce((s, a) => s + (a.amount || 0), 0);
    const chg = (data.allowancesCharges || []).filter(a => a.chargeIndicator).reduce((s, a) => s + (a.amount || 0), 0);
    const exp = sub + tax - disc + chg;
    const decl = data.taxInclusiveAmount || data.payableAmount;
    return !decl || Math.abs(exp - decl) < 0.02;
  } },
  VLR53: { code: 'VLR53', rule: 'PayableAmount = TaxInclusiveAmount', check: (data) => !data.payableAmount || !data.taxInclusiveAmount || Math.abs(data.payableAmount - data.taxInclusiveAmount) < 0.01 },

  // NC/ND
  VLR60: { code: 'VLR60', rule: 'Nota Credito/Debito requiere billingReference', check: (data) => !['CreditNote','DebitNote'].includes(data.documentType) || !!data.billingReference },
  VLR61: { code: 'VLR61', rule: 'billingReference con ID y fecha', check: (data) => !data.billingReference || (data.billingReference.id && data.billingReference.issueDate) },

  // CUFE
  VLR70: { code: 'VLR70', rule: 'CUFE presente y valido (SHA-384)', check: (data) => data.cufe && /^[A-F0-9]{96}$/i.test(data.cufe) },

  // Contingencia
  VLR80: { code: 'VLR80', rule: 'Tipo contingencia 03 o 04', check: (data) => !data.contingencyType || ['03','04'].includes(data.contingencyType) }
};

// ============================================================
// CODIGOS DE ACEPTACION/ERROR (CAE) - Contenido
// ============================================================
export const CAE_CODES = {
  // Factura
  CAE01: { code: 'CAE01', field: 'cbc:ID', message: 'ID factura invalido' },
  CAE02: { code: 'CAE02', field: 'cbc:IssueDate', message: 'Fecha emision invalida' },
  CAE03: { code: 'CAE03', field: 'cbc:IssueTime', message: 'Hora emision invalida' },
  CAE04: { code: 'CAE04', field: 'cbc:InvoiceTypeCode', message: 'Tipo documento invalido' },
  CAE05: { code: 'CAE05', field: 'cbc:DocumentCurrencyCode', message: 'Moneda invalida' },
  CAE06: { code: 'CAE06', field: 'cbc:LineCountNumeric', message: 'Conteo lineas invalido' },

  // Emisor
  CAE10: { code: 'CAE10', field: 'cac:AccountingSupplierParty/cac:Party/cac:PartyIdentification/cbc:ID', message: 'NIT emisor invalido' },
  CAE11: { code: 'CAE11', field: 'cac:AccountingSupplierParty/cac:Party/cac:PartyName/cbc:Name', message: 'Razon social emisor requerida' },
  CAE12: { code: 'CAE12', field: 'cac:AccountingSupplierParty/cac:PhysicalLocation/cac:Address', message: 'Direccion emisor incompleta' },

  // Adquiriente
  CAE20: { code: 'CAE20', field: 'cac:AccountingCustomerParty/cac:Party/cac:PartyIdentification/cbc:ID', message: 'Identificacion adquiriente invalida' },
  CAE21: { code: 'CAE21', field: 'cac:AccountingCustomerParty/cac:Party/cac:PartyName/cbc:Name', message: 'Nombre adquiriente requerido' },

  // Lineas
  CAE30: { code: 'CAE30', field: 'cac:InvoiceLine/cbc:ID', message: 'Numero de linea invalido' },
  CAE31: { code: 'CAE31', field: 'cac:InvoiceLine/cbc:InvoicedQuantity', message: 'Cantidad invalida' },
  CAE32: { code: 'CAE32', field: 'cac:InvoiceLine/cbc:LineExtensionAmount', message: 'Subtotal linea incorrecto' },
  CAE33: { code: 'CAE33', field: 'cac:InvoiceLine/cac:Item/cbc:Description', message: 'Descripcion requerida' },
  CAE34: { code: 'CAE34', field: 'cac:InvoiceLine/cac:Item/cac:SellersItemIdentification/cbc:ID', message: 'Codigo producto requerido' },
  CAE35: { code: 'CAE35', field: 'cac:InvoiceLine/cac:Price/cbc:PriceAmount', message: 'Precio unitario invalido' },
  CAE36: { code: 'CAE36', field: 'cac:InvoiceLine/cac:Item/cac:ClassifiedTaxCategory/cbc:ID', message: 'Categoria tributaria invalida' },
  CAE37: { code: 'CAE37', field: 'cac:InvoiceLine/cac:TaxTotal', message: 'Impuestos de linea incorrectos' },

  // Totales
  CAE40: { code: 'CAE40', field: 'cac:LegalMonetaryTotal/cbc:LineExtensionAmount', message: 'Subtotal incorrecto' },
  CAE41: { code: 'CAE41', field: 'cac:LegalMonetaryTotal/cbc:TaxExclusiveAmount', message: 'Base imponible incorrecta' },
  CAE42: { code: 'CAE42', field: 'cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount', message: 'Total con impuestos incorrecto' },
  CAE43: { code: 'CAE43', field: 'cac:LegalMonetaryTotal/cbc:PayableAmount', message: 'Total a pagar incorrecto' },

  // NC/ND
  CAE50: { code: 'CAE50', field: 'cac:BillingReference', message: 'Referencia factura origen requerida' },
  CAE51: { code: 'CAE51', field: 'cac:BillingReference/cac:InvoiceDocumentReference/cbc:ID', message: 'ID factura origen requerido' },
  CAE52: { code: 'CAE52', field: 'cac:BillingReference/cac:InvoiceDocumentReference/cbc:IssueDate', message: 'Fecha factura origen requerida' },

  // Firma
  CAE60: { code: 'CAE60', field: 'ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/ds:Signature', message: 'Firma digital requerida' },
  CAE61: { code: 'CAE61', field: 'ds:Signature/ds:SignedInfo/ds:Reference/ds:DigestValue', message: 'DigestValue incorrecto' },
  CAE62: { code: 'CAE62', field: 'ds:Signature/ds:SignatureValue', message: 'Firma digital invalida' },
  CAE63: { code: 'CAE63', field: 'ds:Signature/ds:KeyInfo/ds:X509Data/ds:X509Certificate', message: 'Certificado digital invalido' },

  // CUFE
  CAE70: { code: 'CAE70', field: 'cbc:UUID', message: 'CUFE/CUDE invalido' },
  CAE71: { code: 'CAE71', field: 'cbc:UUID/@schemeName', message: 'Algoritmo CUFE invalido (debe ser SHA-384)' }
};

// ============================================================
// FUNCION PRINCIPAL DE VALIDACION COMPLETA
// ============================================================

/**
 * Ejecuta validacion completa segun Resolucion 000042
 * @param {Object} invoiceData - Datos de factura
 * @returns {Object} Resultado con codigos CADE, VLR, CAE
 */
export function validateComplete(invoiceData) {
  const results = {
    valid: true,
    cade: [],
    vlr: [],
    cae: [],
    warnings: [],
    summary: { errors: 0, warnings: 0, info: 0 }
  };

  // Ejecutar validaciones CADE (Estructura)
  const cadeResults = validateCADE(invoiceData);
  results.cade = cadeResults.errors;
  results.warnings.push(...cadeResults.warnings);

  // Ejecutar validaciones VLR (Reglas de negocio)
  const vlrResults = validateVLR(invoiceData);
  results.vlr = vlrResults.errors;
  results.warnings.push(...vlrResults.warnings);

  // Ejecutar validaciones CAE (Contenido)
  const caeResults = validateCAE(invoiceData);
  results.cae = caeResults.errors;

  // Consolidar
  const allErrors = [...results.cade, ...results.vlr, ...results.cae];
  results.valid = allErrors.length === 0;
  results.summary = {
    errors: allErrors.length,
    warnings: results.warnings.length,
    info: 0
  };

  return results;
}

/**
 * Valida codigos CADE (Estructura XML)
 */
function validateCADE(data) {
  const errors = [];
  const warnings = [];

  if (!data.id) {
    errors.push({ code: 'CADE20', message: 'ID de factura requerido', severity: 'error' });
  } else if (!/^[A-Z]{2,4}\d{1,10}$/.test(data.id)) {
    warnings.push({ code: 'CADE20', message: 'ID debe seguir patron PREFIJO + CONSECUTIVO', severity: 'warning' });
  }

  if (!data.issueDate || !/^\d{4}-\d{2}-\d{2}$/.test(data.issueDate)) {
    errors.push({ code: 'CADE23', message: 'Fecha emision invalida (YYYY-MM-DD)', severity: 'error' });
  } else {
    if (new Date(data.issueDate) > new Date()) {
      errors.push({ code: 'CADE25', message: 'Fecha emision no puede ser futura', severity: 'error' });
    }
    const diffDays = (new Date() - new Date(data.issueDate)) / (1000 * 60 * 60 * 24);
    if (diffDays > 90) {
      warnings.push({ code: 'CADE26', message: 'Factura con mas de 90 dias de antiguedad', severity: 'warning' });
    }
  }

  if (!data.issueTime || !/^\d{2}:\d{2}:\d{2}$/.test(data.issueTime)) {
    errors.push({ code: 'CADE24', message: 'Hora emision invalida (HH:MM:SS)', severity: 'error' });
  }

  if (!['01', '02', '03', '04'].includes(data.invoiceTypeCode)) {
    errors.push({ code: 'CADE21', message: 'Tipo documento invalido (01, 02, 03, 04)', severity: 'error' });
  }

  if (data.documentCurrencyCode !== 'COP') {
    errors.push({ code: 'CADE22', message: 'Moneda debe ser COP', severity: 'error' });
  }

  return { errors, warnings };
}

/**
 * Valida codigos VLR (Reglas de negocio)
 */
function validateVLR(data) {
  const errors = [];
  const warnings = [];

  // VLR01-VLR05: Identificacion
  if (!data.id) {
    errors.push({ code: 'VLR01', message: 'ID factura requerido', severity: 'error' });
  } else if (!/^[A-Z]{2,4}\d{1,10}$/.test(data.id)) {
    warnings.push({ code: 'VLR01', message: 'ID debe seguir patron PREFIJO + CONSECUTIVO', severity: 'warning' });
  }

  if (!data.issueDate) {
    errors.push({ code: 'VLR02', message: 'Fecha emision requerida', severity: 'error' });
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.issueDate)) {
    errors.push({ code: 'VLR02', message: 'Fecha emision debe ser YYYY-MM-DD', severity: 'error' });
  } else if (new Date(data.issueDate) > new Date()) {
    errors.push({ code: 'VLR02', message: 'Fecha emision no puede ser futura', severity: 'error' });
  }

  if (!data.issueTime) {
    errors.push({ code: 'VLR03', message: 'Hora emision requerida', severity: 'error' });
  } else if (!/^\d{2}:\d{2}:\d{2}$/.test(data.issueTime)) {
    errors.push({ code: 'VLR03', message: 'Hora emision debe ser HH:MM:SS', severity: 'error' });
  }

  if (data.documentCurrencyCode !== 'COP') {
    errors.push({ code: 'VLR04', message: 'Moneda debe ser COP', severity: 'error' });
  }

  if (!['01','02','03','04'].includes(data.invoiceTypeCode)) {
    errors.push({ code: 'VLR05', message: 'Tipo documento invalido (01,02,03,04)', severity: 'error' });
  }

  // VLR10-VLR12: Emisor
  if (!data.supplier?.identification) {
    errors.push({ code: 'VLR10', message: 'NIT emisor requerido', severity: 'error' });
  }
  if (data.supplier?.tipoIdentificacion !== '31') {
    warnings.push({ code: 'VLR11', message: 'Tipo identificacion emisor deberia ser 31 (NIT)', severity: 'warning' });
  }

  // VLR20: Adquiriente
  if (data.customer?.tipoIdentificacion && !['13','22','31','41','42','43','50','91'].includes(data.customer.tipoIdentificacion)) {
    warnings.push({ code: 'VLR20', message: 'Tipo identificacion adquiriente puede no ser valido', severity: 'warning' });
  }

  // Lineas
  if (!data.lines || data.lines.length === 0) {
    errors.push({ code: 'VLR30', message: 'Debe haber al menos una linea', severity: 'error' });
  } else {
    for (let i = 0; i < data.lines.length; i++) {
      const line = data.lines[i];
      const lineNum = i + 1;

      if (!line.description) errors.push({ code: 'VLR31', message: 'Linea ' + lineNum + ': Descripcion requerida', severity: 'error' });
      if (!line.quantity || line.quantity <= 0) errors.push({ code: 'VLR31', message: 'Linea ' + lineNum + ': Cantidad > 0', severity: 'error' });
      if (!line.unitPrice || line.unitPrice < 0) errors.push({ code: 'VLR32', message: 'Linea ' + lineNum + ': Precio unitario invalido', severity: 'error' });
      if (!['94','KG','LT','MT','M2','M3','PR','SET','CJ','PA'].includes(line.unitCode)) warnings.push({ code: 'VLR33', message: 'Linea ' + lineNum + ': Unidad ' + line.unitCode + ' no estandar DIAN', severity: 'warning' });

      const expectedSub = line.quantity * line.unitPrice;
      if (line.lineExtensionAmount && Math.abs(line.lineExtensionAmount - expectedSub) > 0.02) {
        errors.push({ code: 'VLR34', message: 'Linea ' + lineNum + ': Subtotal no coincide (calc ' + expectedSub + ' vs ' + line.lineExtensionAmount + ')', severity: 'error' });
      }

      if (![0, 5, 19].includes(line.taxRate || 19)) warnings.push({ code: 'VLR35', message: 'Linea ' + lineNum + ': Tasa IVA ' + line.taxRate + '% no estandar', severity: 'warning' });
    }

    // VLR40-VLR41: Tributos
    if (data.lines) {
      for (let i = 0; i < data.lines.length; i++) {
        const line = data.lines[i];
        const lineNum = i + 1;
        if ((line.taxRate || 19) > 0 && line.taxId === '01' && line.taxCategoryId !== 'S') {
          warnings.push({ code: 'VLR40', message: 'Linea ' + lineNum + ': Categoria deberia ser S para IVA gravado', severity: 'warning' });
        }
        if (line.taxCategoryId === 'Z' && line.taxRate > 0) {
          errors.push({ code: 'VLR41', message: 'Linea ' + lineNum + ': Categoria Z (exento) no puede tener tasa > 0', severity: 'error' });
        }
      }
    }

    // VLR50-VLR53: Totales
    if (data.lines) {
      const lines = data.lines;
      const calcSub = lines.reduce((s, l) => s + (l.lineExtensionAmount || l.quantity * l.unitPrice), 0);
      const calcTax = lines.reduce((s, l) => s + (l.taxAmount || Math.round(l.quantity * l.unitPrice * (l.taxRate || 19) / 100)), 0);
      const declSub = data.lineExtensionAmount || data.taxExclusiveAmount;
      if (declSub && Math.abs(calcSub - declSub) > 0.02) {
        errors.push({ code: 'VLR50', message: 'Subtotal no coincide: calc ' + calcSub.toFixed(2) + ' vs decl ' + declSub.toFixed(2), severity: 'error' });
      }

      const declTax = data.totalTax || data.totalIva;
      if (declTax && Math.abs(calcTax - declTax) > 0.02) {
        errors.push({ code: 'VLR51', message: 'Total IVA no coincide: calc ' + calcTax.toFixed(2) + ' vs decl ' + declTax.toFixed(2), severity: 'error' });
      }

      const disc = (data.allowancesCharges || []).filter(a => !a.chargeIndicator).reduce((s, a) => s + (a.amount || 0), 0);
      const chg = (data.allowancesCharges || []).filter(a => a.chargeIndicator).reduce((s, a) => s + (a.amount || 0), 0);
      const expTot = calcSub + calcTax - disc + chg;
      const declTot = data.taxInclusiveAmount || data.payableAmount;
      if (declTot && Math.abs(expTot - declTot) > 0.02) {
        errors.push({ code: 'VLR52', message: 'Total no coincide: esp ' + expTot.toFixed(2) + ' vs decl ' + declTot.toFixed(2), severity: 'error' });
      }

      if (data.payableAmount && data.taxInclusiveAmount && Math.abs(data.payableAmount - data.taxInclusiveAmount) > 0.01) {
        errors.push({ code: 'VLR53', message: 'PayableAmount debe igual TaxInclusiveAmount', severity: 'error' });
      }
    }

    // NC/ND
    if (['CreditNote','DebitNote'].includes(data.documentType)) {
      if (!data.billingReference) {
        errors.push({ code: 'VLR60', message: 'billingReference obligatorio para NC/ND', severity: 'error' });
      } else {
        if (!data.billingReference.id) errors.push({ code: 'VLR61', message: 'billingReference.id requerido', severity: 'error' });
        if (!data.billingReference.issueDate) errors.push({ code: 'VLR61', message: 'billingReference.issueDate requerido', severity: 'error' });
      }
    }

    // CUFE
    if (data.cufe && !/^[A-F0-9]{96}$/i.test(data.cufe)) {
      warnings.push({ code: 'VLR70', message: 'CUFE formato invalido (debe ser SHA-384 96 chars hex)', severity: 'warning' });
    }

    // Contingencia
    if (data.contingencyType && !['03','04'].includes(data.contingencyType)) {
      errors.push({ code: 'VLR80', message: 'Tipo contingencia invalido (03=Facturador, 04=DIAN)', severity: 'error' });
    }
  }

  return { errors, warnings };
}

/**
 * Valida codigos CAE (Contenido)
 */
function validateCAE(data) {
  const errors = [];
  const warnings = [];

  // CAE validations would go here
  return { errors, warnings };
}

export default {
  CADE_CODES,
  VLR_RULES,
  CAE_CODES,
  validateComplete,
  validateCADE,
  validateVLR
};