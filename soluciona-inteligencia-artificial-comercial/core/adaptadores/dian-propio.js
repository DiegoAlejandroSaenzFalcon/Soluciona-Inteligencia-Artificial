/**
 * Adaptador DIAN Propio (Software Propio)
 * Usa el dian-middleware nativo para firmar, enviar y generar PDF+QR.
 * Soporta envío síncrono (wait) o asíncrono con cola BullMQ + reintentos.
 * Requiere configuración en panel/.env:
 * - FC_DIAN_CODIGO_SOFTWARE, FC_DIAN_PIN_SOFTWARE, FC_DIAN_TESTSET_ID
 * - FC_DIAN_CERT_PATH, FC_DIAN_CERT_PASS
 * - Numeración autorizada (resolución DIAN)
 */

const { config } = require('../config');
let dianMiddleware = null;
let dianQueue = null;

/**
 * Inicializa el middleware DIAN (singleton por proceso).
 * Lee la configuración desde config.facturacion.dian_propio.
 */
async function initMiddleware() {
  if (dianMiddleware) return dianMiddleware;

  const dp = config.facturacion?.dian_propio || {};

  if (dp.nit)               process.env.DIAN_NIT = dp.nit;
  if (dp.dv)                process.env.DIAN_DV = dp.dv;
  if (dp.razonSocial)       process.env.DIAN_RAZON_SOCIAL = dp.razonSocial;
  if (dp.nombreComercial)   process.env.DIAN_NOMBRE_COMERCIAL = dp.nombreComercial;
  if (dp.direccion)         process.env.DIAN_DIRECCION = dp.direccion;
  if (dp.municipio)         process.env.DIAN_MUNICIPIO = dp.municipio;
  if (dp.departamento)      process.env.DIAN_DEPARTAMENTO = dp.departamento;
  if (dp.codigoPostal)      process.env.DIAN_CODIGO_POSTAL = dp.codigoPostal;
  if (dp.telefono)          process.env.DIAN_TELEFONO = dp.telefono;
  if (dp.email)             process.env.DIAN_EMAIL = dp.email;
  if (dp.responsabilidadFiscal?.length) {
    process.env.DIAN_RESPONSABILIDAD_FISCAL = dp.responsabilidadFiscal.join(',');
  }
  if (dp.regimenFiscal)     process.env.DIAN_REGIMEN_FISCAL = dp.regimenFiscal;
  if (dp.ambiente)          process.env.DIAN_AMBIENTE = dp.ambiente;
  if (dp.certPath)          process.env.DIAN_CERT_PATH = dp.certPath;
  if (dp.certPass)          process.env.DIAN_CERT_PASS = dp.certPass;
  if (dp.codigoSoftware)    process.env.DIAN_CODIGO_SOFTWARE = dp.codigoSoftware;
  if (dp.pinSoftware)       process.env.DIAN_PIN_SOFTWARE = dp.pinSoftware;
  if (dp.testSetId)         process.env.DIAN_TESTSET_ID = dp.testSetId;
  if (dp.prefijo)           process.env.DIAN_PREFIJO = dp.prefijo;
  if (dp.resolucionNumero)  process.env.DIAN_RESOLUCION_NUMERO = dp.resolucionNumero;
  if (dp.resolucionFecha)   process.env.DIAN_RESOLUCION_FECHA = dp.resolucionFecha;
  if (dp.resolucionPrefijo) process.env.DIAN_RESOLUCION_PREFIJO = dp.resolucionPrefijo;
  if (dp.resolucionDesde)   process.env.DIAN_RESOLUCION_DESDE = dp.resolucionDesde;
  if (dp.resolucionHasta)   process.env.DIAN_RESOLUCION_HASTA = dp.resolucionHasta;

  const mod = await import('../../dian-middleware/src/index.js');
  dianMiddleware = mod.createDianMiddleware({});
  await dianMiddleware.initialize();

  return dianMiddleware;
}

/**
 * Inicializa cola BullMQ (opcional, lazy)
 */
async function initQueue() {
  if (dianQueue) return dianQueue;

  try {
    const mod = await import('../../dian-middleware/src/index.js');
    const queue = await mod.initDianQueue();
    dianQueue = queue;
    return queue;
  } catch (e) {
    console.warn('[DIAN-PROPIO] Cola no disponible (Redis no conectado):', e.message);
    return null;
  }
}

/**
 * Construye los datos de factura UBL desde el pedido estándar.
 */
function buildInvoiceData(payload, cfg = {}) {
  const p = payload.pedido;
  const now = new Date();
  const issueDate = now.toISOString().slice(0, 10);
  const issueTime = now.toTimeString().slice(0, 8);

  const prefijo = cfg.prefijo || process.env.DIAN_PREFIJO || 'SETP';
  const consecutivo = cfg.consecutivoActual || 1;
  const id = `${prefijo}${String(consecutivo).padStart(10, '0')}`;

  return {
    id,
    issueDate,
    issueTime,
    invoiceTypeCode: '01',
    documentCurrencyCode: 'COP',
    supplier: {
      identification: process.env.DIAN_NIT || '',
      dv: process.env.DIAN_DV || '',
      name: process.env.DIAN_RAZON_SOCIAL || '',
      tipoIdentificacion: '31',
      direccion: process.env.DIAN_DIRECCION || '',
      municipio: process.env.DIAN_MUNICIPIO || '11001',
      departamento: process.env.DIAN_DEPARTAMENTO || '11',
      codigoPostal: process.env.DIAN_CODIGO_POSTAL || '110111',
      telefono: process.env.DIAN_TELEFONO || '',
      email: process.env.DIAN_EMAIL || '',
      responsabilidadFiscal: (process.env.DIAN_RESPONSABILIDAD_FISCAL || 'O-13').split(',').filter(Boolean),
      regimenFiscal: process.env.DIAN_REGIMEN_FISCAL || 'Regimen Comun',
    },
    customer: {
      identification: p.telefono || '000000000',
      dv: '',
      name: p.remitente || 'Cliente Consumidor Final',
      tipoIdentificacion: '31',
      direccion: p.direccion || 'Sin dirección',
      municipio: process.env.DIAN_MUNICIPIO || '11001',
      departamento: process.env.DIAN_DEPARTAMENTO || '11',
      codigoPostal: process.env.DIAN_CODIGO_POSTAL || '110111',
      telefono: p.telefono || '',
      email: p.email || '',
      responsabilidadFiscal: ['R-99-PN'],
      regimenFiscal: 'Regimen Comun',
    },
    lines: (p.items || []).map((item, idx) => ({
      lineNumber: idx + 1,
      itemCode: item.producto || `PROD${idx + 1}`,
      description: item.producto,
      quantity: item.cantidad,
      unitCode: '94',
      unitPrice: item.precioUnitario,
      lineExtensionAmount: item.subtotal,
      taxRate: 19,
      taxAmount: Math.round(item.subtotal * 0.19),
      taxId: '01',
    })),
    uuid: `uuid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    tipoAmbiente: process.env.DIAN_AMBIENTE === 'produccion' ? '1' : '2',
  };
}

/**
 * Envío síncrono directo (sin cola) - para compatibilidad
 */
async function enviarSync(payload, cfg) {
  try {
    const mw = await initMiddleware();
    const invoiceData = buildInvoiceData(payload, cfg);
    const result = await mw.processInvoice(invoiceData, { submit: true, generatePdf: true });

    if (result.success) {
      console.log(`[DIAN-PROPIO] ✅ Factura enviada (sync). CUFE: ${result.cufe}`);
      return { success: true, cufe: result.cufe, pdf: result.pdf, dianResponse: result.dianResponse };
    } else {
      console.error(`[DIAN-PROPIO] ❌ Rechazada: ${result.dianResponse?.error || result.dianResponse?.status}`);
      return { success: false, cufe: result.cufe, pdf: null, dianResponse: result.dianResponse };
    }
  } catch (error) {
    console.error('[DIAN-PROPIO] Error crítico (sync):', error.message);
    return { success: false, cufe: null, pdf: null, dianResponse: { error: error.message } };
  }
}

/**
 * Envío asíncrono con cola + reintentos exponenciales
 * Devuelve { success: true, jobId, status: 'queued' } inmediatamente
 */
async function enviarAsync(payload, cfg) {
  try {
    const queue = await initQueue();
    if (!queue) {
      console.warn('[DIAN-PROPIO] Cola no disponible, fallback a sync');
      return enviarSync(payload, cfg);
    }

    const invoiceData = buildInvoiceData(payload, cfg);
    const job = await queue.addInvoiceJob(invoiceData, {
      priority: cfg.priority || 0,
      delay: cfg.delay || 0
    });

    console.log(`[DIAN-PROPIO] ✅ Factura encolada (async). Job: ${job.id}`);
    return { success: true, jobId: job.id, status: 'queued', cufe: null, pdf: null };

  } catch (error) {
    console.error('[DIAN-PROPIO] Error encolando:', error.message);
    return { success: false, cufe: null, pdf: null, dianResponse: { error: error.message } };
  }
}

/**
 * Función principal enviar - detecta modo por cfg.asyncQueue
 * - cfg.asyncQueue === true -> cola asíncrona
 * - cfg.asyncQueue === false o undefined -> síncrono (comportamiento actual)
 */
async function enviar(payload, cfg) {
  const useQueue = cfg?.asyncQueue === true;
  return useQueue ? enviarAsync(payload, cfg) : enviarSync(payload, cfg);
}

/**
 * Consulta estado de job encolado
 */
async function getJobStatus(jobId) {
  const queue = await initQueue();
  if (!queue) return { error: 'Cola no disponible' };

  try {
    const mod = await import('../../dian-middleware/src/index.js');
    return await mod.getJobStatus(jobId);
  } catch (e) {
    return { error: e.message };
  }
}

module.exports = { tipo: 'dian-propio', enviar, getJobStatus };