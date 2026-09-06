const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const QRCode = require('qrcode');
const bwipjs = require('bwip-js');
const { config } = require('../../config.js');
// dian-middleware es un paquete ESM ("type": "module"); desde este módulo CJS
// se carga con import() dinámico (lazy, cacheado tras el primer uso).
let _dianSigPromise = null;
function dianSig() {
  if (!_dianSigPromise) {
    _dianSigPromise = import('../../dian-middleware/src/security/signature.js');
  }
  return _dianSigPromise;
}
const { DOMParser } = require('xmldom');

const DIAN_BASE = 'https://facturaelectronica.dian.gov.co';
const DIAN_BASE_TEST = 'https://facturaelectronica.dian.gov.co/habilitacion';

// ============================================================
// QR + PDF417 Generation (Anexo Técnico DIAN)
// ============================================================

/**
 * Genera QR code como base64 PNG para factura DIAN
 * El contenido del QR sigue el formato DIAN: CUFE|NIT|Fecha|Hora|Total|etc.
 * @param {Object} params - Parámetros del QR
 * @returns {Promise<string>} Base64 PNG del QR
 */
async function generarQrDian(params) {
  const {
    cufe,
    nit,
    fecha,
    hora,
    total,
    tipoDocumento = '01',
    prefijo,
    numero
  } = params;
  
  // Formato QR DIAN según Anexo Técnico
  const qrContent = [
    cufe,
    nit,
    fecha,
    hora,
    total.toFixed(2),
    tipoDocumento,
    `${prefijo}${numero}`
  ].join('|');
  
  try {
    const qrBase64 = await QRCode.toDataURL(qrContent, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
    return qrBase64.replace('data:image/png;base64,', '');
  } catch (e) {
    console.error('[DIAN] Error generando QR:', e.message);
    return '';
  }
}

/**
 * Genera código PDF417 como base64 PNG para factura DIAN
 * @param {Object} params - Parámetros del PDF417
 * @returns {Promise<string>} Base64 PNG del PDF417
 */
async function generarPdf417Dian(params) {
  const {
    cufe,
    nit,
    fecha,
    hora,
    total,
    tipoDocumento = '01',
    prefijo,
    numero,
    nitAdquiriente
  } = params;
  
  // Formato PDF417 según Anexo Técnico DIAN
  const pdf417Content = [
    'C1:', cufe,
    'C2:', nit,
    'C3:', fecha,
    'C4:', hora,
    'C5:', total.toFixed(2),
    'C6:', tipoDocumento,
    'C7:', `${prefijo}${numero}`,
    'C8:', nitAdquiriente || ''
  ].join('|');
  
  return new Promise((resolve) => {
    bwipjs.toBuffer({
      bcid: 'pdf417',
      text: pdf417Content,
      scale: 2,
      columns: 4,
      eclevel: 'M',
      includetext: false,
      scaleX: 2,
      scaleY: 2
    }, (err, png) => {
      if (err) {
        console.error('[DIAN] Error generando PDF417:', err.message);
        resolve('');
      } else {
        resolve(png.toString('base64'));
      }
    });
  });
}

/**
 * Genera ambos códigos (QR + PDF417) para una factura
 * @param {Object} facturaData - Datos de la factura
 * @returns {Promise<{qr: string, pdf417: string}>}
 */
async function generarCodigosBarrasFactura(facturaData) {
  const [qr, pdf417] = await Promise.all([
    generarQrDian(facturaData),
    generarPdf417Dian(facturaData)
  ]);
  return { qr, pdf417 };
}

// ============================================================
// CONFIGURACIÓN DIAN
// ============================================================

// Guarda tokens en archivo (persistente entre reinicios)
const TOKEN_FILE = path.join(config.dataDir || './data', 'dian_token.json');

function leerToken() {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
      if (data.expires_at && Date.now() < data.expires_at) return data.token;
    }
  } catch {}
  return null;
}

function guardarToken(token, expiresIn) {
  try {
    fs.writeFileSync(TOKEN_FILE, JSON.stringify({
      token,
      expires_at: Date.now() + (expiresIn - 60) * 1000 // 1 min buffer
    }), 'utf8');
  } catch (e) {
    console.error('[DIAN] No pude guardar token:', e.message);
  }
}

async function obtenerToken(cfg) {
  const cached = leerToken();
  if (cached) return cached;

  const base = cfg.ambiente === 'produccion' ? DIAN_BASE : DIAN_BASE_TEST;
  const resp = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nit: cfg.nit,
      password: cfg.password,
      codigo_software: cfg.codigo_software,
      pin_software: cfg.pin_software
    })
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`DIAN auth failed: ${resp.status} ${JSON.stringify(err)}`);
  }

  const data = await resp.json();
  guardarToken(data.token, data.expires_in || 3600);
  return data.token;
}

async function enviarFacturaDianGratuito(payload, cfg) {
  const { pedido } = payload;
  const base = cfg.ambiente === 'produccion' ? DIAN_BASE : DIAN_BASE_TEST;
  
  const token = await obtenerToken(cfg);
  
  // Construir XML UBL 2.1 completo
  const xml = construirXmlFactura(payload, cfg);
  
  // Cargar certificado y firmar XML con XAdES-BES (RSA-SHA384)
  const { signXml, loadPkcs12, generateCufe } = await dianSig();
  const certData = loadPkcs12(cfg.cert_path, cfg.cert_pass);
  const xmlFirmado = signXml(xml, certData, 'Invoice');
  
  // Generar CUFE
  const cufeParams = {
    numFac: `${cfg.prefijo}${pedido.id}`,
    fecFac: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
    horFac: new Date().toISOString().slice(11, 19).replace(/[:-]/g, ''),
    valFac: pedido.total.toFixed(2).replace('.', ''),
    codImp1: '01',
    valImp1: Math.round(pedido.total * 0.19).toFixed(2).replace('.', ''),
    codImp2: '',
    valImp2: '0',
    codImp3: '',
    valImp3: '0',
    valTot: (pedido.total + Math.round(pedido.total * 0.19)).toFixed(2).replace('.', ''),
    nitOfe: cfg.nit,
    numAdq: pedido.telefono || '222222222222',
    clTec: crypto.randomUUID().split('-')[0],
    tipoAmbiente: cfg.ambiente === 'produccion' ? '1' : '2'
  };
  const cufe = generateCufe(cufeParams);
  
  // Extraer firma y certificado del XML firmado para envío a DIAN
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlFirmado, 'text/xml');
  const sigEl = xmlDoc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Signature')[0];
  const signatureValue = sigEl?.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'SignatureValue')[0]?.textContent || '';
  const certEl = sigEl?.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'X509Certificate')[0];
  const certificate = certEl?.textContent || '';
  
  const factura = {
    nit: cfg.nit,
    prefijo: cfg.prefijo,
    numero: pedido.id.toString(),
    fecha_emision: new Date().toISOString().slice(0, 10),
    hora_emision: new Date().toISOString().slice(11, 19),
    tipo_documento: '01',
    metodo_pago: '1',
    forma_pago: '1',
    tipo_operacion: '10',
    cliente: {
      tipo_identificacion: cfg.cliente_tipo_id || '31',
      identificacion: pedido.telefono || '222222222222',
      nombre: pedido.remitente || 'Cliente Genérico',
      email: cfg.cliente_email || 'cliente@ejemplo.com',
      direccion: pedido.direccion || 'Sin dirección',
      municipio: cfg.cliente_municipio || '11001',
      departamento: cfg.cliente_departamento || '11'
    },
    items: pedido.items.map((item, idx) => ({
      numero_linea: idx + 1,
      codigo: item.producto,
      descripcion: item.producto,
      cantidad: item.cantidad,
      valor_unitario: item.precioUnitario,
      valor_total: item.subtotal,
      unidad_medida: '94',
      tributos: [{
        codigo: '01',
        tasa: 19.00,
        valor: Math.round(item.subtotal * 0.19)
      }]
    })),
    totales: {
      subtotal: pedido.total,
      base_imponible: pedido.total,
      iva: Math.round(pedido.total * 0.19),
      total: pedido.total + Math.round(pedido.total * 0.19)
    },
    xml_firmado: xmlFirmado,
    cufe,
    firma: {
      valor: signatureValue,
      certificado: certificate
    }
  };

  const resp = await fetch(`${base}/api/v1/facturas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    },
    body: JSON.stringify(factura)
  });

  const data = await resp.json().catch(() => ({}));
  
  if (!resp.ok) {
    throw new Error(`DIAN envió factura: ${resp.status} ${JSON.stringify(data)}`);
  }

  console.log('[DIAN-GRATUITO] Factura enviada:', data.cufe || data.id);
  return { ok: true, cufe: data.cufe, id: data.id, qr: data.qr };
}

function construirXmlFactura(payload, cfg) {
  const { pedido } = payload;
  const fecha = new Date().toISOString().slice(0, 10);
  const hora = new Date().toISOString().slice(11, 19);
  
  // Calcular impuestos por tipo
  const items = pedido.items || [];
  const taxByCode = { '01': 0, '04': 0, '03': 0 }; // IVA, ICA, Consumo
  
  for (const item of items) {
    const taxId = item.taxId || '01';
    const taxRate = item.taxRate || 19;
    const taxAmount = item.taxAmount !== undefined 
      ? item.taxAmount 
      : Math.round(item.subtotal * taxRate / 100);
    if (taxByCode[taxId] !== undefined) {
      taxByCode[taxId] += taxAmount;
    }
  }
  
  const totalIva = taxByCode['01'] || 0;
  const totalIca = taxByCode['04'] || 0;
  const totalConsumo = taxByCode['03'] || 0;
  const totalImpuestos = totalIva + totalIca + totalConsumo;
  const totalConImpuestos = pedido.total + totalImpuestos;

  // Generar líneas de factura con impuestos correctos
  const invoiceLines = items.map((item, idx) => {
    const taxId = item.taxId || '01';
    const taxRate = item.taxRate || 19;
    const taxCategory = taxRate > 0 ? 'S' : 'Z'; // S=Gravado, Z=Exento
    const taxAmount = item.taxAmount !== undefined 
      ? item.taxAmount 
      : Math.round(item.subtotal * taxRate / 100);
    const taxSchemeId = taxId === '01' ? '01' : (taxId === '04' ? '04' : '03');
    
    return `
    <cac:InvoiceLine>
      <cbc:ID>${idx + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="${item.unitCode || '94'}">${item.cantidad}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="COP">${item.subtotal}</cbc:LineExtensionAmount>
      <cac:Item>
        <cbc:Description>${escapeXml(item.producto)}</cbc:Description>
        <cac:SellersItemIdentification>
          <cbc:ID>${escapeXml(item.producto)}</cbc:ID>
        </cac:SellersItemIdentification>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="COP">${item.precioUnitario}</cbc:PriceAmount>
      </cac:Price>
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="COP">${Math.round(item.subtotal * taxRate / 100)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
          <cbc:TaxableAmount currencyID="COP">${item.subtotal}</cbc:TaxableAmount>
          <cbc:TaxAmount currencyID="COP">${Math.round(item.subtotal * taxRate / 100)}</cbc:TaxAmount>
          <cac:TaxCategory>
            <cbc:ID>${taxRate > 0 ? 'S' : 'Z'}</cbc:ID>
            <cbc:Percent>${taxRate.toFixed(2)}</cbc:Percent>
            <cac:TaxScheme>
              <cbc:ID>${taxSchemeId}</cbc:ID>
            </cac:TaxScheme>
          </cac:TaxCategory>
        </cac:TaxSubtotal>
      </cac:TaxTotal>
      </cac:InvoiceLine>`;
  }).join('');

  // Totales por tipo de impuesto para cac:TaxTotal a nivel factura
  const taxTotals = [];
  if (totalIva > 0) {
    taxTotals.push(`
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="COP">${totalIva}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxAmount currencyID="COP">${totalIva}</cbc:TaxAmount>
        <cac:TaxCategory>
          <cbc:ID>S</cbc:ID>
          <cbc:Percent>19.00</cbc:Percent>
          <cac:TaxScheme>
            <cbc:ID>01</cbc:ID>
          </cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>`);
  }
  if (totalIca > 0) {
    taxTotals.push(`
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="COP">${totalIca}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxAmount currencyID="COP">${totalIca}</cbc:TaxAmount>
        <cac:TaxCategory>
          <cbc:ID>S</cbc:ID>
          <cbc:Percent>${cfg.ica_rate || '0.00'}</cbc:Percent>
          <cac:TaxScheme>
            <cbc:ID>04</cbc:ID>
          </cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>`);
  }
  if (totalConsumo > 0) {
    taxTotals.push(`
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="COP">${totalConsumo}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxAmount currencyID="COP">${totalConsumo}</cbc:TaxAmount>
        <cac:TaxCategory>
          <cbc:ID>S</cbc:ID>
          <cbc:Percent>${cfg.consumo_rate || '0.00'}</cbc:Percent>
          <cac:TaxScheme>
            <cbc:ID>03</cbc:ID>
          </cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>`);
  }

  const totalImpuestosStr = totalImpuestos.toFixed(2);
  const totalConImpuestosStr = totalConImpuestos.toFixed(2);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>10</cbc:CustomizationID>
  <cbc:ProfileID>FACTURA_VENTA</cbc:ProfileID>
  <cbc:ID>${cfg.prefijo}${pedido.id}</cbc:ID>
  <cbc:IssueDate>${fecha}</cbc:IssueDate>
  <cbc:IssueTime>${hora}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>01</cbc:InvoiceTypeCode>
  <cbc:Note>Factura generada por ${escapeXml(config.nombreNegocio())}</cbc:Note>
  <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="31">${cfg.nit}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${escapeXml(config.nombreNegocio())}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:CityName>${escapeXml(cfg.empresa_ciudad || 'Bogotá')}</cbc:CityName>
        <cac:CountrySubentity>${escapeXml(cfg.empresa_depto || 'Cundinamarca')}</cac:CountrySubentity>
        <cac:Country>
          <cbc:IdentificationCode>CO</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${escapeXml(config.nombreNegocio())}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="31">${cfg.nit}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>01</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(config.nombreNegocio())}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="31">${cfg.nit}</cbc:CompanyID>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="${cfg.cliente_tipo_id || '31'}">${pedido.telefono || '222222222222'}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${escapeXml(pedido.remitente || 'Cliente Genérico')}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:CityName>${escapeXml(cfg.cliente_ciudad || 'Bogotá')}</cbc:CityName>
        <cac:CountrySubentity>${escapeXml(cfg.cliente_depto || 'Cundinamarca')}</cac:CountrySubentity>
        <cac:Country>
          <cbc:IdentificationCode>CO</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${escapeXml(pedido.remitente || 'Cliente Genérico')}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="${cfg.cliente_tipo_id || '31'}">${pedido.telefono || '222222222222'}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>01</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(pedido.remitente || 'Cliente Genérico')}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="${cfg.cliente_tipo_id || '31'}">${pedido.telefono || '222222222222'}</cbc:CompanyID>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  ${taxTotals.join('')}
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="COP">${pedido.total.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="COP">${pedido.total.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="COP">${(pedido.total + totalImpuestos).toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="COP">${(pedido.total + totalImpuestos).toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${invoiceLines}
  <cac:PaymentTerms>
    <cbc:Note>${cfg.payment_terms || 'Contado'}</cbc:Note>
  </cac:PaymentTerms>
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>${cfg.payment_means_code || '1'}</cbc:PaymentMeansCode>
    <cbc:PaymentDueDate>${fecha}</cbc:PaymentDueDate>
  </cac:PaymentMeans>
</Invoice>`;
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ============================================================
// NOTA CRÉDITO (Código 02) y NOTA DÉBITO (Código 03) - DIAN
// Resolución 000020 de 2021
// ============================================================

/**
 * Envía Nota Crédito (02) o Nota Débito (03) a DIAN Gratuito
 * @param {Object} payload - { nota: { tipo: '02'|'03', ... }, facturaOrigen: {...} }
 * @param {Object} cfg - Configuración DIAN
 * @returns {Promise<{ok, cude, id, qr}>}
 */
async function enviarNotaDianGratuito(payload, cfg, tipoDocumento) {
  const { nota, facturaOrigen } = payload;
  const base = cfg.ambiente === 'produccion' ? DIAN_BASE : DIAN_BASE_TEST;
  
  const token = await obtenerToken(cfg);
  
  // Construir XML UBL 2.1 para NC/ND
  const xml = tipoDocumento === '02' 
    ? construirXmlNotaCredito(payload, cfg)
    : construirXmlNotaDebito(payload, cfg);
  
  // Cargar certificado y firmar XML con XAdES-BES (RSA-SHA384)
  const { signXml, loadPkcs12, generateCufe } = await dianSig();
  const certData = loadPkcs12(cfg.cert_path, cfg.cert_pass);
  const referenceId = tipoDocumento === '02' ? 'CreditNote' : 'DebitNote';
  const xmlFirmado = signXml(xml, certData, referenceId);
  
  // Generar CUDE (mismo algoritmo que CUFE)
  const cudeParams = {
    numFac: `${cfg.prefijo}${nota.numero}`,
    fecFac: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
    horFac: new Date().toISOString().slice(11, 19).replace(/[:-]/g, ''),
    valFac: nota.total.toFixed(2).replace('.', ''),
    codImp1: '01',
    valImp1: Math.round(nota.total * 0.19).toFixed(2).replace('.', ''),
    codImp2: '',
    valImp2: '0',
    codImp3: '',
    valImp3: '0',
    valTot: (nota.total + Math.round(nota.total * 0.19)).toFixed(2).replace('.', ''),
    nitOfe: cfg.nit,
    numAdq: nota.cliente_identificacion || '222222222222',
    clTec: crypto.randomUUID().split('-')[0],
    tipoAmbiente: cfg.ambiente === 'produccion' ? '1' : '2'
  };
  const cude = generateCufe(cudeParams);
  
  // Extraer firma y certificado del XML firmado para envío a DIAN
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlFirmado, 'text/xml');
  const sigEl = xmlDoc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Signature')[0];
  const signatureValue = sigEl?.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'SignatureValue')[0]?.textContent || '';
  const certEl = sigEl?.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'X509Certificate')[0];
  const certificate = certEl?.textContent || '';
  
  const documento = {
    nit: cfg.nit,
    prefijo: cfg.prefijo,
    numero: nota.numero.toString(),
    fecha_emision: new Date().toISOString().slice(0, 10),
    hora_emision: new Date().toISOString().slice(11, 19),
    tipo_documento: tipoDocumento, // '02' = NC, '03' = ND
    metodo_pago: '1',
    forma_pago: '1',
    tipo_operacion: '10',
    cliente: {
      tipo_identificacion: cfg.cliente_tipo_id || '31',
      identificacion: nota.cliente_identificacion || '222222222222',
      nombre: nota.cliente_nombre || 'Cliente Genérico',
      email: cfg.cliente_email || 'cliente@ejemplo.com',
      direccion: nota.cliente_direccion || 'Sin dirección',
      municipio: cfg.cliente_municipio || '11001',
      departamento: cfg.cliente_departamento || '11'
    },
    items: nota.items.map((item, idx) => ({
      numero_linea: idx + 1,
      codigo: item.producto,
      descripcion: item.producto,
      cantidad: item.cantidad,
      valor_unitario: item.precioUnitario,
      valor_total: item.subtotal,
      unidad_medida: '94',
      tributos: [{
        codigo: '01',
        tasa: 19.00,
        valor: Math.round(item.subtotal * 0.19)
      }]
    })),
    totales: {
      subtotal: nota.subtotal,
      base_imponible: nota.subtotal,
      iva: Math.round(nota.subtotal * 0.19),
      total: nota.total
    },
    xml_firmado: xmlFirmado,
    cude: generateCude(cudeParams),
    factura_origen: {
      prefijo: facturaOrigen.prefijo,
      numero: facturaOrigen.numero,
      cufe: facturaOrigen.cufe
    },
    firma: {
      valor: signatureValue,
      certificado: certificate
    }
  };

  const resp = await fetch(`${base}/api/v1/facturas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    },
    body: JSON.stringify(documento)
  });

  const data = await resp.json().catch(() => ({}));
  
  if (!resp.ok) {
    throw new Error(`DIAN envió ${tipoDocumento === '02' ? 'Nota Crédito' : 'Nota Débito'}: ${resp.status} ${JSON.stringify(data)}`);
  }

  console.log('[DIAN-GRATUITO] ' + (tipoDocumento === '02' ? 'Nota Crédito' : 'Nota Débito') + ' enviada:', data.cude || data.id);
  return { ok: true, cude: data.cude, id: data.id, qr: data.qr };
}

async function enviarNotaCreditoDianGratuito(payload, cfg) {
  return enviarNotaDianGratuito(payload, cfg, '02');
}

async function enviarNotaDebitoDianGratuito(payload, cfg) {
  return enviarNotaDianGratuito(payload, cfg, '03');
}

// ============================================================
// XML Builders para NC/ND (UBL 2.1 DIAN)
// ============================================================

function construirXmlNotaCredito(payload, cfg) {
  const { nota, facturaOrigen } = payload;
  const fecha = new Date().toISOString().slice(0, 10);
  const hora = new Date().toISOString().slice(11, 19);
  const totalIva = Math.round(nota.subtotal * 0.19);
  const totalConIva = nota.total;

  const invoiceLines = (nota.items || []).map((item, idx) => {
    const taxRate = item.taxRate || 19;
    const taxCategory = taxRate > 0 ? 'S' : 'Z'; // S=Gravado, Z=Exento
    const taxAmount = item.taxAmount !== undefined 
      ? item.taxAmount 
      : Math.round(item.subtotal * taxRate / 100);
    const taxSchemeId = item.taxId === '01' ? '01' : (item.taxId === '04' ? '04' : '03');
    
    return `
    <cac:CreditNoteLine>
      <cbc:ID>${idx + 1}</cbc:ID>
      <cbc:CreditedQuantity unitCode="${item.unitCode || '94'}">${item.cantidad}</cbc:CreditedQuantity>
      <cbc:LineExtensionAmount currencyID="COP">${item.subtotal}</cbc:LineExtensionAmount>
      <cac:Item>
        <cbc:Description>${escapeXml(item.producto)}</cbc:Description>
        <cac:SellersItemIdentification>
          <cbc:ID>${escapeXml(item.producto)}</cbc:ID>
        </cac:SellersItemIdentification>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="COP">${item.precioUnitario}</cbc:PriceAmount>
      </cac:Price>
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="COP">${Math.round(item.subtotal * taxRate / 100)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
          <cbc:TaxableAmount currencyID="COP">${item.subtotal}</cbc:TaxableAmount>
          <cbc:TaxAmount currencyID="COP">${Math.round(item.subtotal * taxRate / 100)}</cbc:TaxAmount>
          <cac:TaxCategory>
            <cbc:ID>${taxRate > 0 ? 'S' : 'Z'}</cbc:ID>
            <cbc:Percent>${taxRate.toFixed(2)}</cbc:Percent>
            <cac:TaxScheme>
              <cbc:ID>${taxSchemeId}</cbc:ID>
            </cac:TaxScheme>
          </cac:TaxCategory>
        </cac:TaxSubtotal>
      </cac:TaxTotal>
      </cac:CreditNoteLine>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<CreditNote xmlns="urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>10</cbc:CustomizationID>
  <cbc:ProfileID>NOTA_CREDITO</cbc:ProfileID>
  <cbc:ID>${cfg.prefijo}${nota.numero}</cbc:ID>
  <cbc:IssueDate>${fecha}</cbc:IssueDate>
  <cbc:IssueTime>${hora}</cbc:IssueTime>
  <cbc:CreditNoteTypeCode>1</cbc:CreditNoteTypeCode>
  <cbc:Note>${escapeXml('Devolución/Descuento sobre factura ' + facturaOrigen.prefijo + facturaOrigen.numero)}</cbc:Note>
  <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="31">${cfg.nit}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${escapeXml(config.nombreNegocio())}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:CityName>${escapeXml(cfg.empresa_ciudad || 'Bogotá')}</cbc:CityName>
        <cac:CountrySubentity>${escapeXml(cfg.empresa_depto || 'Cundinamarca')}</cac:CountrySubentity>
        <cac:Country>
          <cbc:IdentificationCode>CO</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${escapeXml(config.nombreNegocio())}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="31">${cfg.nit}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>01</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(config.nombreNegocio())}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="31">${cfg.nit}</cbc:CompanyID>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="${cfg.cliente_tipo_id || '31'}">${nota.cliente_identificacion || '222222222222'}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${escapeXml(nota.cliente_nombre || 'Cliente Genérico')}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:CityName>${escapeXml(cfg.cliente_ciudad || 'Bogotá')}</cbc:CityName>
        <cac:CountrySubentity>${escapeXml(cfg.cliente_depto || 'Cundinamarca')}</cac:CountrySubentity>
        <cac:Country>
          <cbc:IdentificationCode>CO</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${escapeXml(nota.cliente_nombre || 'Cliente Genérico')}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="${cfg.cliente_tipo_id || '31'}">${nota.cliente_identificacion || '222222222222'}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>01</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(nota.cliente_nombre || 'Cliente Genérico')}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="${cfg.cliente_tipo_id || '31'}">${nota.cliente_identificacion || '222222222222'}</cbc:CompanyID>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:BillingReference>
    <cac:InvoiceDocumentReference>
      <cbc:ID>${facturaOrigen.prefijo}${facturaOrigen.numero}</cbc:ID>
      <cbc:UUID>${facturaOrigen.cufe}</cbc:UUID>
      <cbc:IssueDate>${facturaOrigen.fecha}</cbc:IssueDate>
      <cbc:DocumentTypeCode>01</cbc:DocumentTypeCode>
    </cac:InvoiceDocumentReference>
  </cac:BillingReference>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="COP">${totalIva}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxAmount currencyID="COP">${totalIva}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>19.00</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>01</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="COP">${nota.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="COP">${nota.subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="COP">${(nota.subtotal + totalIva).toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="COP">${nota.total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${invoiceLines}
  <cac:PaymentTerms>
    <cbc:Note>Contado</cbc:Note>
  </cac:PaymentTerms>
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>1</cbc:PaymentMeansCode>
    <cbc:PaymentDueDate>${fecha}</cbc:PaymentDueDate>
  </cac:PaymentMeans>
</CreditNote>`;
}

function construirXmlNotaDebito(payload, cfg) {
  const { nota, facturaOrigen } = payload;
  const fecha = new Date().toISOString().slice(0, 10);
  const hora = new Date().toISOString().slice(11, 19);
  const totalIva = Math.round(nota.subtotal * 0.19);
  const totalConIva = nota.total;

  const invoiceLines = (nota.items || []).map((item, idx) => {
    const taxRate = item.taxRate || 19;
    const taxCategory = taxRate > 0 ? 'S' : 'Z'; // S=Gravado, Z=Exento
    const taxAmount = item.taxAmount !== undefined 
      ? item.taxAmount 
      : Math.round(item.subtotal * taxRate / 100);
    const taxSchemeId = item.taxId === '01' ? '01' : (item.taxId === '04' ? '04' : '03');
    
    return `
    <cac:DebitNoteLine>
      <cbc:ID>${idx + 1}</cbc:ID>
      <cbc:DebitedQuantity unitCode="${item.unitCode || '94'}">${item.cantidad}</cbc:DebitedQuantity>
      <cbc:LineExtensionAmount currencyID="COP">${item.subtotal}</cbc:LineExtensionAmount>
      <cac:Item>
        <cbc:Description>${escapeXml(item.producto)}</cbc:Description>
        <cac:SellersItemIdentification>
          <cbc:ID>${escapeXml(item.producto)}</cbc:ID>
        </cac:SellersItemIdentification>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="COP">${item.precioUnitario}</cbc:PriceAmount>
      </cac:Price>
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="COP">${Math.round(item.subtotal * taxRate / 100)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
          <cbc:TaxableAmount currencyID="COP">${item.subtotal}</cbc:TaxableAmount>
          <cbc:TaxAmount currencyID="COP">${Math.round(item.subtotal * taxRate / 100)}</cbc:TaxAmount>
          <cac:TaxCategory>
            <cbc:ID>${taxRate > 0 ? 'S' : 'Z'}</cbc:ID>
            <cbc:Percent>${taxRate.toFixed(2)}</cbc:Percent>
            <cac:TaxScheme>
              <cbc:ID>${taxSchemeId}</cbc:ID>
            </cac:TaxScheme>
          </cac:TaxCategory>
        </cac:TaxSubtotal>
      </cac:TaxTotal>
      </cac:DebitNoteLine>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<DebitNote xmlns="urn:oasis:names:specification:ubl:schema:xsd:DebitNote-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>10</cbc:CustomizationID>
  <cbc:ProfileID>NOTA_DEBITO</cbc:ProfileID>
  <cbc:ID>${cfg.prefijo}${nota.numero}</cbc:ID>
  <cbc:IssueDate>${fecha}</cbc:IssueDate>
  <cbc:IssueTime>${hora}</cbc:IssueTime>
  <cbc:DebitNoteTypeCode>1</cbc:DebitNoteTypeCode>
  <cbc:Note>${escapeXml('Ajuste/Cargo sobre factura ' + facturaOrigen.prefijo + facturaOrigen.numero)}</cbc:Note>
  <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="31">${cfg.nit}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${escapeXml(config.nombreNegocio())}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:CityName>${escapeXml(cfg.empresa_ciudad || 'Bogotá')}</cbc:CityName>
        <cac:CountrySubentity>${escapeXml(cfg.empresa_depto || 'Cundinamarca')}</cac:CountrySubentity>
        <cac:Country>
          <cbc:IdentificationCode>CO</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${escapeXml(config.nombreNegocio())}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="31">${cfg.nit}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>01</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(config.nombreNegocio())}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="31">${cfg.nit}</cbc:CompanyID>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="${cfg.cliente_tipo_id || '31'}">${nota.cliente_identificacion || '222222222222'}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${escapeXml(nota.cliente_nombre || 'Cliente Genérico')}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:CityName>${escapeXml(cfg.cliente_ciudad || 'Bogotá')}</cbc:CityName>
        <cac:CountrySubentity>${escapeXml(cfg.cliente_depto || 'Cundinamarca')}</cac:CountrySubentity>
        <cac:Country>
          <cbc:IdentificationCode>CO</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${escapeXml(nota.cliente_nombre || 'Cliente Genérico')}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="${cfg.cliente_tipo_id || '31'}">${nota.cliente_identificacion || '222222222222'}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>01</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(nota.cliente_nombre || 'Cliente Genérico')}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="${cfg.cliente_tipo_id || '31'}">${nota.cliente_identificacion || '222222222222'}</cbc:CompanyID>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:BillingReference>
    <cac:InvoiceDocumentReference>
      <cbc:ID>${facturaOrigen.prefijo}${facturaOrigen.numero}</cbc:ID>
      <cbc:UUID>${facturaOrigen.cufe}</cbc:UUID>
      <cbc:IssueDate>${facturaOrigen.fecha}</cbc:IssueDate>
      <cbc:DocumentTypeCode>01</cbc:DocumentTypeCode>
    </cac:InvoiceDocumentReference>
  </cac:BillingReference>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="COP">${totalIva}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxAmount currencyID="COP">${totalIva}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>19.00</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>01</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="COP">${nota.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="COP">${nota.subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="COP">${(nota.subtotal + totalIva).toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="COP">${nota.total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${invoiceLines}
  <cac:PaymentTerms>
    <cbc:Note>Contado</cbc:Note>
  </cac:PaymentTerms>
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>1</cbc:PaymentMeansCode>
    <cbc:PaymentDueDate>${fecha}</cbc:PaymentDueDate>
  </cac:PaymentMeans>
</DebitNote>`;
}

module.exports = {
  enviarFacturaDianGratuito, 
  enviarFactura: enviarFacturaDianGratuito, 
  enviarNotaCreditoDianGratuito, 
  enviarNotaDebitoDianGratuito, 
  construirXmlNotaCredito, 
  construirXmlNotaDebito,
  generarQrDian,
  generarPdf417Dian,
  generarCodigosBarrasFactura
};
