/**
 * Habilitación Manager - Gestor del set de pruebas DIAN
 * Modos de operación según Resolución 000042 / Anexo Técnico:
 * - software-propio: 60 Facturas + 20 NC + 20 ND
 * - proveedor-tecnologico: 6 Facturas + 2 NC + 2 ND
 * - facturacion-gratuita: 2 Facturas + 1 NC + 1 ND
 */

import { v4 as uuidv4 } from 'uuid';
import { validateHabilitacionSet } from '../validation/dian-validator.js';
import { generateInvoicePdf } from '../pdf/generator.js';
import { buildInvoice, buildCreditNote, buildDebitNote } from '../ubl/index.js';
import { generateCufe, extractCufeParams, signXml, loadPkcs12 } from '../security/signature.js';
import { createDianClient } from '../soap/dian-client.js';
import { config, isHabilitacion } from '../config/dian.config.js';

export const MODOS_HABILITACION = {
  'software-propio': { invoices: 60, creditNotes: 20, debitNotes: 20, label: 'Software Propio' },
  'proveedor-tecnologico': { invoices: 6, creditNotes: 2, debitNotes: 2, label: 'Proveedor Tecnológico' },
  'facturacion-gratuita': { invoices: 2, creditNotes: 1, debitNotes: 1, label: 'Facturación Gratuita DIAN' }
};

export const MODO_DEFAULT = 'software-propio';

/**
 * Clase para gestionar el proceso de habilitación DIAN
 */
export class HabilitacionManager {
  constructor(options = {}) {
    const mode = options.mode || MODO_DEFAULT;
    if (!MODOS_HABILITACION[mode]) {
      throw new Error(`Modo de operación inválido: ${mode}. Válidos: ${Object.keys(MODOS_HABILITACION).join(', ')}`);
    }

    this.options = {
      outputDir: options.outputDir || './habilitacion-output',
      testMode: options.testMode !== false,
      mode,
      counts: MODOS_HABILITACION[mode],
      ...options
    };

    this.results = {
      invoices: [],
      creditNotes: [],
      debitNotes: [],
      errors: [],
      startTime: null,
      endTime: null
    };

    this.dianClient = null;
    this.certData = null;
  }

  /**
   * Inicializa el manager (SOAP es lazy, solo para submit)
   */
  async initialize() {
    if (!isHabilitacion()) {
      throw new Error('Habilitación solo disponible en ambiente de habilitación');
    }

    this.certData = loadPkcs12(config.certPath, config.certPass);

    console.log('[HABILITACION] Manager inicializado en ambiente de habilitación');
  }

  /**
   * Inicializa cliente SOAP solo cuando se necesita (submit)
   */
  async ensureSoapClient() {
    if (!this.dianClient) {
      this.dianClient = createDianClient();
    }
    await this.dianClient.initialize();
    return this.dianClient;
  }

  /**
   * Genera set completo de pruebas
   * @param {Object} testData - Datos de prueba predefinidos
   * @returns {Promise<Object>} Set de pruebas generado
   */
  async generateTestSet(testData = {}) {
    this.results.startTime = new Date();

    const { invoices: nInvoices, creditNotes: nCreditNotes, debitNotes: nDebitNotes, label } = this.options.counts;

    console.log(`[HABILITACION] Generando set de pruebas (${label}: ${nInvoices}F + ${nCreditNotes}NC + ${nDebitNotes}ND)...`);

    // 1. Generar Facturas
    console.log(`[HABILITACION] Generando ${nInvoices} facturas...`);
    for (let i = 1; i <= nInvoices; i++) {
      const invoice = await this.generateTestInvoice(i, testData.invoiceTemplate);
      this.results.invoices.push(invoice);
    }

    // 2. Generar Notas Crédito
    console.log(`[HABILITACION] Generando ${nCreditNotes} notas crédito...`);
    for (let i = 1; i <= nCreditNotes; i++) {
      const nc = await this.generateTestCreditNote(i, testData.creditNoteTemplate);
      this.results.creditNotes.push(nc);
    }

    // 3. Generar Notas Débito
    console.log(`[HABILITACION] Generando ${nDebitNotes} notas débito...`);
    for (let i = 1; i <= nDebitNotes; i++) {
      const nd = await this.generateTestDebitNote(i, testData.debitNoteTemplate);
      this.results.debitNotes.push(nd);
    }

    // Validar set completo
    const validation = validateHabilitacionSet(this.results, this.options.counts);
    if (!validation.valid) {
      this.results.errors.push(...validation.errors);
    }

    this.results.endTime = new Date();
    console.log('[HABILITACION] Set generado:', validation.counts);

    return this.results;
  }

  /**
   * Genera factura de prueba
   */
  async generateTestInvoice(index, template = {}) {
    const consecutive = config.resolucionDesde + index - 1;
    const id = `${config.prefijo}${String(consecutive).padStart(10, '0')}`;

    const invoiceData = {
      id,
      issueDate: template.issueDate || new Date().toISOString().split('T')[0],
      issueTime: template.issueTime || new Date().toTimeString().split(' ')[0],
      invoiceTypeCode: '01',
      documentCurrencyCode: 'COP',
      supplier: template.supplier || this.getDefaultSupplier(),
      customer: template.customer || this.getTestCustomer(index),
      lines: template.lines || this.getTestLines(index),
      note: template.note || `Factura de prueba habilitación #${index}`,
      orderReference: template.orderReference
    };

    // Calcular totales
    this.calculateTotals(invoiceData);

    // Generar CUFE (parametros del anexo tecnico)
    const cufeParams = extractCufeParams(invoiceData);
    cufeParams.tipoAmbiente = isHabilitacion() ? '2' : '1';
    const cufe = generateCufe(cufeParams);

    // Construir XML
    const xml = buildInvoice(invoiceData);

    // Firmar XML
    const signedXml = signXml(xml, this.certData, 'Invoice');

    // Generar PDF
    const pdfBuffer = await generateInvoicePdf(invoiceData, { cufe, status: 'Pendiente' });

    return {
      id,
      xml: signedXml,
      pdf: pdfBuffer,
      cufe,
      consecutive,
      data: invoiceData
    };
  }

  /**
   * Genera Nota Crédito de prueba
   */
  async generateTestCreditNote(index, template = {}) {
    const consecutive = config.resolucionDesde + 1000 + index - 1;
    const id = `${config.prefijo}${String(consecutive).padStart(10, '0')}`;

    // Referenciar una factura existente
    const refInvoice = this.results.invoices[index - 1] || this.results.invoices[0];

    const ncData = {
      id,
      issueDate: template.issueDate || new Date().toISOString().split('T')[0],
      issueTime: template.issueTime || new Date().toTimeString().split(' ')[0],
      noteTypeCode: '1', // Devolución
      documentCurrencyCode: 'COP',
      supplier: template.supplier || this.getDefaultSupplier(),
      customer: template.customer || this.getTestCustomer(index),
      lines: template.lines || this.getTestLines(index, true), // Cantidades negativas para NC
      reason: template.reason || `Devolución prueba #${index}`,
      billingReference: {
        id: refInvoice.id,
        uuid: refInvoice.cufe,
        issueDate: refInvoice.data.issueDate
      },
      note: template.note || `Nota Crédito prueba #${index}`
    };

    this.calculateTotals(ncData);

    const cufeParams = extractCufeParams(ncData);
    cufeParams.tipoAmbiente = isHabilitacion() ? '2' : '1';
    const cufe = generateCufe(cufeParams);

    const xml = buildCreditNote(ncData);
    const signedXml = signXml(xml, this.certData, 'CreditNote');
    const pdfBuffer = await generateInvoicePdf(ncData, { cufe, status: 'Pendiente' }, { documentType: 'CreditNote' });

    return {
      id,
      xml: signedXml,
      pdf: pdfBuffer,
      cufe,
      consecutive,
      data: ncData
    };
  }

  /**
   * Genera Nota Débito de prueba
   */
  async generateTestDebitNote(index, template = {}) {
    const consecutive = config.resolucionDesde + 2000 + index - 1;
    const id = `${config.prefijo}${String(consecutive).padStart(10, '0')}`;

    const refInvoice = this.results.invoices[index - 1] || this.results.invoices[0];

    const ndData = {
      id,
      issueDate: template.issueDate || new Date().toISOString().split('T')[0],
      issueTime: template.issueTime || new Date().toTimeString().split(' ')[0],
      noteTypeCode: '3', // Corrección precio
      documentCurrencyCode: 'COP',
      supplier: template.supplier || this.getDefaultSupplier(),
      customer: template.customer || this.getTestCustomer(index),
      lines: template.lines || this.getTestLines(index),
      reason: template.reason || `Corrección precio prueba #${index}`,
      billingReference: {
        id: refInvoice.id,
        uuid: refInvoice.cufe,
        issueDate: refInvoice.data.issueDate
      },
      note: template.note || `Nota Débito prueba #${index}`
    };

    this.calculateTotals(ndData);

    const cufeParams = extractCufeParams(ndData);
    cufeParams.tipoAmbiente = isHabilitacion() ? '2' : '1';
    const cufe = generateCufe(cufeParams);

    const xml = buildDebitNote(ndData);
    const signedXml = signXml(xml, this.certData, 'DebitNote');
    const pdfBuffer = await generateInvoicePdf(ndData, { cufe, status: 'Pendiente' }, { documentType: 'DebitNote' });

    return {
      id,
      xml: signedXml,
      pdf: pdfBuffer,
      cufe,
      consecutive,
      data: ndData
    };
  }

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
   * Envía el set completo a DIAN
   */
  async submitToDian() {
    console.log('[HABILITACION] Enviando set de pruebas a DIAN...');

    const testSet = {
      invoices: this.results.invoices.map(i => ({ fileName: `${i.id}.xml`, xml: i.xml })),
      creditNotes: this.results.creditNotes.map(nc => ({ fileName: `${nc.id}.xml`, xml: nc.xml })),
      debitNotes: this.results.debitNotes.map(nd => ({ fileName: `${nd.id}.xml`, xml: nd.xml }))
    };

    try {
      const client = await this.ensureSoapClient();
      const response = await client.sendTestSet(testSet);
      console.log('[HABILITACION] Respuesta DIAN:', response);
      return response;
    } catch (error) {
      console.error('[HABILITACION] Error enviando:', error);
      throw error;
    }
  }

  /**
   * Obtiene reporte final
   */
  getReport() {
    return {
      summary: {
        mode: this.options.mode,
        modeLabel: this.options.counts.label,
        invoices: this.results.invoices.length,
        creditNotes: this.results.creditNotes.length,
        debitNotes: this.results.debitNotes.length,
        total: this.results.invoices.length + this.results.creditNotes.length + this.results.debitNotes.length,
        duration: this.results.endTime ? this.results.endTime - this.results.startTime : null
      },
      validation: validateHabilitacionSet(this.results, this.options.counts),
      errors: this.results.errors,
      cufeList: {
        invoices: this.results.invoices.map(i => ({ id: i.id, cufe: i.cufe })),
        creditNotes: this.results.creditNotes.map(nc => ({ id: nc.id, cufe: nc.cufe })),
        debitNotes: this.results.debitNotes.map(nd => ({ id: nd.id, cufe: nd.cufe }))
      }
    };
  }

  // ===== Helpers de datos de prueba =====

  getDefaultSupplier() {
    return {
      identification: config.nit,
      dv: config.dv,
      name: config.razonSocial,
      tipoIdentificacion: '31',
      direccion: config.direccion,
      municipio: config.municipio,
      departamento: config.departamento,
      codigoPostal: config.codigoPostal,
      telefono: config.telefono,
      email: config.email,
      responsabilidadFiscal: config.responsabilidadFiscal,
      regimenFiscal: config.regimenFiscal
    };
  }

  getTestCustomer(index) {
    // Generar NIT de prueba válido (usar NIT de prueba DIAN: 900000000-1)
    const testNits = [
      '900000000', '900000001', '900000002', '900000003', '900000004',
      '900000005', '900000006', '900000007', '900000008', '900000009'
    ];

    const nit = testNits[(index - 1) % testNits.length];
    return {
      identification: nit,
      dv: '1',
      name: `Cliente Prueba ${index}`,
      tipoIdentificacion: '31',
      direccion: `Calle ${index} # ${index * 10}-${index * 5}`,
      municipio: '11001',
      departamento: '11',
      codigoPostal: '110111',
      telefono: `30000000${index.toString().padStart(2, '0')}`,
      email: `cliente${index}@test.com`
    };
  }

  getTestLines(index, isCreditNote = false) {
    const products = [
      { code: 'PROD001', name: 'Producto A', price: 50000, tax: 19 },
      { code: 'PROD002', name: 'Producto B', price: 75000, tax: 19 },
      { code: 'PROD003', name: 'Producto C', price: 120000, tax: 19 },
      { code: 'PROD004', name: 'Servicio X', price: 200000, tax: 19 },
      { code: 'PROD005', name: 'Servicio Y', price: 350000, tax: 19 }
    ];

    const lines = [];
    const numLines = Math.min(5, (index % 5) + 1);

    for (let i = 0; i < numLines; i++) {
      const product = products[i % products.length];
      const quantity = isCreditNote ? 1 : ((index + i) % 10) + 1;
      const unitPrice = product.price;
      const subtotal = quantity * unitPrice;
      const taxRate = product.tax;
      const taxAmount = Math.round(subtotal * taxRate / 100);

      lines.push({
        lineNumber: i + 1,
        itemCode: product.code,
        description: product.name,
        quantity,
        unitCode: '94',
        unitPrice,
        lineExtensionAmount: subtotal,
        taxRate,
        taxAmount,
        taxId: '01',
        codigoProducto: product.code
      });
    }

    return lines;
  }
}

/**
 * Ejecuta proceso completo de habilitación
 */
export async function runHabilitacion(options = {}) {
  const manager = new HabilitacionManager(options);

  try {
    await manager.initialize();
    await manager.generateTestSet(options.templates);

    if (options.submit) {
      await manager.submitToDian();
    }

    const report = manager.getReport();
    console.log('[HABILITACION] Proceso completado:', report.summary);

    return report;
  } catch (error) {
    console.error('[HABILITACION] Error:', error);
    throw error;
  }
}

export default { HabilitacionManager, runHabilitacion, MODOS_HABILITACION, MODO_DEFAULT };