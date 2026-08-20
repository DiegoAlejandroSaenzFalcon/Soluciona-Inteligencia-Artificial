const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { config } = require('../../config');

const DIAN_BASE = 'https://facturaelectronica.dian.gov.co';
const DIAN_BASE_TEST = 'https://facturaelectronica.dian.gov.co/habilitacion';

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

function firmarXml(xml, certPath, certPass) {
  const forge = require('node-forge');
  const p12 = fs.readFileSync(certPath);
  const p12Asn1 = forge.asn1.fromDer(p12.toString('binary'));
  const p12Obj = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, certPass);
  
  const bags = p12Obj.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const keyBag = bags[forge.pki.oids.pkcs8ShroudedKeyBag][0];
  const privateKey = keyBag.key;
  
  const certBags = p12Obj.getBags({ bagType: forge.pki.oids.certBag });
  const certBag = certBags[forge.pki.oids.certBag][0];
  const certificate = certBag.cert;

  const signer = forge.pki.createSigner();
  signer.signingKey = privateKey;
  signer.md = forge.md.sha256.create();
  signer.update(forge.util.createBuffer(xml, 'utf8'));
  const signature = signer.sign();
  
  return {
    signature: forge.util.encode64(signature),
    certificate: forge.util.encode64(forge.asn1.toDer(forge.pki.certificateToAsn1(certificate)).getBytes())
  };
}

async function enviarFacturaDianGratuito(payload, cfg) {
  const { pedido } = payload;
  const base = cfg.ambiente === 'produccion' ? DIAN_BASE : DIAN_BASE_TEST;
  
  const token = await obtenerToken(cfg);
  
  // Construir XML UBL 2.1 (simplificado - en producción usar librería completa)
  const xml = construirXmlFactura(payload, cfg);
  
  // Firmar XML
  const { signature, certificate } = firmarXml(xml, cfg.cert_path, cfg.cert_pass);
  
  const factura = {
    nit: cfg.nit,
    prefijo: cfg.prefijo,
    numero: pedido.id.toString(),
    fecha_emision: new Date().toISOString().slice(0, 10),
    hora_emision: new Date().toISOString().slice(11, 19),
    tipo_documento: '01', // Factura de venta
    metodo_pago: '1', // Contado
    forma_pago: '1', // Efectivo
    tipo_operacion: '10', // Normal
    cliente: {
      tipo_identificacion: cfg.cliente_tipo_id || '31', // NIT
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
      unidad_medida: '94', // Unidad
      tributos: [{
        codigo: '01', // IVA
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
    xml_firmado: xml, // En producción: XML con firma embebida
    firma: {
      valor: signature,
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
  const totalIva = Math.round(pedido.total * 0.19);
  const totalConIva = pedido.total + totalIva;

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
  <cbc:Note>Factura generada por ${config.nombreNegocio()}</cbc:Note>
  <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="31">${cfg.nit}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${config.nombreNegocio()}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:CityName>${cfg.empresa_ciudad || 'Bogotá'}</cbc:CityName>
        <cac:CountrySubentity>${cfg.empresa_depto || 'Cundinamarca'}</cac:CountrySubentity>
        <cac:Country>
          <cbc:IdentificationCode>CO</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${config.nombreNegocio()}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="31">${cfg.nit}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>01</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="${cfg.cliente_tipo_id || '31'}">${pedido.telefono || '222222222222'}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${pedido.remitente || 'Cliente Genérico'}</cbc:Name>
      </cac:PartyName>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="COP">${pedido.total}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="COP">${pedido.total}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="COP">${totalConIva}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="COP">${totalConIva}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${pedido.items.map((item, idx) => `
  <cac:InvoiceLine>
    <cbc:ID>${idx + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="94">${item.cantidad}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="COP">${item.subtotal}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>${item.producto}</cbc:Description>
      <cac:SellersItemIdentification>
        <cbc:ID>${item.producto}</cbc:ID>
      </cac:SellersItemIdentification>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="COP">${item.precioUnitario}</cbc:PriceAmount>
    </cac:Price>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="COP">${Math.round(item.subtotal * 0.19)}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxAmount currencyID="COP">${Math.round(item.subtotal * 0.19)}</cbc:TaxAmount>
        <cac:TaxCategory>
          <cbc:ID>S</cbc:ID>
          <cbc:Percent>19.00</cbc:Percent>
          <cac:TaxScheme>
            <cbc:ID>01</cbc:ID>
          </cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
  </cac:InvoiceLine>`).join('')}
</Invoice>`;
}

module.exports = { enviarFacturaDianGratuito, enviarFactura: enviarFacturaDianGratuito };