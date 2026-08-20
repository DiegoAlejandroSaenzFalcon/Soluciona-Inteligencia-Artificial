/**
 * DIAN Middleware - Punto de entrada principal
 * Facturación Electrónica Colombia - Software Propio
 */

import { config, validateConfig, isHabilitacion } from './config/dian.config.js';
import { buildInvoice, buildCreditNote, buildDebitNote } from './ubl/index.js';
import { generateCufe, generateCude, extractCufeParams, signXml, loadPkcs12, verifyXmlSignature } from './security/signature.js';
import { createDianClient } from './soap/dian-client.js';
import { validateInvoice, validateXmlSchema, validateHabilitacionSet } from './validation/dian-validator.js';
import { validateComplete } from './validation/dian-rules.js';
import { generateInvoicePdf, generateCreditNotePdf, generateDebitNotePdf } from './pdf/generator.js';
import { HabilitacionManager, runHabilitacion, MODOS_HABILITACION, MODO_DEFAULT } from './habilitacion/manager.js';

/**
 * Clase principal DIAN Middleware
 */
export class DianMiddleware {
  constructor(options = {}) {
    this.options = options;
    this.certData = null;
    this.dianClient = null;
    this.initialized = false;
  }

  /**
   * Inicializa el middleware (solo carga certificado, SOAP es lazy)
   */
  async initialize() {
    if (this.initialized) return;

    validateConfig();
    this.certData = loadPkcs12(config.certPath, config.certPass);

    this.initialized = true;
    console.log('[DIAN-MIDDLEWARE] Inicializado correctamente');
  }

  /**
   * Inicializa el cliente SOAP solo cuando se necesita (envio/consulta)
   */
  async ensureSoapClient() {
    if (!this.dianClient) {
      this.dianClient = createDianClient();
    }
    await this.dianClient.initialize();
    return this.dianClient;
  }

  /**
   * Procesa factura completa: valida, genera CUFE, firma, envía a DIAN, genera PDF
   * @param {Object} invoiceData - Datos de la factura
   * @param {Object} options - Opciones (submit, generatePdf)
   * @returns {Promise<Object>} Resultado completo
   */
  async processInvoice(invoiceData, options = {}) {
    await this.initialize();

    const { submit = true, generatePdf: genPdf = true } = options;

    // 1. Validar datos
    const validation = validateInvoice(invoiceData);
    if (!validation.valid) {
      throw new Error(`Validación fallida: ${validation.errors.join(', ')}`);
    }

    // 2. Calcular totales si no vienen
    this.calculateTotals(invoiceData);

    // 3. Generar CUFE usando parámetros del anexo técnico
    const cufeParams = extractCufeParams(invoiceData);
    cufeParams.tipoAmbiente = isHabilitacion() ? '2' : '1'; // 2=Pruebas, 1=Producción
    const cufe = generateCufe(cufeParams);

    // 4. Construir XML UBL
    const xml = buildInvoice(invoiceData);

    // 5. Firmar XML
    const signedXml = signXml(xml, this.certData, 'Invoice');

    // 6. Enviar a DIAN (opcional)
    let dianResponse = { cufe, status: 'Generado localmente' };
    if (submit) {
      try {
        const client = await this.ensureSoapClient();
        const dianResult = await client.sendInvoice(signedXml, {
          id: invoiceData.id,
          fileName: `${invoiceData.id}.zip`
        });
        dianResponse = { ...dianResponse, ...dianResult };
      } catch (error) {
        console.error('[DIAN] Error enviando:', error.message);
        dianResponse.error = error.message;
        dianResponse.status = 'Error envío';
      }
    }

    // 7. Generar PDF (opcional)
    let pdfBuffer = null;
    if (genPdf) {
      pdfBuffer = await generateInvoicePdf(invoiceData, dianResponse);
    }

    return {
      success: dianResponse.success !== false,
      id: invoiceData.id,
      cufe,
      xml: signedXml,
      pdf: pdfBuffer,
      dianResponse,
      validationWarnings: validation.warnings
    };
  }

  /**
   * Procesa Nota Crédito
   */
  async processCreditNote(ncData, options = {}) {
    await this.initialize();

    const { submit = true, generatePdf: genPdf = true } = options;

    const validation = validateInvoice(ncData);
    if (!validation.valid) {
      throw new Error(`Validación NC fallida: ${validation.errors.join(', ')}`);
    }

    this.calculateTotals(ncData);

    const cufeParams = extractCufeParams(ncData);
    cufeParams.tipoAmbiente = isHabilitacion() ? '2' : '1';
    const cude = generateCude(cufeParams);

    const xml = buildCreditNote(ncData);
    const signedXml = signXml(xml, this.certData, 'CreditNote');

    let dianResponse = { cufe: cude, status: 'Generado localmente' };
    if (submit) {
      try {
        const client = await this.ensureSoapClient();
        const result = await client.sendCreditNote(signedXml, {
          id: ncData.id,
          fileName: `${ncData.id}.zip`
        });
        dianResponse = { ...dianResponse, ...result };
      } catch (error) {
        dianResponse.error = error.message;
        dianResponse.status = 'Error envío';
      }
    }

    let pdfBuffer = null;
    if (genPdf) {
      pdfBuffer = await generateCreditNotePdf(ncData, dianResponse);
    }

    return {
      success: dianResponse.success !== false,
      id: ncData.id,
      cude,
      xml: signedXml,
      pdf: pdfBuffer,
      dianResponse
    };
  }

  /**
   * Procesa Nota Débito
   */
  async processDebitNote(ndData, options = {}) {
    await this.initialize();

    const { submit = true, generatePdf: genPdf = true } = options;

    const validation = validateInvoice(ndData);
    if (!validation.valid) {
      throw new Error(`Validación ND fallida: ${validation.errors.join(', ')}`);
    }

    this.calculateTotals(ndData);

    const cufeParams = extractCufeParams(ndData);
    cufeParams.tipoAmbiente = isHabilitacion() ? '2' : '1';
    const cude = generateCude(cufeParams);

    const xml = buildDebitNote(ndData);
    const signedXml = signXml(xml, this.certData, 'DebitNote');

    let dianResponse = { cufe: cude, status: 'Generado localmente' };
    if (submit) {
      try {
        const client = await this.ensureSoapClient();
        const result = await client.sendDebitNote(signedXml, {
          id: ndData.id,
          fileName: `${ndData.id}.zip`
        });
        dianResponse = { ...dianResponse, ...result };
      } catch (error) {
        dianResponse.error = error.message;
        dianResponse.status = 'Error envío';
      }
    }

    let pdfBuffer = null;
    if (genPdf) {
      pdfBuffer = await generateDebitNotePdf(ndData, dianResponse);
    }

    return {
      success: dianResponse.success !== false,
      id: ndData.id,
      cude,
      xml: signedXml,
      pdf: pdfBuffer,
      dianResponse
    };
  }

  /**
   * Consulta estado de documento en DIAN
   */
  async getDocumentStatus(trackingId) {
    await this.initialize();
    const client = await this.ensureSoapClient();
    return client.getStatus(trackingId);
  }

  /**
   * Consulta estado de ZIP en DIAN
   */
  async getDocumentStatusZip(trackingId) {
    await this.initialize();
    const client = await this.ensureSoapClient();
    return client.getStatusZip(trackingId);
  }

  /**
   * Consulta rangos de numeración en DIAN
   */
  async getNumberingRange() {
    await this.initialize();
    const client = await this.ensureSoapClient();
    return client.getNumberingRange();
  }

  /**
   * Obtiene emails de intercambio de DIAN
   */
  async getExchangeEmails() {
    await this.initialize();
    const client = await this.ensureSoapClient();
    return client.getExchangeEmails();
  }

  /**
   * Ejecuta proceso de habilitación completo
   */
  async runHabilitacion(options = {}) {
    return runHabilitacion(options);
  }

  /**
   * Verifica firma de XML recibido
   */
  verifySignature(signedXml) {
    return verifyXmlSignature(signedXml);
  }

  // ===== Helpers =====

  /**
   * Calcula totales de factura
   */
  calculateTotals(data) {
    const lines = data.lines || [];

    const lineExtensionAmount = lines.reduce((sum, l) => sum + (l.lineExtensionAmount || l.quantity * l.unitPrice), 0);
    const taxAmount = lines.reduce((sum, l) => sum + (l.taxAmount || Math.round(l.quantity * l.unitPrice * (l.taxRate || 19) / 100)), 0);
    const discounts = (data.allowancesCharges || []).filter(a => !a.chargeIndicator).reduce((s, a) => s + (a.amount || 0), 0);
    const charges = (data.allowancesCharges || []).filter(a => a.chargeIndicator).reduce((s, a) => s + (a.amount || 0), 0);

    const taxExclusiveAmount = lineExtensionAmount - discounts + charges;
    const taxInclusiveAmount = taxExclusiveAmount + taxAmount;
    const payableAmount = taxInclusiveAmount;

    data.legalMonetaryTotal = {
      lineExtensionAmount,
      taxExclusiveAmount,
      taxInclusiveAmount,
      payableAmount,
      allowanceTotalAmount: discounts,
      chargeTotalAmount: charges
    };

    // Campos directos usados por los builders UBL
    data.lineExtensionAmount = data.lineExtensionAmount ?? lineExtensionAmount;
    data.taxExclusiveAmount = taxExclusiveAmount;
    data.taxInclusiveAmount = taxInclusiveAmount;
    data.payableAmount = payableAmount;
    data.totalTax = data.totalTax ?? taxAmount;
  }

  /**
   * Extrae consecutivo del ID
   */
  extractConsecutive(id) {
    const prefix = config.prefijo;
    if (id.startsWith(prefix)) {
      return parseInt(id.substring(prefix.length), 10);
    }
    return parseInt(id, 10) || 1;
  }
}

/**
 * Factory function
 */
export function createDianMiddleware(options = {}) {
  return new DianMiddleware(options);
}

// Exportar todo
export {
  config,
  buildInvoice,
  buildCreditNote,
  buildDebitNote,
  generateCufe,
  generateCude,
  extractCufeParams,
  signXml,
  loadPkcs12,
  verifyXmlSignature,
  createDianClient,
  validateInvoice,
  validateXmlSchema,
  validateHabilitacionSet,
  validateComplete,
  generateInvoicePdf,
  generateCreditNotePdf,
  generateDebitNotePdf,
  HabilitacionManager,
  runHabilitacion,
  MODOS_HABILITACION,
  MODO_DEFAULT,
  isHabilitacion
};