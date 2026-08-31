/**
 * Configuracion DIAN Middleware
 * Carga desde .env y valida configuracion requerida
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
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

// FIX 2026: endpoints vigentes del WSDL DIAN.
// Antes apuntaba a facturaelectronica.dian.gov.co/habilitacion/ws/ReciboFactura
// (legacy, devuelve error Azure). Las URLs correctas hoy son vpfe.
const DIAN_WSDL = {
  habilitacion: 'https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc?wsdl',
  produccion:   'https://vpfe.dian.gov.co/WcfDianCustomerServices.svc?wsdl',
};
const DIAN_ENDPOINTS = {
  habilitacion: 'https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc',
  produccion:   'https://vpfe.dian.gov.co/WcfDianCustomerServices.svc',
};

export const config = {
  // Identificacion del facturador
  nit: env('DIAN_NIT'),
  dv: env('DIAN_DV', '').toString(),
  razonSocial: env('DIAN_RAZON_SOCIAL'),
  nombreComercial: env('DIAN_NOMBRE_COMERCIAL', ''),
  direccion: env('DIAN_DIRECCION'),
  municipio: env('DIAN_MUNICIPIO', '11001'),
  departamento: env('DIAN_DEPARTAMENTO', '11'),
  codigoPostal: env('DIAN_CODIGO_POSTAL', '110111'),
  telefono: env('DIAN_TELEFONO', ''),
  email: env('DIAN_EMAIL', ''),

  // Responsabilidades fiscales
  responsabilidadFiscal: env('DIAN_RESPONSABILIDAD_FISCAL', 'O-13,O-14,O-15')
    .split(',').map(s => s.trim()).filter(Boolean),
  regimenFiscal: env('DIAN_REGIMEN_FISCAL', 'Regimen Comun'),

  // Ambiente y certificados
  ambiente: env('DIAN_AMBIENTE', 'habilitacion'),
  certPath: env('DIAN_CERT_PATH', join(PROJECT_ROOT, 'certs', 'firma.p12')),
  certPass: env('DIAN_CERT_PASS', ''),

  // Credenciales DIAN (portal desarrolladores / Software Propio)
  codigoSoftware: env('DIAN_CODIGO_SOFTWARE', ''),
  pinSoftware: env('DIAN_PIN_SOFTWARE', ''),
  testSetId: env('DIAN_TESTSET_ID', ''),

  // Numeracion autorizada
  prefijo: env('DIAN_PREFIJO', 'SETP'),
  resolucionNumero: envInt('DIAN_RESOLUCION_NUMERO'),
  resolucionFecha: env('DIAN_RESOLUCION_FECHA', ''),
  resolucionPrefijo: envInt('DIAN_RESOLUCION_PREFIJO'),
  resolucionDesde: envInt('DIAN_RESOLUCION_DESDE'),
  resolucionHasta: envInt('DIAN_RESOLUCION_HASTA'),

  // URLs DIAN (auto-segun ambiente)
  wsdlUrl: env('DIAN_WSDL_URL', DIAN_WSDL[env('DIAN_AMBIENTE', 'habilitacion')]),
  endpointUrl: env('DIAN_ENDPOINT_URL', DIAN_ENDPOINTS[env('DIAN_AMBIENTE', 'habilitacion')]),

  // Timeouts / reintentos
  timeout: envInt('DIAN_TIMEOUT', 30000),
  retryAttempts: envInt('DIAN_RETRY_ATTEMPTS', 3),
  retryDelay: envInt('DIAN_RETRY_DELAY', 2000),

  // Logging
  logLevel: env('DIAN_LOG_LEVEL', 'info'),
  logDir: env('DIAN_LOG_DIR', join(PROJECT_ROOT, 'logs')),

  // Validacion
  validarEsquema: envBool('DIAN_VALIDAR_ESQUEMA', true),
  validarAritmetica: envBool('DIAN_VALIDAR_ARITMETICA', true),
};

/**
 * Valida la configuracion. Para pruebas locales, solo exige lo minimo
 * (certificado + credenciales de envio). Para produccion exige todo.
 */
export function validateConfig(opts = {}) {
  const strict = opts.strict !== false;
  const required = [
    'nit', 'razonSocial', 'direccion', 'municipio', 'departamento',
    'certPath', 'certPass', 'codigoSoftware', 'pinSoftware',
    'prefijo', 'resolucionNumero', 'resolucionFecha',
    'resolucionPrefijo', 'resolucionDesde', 'resolucionHasta',
  ];
  if (strict) {
    const missing = required.filter(k => !config[k]);
    if (missing.length > 0) {
      throw new Error(`Configuracion DIAN incompleta. Faltan: ${missing.join(', ')}`);
    }
  }
  if (!existsSync(config.certPath)) {
    throw new Error(`Certificado no encontrado: ${config.certPath}`);
  }
  return true;
}

export function getWsdlUrl() { return config.wsdlUrl; }
export function getEndpointUrl() { return config.endpointUrl; }
export function isHabilitacion() { return config.ambiente === 'habilitacion'; }

export default config;
