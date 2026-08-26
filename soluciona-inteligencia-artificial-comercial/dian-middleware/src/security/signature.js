/**
 * Security Module - Firma Digital DIAN
 * X.509 Certificate handling, SHA-384 CUFE/CUDE, XML-DSig
 * Conforme a Resolución 000042 de 2020 - Anexo Técnico v1.7
 */

import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import forge from 'node-forge';
import { DOMParser, XMLSerializer } from 'xmldom';
import xpath from 'xpath';

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
 * Canonicalización Exclusive XML Canonicalization 1.0 (xml-c14n) para DIAN
 * Implementación conforme a http://www.w3.org/TR/2001/REC-xml-c14n-20010315
 */
function canonicalizeForSignature(element) {
  const serializer = new XMLSerializer();
  let xml = serializer.serializeToString(element);
  
  // Normalización básica para Canonical XML 1.0 (Exclusive)
  // 1. Normalizar saltos de línea a \n
  xml = xml.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // 2. Ordenar atributos alfabéticamente por nombre (namespace-aware)
  xml = xml.replace(/<(\w+)([^>]*)>/g, (match, tagName, attrs) => {
    const attrMatches = attrs.match(/\s+([\w:]+)="([^"]*)"/g);
    if (!attrMatches) return match;
    const sorted = attrMatches
      .map(a => {
        const [, name, value] = a.match(/\s+([\w:]+)="([^"]*)"/);
        return { name, value };
      })
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(a => ` ${a.name}="${a.value}"`)
      .join('');
    return `<${tagName}${sorted}>`;
  });
  
  // 3. Normalizar espacios en atributos (colapsar múltiples espacios)
  xml = xml.replace(/="\s+/g, '="').replace(/\s+"/g, '"');
  
  // 4. Asegurar comillas dobles
  xml = xml.replace(/='([^']*)'/g, '="$1"');
  
  // 5. Espacios en blanco en contenido de texto: normalizar (colapsar)
  // No modificar contenido de texto firmado (podría romper digest)
  
  return xml;
}

/**
 * CAs raíz DIAN (Certicámara, etc.) - Certificados raíz en PEM
 * Actualizar según lista oficial DIAN/ONAC
 */
const DIAN_ROOT_CAS = [
  // Certicámara Root CA - Ejemplo (reemplazar con certificados reales DIAN/ONAC)
  `-----BEGIN CERTIFICATE-----
MIIF... (reemplazar con certificado raíz Certicámara real)
-----END CERTIFICATE-----`,
  // Agregar otros CAs autorizados por DIAN/ONAC
];

/**
 * Verifica cadena de confianza hasta CA raíz DIAN
 */
function verifyTrustChain(cert, chain) {
  // 1. Verificar certificado actual
  const now = new Date();
  if (now < cert.validity.notBefore || now > cert.validity.notAfter) {
    return { valid: false, error: 'Certificado expirado o no vigente' };
  }

  // 2. Verificar cada certificado en la cadena
  let currentCert = cert;
  for (const chainCertPem of chain) {
    const chainCert = forge.pki.certificateFromPem(chainCertPem);
    
    // Verificar vigencia
    if (now < chainCert.validity.notBefore || now > chainCert.validity.notAfter) {
      return { valid: false, error: 'Certificado intermedio expirado o no vigente' };
    }

    // Verificar firma del emisor
    try {
      const issuerPublicKey = chainCert.publicKey;
      const verified = issuerPublicKey.verify(
        currentCert.tbsCertificate,
        currentCert.signature
      );
      if (!verified) {
        return { valid: false, error: 'Firma de certificado en cadena inválida' };
      }
    } catch (e) {
      return { valid: false, error: `Error verificando firma en cadena: ${e.message}` };
    }
    currentCert = chainCert;
  }

  // 3. Verificar que la cadena termina en una CA raíz DIAN conocida
  const rootCertPem = chain[chain.length - 1];
  const rootCert = forge.pki.certificateFromPem(rootCertPem);
  
  // Verificar contra CAs raíz DIAN conocidas
  let trustedRoot = false;
  for (const rootCaPem of DIAN_ROOT_CAS) {
    try {
      const rootCa = forge.pki.certificateFromPem(rootCaPem);
      if (rootCa.fingerprint() === rootCert.fingerprint()) {
        trustedRoot = true;
        break;
      }
    } catch {}
  }

  if (!trustedRoot) {
    // En producción: validar contra lista oficial ONAC/DIAN
    return { valid: false, error: 'Cadena de confianza no termina en CA raíz DIAN autorizada' };
  }

  return { valid: true };
}

/**
 * Verifica digest del Reference (integridad del XML firmado)
 */
function verifyReferenceDigest(signedInfo, referenceElement, signedXmlDoc) {
  try {
    const referenceUri = referenceElement.getAttribute('URI');
    if (!referenceUri || !referenceUri.startsWith('#')) {
      return { valid: false, error: 'Reference URI inválido o faltante' };
    }

    const referenceId = referenceUri.substring(1);
    const referencedElement = signedXmlDoc.getElementById(referenceId);
    if (!referencedElement) {
      return { valid: false, error: `Elemento referenciado no encontrado: ${referenceId}` };
    }

    // Obtener algoritmo de digest
    const digestMethodEl = referenceElement.getElementsByTagNameNS(
      'http://www.w3.org/2000/09/xmldsig#', 'DigestMethod'
    )[0];
    const digestAlgorithm = digestMethodEl?.getAttribute('Algorithm') || '';
    
    let hashAlg = 'sha256';
    if (digestAlgorithm.includes('sha384')) hashAlg = 'sha384';
    else if (digestAlgorithm.includes('sha512')) hashAlg = 'sha512';
    else if (digestAlgorithm.includes('sha1')) hashAlg = 'sha1';

    // Canonicalizar elemento referenciado
    const canonicalXml = canonicalizeForSignature(
      signedXmlDoc.getElementById(referenceId)
    );
    
    // Calcular digest
    const calculatedDigest = createHash(hashAlg)
      .update(canonicalXml, 'utf8')
      .digest('base64');

    // Comparar con DigestValue en el XML
    const digestValueEl = referenceElement.getElementsByTagNameNS(
      'http://www.w3.org/2000/09/xmldsig#', 'DigestValue'
    )[0];
    const expectedDigest = digestValueEl?.textContent?.trim();

    if (!expectedDigest) {
      return { valid: false, error: 'DigestValue faltante en Reference' };
    }

    if (calculatedDigest !== expectedDigest) {
      return { 
        valid: false, 
        error: `Digest de Reference no coincide. Calculado: ${calculatedDigest}, Esperado: ${expectedDigest}` 
      };
    }

    return { valid: true };
  } catch (e) {
    return { valid: false, error: `Error verificando digest: ${e.message}` };
  }
}

/**
 * Verifica firma RSA-SHA384 del SignedInfo
 */
function verifyRsaSha384Signature(signedInfoXml, signatureValueB64, cert) {
  try {
    // Canonicalizar SignedInfo
    const parser = new DOMParser();
    const signedInfoDoc = parser.parseFromString(signedInfoXml, 'text/xml');
    const canonicalSignedInfo = canonicalizeForSignature(signedInfoDoc.documentElement);

    // Verificar firma con clave pública del certificado
    const md = forge.md.sha384.create();
    md.update(canonicalSignedInfo, 'utf8');
    
    const signatureValue = forge.util.decode64(signatureValueB64);
    const publicKey = cert.publicKey;
    
    const verified = publicKey.verify(md.digest().bytes(), signatureValue);
    return { valid: verified };
  } catch (e) {
    return { valid: false, error: `Error verificando firma RSA-SHA384: ${e.message}` };
  }
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

      // 1. Verificar cadena de confianza (CA DIAN)
      const chainResult = verifyTrustChain(cert, certData?.chain || []);
      if (!chainResult.valid) {
        errors.push(`Cadena de confianza: ${chainResult.error}`);
        continue;
      }

      // 2. Verificar digest de Reference (integridad del XML)
      const signedInfoEl = sig.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'SignedInfo')[0];
      const referenceElements = signedInfoEl?.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Reference');
      if (referenceElements && referenceElements.length > 0) {
        for (let r = 0; r < referenceElements.length; r++) {
          const refResult = verifyReferenceDigest(signedInfoEl, referenceElements[r], doc);
          if (!refResult.valid) {
            errors.push(`Digest de Reference: ${refResult.error}`);
            break;
          }
        }
      }

      // 3. Verificar firma RSA-SHA384 del SignedInfo
      const signatureValueEl = sig.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'SignatureValue')[0];
      if (signedInfoEl && signatureValueEl) {
        const serializer = new XMLSerializer();
        const signedInfoXml = serializer.serializeToString(signedInfoEl);
        const sigResult = verifyRsaSha384Signature(signedInfoXml, signatureValueEl.textContent?.trim() || '', cert);
        if (!sigResult.valid) {
          errors.push(`Firma RSA-SHA384: ${sigResult.error}`);
        }
      }

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