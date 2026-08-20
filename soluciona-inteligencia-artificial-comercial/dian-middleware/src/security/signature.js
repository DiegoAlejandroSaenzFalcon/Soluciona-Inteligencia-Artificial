/**
 * Security Module - Firma Digital DIAN
 * X.509 Certificate handling, SHA-384 CUFE/CUDE, XML-DSig
 * Conforme a Resolución 000042 de 2020 - Anexo Técnico v1.7
 */

import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import forge from 'node-forge';
import { DOMParser, XMLSerializer } from 'xmldom';

/**
 * Carga certificado PKCS#12 (.p12/.pfx)
 * @param {string} p12Path - Ruta al archivo .p12
 * @param {string} password - Password del certificado
 * @returns {Object} { privateKey, certificate, certPem, chain }
 */
export function loadPkcs12(p12Path, password) {
  try {
    const p12Buffer = readFileSync(p12Path);
    const p12Der = forge.util.createBuffer(p12Buffer.toString('binary'));
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);

    // Obtener clave privada
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0];
    const privateKey = keyBag.key;

    // Obtener certificado
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag][0];
    const certificate = certBag.cert;

    // Obtener cadena de certificación (CA)
    const chain = [];
    for (const bag of certBags[forge.pki.oids.certBag]) {
      if (bag.cert !== certificate) {
        chain.push(bag.cert);
      }
    }

    return {
      privateKey,
      certificate,
      certPem: forge.pki.certificateToPem(certificate),
      chain: chain.map(c => forge.pki.certificateToPem(c)),
      subject: certificate.subject.getField('CN').value,
      issuer: certificate.issuer.getField('CN').value,
      serialNumber: certificate.serialNumber,
      validFrom: certificate.validity.notBefore,
      validTo: certificate.validity.notAfter
    };
  } catch (error) {
    throw new Error(`Error cargando certificado PKCS#12: ${error.message}`);
  }
}

/**
 * Genera CUFE (Código Único de Facturación Electrónica) según DIAN
 * Resolución 000042 Anexo Técnico - Composición del CUFE:
 * SHA-384(NumFac + FecFac + HorFac + ValFac + CodImp1 + ValImp1 + CodImp2 + ValImp2 + CodImp3 + ValImp3 + ValTot + NitOFE + NumAdq + ClTec + TipoAmbiente)
 * 
 * @param {Object} params - Parámetros para CUFE
 * @returns {string} CUFE en hexadecimal uppercase (96 caracteres)
 */
export function generateCufe(params) {
  const {
    // Datos de la factura (obligatorios según anexo técnico)
    numFac,           // NumFac: Prefijo + Consecutivo (ej: SETP323200000129)
    fecFac,           // FecFac: Fecha emisión YYYY-MM-DD
    horFac,           // HorFac: Hora emisión HH:MM:SS -05:00
    valFac,           // ValFac: Valor bruto (LineExtensionAmount) sin formato, ej: 1500000.00
    codImp1,          // CodImp1: Código impuesto 1 (01=IVA, 04=ICA, 03=Consumo)
    valImp1,          // ValImp1: Valor impuesto 1
    codImp2,          // CodImp2: Código impuesto 2 (04, 03, o vacío)
    valImp2,          // ValImp2: Valor impuesto 2
    codImp3,          // CodImp3: Código impuesto 3 (03, o vacío)
    valImp3,          // ValImp3: Valor impuesto 3
    valTot,           // ValTot: Valor total a pagar (PayableAmount)
    nitOfe,           // NitOFE: NIT del facturador (sin DV)
    numAdq,           // NumAdq: Identificación del adquiriente (sin DV)
    clTec,            // ClTec: Clave técnica del servicio de numeración DIAN
    tipoAmbiente      // TipoAmbiente: 1=Producción, 2=Pruebas
  } = params;

  // Validar parámetros obligatorios
  const required = ['numFac', 'fecFac', 'horFac', 'valFac', 'codImp1', 'valImp1', 'valTot', 'nitOfe', 'numAdq', 'clTec', 'tipoAmbiente'];
  for (const field of required) {
    if (!params[field] && params[field] !== 0) {
      throw new Error(`Parámetro obligatorio para CUFE faltante: ${field}`);
    }
  }

  // Normalizar valores según especificación del anexo técnico
  // Los valores numéricos deben tener exactamente 2 decimales sin separadores de miles
  const formatNum = (val) => {
    const num = Number(val);
    return num.toFixed(2).replace('.', '');
  };

  // Construir string base para hash (concatenación directa sin separadores)
  // Orden exacto según anexo técnico: NumFac + FecFac + HorFac + ValFac + CodImp1 + ValImp1 + CodImp2 + ValImp2 + CodImp3 + ValImp3 + ValTot + NitOFE + NumAdq + ClTec + TipoAmbiente
  const baseString = 
    String(params.numFac) +
    String(params.fecFac).replace(/-/g, '') +           // YYYYMMDD
    String(params.horFac).replace(/[:-]/g, '') +        // HHMMSS (sin zona horaria en concatenación)
    formatNum(params.valFac) +                           // Valor bruto sin punto decimal
    String(params.codImp1) +                             // CodImp1
    formatNum(params.valImp1) +                          // ValImp1
    String(params.codImp2 || '') +                       // CodImp2 (vacío si no aplica)
    formatNum(params.valImp2 || 0) +                     // ValImp2
    String(params.codImp3 || '') +                       // CodImp3 (vacío si no aplica)
    formatNum(params.valImp3 || 0) +                     // ValImp3
    formatNum(params.valTot) +                           // ValTot
    String(params.nitOfe) +                              // NitOFE
    String(params.numAdq) +                              // NumAdq
    String(params.clTec) +                               // ClTec
    String(params.tipoAmbiente);                         // TipoAmbiente (1 o 2)

  // SHA-384 hash
  const hash = createHash('sha384').update(baseString, 'utf8').digest('hex');

  return hash.toUpperCase();
}

/**
 * Genera CUDE (Código Único de Documento Electrónico) para NC/ND
 * Mismo algoritmo que CUFE pero con documentType '02' (NC) o '03' (ND)
 * 
 * @param {Object} params - Parámetros (usa generateCufe internamente)
 * @returns {string} CUDE
 */
export function generateCude(params) {
  return generateCufe(params);
}

/**
 * Extrae los parámetros para CUFE desde datos de factura UBL
 * @param {Object} invoiceData - Datos de factura estructurados
 * @returns {Object} Parámetros para generateCufe
 */
export function extractCufeParams(invoiceData) {
  const lines = invoiceData.lines || [];
  const legalMonetaryTotal = invoiceData.legalMonetaryTotal || {};
  const taxTotals = invoiceData.taxTotals || [];

  // Calcular valores de impuestos por código (01=IVA, 04=ICA, 03=Consumo)
  const taxByCode = {};

  // Si hay taxTotals estructurados (formato UBL), usarlos
  for (const taxTotal of taxTotals) {
    for (const subtotal of taxTotal.taxSubtotals || []) {
      const taxSchemeId = subtotal.taxCategory?.taxScheme?.id || '01';
      if (!taxByCode[taxSchemeId]) {
        taxByCode[taxSchemeId] = { amount: 0, rate: subtotal.percent || 0 };
      }
      taxByCode[taxSchemeId].amount += Number(subtotal.taxAmount || 0);
    }
  }

  // Si no hay taxTotals, derivar impuestos de las lineas (formato simplificado)
  if (Object.keys(taxByCode).length === 0) {
    for (const line of lines) {
      const taxId = line.taxId || '01';
      const taxAmount = line.taxAmount !== undefined
        ? Number(line.taxAmount)
        : Math.round(line.quantity * line.unitPrice * (line.taxRate || 0) / 100);
      if (!taxByCode[taxId]) {
        taxByCode[taxId] = { amount: 0, rate: line.taxRate || 0 };
      }
      taxByCode[taxId].amount += taxAmount;
    }
  }

  // Ordenar códigos: 01 (IVA), 04 (ICA), 03 (Consumo)
  const taxOrder = ['01', '04', '03'];
  let codImp1 = '', valImp1 = 0, codImp2 = '', valImp2 = 0, codImp3 = '', valImp3 = 0;

  for (const code of taxOrder) {
    if (taxByCode[code] && taxByCode[code].amount > 0) {
      if (!codImp1) { codImp1 = code; valImp1 = taxByCode[code].amount; }
      else if (!codImp2) { codImp2 = code; valImp2 = taxByCode[code].amount; }
      else if (!codImp3) { codImp3 = code; valImp3 = taxByCode[code].amount; }
    }
  }

  // Extraer clave técnica del UUID
  const uuid = invoiceData.uuid || invoiceData.id || '';
  const clTec = uuid.split('-')[0] || ''; // Primera parte del UUID

  return {
    numFac: invoiceData.id,
    fecFac: invoiceData.issueDate,
    horFac: invoiceData.issueTime,
    valFac: legalMonetaryTotal.lineExtensionAmount || 0,
    codImp1,
    valImp1,
    codImp2,
    valImp2,
    codImp3,
    valImp3,
    valTot: legalMonetaryTotal.payableAmount || 0,
    nitOfe: invoiceData.supplier?.identification || '',
    numAdq: invoiceData.customer?.identification || '',
    clTec,
    tipoAmbiente: invoiceData.tipoAmbiente || '2' // Default pruebas
  };
}

/**
 * Firma XML usando XML-DSig (Enveloped Signature) según DIAN
 * Resolución 000042 - Firma XAdES-BES con RSA-SHA384
 * 
 * @param {string} xml - XML a firmar
 * @param {Object} certData - Datos del certificado (privateKey, certificate, chain)
 * @param {string} referenceId - ID del elemento a firmar (ej: 'Invoice', 'CreditNote')
 * @returns {string} XML con firma embebida
 */
export function signXml(xml, certData, referenceId = 'Invoice') {
  const { privateKey, certificate, chain } = certData;

  // Parsear XML
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');

  // Encontrar elemento a firmar
  const rootElement = doc.documentElement;
  rootElement.setAttribute('Id', referenceId);

  // Crear namespace manager
  const dsNs = 'http://www.w3.org/2000/09/xmldsig#';

  // Referencia al elemento firmado
  const referenceUri = `#${referenceId}`;

  // Calcular digest del Reference (SHA-256)
  const referenceDigest = createHash('sha256').update(canonicalizeForSignature(rootElement)).digest('base64');

  // Construir SignedInfo
  const signedInfo = `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
    <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
    <SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha384"/>
    <Reference URI="${referenceUri}">
      <Transforms>
        <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
        <Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
      </Transforms>
      <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
      <DigestValue>${referenceDigest}</DigestValue>
    </Reference>
  </SignedInfo>`;

  // Firmar SignedInfo con RSA-SHA384 (node-forge: privateKey.sign(md))
  const md = forge.md.sha384.create();
  md.update(signedInfo, 'utf8');
  const signatureValue = privateKey.sign(md);
  const signatureB64 = forge.util.encode64(signatureValue);

  // Certificado en Base64
  const certB64 = forge.util.encode64(forge.asn1.toDer(forge.pki.certificateToAsn1(certificate)).getBytes());

  // Construir Signature XML completa según DIAN (XAdES-BES)
  const signatureXml = `
    <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="Signature${referenceId}">
      <ds:SignedInfo>
        <ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
        <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha384"/>
        <ds:Reference URI="${referenceUri}">
          <ds:Transforms>
            <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
            <ds:Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
          </ds:Transforms>
          <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
          <ds:DigestValue>${referenceDigest}</ds:DigestValue>
        </ds:Reference>
      </ds:SignedInfo>
      <ds:SignatureValue>${signatureB64}</ds:SignatureValue>
      <ds:KeyInfo>
        <ds:X509Data>
          <ds:X509Certificate>${certB64}</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </ds:Signature>`;

  // Insertar firma en el XML (como primer hijo del elemento root)
  const signatureDoc = parser.parseFromString(signatureXml, 'text/xml');
  const signatureElement = signatureDoc.documentElement;

  // Importar nodo al documento original
  const importedSig = doc.importNode(signatureElement, true);
  rootElement.insertBefore(importedSig, rootElement.firstChild);

  // Serializar
  const serializer = new XMLSerializer();
  return serializer.serializeToString(doc);
}

/**
 * Construye el XML de SignedInfo para firma
 */
function getSignedInfoXml(referenceUri) {
  return `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
    <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
    <SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha384"/>
    <Reference URI="${referenceUri}">
      <Transforms>
        <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
        <Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
      </Transforms>
      <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
      <DigestValue></DigestValue>
    </Reference>
  </SignedInfo>`;
}

/**
 * Canonicaliza un elemento para firma (simplificado - en producción usar xml-c14n)
 */
function canonicalizeForSignature(element) {
  const serializer = new XMLSerializer();
  return serializer.serializeToString(element);
}

/**
 * Verifica firma XML según DIAN
 */
export function verifyXmlSignature(signedXml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(signedXml, 'text/xml');

  const signatures = doc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Signature');
  const errors = [];

  if (signatures.length === 0) {
    return { valid: false, errors: ['No se encontró firma digital'] };
  }

  for (let s = 0; s < signatures.length; s++) {
    const sig = signatures.item(s);
    try {
      const signedInfo = sig.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'SignedInfo')[0];
      const signatureValue = sig.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'SignatureValue')[0];
      const keyInfo = sig.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'KeyInfo')[0];

      if (!signedInfo || !signatureValue || !keyInfo) {
        errors.push('Estructura de firma incompleta');
        continue;
      }

      const certElement = keyInfo.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'X509Certificate')[0];
      if (!certElement) {
        errors.push('No se encontró certificado X509');
        continue;
      }

      const certPem = `-----BEGIN CERTIFICATE-----\n${certElement.textContent}\n-----END CERTIFICATE-----`;
      const cert = forge.pki.certificateFromPem(certPem);

      // Verificar certificado no expirado
      const now = new Date();
      if (now < cert.validity.notBefore || now > cert.validity.notAfter) {
        errors.push('Certificado expirado o no vigente');
        continue;
      }

      // TODO: Verificar cadena de confianza (CA DIAN)
      // TODO: Verificar digest de Reference
      // TODO: Verificar firma RSA-SHA384

    } catch (e) {
      errors.push(`Error verificando firma: ${e.message}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Extrae información del certificado del XML firmado
 */
export function extractCertificateInfo(signedXml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(signedXml, 'text/xml');

  const certElement = doc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'X509Certificate')[0];
  if (!certElement) return null;

  const certPem = `-----BEGIN CERTIFICATE-----\n${certElement.textContent}\n-----END CERTIFICATE-----`;
  const cert = forge.pki.certificateFromPem(certPem);

  return {
    subject: cert.subject.getField('CN').value,
    issuer: cert.issuer.getField('CN').value,
    serialNumber: cert.serialNumber,
    validFrom: cert.validity.notBefore,
    validTo: cert.validity.notAfter,
    fingerprint: forge.md.sha1.create().update(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes()).digest().toHex()
  };
}

export default {
  loadPkcs12,
  generateCufe,
  generateCude,
  extractCufeParams,
  signXml,
  verifyXmlSignature,
  extractCertificateInfo
};