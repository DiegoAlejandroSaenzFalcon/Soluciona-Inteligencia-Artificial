/**
 * Configuración DIAN Middleware
 * Carga desde .env y valida configuración requerida
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');

dotenv.config({ path: join(PROJECT_ROOT, '.env') });

function env(key, fallback = '') {
  const val = process.env[key];
  return (val !== undefined && val !== '') ? val : fallback;
}

function envInt(key, fallback = 0) {
  return parseInt(env(key, fallback), 10) || fallback;
}

function envBool(key, fallback = false) {
  const val = env(key, fallback);
  if (typeof val === 'string') return val === 'true' || val === '1';
  return fallback;
}

const DIAN_WSDL = {
  habilitacion: 'https://facturaelectronica.dian.gov.co/habilitacion/ws/ReciboFactura?wsdl',
  produccion: 'https://facturaelectronica.dian.gov.co/ws/ReciboFactura?wsdl'
};

const DIAN_ENDPOINTS = {
  habilitacion: 'https://facturaelectronica.dian.gov.co/habilitacion/ws/ReciboFactura',
  produccion: 'https://facturaelectronica.dian.gov.co/ws/ReciboFactura'
};

export const config = {
  // Identificación del facturador
  nit: env('DIAN_NIT'),
  dv: env('DIAN_DV', '').toString(),
  razonSocial: env('DIAN_RAZON_SOCIAL'),
  nombreComercial: env('DIAN_NOMBRE_COMERCIAL'),
  direccion: env('DIAN_DIRECCION'),
  municipio: env('DIAN_MUNICIPIO', '11001'),
  departamento: env('DIAN_DEPARTAMENTO', '11'),
  codigoPostal: env('DIAN_CODIGO_POSTAL', '110111'),
  telefono: env('DIAN_TELEFONO'),
  email: env('DIAN_EMAIL'),

  // Responsabilidades fiscales
  responsabilidadFiscal: env('DIAN_RESPONSABILIDAD_FISCAL', 'O-13,O-14,O-15').split(',').map(s => s.trim()),
  regimenFiscal: env('DIAN_REGIMEN_FISCAL', 'Régimen Común'),

  // Ambiente y certificados
  ambiente: env('DIAN_AMBIENTE', 'habilitacion'),
  certPath: env('DIAN_CERT_PATH', join(PROJECT_ROOT, 'certs', 'firma.p12')),
  certPass: env('DIAN_CERT_PASS'),

  // Credenciales DIAN
  codigoSoftware: env('DIAN_CODIGO_SOFTWARE'),
  pinSoftware: env('DIAN_PIN_SOFTWARE'),

  // Numeración autorizada
  prefijo: env('DIAN_PREFIJO', 'SETP'),
  resolucionNumero: envInt('DIAN_RESOLUCION_NUMERO'),
  resolucionFecha: env('DIAN_RESOLUCION_FECHA'),
  resolucionPrefijo: envInt('DIAN_RESOLUCION_PREFIJO'),
  resolucionDesde: envInt('DIAN_RESOLUCION_DESDE'),
  resolucionHasta: envInt('DIAN_RESOLUCION_HASTA'),

  // URLs DIAN
  wsdlUrl: env('DIAN_WSDL_URL', DIAN_WSDL[env('DIAN_AMBIENTE', 'habilitacion')]),
  endpointUrl: env('DIAN_ENDPOINT_URL', DIAN_ENDPOINTS[env('DIAN_AMBIENTE', 'habilitacion')]),

  // Timeouts
  timeout: envInt('DIAN_TIMEOUT', 30000),
  retryAttempts: envInt('DIAN_RETRY_ATTEMPTS', 3),
  retryDelay: envInt('DIAN_RETRY_DELAY', 2000),

  // Logging
  logLevel: env('DIAN_LOG_LEVEL', 'info'),
  logDir: env('DIAN_LOG_DIR', join(PROJECT_ROOT, 'logs')),

  // Validación
  validarEsquema: envBool('DIAN_VALIDAR_ESQUEMA', true),
  validarAritmetica: envBool('DIAN_VALIDAR_ARITMETICA', true)
};

export function validateConfig() {
  const required = [
    'nit', 'razonSocial', 'direccion', 'municipio', 'departamento',
    'certPath', 'certPass', 'codigoSoftware', 'pinSoftware',
    'prefijo', 'resolucionNumero', 'resolucionFecha',
    'resolucionPrefijo', 'resolucionDesde', 'resolucionHasta'
  ];

  const missing = required.filter(key => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Configuración DIAN incompleta. Faltan: ${missing.join(', ')}`);
  }

  if (!existsSync(config.certPath)) {
    throw new Error(`Certificado no encontrado: ${config.certPath}`);
  }

  return true;
}

export function getWsdlUrl() {
  return config.wsdlUrl;
}

export function getEndpointUrl() {
  return config.endpointUrl;
}

export function isHabilitacion() {
  return config.ambiente === 'habilitacion';
}

export default config;