/**
 * Utilidades XML para DIAN Middleware
 */

import { DOMParser, XMLSerializer } from 'xmldom';
import xpath from 'xpath';

/**
 * Escapa caracteres especiales para XML
 * @param {string} str - Texto a escapar
 * @returns {string} Texto escapado
 */
export function escapeXml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&apos;');
}

/**
 * Parsea XML string a DOM Document
 * @param {string} xmlString - XML a parsear
 * @returns {Document} DOM Document
 */
export function parseXml(xmlString) {
  const parser = new DOMParser({
    errorHandler: {
      warning: (w) => console.warn('[XML] Warning:', w),
      error: (e) => console.error('[XML] Error:', e),
      fatalError: (e) => console.error('[XML] Fatal:', e)
    }
  });
  return parser.parseFromString(xmlString, 'text/xml');
}

/**
 * Serializa DOM Document a string
 * @param {Document|Node} doc - Documento DOM
 * @returns {string} XML string
 */
export function serializeXml(doc) {
  const serializer = new XMLSerializer();
  return serializer.serializeToString(doc);
}

/**
 * Evalúa XPath en documento
 * @param {Document} doc - Documento DOM
 * @param {string} xpathExpr - Expresión XPath
 * @param {Object} namespaces - Namespaces para resolver prefijos
 * @returns {Node[]|string|number|boolean} Resultado XPath
 */
export function evaluateXPath(doc, xpathExpr, namespaces = {}) {
  const nsResolver = (prefix) => namespaces[prefix] || null;
  const result = xpath.evaluate(xpathExpr, doc, nsResolver, xpath.XPathResult.ANY_TYPE, null);

  switch (result.resultType) {
    case xpath.XPathResult.NODE_SET_TYPE:
    case xpath.XPathResult.ORDERED_NODE_SNAPSHOT_TYPE:
      const nodes = [];
      for (let i = 0; i < result.snapshotLength; i++) {
        nodes.push(result.snapshotItem(i));
      }
      return nodes;
    case xpath.XPathResult.STRING_TYPE:
      return result.stringValue;
    case xpath.XPathResult.NUMBER_TYPE:
      return result.numberValue;
    case xpath.XPathResult.BOOLEAN_TYPE:
      return result.booleanValue;
    default:
      return result;
  }
}

/**
 * Obtiene valor de nodo por XPath
 * @param {Document} doc - Documento
 * @param {string} xpathExpr - XPath
 * @param {Object} namespaces - Namespaces
 * @returns {string|null} Valor del nodo
 */
export function getNodeValue(doc, xpathExpr, namespaces = {}) {
  const nodes = evaluateXPath(doc, xpathExpr, namespaces);
  if (nodes.length > 0) {
    return nodes[0].textContent || nodes[0].nodeValue || '';
  }
  return null;
}

/**
 * Formatea XML con indentación (pretty print)
 * @param {string} xml - XML a formatear
 * @returns {string} XML formateado
 */
export function prettyPrintXml(xml) {
  const doc = parseXml(xml);
  const serializer = new XMLSerializer();

  // Agregar indentación manualmente
  let formatted = '';
  let indent = '';
  let prevChar = '';

  for (let i = 0; i < xml.length; i++) {
    const char = xml[i];

    if (char === '<') {
      const nextChar = xml[i + 1];
      if (nextChar === '/') {
        // Closing tag
        indent = indent.slice(2);
        formatted += '\n' + indent;
      } else if (nextChar !== '?' && nextChar !== '!') {
        // Opening tag
        if (prevChar === '>') {
          formatted += '\n' + indent;
        }
        formatted += '<';
        indent += '  ';
        continue;
      }
    } else if (char === '>' && xml[i - 1] === '/') {
      // Self-closing tag
      indent = indent.slice(2);
    }

    formatted += char;
    prevChar = char;
  }

  return formatted;
}

/**
 * Canonicaliza XML para firma digital (C14N)
 * @param {Document} doc - Documento DOM
 * @returns {string} XML canonizado
 */
export function canonicalizeXml(doc) {
  // Implementación simplificada - en producción usar xml-c14n
  const serializer = new XMLSerializer();
  return serializer.serializeToString(doc);
}

/**
 * Elimina nodos vacíos y normaliza espacios
 * @param {Document} doc - Documento DOM
 * @returns {Document} Documento limpio
 */
export function cleanXml(doc) {
  const walker = doc.createTreeWalker(doc, NodeFilter.SHOW_TEXT, null, false);
  const toRemove = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.textContent.trim() === '' && !node.parentNode.closest('cbc:EmbeddedDocumentBinaryObject')) {
      toRemove.push(node);
    }
  }

  toRemove.forEach(node => node.parentNode?.removeChild(node));
  return doc;
}

/**
 * Convierte XML a string limpio (sin declaración XML si se especifica)
 * @param {Document|string} xml - XML
 * @param {boolean} omitDeclaration - Omitir declaración XML
 * @returns {string} XML string
 */
export function xmlToString(xml, omitDeclaration = false) {
  const doc = typeof xml === 'string' ? parseXml(xml) : xml;
  const serializer = new XMLSerializer();
  let result = serializer.serializeToString(doc);

  if (omitDeclaration) {
    result = result.replace(/^<\?xml[^?]*\?>\s*/, '');
  }

  return result;
}

export default {
  escapeXml,
  parseXml,
  serializeXml,
  evaluateXPath,
  getNodeValue,
  prettyPrintXml,
  canonicalizeXml,
  cleanXml,
  xmlToString
};