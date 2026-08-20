/**
 * PDF Generator - Representación Gráfica DIAN con QR
 * Genera PDF con código QR obligatorio según Resolución 000042
 * Soporte para contingencia Tipo 03 (Facturador) y Tipo 04 (DIAN)
 */

import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { Readable } from 'stream';

/**
 * Genera PDF de factura con QR DIAN
 * @param {Object} invoiceData - Datos de la factura
 * @param {Object} dianResponse - Respuesta DIAN (CUFE, QR, estado)
 * @param {Object} options - Opciones de generación
 * @param {string} options.documentType - 'Invoice' | 'CreditNote' | 'DebitNote'
 * @param {string} options.contingencyType - '03' (Facturador) | '04' (DIAN) | null
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function generateInvoicePdf(invoiceData, dianResponse, options = {}) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    info: {
      Title: `Factura ${invoiceData.id}`,
      Author: invoiceData.supplier?.name || 'Sistema DIAN',
      Subject: 'Factura Electrónica DIAN',
      Keywords: 'DIAN, Factura Electrónica, Colombia'
    }
  });

  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      generatePdfContent(doc, invoiceData, dianResponse, options);
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Genera contenido del PDF
 */
async function generatePdfContent(doc, data, dianResponse, options = {}) {
  const { supplier, customer, lines, legalMonetaryTotal } = data;
  const { cufe, qrCode, status } = dianResponse || {};
  const documentType = options.documentType || 'Invoice';
  const contingencyType = options.contingencyType || null; // '03' = Facturador, '04' = DIAN

  // Colores
  const primaryColor = '#1a3c5e';
  const secondaryColor = '#2c5f8a';
  const lightGray = '#f5f5f5';
  const borderColor = '#ddd';
  const contingencyColor = '#ff9800'; // Naranja para contingencia

  // ===== HEADER =====
  // Logo placeholder
  doc.rect(40, 40, 100, 50).fill(lightGray).stroke(borderColor);
  doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold')
    .text('LOGO', 40, 55, { width: 100, align: 'center' });

  // Datos emisor
  doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold')
    .text(supplier?.name || 'EMISOR', 160, 40);
  doc.fontSize(7).font('Helvetica')
    .text(`NIT: ${supplier?.identification || ''}-${supplier?.dv || ''}`, 160, 54)
    .text(`${supplier?.direccion || ''}`, 160, 62)
    .text(`${supplier?.municipio || ''} - ${supplier?.departamento || ''}`, 160, 69)
    .text(`Tel: ${supplier?.telefono || ''} | ${supplier?.email || ''}`, 160, 76);

  // Título según tipo de documento y contingencia
  const docTypeLabels = {
    Invoice: 'FACTURA DE VENTA',
    CreditNote: 'NOTA CRÉDITO',
    DebitNote: 'NOTA DÉBITO'
  };
  const docTypeLabel = docTypeLabels[options.documentType] || 'FACTURA DE VENTA';
  const contingencyLabel = options.contingencyType === '03' ? ' CONTINGENCIA TIPO 03 (FACTURADOR)' :
                           options.contingencyType === '04' ? ' CONTINGENCIA TIPO 04 (DIAN)' : '';

  doc.fillColor(secondaryColor).fontSize(16).font('Helvetica-Bold')
    .text(docTypeLabel + contingencyLabel, 400, 40, { align: 'right' });
  doc.fontSize(10).font('Helvetica')
    .text(`No. ${data.id || ''}`, 400, 60, { align: 'right' })
    .text(`${data.issueDate || ''} ${data.issueTime || ''}`, 400, 72, { align: 'right' });

  // Indicador de contingencia en header
  if (options.contingencyType) {
    doc.fillColor(contingencyColor).fontSize(8).font('Helvetica-Bold')
      .text(`⚠ ${options.contingencyType === '03' ? 'CONTINGENCIA TIPO 03 - FACTURADOR' : 'CONTINGENCIA TIPO 04 - DIAN'}`, 40, 95, { align: 'left' });
  }

  // Línea separadora
  doc.moveTo(40, 110).lineTo(555, 110).stroke(borderColor);

  // ===== DATOS ADQUIRIENTE =====
  doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold')
    .text('ADQUIRIENTE', 40, 120);
  doc.fontSize(7).font('Helvetica')
    .text(`${customer?.name || ''}`, 40, 132)
    .text(`Identificación: ${customer?.tipoIdentificacion || ''} ${customer?.identification || ''}`, 40, 140)
    .text(`Dirección: ${customer?.direccion || ''}`, 40, 148)
    .text(`${customer?.municipio || ''} - ${customer?.departamento || ''}`, 40, 156)
    .text(`Tel: ${customer?.telefono || ''} | ${customer?.email || ''}`, 40, 164);

  // ===== DETALLE =====
  let y = 185;
  drawTableHeader(doc, y);
  y += 25;

  for (const line of data.lines || []) {
    if (y > 700) {
      doc.addPage();
      y = 60;
      drawTableHeader(doc, y);
      y += 25;
    }

    drawTableRow(doc, y, line);
    y += 20;
  }

  // Totales
  y += 10;
  drawTotals(doc, y, data, dianResponse);

  // ===== QR CODE =====
  if (qrCode || cufe) {
    await drawQrSection(doc, qrCode, cufe, status, {
      status: status,
      contingencyType: options.contingencyType
    });
  }

  // ===== CUFE =====
  if (cufe) {
    drawCufeSection(doc, cufe);
  }

  // ===== PIE =====
  drawFooter(doc, data);
}

/**
 * Dibuja cabecera de tabla
 */
function drawTableHeader(doc, y) {
  doc.fillColor('#1a3c5e').fontSize(7).font('Helvetica-Bold');
  const cols = [
    { x: 40, w: 30, text: 'Cant' },
    { x: 75, w: 220, text: 'Descripción' },
    { x: 300, w: 60, text: 'Vr. Unit.' },
    { x: 365, w: 60, text: 'IVA %' },
    { x: 430, w: 70, text: 'Vr. IVA' },
    { x: 505, w: 85, text: 'Total' }
  ];

  doc.rect(40, y, 515, 20).fill('#e8f0f8');
  cols.forEach(col => {
    doc.text(col.text, col.x + 2, y + 5, { width: col.w - 4, align: col.w < 60 ? 'right' : 'left' });
  });
}

/**
 * Dibuja fila de tabla
 */
function drawTableRow(doc, y, line) {
  const cols = [
    { x: 40, w: 30, val: line.quantity },
    { x: 75, w: 220, val: line.description },
    { x: 300, w: 60, val: formatCurrency(line.unitPrice), align: 'right' },
    { x: 365, w: 60, val: (line.taxRate || 19) + '%', align: 'center' },
    { x: 430, w: 70, val: formatCurrency(line.taxAmount || 0), align: 'right' },
    { x: 505, w: 85, val: formatCurrency(line.lineExtensionAmount + (line.taxAmount || 0)), align: 'right' }
  ];

  doc.fillColor('#333').fontSize(7).font('Helvetica');
  if (y % 40 < 20) {
    doc.rect(40, y, 515, 20).fill('#fafafa');
  }

  cols.forEach(col => {
    const align = col.align || 'left';
    doc.text(col.val, col.x + 2, y + 5, { width: col.w - 4, align });
  });
}

/**
 * Dibuja totales
 */
function drawTotals(doc, y, data, dianResponse) {
  const totals = data.legalMonetaryTotal || {};
  doc.fontSize(8).font('Helvetica');

  const items = [
    { label: 'Subtotal:', value: totals.lineExtensionAmount || totals.taxExclusiveAmount },
    { label: 'Descuentos:', value: totals.allowanceTotalAmount || 0 },
    { label: 'IVA (19%):', value: totals.taxInclusiveAmount - totals.taxExclusiveAmount },
    { label: 'TOTAL:', value: totals.payableAmount || totals.taxInclusiveAmount, bold: true }
  ];

  let currentY = y;
  items.forEach(item => {
    doc.font(item.bold ? 'Helvetica-Bold' : 'Helvetica');
    doc.fillColor(item.bold ? '#1a3c5e' : '#333');
    doc.text(item.label, 380, currentY, { width: 100, align: 'right' });
    doc.text(formatCurrency(item.value), 490, currentY, { width: 100, align: 'right' });
    currentY += 18;
  });
}

/**
 * Dibuja sección QR con formato DIAN
 * El QR debe contener: CUFE, NIT emisor, NIT adquiriente, valor total, fecha, etc.
 */
async function drawQrSection(doc, qrCode, cufe, status, options = {}) {
  // Generar QR con formato DIAN si no se proporciona uno
  let qrData = qrCode;
  if (!qrCode && cufe) {
    // Formato QR DIAN: CUFE|NITemisor|NITadquiriente|ValorTotal|Fecha|Hora|TipoDocumento|Contingencia
    // Este es un formato simplificado; el QR real debe generarse según especificación DIAN
    qrData = cufe; // Fallback al CUFE
  }

  const qrBuffer = await QRCode.toBuffer(qrData, {
    width: 120,
    margin: 2,
    errorCorrectionLevel: 'M'
  });

  doc.image(qrBuffer, 40, 620, { width: 100 });
  doc.fontSize(6).fillColor('#666').font('Helvetica')
    .text('Código QR DIAN', 40, 725, { width: 100, align: 'center' });

  // Estado
  if (options.status) {
    doc.fontSize(8).fillColor(options.status === 'Aprobado' || options.status === '00' ? 'green' : 'red').font('Helvetica-Bold')
      .text(`Estado: ${options.status}`, 150, 620);
  }

  // Indicador de contingencia en QR
  if (options.contingencyType) {
    doc.fontSize(6).fillColor('#ff9800').font('Helvetica-Bold')
      .text(options.contingencyType === '03' ? 'CONTINGENCIA 03' : 'CONTINGENCIA 04', 150, 640);
  }
}

/**
 * Dibuja CUFE
 */
function drawCufeSection(doc, cufe) {
  doc.fontSize(6).fillColor('#333').font('Helvetica')
    .text('CUFE:', 40, 700)
    .text(cufe.substring(0, 48), 40, 708)
    .text(cufe.substring(48, 96), 40, 716);
}

/**
 * Dibuja pie de página
 */
function drawFooter(doc, data) {
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc.fontSize(6).fillColor('#999').font('Helvetica')
      .text(`Generado por ${data.supplier?.name || 'Sistema DIAN'} | Página ${i + 1} de ${pageCount}`, 40, 780, { align: 'center', width: 515 });
  }
}

/**
 * Formatea moneda
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 2
  }).format(value || 0);
}

/**
 * Genera PDF para Nota Crédito
 */
export async function generateCreditNotePdf(data, dianResponse) {
  return generateInvoicePdf(data, dianResponse, { documentType: 'CreditNote' });
}

/**
 * Genera PDF para Nota Débito
 */
export async function generateDebitNotePdf(data, dianResponse) {
  return generateInvoicePdf(data, dianResponse, { documentType: 'DebitNote' });
}

export default {
  generateInvoicePdf,
  generateCreditNotePdf,
  generateDebitNotePdf
};