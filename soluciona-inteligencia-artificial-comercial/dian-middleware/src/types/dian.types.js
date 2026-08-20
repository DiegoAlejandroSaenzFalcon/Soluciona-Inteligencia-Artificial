/**
 * Tipos TypeScript/JSDoc para DIAN Middleware
 * Basados en UBL 2.1, Anexo Técnico 1.9, Resolución 000042
 */

/**
 * @typedef {Object} DianConfig
 * @property {string} nit - NIT del facturador (sin dígito de verificación)
 * @property {string} dv - Dígito de verificación del NIT
 * @property {string} razonSocial - Razón social del facturador
 * @property {string} nombreComercial - Nombre comercial
 * @property {string} direccion - Dirección física
 * @property {string} municipio - Código DANE municipio (ej: 11001)
 * @property {string} departamento - Código DANE departamento (ej: 11)
 * @property {string} codigoPostal - Código postal
 * @property {string} telefono - Teléfono de contacto
 * @property {string} email - Email de notificaciones
 * @property {string} responsabilidadFiscal - Códigos responsabilidad (ej: ['O-13', 'O-14', 'O-15'])
 * @property {string} regimenFiscal - Régimen fiscal (ej: 'Régimen Común')
 * @property {string} ambiente - 'habilitacion' | 'produccion'
 * @property {string} certPath - Ruta al certificado .p12
 * @property {string} certPass - Password del certificado
 * @property {string} codigoSoftware - Código software DIAN
 * @property {string} pinSoftware - PIN software DIAN
 * @property {string} prefijo - Prefijo autorizado (ej: 'SETP')
 * @property {number} resolucionNumero - Número de resolución
 * @property {string} resolucionFecha - Fecha resolución (YYYY-MM-DD)
 * @property {number} resolucionPrefijo - Prefijo resolución
 * @property {number} resolucionDesde - Rango desde
 * @property {number} resolucionHasta - Rango hasta
 * @property {string} wsdlUrl - URL WSDL DIAN (ambiente)
 */

/**
 * @typedef {Object} Party
 * @property {string} identification - NIT o identificación
 * @property {string} dv - Dígito verificación
 * @property {string} name - Nombre/Razón social
 * @property {string} tipoIdentificacion - Código tipo ID DIAN (31=NIT, 13=CC, 22=CE, etc.)
 * @property {string} direccion - Dirección
 * @property {string} municipio - Código DANE municipio
 * @property {string} departamento - Código DANE departamento
 * @property {string} codigoPostal - Código postal
 * @property {string} telefono - Teléfono
 * @property {string} email - Email
 * @property {string[]} responsabilidadFiscal - Códigos responsabilidad
 * @property {string} regimenFiscal - Régimen fiscal
 */

/**
 * @typedef {Object} InvoiceLine
 * @property {number} lineNumber - Número de línea
 * @property {string} itemCode - Código producto
 * @property {string} description - Descripción
 * @property {number} quantity - Cantidad
 * @property {string} unitCode - Unidad medida (UN=Unidad, KG=Kilo, etc.)
 * @property {number} unitPrice - Precio unitario (sin IVA)
 * @property {number} lineExtensionAmount - Subtotal (cantidad * precio)
 * @property {number} taxRate - Tasa IVA (0, 5, 19)
 * @property {number} taxAmount - Valor IVA línea
 * @property {string} taxId - ID tributo (01=IVA, 02=ICA, 03=Impuesto al consumo)
 * @property {boolean} isExcluded - Si está excluido de IVA
 * @property {string} codigoProducto - Código interno
 */

/**
 * @typedef {Object} PaymentForm
 * @property {string} formCode - Forma pago (1=Contado, 2=Crédito)
 * @property {string} methodCode - Medio pago (10=Efectivo, 20=Cheque, 42=Transferencia, etc.)
 * @property {string} dueDate - Fecha vencimiento (si crédito)
 * @property {number} amount - Valor a pagar
 */

/**
 * @typedef {Object} InvoiceData
 * @property {string} id - ID factura (prefijo + número, ej: 'SETP123')
 * @property {string} issueDate - Fecha emisión (YYYY-MM-DD)
 * @property {string} issueTime - Hora emisión (HH:MM:SS)
 * @property {string} invoiceTypeCode - Tipo documento (01=Factura, 02=Nota Crédito, 03=Nota Débito)
 * @property {string} documentCurrencyCode - Moneda (COP)
 * @property {Party} supplier - Facturador (emisor)
 * @property {Party} customer - Adquiriente (cliente)
 * @property {InvoiceLine[]} lines - Líneas de factura
 * @property {PaymentForm[]} paymentForms - Formas de pago
 * @property {number} lineExtensionAmount - Subtotal total
 * @property {number} taxExclusiveAmount - Base imponible
 * @property {number} taxInclusiveAmount - Total con impuestos
 * @property {number} payableAmount - Total a pagar
 * @property {number} totalTax - Total impuestos
 * @property {Object} allowancesCharges - Descuentos/cargos globales
 * @property {string} note - Observaciones
 * @property {string} orderReference - Referencia orden compra
 */

/**
 * @typedef {Object} CreditNoteData
 * @property {string} id - ID nota crédito
 * @property {string} issueDate - Fecha emisión
 * @property {string} issueTime - Hora emisión
 * @property {string} noteTypeCode - Tipo nota (1=Devolución, 2=Descuento, 3=Rebaja, 4=Anulación)
 * @property {string} referenceInvoiceId - ID factura referenciada
 * @property {string} referenceInvoiceDate - Fecha factura referenciada
 * @property {Party} supplier - Facturador
 * @property {Party} customer - Adquiriente
 * @property {InvoiceLine[]} lines - Líneas
 * @property {number} lineExtensionAmount - Subtotal
 * @property {number} taxExclusiveAmount - Base imponible
 * @property {number} taxInclusiveAmount - Total con impuestos
 * @property {number} payableAmount - Total nota
 * @property {string} reason - Motivo nota crédito
 * @property {string} reasonCode - Código motivo DIAN
 */

/**
 * @typedef {Object} DebitNoteData
 * @property {string} id - ID nota débito
 * @property {string} issueDate - Fecha emisión
 * @property {string} issueTime - Hora emisión
 * @property {string} noteTypeCode - Tipo nota (1=Intereses, 2=Gastos, 3=Corrección precio, 4=Otros)
 * @property {string} referenceInvoiceId - ID factura referenciada
 * @property {Party} supplier - Facturador
 * @property {Party} customer - Adquiriente
 * @property {InvoiceLine[]} lines - Líneas
 * @property {number} lineExtensionAmount - Subtotal
 * @property {number} taxExclusiveAmount - Base imponible
 * @property {number} taxInclusiveAmount - Total con impuestos
 * @property {number} payableAmount - Total nota
 * @property {string} reason - Motivo nota débito
 * @property {string} reasonCode - Código motivo DIAN
 */

/**
 * @typedef {Object} SignedDocument
 * @property {string} xml - XML original sin firmar
 * @property {string} signedXml - XML con firma embebida
 * @property {string} cufe - CUFE/CUDE generado
 * @property {string} qrCode - Base64 QR code
 * @property {string} cufeBase - String base para CUFE (sin hash)
 */

/**
 * @typedef {Object} DianResponse
 * @property {boolean} success - Éxito envío
 * @property {string} status - Estado DIAN (Aprobado, Rechazado, En Proceso)
 * @property {string} cufe - CUFE devuelto
 * @property {string} qrCode - QR devuelto
 * @property {string[]} errors - Errores de validación
 * @property {string[]} warnings - Advertencias
 * @property {string} rawResponse - XML respuesta crudo
 * @property {string} transactionId - ID transacción DIAN
 */

/**
 * @typedef {Object} HabilitacionSet
 * @property {number} facturasRequeridas - 60
 * @property {number} notasCreditoRequeridas - 20
 * @property {number} notasDebitoRequeridas - 20
 * @property {Object[]} facturas - Facturas enviadas
 * @property {Object[]} notasCredito - NC enviadas
 * @property {Object[]} notasDebito - ND enviadas
 * @property {boolean} completado - Si pasó habilitación
 */

export type {
  DianConfig, Party, InvoiceLine, PaymentForm, InvoiceData,
  CreditNoteData, DebitNoteData, SignedDocument, DianResponse, HabilitacionSet
};