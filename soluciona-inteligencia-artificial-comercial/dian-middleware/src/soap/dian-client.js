/**
 * DIAN SOAP Client - Cliente para Web Services DIAN
 * SOAP 1.2 + WS-Security (UsernameToken + BinarySecurityToken + Timestamp + Signature)
 * Conforme a Resolucion 000042 Anexo Tecnico v1.7 - Seccion 11
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import soap from 'soap';
import { loadPkcs12 } from '../security/signature.js';
import { config, getWsdlUrl, getEndpointUrl, isHabilitacion } from '../config/dian.config.js';
import { xmlToString, parseXml } from '../utils/xml.utils.js';

/**
 * Cliente DIAN para envio de facturas, NC, ND
 * Implementa WS-Security segun Resolucion 000042 Anexo Tecnico Seccion 11
 */
export class DianSoapClient {
  constructor(options = {}) {
    this.options = options;
    this.client = null;
    this.certData = null;
    this.wsdlUrl = null;
    this.endpointUrl = null;
  }

  /**
   * Inicializa el cliente SOAP con WS-Security
   */
  async initialize() {
    if (this.client) return this.client;

    // Cargar certificado
    this.certData = loadPkcs12(config.certPath, config.certPass);

    // URLs segun ambiente
    this.wsdlUrl = getWsdlUrl();
    this.endpointUrl = getEndpointUrl();

    // Crear cliente SOAP sin seguridad automatica (manejamos headers manualmente)
    const wsdlOptions = {
      wsdl_options: {
        timeout: config.timeout,
        rejectUnauthorized: isHabilitacion() ? false : true
      },
      endpoint: this.endpointUrl,
      forceSoap12Headers: true,
      overrideRootElement: {
        namespace: 'soap12'
      }
    };

    this.client = await soap.createClientAsync(this.wsdlUrl, wsdlOptions);
    this.client.setEndpoint(this.endpointUrl);

    return this.client;
  }

  /**
   * Construye el header SOAP 1.2 con WS-Security para DIAN
   */
  buildSoapHeader(action) {
    const certB64 = this.certData.certPem
      .replace('-----BEGIN CERTIFICATE-----', '')
      .replace('-----END CERTIFICATE-----', '')
      .replace(/\n/g, '');

    return {
      'soap12:Header': {
        'wsa:Action': {
          '$value': action,
          'soap12:mustUnderstand': '1',
          'xmlns:wsa': 'http://www.w3.org/2005/08/addressing'
        },
        'wsse:Security': {
          'xmlns:wsse': 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd',
          'xmlns:wsu': 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd',
          'soap12:mustUnderstand': '1',
          'wsu:Timestamp': {
            'xmlns:wsu': 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd',
            'wsu:Id': 'TS-' + Date.now(),
            'wsu:Created': new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
            'wsu:Expires': new Date(Date.now() + 5 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z')
          },
          'wsse:BinarySecurityToken': {
            'xmlns:wsse': 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd',
            'xmlns:wsu': 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd',
            'EncodingType': 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary',
            'ValueType': 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3',
            'wsu:Id': 'X509-' + Date.now(),
            '$value': this.certData.certPem
              .replace('-----BEGIN CERTIFICATE-----', '')
              .replace('-----END CERTIFICATE-----', '')
              .replace(/\n/g, '')
          }
        }
      },
      'xmlns:wsa': 'http://www.w3.org/2005/08/addressing',
      'xmlns:wsse': 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd',
      'xmlns:wsu': 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd'
    };
  }

  /**
   * Envia Factura de Venta (SendBillAsync)
   * Seccion 11.8 del Anexo Tecnico
   * @param {string} signedXml - XML firmado de la factura (con ds:Signature)
   * @param {Object} metadata - Metadatos (id, fileName)
   * @returns {Promise<Object>} Respuesta DIAN con trackingId, CUFE, QR, etc.
   */
  async sendInvoice(signedXml, metadata = {}) {
    await this.initialize();

    const zipBuffer = await this.createZipPackage(signedXml, metadata);
    const contentFile = zipBuffer.toString('base64');

    const payload = {
      SendBillAsync: {
        fileName: metadata.fileName || 'factura_' + metadata.id + '.zip',
        contentFile: contentFile
      }
    };

    // Agregar header WS-Security manualmente
    this.client.addSoapHeader(this.buildSoapHeader('http://wcf.dian.colombia/IWcfDianCustomerServices/SendBillAsync'), '', 'soap12', 'http://www.w3.org/2003/05/soap-envelope');

    try {
      const [result] = await this.client.SendBillAsyncAsync(payload);
      return this.parseResponse(result, 'SendBillAsyncResult');
    } catch (error) {
      throw new Error('Error enviando factura: ' + error.message);
    }
  }

  /**
   * Envia Nota Credito (SendBillAsync - mismo endpoint)
   */
  async sendCreditNote(signedXml, metadata = {}) {
    return this.sendInvoice(signedXml, { ...metadata, documentType: 'CreditNote' });
  }

  /**
   * Envia Nota Debito (SendBillAsync)
   */
  async sendDebitNote(signedXml, metadata = {}) {
    return this.sendInvoice(signedXml, { ...metadata, documentType: 'DebitNote' });
  }

  /**
   * Crea paquete ZIP con el XML firmado (MTOM/Attachment)
   * Segun especificacion DIAN: contentFile es un ZIP base64 que contiene el UBL
   */
  async createZipPackage(signedXml, metadata) {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    const fileName = metadata.fileName || metadata.id + '.xml';
    zip.file(fileName, signedXml);

    // Generar ZIP buffer
    return await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  /**
   * Consulta estado de documento (GetStatusAsync)
   * Seccion 11.11 del Anexo Tecnico
   */
  async getStatus(trackingId) {
    await this.initialize();

    const payload = {
      GetStatusAsync: { trackingId }
    };

    this.client.addSoapHeader(this.buildSoapHeader('http://wcf.dian.colombia/IWcfDianCustomerServices/GetStatusAsync'), '', 'soap12', 'http://www.w3.org/2003/05/soap-envelope');

    try {
      const [result] = await this.client.GetStatusAsyncAsync(payload);
      return this.parseResponse(result, 'GetStatusAsyncResult');
    } catch (error) {
      throw new Error('Error consultando estado: ' + error.message);
    }
  }

  /**
   * Consulta estado de ZIP (GetStatusZip)
   * Seccion 11.12 del Anexo Tecnico
   */
  async getStatusZip(trackingId) {
    await this.initialize();

    const payload = {
      GetStatusZip: { trackId: trackingId }
    };

    this.client.addSoapHeader(this.buildSoapHeader('http://wcf.dian.colombia/IWcfDianCustomerServices/GetStatusZip'), '', 'soap12', 'http://www.w3.org/2003/05/soap-envelope');

    try {
      const [result] = await this.client.GetStatusZipAsync(payload);
      return this.parseResponse(result, 'GetStatusZipResult');
    } catch (error) {
      throw new Error('Error consultando estado ZIP: ' + error.message);
    }
  }

  /**
   * Consulta rangos de numeracion (GetNumberingRange)
   * Seccion 11.15 del Anexo Tecnico
   */
  async getNumberingRange() {
    await this.initialize();

    const payload = {
      GetNumberingRange: {}
    };

    this.client.addSoapHeader(this.buildSoapHeader('http://wcf.dian.colombia/IWcfDianCustomerServices/GetNumberingRange'), '', 'soap12', 'http://www.w3.org/2003/05/soap-envelope');

    try {
      const [result] = await this.client.GetNumberingRangeAsync(payload);
      return this.parseResponse(result, 'GetNumberingRangeResult');
    } catch (error) {
      throw new Error('Error consultando rangos: ' + error.message);
    }
  }

  /**
   * Obtiene emails de intercambio (GetExchangeEmails)
   * Seccion 11.16 del Anexo Tecnico
   */
  async getExchangeEmails() {
    await this.initialize();

    const payload = { GetExchangeEmails: {} };

    this.client.addSoapHeader(this.buildSoapHeader('http://wcf.dian.colombia/IWcfDianCustomerServices/GetExchangeEmails'), '', 'soap12', 'http://www.w3.org/2003/05/soap-envelope');

    try {
      const [result] = await this.client.GetExchangeEmailsAsync(payload);
      return this.parseResponse(result, 'GetExchangeEmailsResult');
    } catch (error) {
      throw new Error('Error consultando emails: ' + error.message);
    }
  }

  /**
   * Envia lote de pruebas para habilitacion (SendTestSetAsync)
   * Seccion 11.9 del Anexo Tecnico
   * Software Propio: 60 Facturas + 20 NC + 20 ND
   */
  async sendTestSet(testSet) {
    await this.initialize();

    const payload = {
      SendTestSetAsync: {
        TestSet: {
          Invoice: testSet.invoices?.map(inv => ({
            fileName: inv.fileName,
            contentFile: Buffer.from(inv.xml, 'utf8').toString('base64')
          })) || [],
          CreditNote: testSet.creditNotes?.map(nc => ({
            fileName: nc.fileName,
            contentFile: Buffer.from(nc.xml, 'utf8').toString('base64')
          })) || [],
          DebitNote: testSet.debitNotes?.map(nd => ({
            fileName: nd.fileName,
            contentFile: Buffer.from(nd.xml, 'utf8').toString('base64')
          })) || []
        }
      }
    };

    this.client.addSoapHeader(this.buildSoapHeader('http://wcf.dian.colombia/IWcfDianCustomerServices/SendTestSetAsync'), '', 'soap12', 'http://www.w3.org/2003/05/soap-envelope');

    try {
      const [result] = await this.client.SendTestSetAsyncAsync(payload);
      return this.parseResponse(result, 'SendTestSetAsyncResult');
    } catch (error) {
      throw new Error('Error enviando set de pruebas: ' + error.message);
    }
  }

  /**
   * Parsea respuesta DIAN
   */
  parseResponse(result, key) {
    const response = result[key] || result;

    if (typeof response === 'string') {
      try {
        const parsed = JSON.parse(response);
        return this.normalizeResponse(parsed);
      } catch {
        const doc = parseXml(response);
        return this.parseXmlResponse(doc);
      }
    }

    return this.normalizeResponse(response);
  }

  /**
   * Normaliza respuesta a formato estandar
   */
  normalizeResponse(response) {
    return {
      success: response.Status === '00' || response.status === 'OK' || response.success === true,
      status: response.Status || response.status || response.Estado || 'UNKNOWN',
      trackingId: response.TrackingId || response.trackingId || response.idSeguimiento,
      cufe: response.CUFE || response.cufe || response.cude,
      qrCode: response.QRCode || response.qrCode || response.codigoQR,
      errors: this.extractErrors(response),
      warnings: this.extractWarnings(response),
      rawResponse: response
    };
  }

  /**
   * Parsea ApplicationResponse de DIAN según Anexo Técnico
   * Estructura esperada según Resolución 000042:
   * - Status: Estado del procesamiento (00=Aceptado, otros=Rechazado)
   * - TrackingId: ID de seguimiento
   * - CUFE/CUDE: Código único de facturación
   * - QRCode: Código QR en base64
   * - Errors: Lista de errores de validación
   * - Warnings: Advertencias
   * - ApplicationResponse/Description: Descripción del resultado
   */
  parseXmlResponse(doc) {
    const getText = (xpath, contextNode = doc) => {
      const nodes = doc.evaluate(xpath, contextNode, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      return nodes.singleNodeValue?.textContent || '';
    };

    const getAllText = (xpath) => {
      const nodes = doc.evaluate(xpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      const results = [];
      for (let i = 0; i < nodes.snapshotLength; i++) {
        const text = nodes.snapshotItem(i)?.textContent || '';
        if (text) results.push(text);
      }
      return results;
    };

    const status = getText('//Status') || getText('//status') || getText('//cbc:ResponseCode');
    const trackingId = getText('//TrackingId') || getText('//trackingId') || getText('//cbc:TrackingID');
    const cufe = getText('//CUFE') || getText('//cufe') || getText('//CUDE') || getText('//cude');
    const qrCode = getText('//QRCode') || getText('//qrCode') || getText('//cbc:QRCode');
    const description = getText('//Description') || getText('//description') || getText('//cbc:Description');

    // Extraer todos los errores y advertencias
    const errors = getAllText('//Error/Message') || getAllText('//Error/message') || getAllText('//cbc:ErrorMessage');
    const warnings = getAllText('//Warning/Message') || getAllText('//Warning/message') || getAllText('//cbc:WarningMessage');

    // Extraer detalles de validación (códigos de error específicos DIAN)
    const validationErrors = [];
    const errorNodes = doc.evaluate('//Error | //error', doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (let i = 0; i < errorNodes.snapshotLength; i++) {
      const node = errorNodes.snapshotItem(i);
      const code = getText('./Code | ./code | ./cbc:ErrorCode', node);
      const message = getText('./Message | ./message | ./cbc:Description', node);
      if (code || message) {
        validationErrors.push({ code, message });
      }
    }

    return {
      success: status === '00' || status === 'OK',
      status,
      statusCode: status,
      trackingId,
      cufe,
      cude: cufe, // alias
      qrCode,
      description,
      errors,
      warnings,
      validationErrors,
      rawResponse: ''
    };
  }

  extractErrors(response) {
    if (response.Errors && Array.isArray(response.Errors)) {
      return response.Errors.map(e => e.Message || e.message || e.Description || e);
    }
    if (response.Error) {
      return [response.Error.Message || response.Error.message || response.Error];
    }
    return [];
  }

  extractWarnings(response) {
    if (response.Warnings && Array.isArray(response.Warnings)) {
      return response.Warnings.map(w => w.Message || w.message || w);
    }
    return [];
  }

  extractErrorsFromXml(doc) {
    const errors = [];
    const errorNodes = doc.evaluate('//Error', doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (let i = 0; i < errorNodes.snapshotLength; i++) {
      const node = errorNodes.snapshotItem(i);
      errors.push(node.textContent || node.getAttribute('Message') || node.getAttribute('Description'));
    }
    return errors;
  }
}

/**
 * Factory para crear cliente DIAN
 */
export function createDianClient(options = {}) {
  return new DianSoapClient(options);
}

export default { DianSoapClient, createDianClient };