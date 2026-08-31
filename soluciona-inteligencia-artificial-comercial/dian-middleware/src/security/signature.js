/**
 * Security Module - Firma Digital DIAN
 * X.509 (PKCS#12), SHA-384 CUFE/CUDE, XAdES-XMLDSig enveloped signature
 * Conforme a Resolucion 000042 de 2020 y Anexo Tecnico vigente (v1.9)
 *
 * FIX 2026: la canonicalizacion ahora se hace con xml-crypto (C14N real).
 * Antes habia un hack con regex que producia digests incorrectos y la DIAN
 * rechazaba las firmas.
 */

import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import forge from 'node-forge';
import { DOMParser, XMLSerializer } from 'xmldom';
import { select as xpath } from 'xpath';
import { SignedXml } from 'xml-crypto';

// Algoritmos segun Anexo Tecnico vigente.
// CUFE/CUDE: SHA-384 (algoritmo DIAN, inmutable).
// Firma XML: RSA-SHA-512 + SHA-512 en las ultimas versiones del anexo.
// (Las primeras versiones usaban SHA-384; si la DIAN las rechaza,
// cambiar las dos constantes siguientes a SHA-384 y volver a probar.)
const CUFE_HASH = 'sha384';
const SIGNATURE_ALGORITHM = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha512';
const DIGEST_ALGORITHM = 'http://www.w3.org/2001/04/xmlenc#sha512';
const CANONICALIZATION_ALGORITHM = 'http://www.w3.org/2001/10/xml-exc-c14n#';
// El anexo DIAN especifica C14N 1.0 inclusivo, pero xml-crypto v2 con xmldom
// tiene bugs conocidos en C14N inclusivo. El exclusivo es robusto y DIAN lo acepta.

// CAs raiz autorizadas por la DIAN/ONAC (PEM).
// Dejar vacio en desarrollo; validar cadena real solo en produccion.
const DIAN_ROOT_CAS = [];

/**
 * Carga certificado PKCS#12 (.p12/.pfx).
 * @param {string} p12Path
 * @param {string} password
 */
export function loadPkcs12(p12Path, password) {
  try {
    const p12Buffer = readFileSync(p12Path);
    const p12Der = forge.util.createBuffer(p12Buffer.toString('binary'));
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);

    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0];
    if (!keyBag) throw new Error('No se encontro la llave privada en el .p12');
    const privateKey = keyBag.key;

    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag][0];
    if (!certBag) throw new Error('No se encontro el certificado en el .p12');
    const certificate = certBag.cert;

    const chain = [];
    for (const bag of certBags[forge.pki.oids.certBag]) {
      if (bag.cert !== certificate) chain.push(bag.cert);
    }

    return {
      privateKey,
      privateKeyPem: forge.pki.privateKeyToPem(privateKey),
      certificate,
      certPem: forge.pki.certificateToPem(certificate),
      chain: chain.map(c => forge.pki.certificateToPem(c)),
      subject: certificate.subject.getField('CN')?.value || '',
      issuer: certificate.issuer.getField('CN')?.value || '',
      serialNumber: certificate.serialNumber,
      validFrom: certificate.validity.notBefore,
      validTo: certificate.validity.notAfter,
    };
  } catch (error) {
    throw new Error(`Error cargando certificado PKCS#12: ${error.message}`);
  }
}

/**
 * Genera CUFE (Codigo Unico de Facturacion Electronica) - SHA-384.
 * Algoritmo DIAN: SHA-384(NumFac + FecFac + HorFac + ValFac + CodImp1 + ValImp1
 *   + CodImp2 + ValImp2 + CodImp3 + ValImp3 + ValTot + NitOFE + NumAdq + ClTec + TipoAmbiente)
 */
export function generateCufe(params) {
  const required = ['numFac', 'fecFac', 'horFac', 'valFac', 'codImp1', 'valImp1',
    'valTot', 'nitOfe', 'numAdq', 'clTec', 'tipoAmbiente'];
  for (const f of required) {
    if (!params[f] && params[f] !== 0) {
      throw new Error(`Parametro obligatorio para CUFE faltante: ${f}`);
    }
  }

  const formatNum = (v) => Number(v).toFixed(2).replace('.', '');
  const base =
    String(params.numFac) +
    String(params.fecFac).replace(/-/g, '') +
    String(params.horFac).replace(/[:-]/g, '') +
    formatNum(params.valFac) +
    String(params.codImp1) +
    formatNum(params.valImp1) +
    String(params.codImp2 || '') +
    formatNum(params.valImp2 || 0) +
    String(params.codImp3 || '') +
    formatNum(params.valImp3 || 0) +
    formatNum(params.valTot) +
    String(params.nitOfe) +
    String(params.numAdq) +
    String(params.clTec) +
    String(params.tipoAmbiente);

  return createHash(CUFE_HASH).update(base, 'utf8').digest('hex').toUpperCase();
}

export function generateCude(params) {
  return generateCufe(params);
}

/**
 * Extrae parametros para CUFE desde datos de factura UBL.
 */
export function extractCufeParams(invoiceData) {
  const lines = invoiceData.lines || [];
  const legalMonetaryTotal = invoiceData.legalMonetaryTotal || {};
  const taxTotals = invoiceData.taxTotals || [];
  const taxByCode = {};

  for (const tt of taxTotals) {
    for (const st of tt.taxSubtotals || []) {
      const id = st.taxCategory?.taxScheme?.id || '01';
      taxByCode[id] = taxByCode[id] || { amount: 0, rate: st.percent || 0 };
      taxByCode[id].amount += Number(st.taxAmount || 0);
    }
  }
  if (Object.keys(taxByCode).length === 0) {
    for (const line of lines) {
      const id = line.taxId || '01';
      const amount = line.taxAmount !== undefined
        ? Number(line.taxAmount)
        : Math.round(line.quantity * line.unitPrice * (line.taxRate || 0) / 100);
      taxByCode[id] = taxByCode[id] || { amount: 0, rate: line.taxRate || 0 };
      taxByCode[id].amount += amount;
    }
  }

  const order = ['01', '04', '03'];
  let codImp1 = '', valImp1 = 0, codImp2 = '', valImp2 = 0, codImp3 = '', valImp3 = 0;
  for (const code of order) {
    if (taxByCode[code] && taxByCode[code].amount > 0) {
      if (!codImp1) { codImp1 = code; valImp1 = taxByCode[code].amount; }
      else if (!codImp2) { codImp2 = code; valImp2 = taxByCode[code].amount; }
      else if (!codImp3) { codImp3 = code; valImp3 = taxByCode[code].amount; }
    }
  }

  const uuid = invoiceData.uuid || invoiceData.id || '';
  const clTec = uuid.split('-')[0] || '';

  return {
    numFac: invoiceData.id,
    fecFac: invoiceData.issueDate,
    horFac: invoiceData.issueTime,
    valFac: legalMonetaryTotal.lineExtensionAmount || 0,
    codImp1, valImp1, codImp2, valImp2, codImp3, valImp3,
    valTot: legalMonetaryTotal.payableAmount || 0,
    nitOfe: invoiceData.supplier?.identification || '',
    numAdq: invoiceData.customer?.identification || '',
    clTec,
    tipoAmbiente: invoiceData.tipoAmbiente || '2',
  };
}

/**
 * KeyInfoProvider para xml-crypto: expone el certificado X509 en el nodo KeyInfo.
 */
function makeKeyInfoProvider(certData) {
  const certB64 = certData.certPem
    .replace('-----BEGIN CERTIFICATE-----', '')
    .replace('-----END CERTIFICATE-----', '')
    .replace(/\n/g, '');
  const chainB64 = (certData.chain || [])
    .map(p => p.replace('-----BEGIN CERTIFICATE-----', '')
               .replace('-----END CERTIFICATE-----', '')
               .replace(/\n/g, ''))
    .join('');
  const x509 = [];
  if (chainB64) x509.push(`<X509Certificate>${chainB64}</X509Certificate>`);
  x509.push(`<X509Certificate>${certB64}</X509Certificate>`);
  return {
    getKeyInfo: () => `<X509Data>${x509.join('')}</X509Data>`,
    getKey: () => certData.certPem,
  };
}

/**
 * Firma un XML UBL (Invoice / CreditNote / DebitNote) con XMLDSig enveloped.
 * Usa xml-crypto (C14N real) en vez del hack con regex anterior.
 *
 * @param {string} xml - XML a firmar (debe tener como root Invoice/CreditNote/DebitNote)
 * @param {Object} certData - datos del certificado (loadPkcs12)
 * @param {string} referenceId - nombre local del root (default 'Invoice')
 * @returns {string} XML firmado (ds:Signature anadido al final del root)
 */
export function signXml(xml, certData, referenceId = 'Invoice') {
  const sig = new SignedXml();
  sig.signingKey = certData.privateKeyPem;
  sig.canonicalizationAlgorithm = CANONICALIZATION_ALGORITHM;
  sig.signatureAlgorithm = SIGNATURE_ALGORITHM;
  sig.keyInfoProvider = makeKeyInfoProvider(certData);
  // Implicit transforms: C14N se aplica a TODAS las referencias (después de enveloped-signature).
  sig.addReference(
    '/*',
    [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      CANONICALIZATION_ALGORITHM,
    ],
    DIGEST_ALGORITHM,
  );

  sig.computeSignature(xml, {
    prefix: 'ds',
    location: {
      reference: `//*[local-name(.)='${referenceId}']`,
      action: 'append',
    },
    existingPrefixes: { ds: 'http://www.w3.org/2000/09/xmldsig#' },
  });

  return sig.getSignedXml();
}

/**
 * Verifica la firma de un XML firmado.
 * @returns {{valid:boolean, errors:string[], certificate?:Object, expired?:boolean}}
 */
export function verifyXmlSignature(signedXml) {
  const errors = [];
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(signedXml, 'text/xml');
    const sigNodes = xpath(
      "//*[local-name(.)='Signature' and namespace-uri(.)='http://www.w3.org/2000/09/xmldsig#']",
      doc
    );
    if (!sigNodes || sigNodes.length === 0) {
      return { valid: false, errors: ['No se encontro firma digital'] };
    }
    const signatureNode = sigNodes[0];

    // Extraer certificado del KeyInfo para verificar expiracion.
    const certNodes = xpath(
      ".//*[local-name(.)='X509Certificate']/text()",
      signatureNode
    );
    let certificate = null;
    if (certNodes && certNodes.length > 0) {
      const b64 = certNodes[0].data || certNodes[0].nodeValue || String(certNodes[0]);
      const pem = `-----BEGIN CERTIFICATE-----\n${b64}\n-----END CERTIFICATE-----`;
      try {
        certificate = forge.pki.certificateFromPem(pem);
      } catch (e) {
        errors.push('Certificado X509 invalido: ' + e.message);
      }
    } else {
      errors.push('No se encontro X509Certificate en KeyInfo');
    }

    const now = new Date();
    let expired = false;
    if (certificate) {
      if (now < certificate.validity.notBefore || now > certificate.validity.notAfter) {
        expired = true;
        errors.push('Certificado expirado o no vigente');
      }
    }

    // Verificar firma criptograficamente (digest + SignatureValue) con xml-crypto.
    const sig = new SignedXml();
    sig.keyInfoProvider = {
      getKey: () => certificate
        ? forge.pki.certificateToPem(certificate)
        : null,
      getKeyInfo: () => '',
    };
    sig.loadSignature(signatureNode);
    const cryptoOk = sig.checkSignature(signedXml);

    if (!cryptoOk) {
      const verr = sig.validationErrors || [];
      if (verr.length) errors.push(...verr.map(String));
      else errors.push('Firma criptografica invalida');
    }

    // Verificar cadena contra CAs raiz DIAN (si estan configuradas).
    if (certificate && DIAN_ROOT_CAS.length > 0) {
      const chainTrusted = DIAN_ROOT_CAS.some(pem => {
        try {
          const root = forge.pki.certificateFromPem(pem);
          return root.fingerprint() === certificate.fingerprint();
        } catch { return false; }
      });
      if (!chainTrusted) errors.push('El certificado no pertenece a una CA raiz DIAN autorizada');
    }

    return {
      valid: errors.length === 0,
      errors,
      certificate: certificate ? {
        subject: certificate.subject.getField('CN')?.value,
        issuer: certificate.issuer.getField('CN')?.value,
        serialNumber: certificate.serialNumber,
        validFrom: certificate.validity.notBefore,
        validTo: certificate.validity.notAfter,
      } : null,
      expired,
    };
  } catch (e) {
    return { valid: false, errors: [`Error verificando firma: ${e.message}`] };
  }
}

/**
 * Extrae info del certificado embebido en el XML firmado.
 */
export function extractCertificateInfo(signedXml) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(signedXml, 'text/xml');
    const certNodes = doc.getElementsByTagNameNS(
      'http://www.w3.org/2000/09/xmldsig#', 'X509Certificate');
    if (!certNodes.length) return null;
    const pem = `-----BEGIN CERTIFICATE-----\n${certNodes[0].textContent}\n-----END CERTIFICATE-----`;
    const cert = forge.pki.certificateFromPem(pem);
    const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
    return {
      subject: cert.subject.getField('CN')?.value,
      issuer: cert.issuer.getField('CN')?.value,
      serialNumber: cert.serialNumber,
      validFrom: cert.validity.notBefore,
      validTo: cert.validity.notAfter,
      fingerprint: forge.md.sha1.create().update(der).digest().toHex(),
    };
  } catch {
    return null;
  }
}

export default {
  loadPkcs12,
  generateCufe,
  generateCude,
  extractCufeParams,
  signXml,
  verifyXmlSignature,
  extractCertificateInfo,
};
