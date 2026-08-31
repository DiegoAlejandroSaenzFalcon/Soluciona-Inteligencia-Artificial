const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

function resolverRutaConfig() {
  const args = process.argv.slice(2);
  const i = args.indexOf('--cliente');
  let p = i !== -1 ? args[i + 1] : process.env.CLIENTE_CONFIG;
  if (!p) p = 'config.json';
  return path.isAbsolute(p) ? p : path.join(__dirname, p);
}

const CONFIG_PATH = resolverRutaConfig();
const esConfigPorDefecto = CONFIG_PATH.replace(/\\/g, '/').endsWith('config.json');

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

// Nombre del SOFTWARE (no del negocio/cliente). El nombre del negocio se
// configura por cada cliente y queda vacío hasta que se establece.
config.softwareNombre = 'SOLUCIONA INTELIGENCIA ARTIFICIAL';

// Nombre del negocio: puede estar vacío mientras no se configura. Para UI y
// mensajes se usa nombreNegocio() con un fallback elegante.
function nombreNegocio() {
  return (config.negocio || '').trim() || 'tu negocio';
}
config.nombreNegocio = nombreNegocio;

const clienteId = config.id || (esConfigPorDefecto ? 'default' : path.basename(CONFIG_PATH, '.json'));
config.clienteId = clienteId;

const DATA_DIR = esConfigPorDefecto
  ? path.join(__dirname, 'data')
  : path.join(__dirname, 'data', clienteId);
config.dataDir = DATA_DIR;

config.authDir = config.auth_dir
  ? path.resolve(__dirname, config.auth_dir)
  : path.join(__dirname, esConfigPorDefecto ? 'auth_info' : 'auth_info_' + clienteId);

// Motor de base de datos operacional: 'sqlite' (por defecto) | 'postgres'
config.dbEngine = (env('DB_ENGINE', config.db_engine || 'sqlite') || 'sqlite').toLowerCase();
config.db_engine = config.dbEngine;

// Database config (PostgreSQL)
config.dbHost = env('DB_HOST', config.dbHost || 'localhost');
config.dbPort = envInt('DB_PORT', config.dbPort || 5432);
config.dbName = env('DB_NAME', config.dbName || 'soluciona_inteligencia_artificial_comercial');
config.dbUser = env('DB_USER', config.dbUser || 'postgres');
config.dbPass = env('DB_PASS', config.dbPass || 'postgres');
config.dbPoolSize = envInt('DB_POOL_SIZE', config.dbPoolSize || 10);
config.dbDebug = envBool('DB_DEBUG', config.dbDebug || false);

if (config.puerto && process.env.PORT_OVERRIDE) {
  config.puerto = parseInt(process.env.PORT_OVERRIDE, 10) || config.puerto;
}

// ============================================================
// HELPER: leer de ENV con fallback a config.json
// ============================================================
function env(key, fallback) {
  const val = process.env[key];
  return (val !== undefined && val !== '') ? val : fallback;
}

function envInt(key, fallback) {
  const val = env(key, fallback);
  return parseInt(val, 10) || fallback;
}

function envBool(key, fallback) {
  const val = env(key, fallback);
  if (typeof val === 'string') return val === 'true' || val === '1';
  return fallback;
}

// ============================================================
// SOBRESCRIBIR CONFIG SENSIBLE DESDE .env
// ============================================================

// LLM / Chatbot WhatsApp
config.llm = config.llm || {};
config.llm.proveedor = env('LLM_PROVEEDOR', config.llm.proveedor || 'nvidia');
config.llm.base_url = env('LLM_BASE_URL', config.llm.base_url || 'https://integrate.api.nvidia.com/v1');
config.llm.modelo = env('LLM_MODEL', config.llm.modelo || 'meta/llama-3.1-8b-instruct');
config.llm.api_key = env('LLM_API_KEY', config.llm.api_key || '');
config.llm.limite_diario = envInt('LLM_LIMITE_DIARIO', config.llm.limite_diario || 0);
config.llm.limite_mensual = envInt('LLM_LIMITE_MENSUAL', config.llm.limite_mensual || 0);

// Asistentes IA (panel)
config.asistentes_ia = config.asistentes_ia || {};
config.asistentes_ia.modelo = env('ASISTENTES_IA_MODEL', config.asistentes_ia.modelo || 'meta/llama-3.3-70b-instruct');
config.asistentes_ia.api_key = env('ASISTENTES_IA_API_KEY', config.asistentes_ia.api_key || '');
config.asistentes_ia.limite_diario = envInt('ASISTENTES_IA_LIMITE_DIARIO', config.asistentes_ia.limite_diario || 0);
config.asistentes_ia.limite_mensual = envInt('ASISTENTES_IA_LIMITE_MENSUAL', config.asistentes_ia.limite_mensual || 0);

// Visión (foto menú)
config.vision = config.vision || {};
config.vision.modelo = env('VISION_MODEL', config.vision.modelo || 'meta/llama-3.2-11b-vision-instruct');
config.vision.api_key = env('VISION_API_KEY', config.vision.api_key || '');
config.vision.limite_diario = envInt('VISION_LIMITE_DIARIO', config.vision.limite_diario || 0);
config.vision.limite_mensual = envInt('VISION_LIMITE_MENSUAL', config.vision.limite_mensual || 0);

// Gemini (fallback)
config.gemini_api_key = env('GEMINI_API_KEY', config.gemini_api_key || '');
config.gemini_model = env('GEMINI_MODEL', config.gemini_model || 'gemini-3.5-flash');

// Integración POS
config.integracion = config.integracion || {};
config.integracion.tipo = env('INTEGRACION_TIPO', config.integracion.tipo || 'pos-propio');

// Siigo
if (config.integracion.tipo === 'siigo' || process.env.SIIGO_USERNAME) {
  config.integracion.username = env('SIIGO_USERNAME', config.integracion.username);
  config.integracion.access_key = env('SIIGO_ACCESS_KEY', config.integracion.access_key);
  config.integracion.partner_id = env('SIIGO_PARTNER_ID', config.integracion.partner_id);
  config.integracion.document_id = envInt('SIIGO_DOCUMENT_ID', config.integracion.document_id);
  config.integracion.payment_id = envInt('SIIGO_PAYMENT_ID', config.integracion.payment_id);
  config.integracion.tax_id = envInt('SIIGO_TAX_ID', config.integracion.tax_id);
  config.integracion.customer_identification = env('SIIGO_CUSTOMER_IDENTIFICATION', config.integracion.customer_identification);
  config.integracion.codigos_productos = config.integracion.codigos_productos || {};
  config.integracion.stamp_dian = envBool('SIIGO_STAMP_DIAN', config.integracion.stamp_dian || false);
}

// Alegra
if (config.integracion.tipo === 'alegra' || process.env.ALEGRA_EMAIL) {
  config.integracion.email = env('ALEGRA_EMAIL', config.integracion.email);
  config.integracion.token = env('ALEGRA_TOKEN', config.integracion.token);
  config.integracion.id_type = env('ALEGRA_ID_TYPE', config.integracion.id_type || 'CC');
  config.integracion.customer_identification = env('ALEGRA_CUSTOMER_IDENTIFICATION', config.integracion.customer_identification);
  config.integracion.tax_id = env('ALEGRA_TAX_ID', config.integracion.tax_id);
  config.integracion.payment_form = env('ALEGRA_PAYMENT_FORM', config.integracion.payment_form || 'CASH');
  config.integracion.codigos_productos = config.integracion.codigos_productos || {};
  config.integracion.stamp_dian = envBool('ALEGRA_STAMP_DIAN', config.integracion.stamp_dian || false);
}

// Webhook
if (config.integracion.tipo === 'webhook' || process.env.WEBHOOK_URL) {
  config.integracion.url = env('WEBHOOK_URL', config.integracion.url);
  config.integracion.token = env('WEBHOOK_TOKEN', config.integracion.token);
  config.integracion.header = env('WEBHOOK_HEADER', config.integracion.header);
  config.integracion.valor = env('WEBHOOK_VALOR', config.integracion.valor);
  config.integracion.timeout = envInt('WEBHOOK_TIMEOUT', config.integracion.timeout || 8000);
}

// Telegram (integración)
if (config.integracion.tipo === 'telegram' || process.env.TELEGRAM_BOT_TOKEN) {
  config.integracion.token = env('TELEGRAM_BOT_TOKEN', config.integracion.token);
  config.integracion.chat_id = env('TELEGRAM_CHAT_ID', config.integracion.chat_id);
}

// Archivo
if (config.integracion.tipo === 'archivo') {
  config.integracion.salida = env('INTEGRACION_SALIDA', config.integracion.salida || 'integracion.jsonl');
}

// Factus
if (config.integracion.tipo === 'factus' || process.env.FACTUS_EMAIL) {
  config.integracion.email = env('FACTUS_EMAIL', config.integracion.email);
  config.integracion.password = env('FACTUS_PASSWORD', config.integracion.password);
  config.integracion.prefijo = env('FACTUS_PREFIJO', config.integracion.prefijo || 'SETP');
  config.integracion.customer_email = env('FACTUS_CUSTOMER_EMAIL', config.integracion.customer_email);
  config.integracion.city_code = env('FACTUS_CITY_CODE', config.integracion.city_code);
  config.integracion.payment_form = env('FACTUS_PAYMENT_FORM', config.integracion.payment_form);
  config.integracion.payment_method = env('FACTUS_PAYMENT_METHOD', config.integracion.payment_method);
}

// Alanube
if (config.integracion.tipo === 'alanube' || process.env.ALANUBE_USERNAME) {
  config.integracion.username = env('ALANUBE_USERNAME', config.integracion.username);
  config.integracion.password = env('ALANUBE_PASSWORD', config.integracion.password);
  config.integracion.prefijo = env('ALANUBE_PREFIJO', config.integracion.prefijo || 'SETP');
  config.integracion.customer_type_id = env('ALANUBE_CUSTOMER_TYPE_ID', config.integracion.customer_type_id);
  config.integracion.customer_email = env('ALANUBE_CUSTOMER_EMAIL', config.integracion.customer_email);
  config.integracion.customer_city = env('ALANUBE_CUSTOMER_CITY', config.integracion.customer_city);
  config.integracion.payment_form = env('ALANUBE_PAYMENT_FORM', config.integracion.payment_form);
  config.integracion.payment_method = env('ALANUBE_PAYMENT_METHOD', config.integracion.payment_method);
}

// OpenData
if (config.integracion.tipo === 'opendata' || process.env.OPENDATA_API_KEY) {
  config.integracion.api_key = env('OPENDATA_API_KEY', config.integracion.api_key);
  config.integracion.secret_key = env('OPENDATA_SECRET_KEY', config.integracion.secret_key);
  config.integracion.prefijo = env('OPENDATA_PREFIJO', config.integracion.prefijo || 'SETP');
  config.integracion.cliente_tipo_id = env('OPENDATA_CLIENTE_TIPO_ID', config.integracion.cliente_tipo_id);
  config.integracion.cliente_email = env('OPENDATA_CLIENTE_EMAIL', config.integracion.cliente_email);
  config.integracion.cliente_ciudad = env('OPENDATA_CLIENTE_CIUDAD', config.integracion.cliente_ciudad);
  config.integracion.forma_pago = env('OPENDATA_FORMA_PAGO', config.integracion.forma_pago);
  config.integracion.metodo_pago = env('OPENDATA_METODO_PAGO', config.integracion.metodo_pago);
}

// DIAN Portal Gratuito
if (config.integracion.tipo === 'dian-gratuito' || process.env.DIAN_NIT) {
  config.integracion.nit = env('DIAN_NIT', config.integracion.nit);
  config.integracion.password = env('DIAN_PASSWORD', config.integracion.password);
  config.integracion.codigo_software = env('DIAN_CODIGO_SOFTWARE', config.integracion.codigo_software);
  config.integracion.pin_software = env('DIAN_PIN_SOFTWARE', config.integracion.pin_software);
  config.integracion.cert_path = env('DIAN_CERT_PATH', config.integracion.cert_path);
  config.integracion.cert_pass = env('DIAN_CERT_PASS', config.integracion.cert_pass);
  config.integracion.ambiente = env('DIAN_AMBIENTE', config.integracion.ambiente || 'habilitacion');
  config.integracion.prefijo = env('DIAN_PREFIJO', config.integracion.prefijo || 'SETP');
  config.integracion.cliente_tipo_id = env('DIAN_CLIENTE_TIPO_ID', config.integracion.cliente_tipo_id);
  config.integracion.cliente_email = env('DIAN_CLIENTE_EMAIL', config.integracion.cliente_email);
  config.integracion.cliente_municipio = env('DIAN_CLIENTE_MUNICIPIO', config.integracion.cliente_municipio);
  config.integracion.cliente_departamento = env('DIAN_CLIENTE_DEPARTAMENTO', config.integracion.cliente_departamento);
  config.integracion.empresa_ciudad = env('DIAN_EMPRESA_CIUDAD', config.integracion.empresa_ciudad);
  config.integracion.empresa_depto = env('DIAN_EMPRESA_DEPTO', config.integracion.empresa_depto);
}

// Facturación
config.facturacion = config.facturacion || {};
config.facturacion.proveedor = env('FACTURACION_PROVEEDOR', config.facturacion.proveedor || '');
config.facturacion.emision_automatica = envBool('FACTURACION_EMISION_AUTO', config.facturacion.emision_automatica || false);
config.facturacion.estado_dispara = env('FACTURACION_ESTADO_DISPARA', config.facturacion.estado_dispara || 'pagado');
config.facturacion.enviar_mail = envBool('FACTURACION_ENVIAR_MAIL', config.facturacion.enviar_mail !== false);

// DIAN Software Propio (vars genéricas, sin prefijo DIAN_ para evitar colisión)
config.facturacion.dian_propio = config.facturacion.dian_propio || {};
config.facturacion.dian_propio.ambiente          = env('FC_DIAN_AMBIENTE',        config.facturacion.dian_propio.ambiente || 'habilitacion');
config.facturacion.dian_propio.nit               = env('FC_DIAN_NIT',             config.facturacion.dian_propio.nit || '');
config.facturacion.dian_propio.dv                = env('FC_DIAN_DV',              config.facturacion.dian_propio.dv || '');
config.facturacion.dian_propio.razonSocial       = env('FC_DIAN_RAZON_SOCIAL',    config.facturacion.dian_propio.razonSocial || '');
config.facturacion.dian_propio.direccion         = env('FC_DIAN_DIRECCION',       config.facturacion.dian_propio.direccion || '');
config.facturacion.dian_propio.municipio         = env('FC_DIAN_MUNICIPIO',       config.facturacion.dian_propio.municipio || '11001');
config.facturacion.dian_propio.departamento      = env('FC_DIAN_DEPARTAMENTO',    config.facturacion.dian_propio.departamento || '11');
config.facturacion.dian_propio.codigoPostal      = env('FC_DIAN_CODIGO_POSTAL',   config.facturacion.dian_propio.codigoPostal || '110111');
config.facturacion.dian_propio.telefono          = env('FC_DIAN_TELEFONO',        config.facturacion.dian_propio.telefono || '');
config.facturacion.dian_propio.email             = env('FC_DIAN_EMAIL',           config.facturacion.dian_propio.email || '');
config.facturacion.dian_propio.responsabilidadFiscal = env('FC_DIAN_RESPONSABILIDAD', config.facturacion.dian_propio.responsabilidadFiscal || 'O-13').split(',').map(s => s.trim()).filter(Boolean);
config.facturacion.dian_propio.regimenFiscal     = env('FC_DIAN_REGIMEN',         config.facturacion.dian_propio.regimenFiscal || 'Regimen Comun');
config.facturacion.dian_propio.codigoSoftware    = env('FC_DIAN_CODIGO_SOFTWARE', config.facturacion.dian_propio.codigoSoftware || '');
config.facturacion.dian_propio.pinSoftware       = env('FC_DIAN_PIN_SOFTWARE',    config.facturacion.dian_propio.pinSoftware || '');
config.facturacion.dian_propio.testSetId         = env('FC_DIAN_TESTSET_ID',      config.facturacion.dian_propio.testSetId || '');
config.facturacion.dian_propio.certPath          = env('FC_DIAN_CERT_PATH',       config.facturacion.dian_propio.certPath || '');
config.facturacion.dian_propio.certPass          = env('FC_DIAN_CERT_PASS',       config.facturacion.dian_propio.certPass || '');
config.facturacion.dian_propio.prefijo           = env('FC_DIAN_PREFIJO',         config.facturacion.dian_propio.prefijo || 'SETP');
config.facturacion.dian_propio.resolucionNumero  = env('FC_DIAN_RESOLUCION_NUMERO', config.facturacion.dian_propio.resolucionNumero || '');
config.facturacion.dian_propio.resolucionFecha   = env('FC_DIAN_RESOLUCION_FECHA',  config.facturacion.dian_propio.resolucionFecha || '');
config.facturacion.dian_propio.resolucionPrefijo = env('FC_DIAN_RESOLUCION_PREFIJO', config.facturacion.dian_propio.resolucionPrefijo || '');
config.facturacion.dian_propio.resolucionDesde   = env('FC_DIAN_RESOLUCION_DESDE',  config.facturacion.dian_propio.resolucionDesde || '');
config.facturacion.dian_propio.resolucionHasta   = env('FC_DIAN_RESOLUCION_HASTA',  config.facturacion.dian_propio.resolucionHasta || '');

// Alertas Telegram (bot caído)
config.alertas = config.alertas || {};
config.alertas.telegram = config.alertas.telegram || {};
config.alertas.telegram.token = env('ALERTAS_TELEGRAM_TOKEN', config.alertas.telegram.token);
config.alertas.telegram.chat_id = env('ALERTAS_TELEGRAM_CHAT_ID', config.alertas.telegram.chat_id);

// Panel passwords
config.panel_password = env('PANEL_PASSWORD', config.panel_password || '');

// Segmento DIAN (CIIU): comidas | salud | retail
config.segmento = config.segmento || 'comidas';
config.ciiu = config.ciiu || '';

// Segmento SALUD: catálogo de servicios, profesionales y horarios de agenda
config.servicios = Array.isArray(config.servicios) ? config.servicios : [];
config.profesionales = Array.isArray(config.profesionales) ? config.profesionales : [];
config.horarios = Array.isArray(config.horarios) ? config.horarios : [];

// Segmento RETAIL: inventario con stock disponible por producto
config.stock = config.stock || {};
config.mensaje_agotado = config.mensaje_agotado || 'Lo sentimos, ese producto no tiene stock disponible en este momento.';
config.mensaje_llamada = config.mensaje_llamada || `Hola 👋 No puedo contestar llamadas aquí, pero escríbeme tu pedido y lo atiendo de inmediato 🛵`;

// Segmento BELLEZA: recursos (sillas/camillas), profesionales con horarios, paquetes
config.recursos = Array.isArray(config.recursos) ? config.recursos : [];
config.paquetes = Array.isArray(config.paquetes) ? config.paquetes : [];

// Ubicación GPS del negocio (para costo de domicilio por distancia)
config.ubicacion_negocio = config.ubicacion_negocio || {};
if (!config.ubicacion_negocio.lat) config.ubicacion_negocio.lat = 0;
if (!config.ubicacion_negocio.lng) config.ubicacion_negocio.lng = 0;

// Tarifas de domicilio por distancia (faixas por km)
config.domicilios = config.domicilios || {};
if (!Array.isArray(config.domicilios.faixas)) config.domicilios.faixas = [];
if (!config.domicilios.radio_max_entrega_km) config.domicilios.radio_max_entrega_km = 0;
if (!config.domicilios.gratis_si_total_sobre) config.domicilios.gratis_si_total_sobre = 0;

// Valores por defecto obligatorios (evitan crashes si faltan en config.json)
config.numero_dueno = config.numero_dueno || '';
config.hora_reporte = config.hora_reporte || '21:00';
config.max_unidades_confirmar = config.max_unidades_confirmar || 15;
config.pregunta_direccion = config.pregunta_direccion || '📍 Mándame tu UBICACIÓN por GPS (botón 📎 → Ubicación).';
config.mensaje_bienvenida = config.mensaje_bienvenida || '¡Hola! 👋 Bienvenido. Escríbeme tu pedido y lo registramos.';
config.mensaje_fallback = config.mensaje_fallback || 'No entendí bien tu mensaje. ¿Me escribes tu pedido?';

// ============================================================
// EXPORTAR CLAVES INDIVIDUALES PARA USO DIRECTO
// ============================================================
const LLM_API_KEY = config.llm.api_key;
const ASISTENTES_IA_API_KEY = config.asistentes_ia.api_key;
const VISION_API_KEY = config.vision.api_key;
const GEMINI_API_KEY = config.gemini_api_key;
const SIIGO_API_KEY = config.integracion.access_key;
const ALEGRA_API_KEY = config.integracion.token;
const WEBHOOK_API_KEY = config.integracion.token;
const TELEGRAM_BOT_TOKEN = config.integracion.token;
const TELEGRAM_CHAT_ID = config.integracion.chat_id;
const ALERTAS_TELEGRAM_TOKEN = config.alertas.telegram.token;
const ALERTAS_TELEGRAM_CHAT_ID = config.alertas.telegram.chat_id;

// ============================================================
// UTILIDADES
// ============================================================
function normalizar(t) {
  return t.toLowerCase().normalize('NFD').replace(/[^\x00-\x7F]/g, '');
}
function escaparRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": '&apos;' }[c]));
}
function csvCell(v) {
  const s = String(v == null ? '' : v).replace(/"/g, '""');
  return /^[=+\-@]/.test(s) ? '"' + s + '"' : s;
}
function fechaDia() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function hoyInicio() {
  return `${fechaDia()}T00:00`;
}
function numDeCelular(id) {
  const solo = String(id).split('@')[0].split(':')[0];
  return solo.replace(/\D/g, '');
}

module.exports = {
  config,
  LLM_API_KEY,
  ASISTENTES_IA_API_KEY,
  VISION_API_KEY,
  GEMINI_API_KEY,
  SIIGO_API_KEY,
  ALEGRA_API_KEY,
  WEBHOOK_API_KEY,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  ALERTAS_TELEGRAM_TOKEN,
  ALERTAS_TELEGRAM_CHAT_ID,
  DB_HOST: config.dbHost,
  DB_PORT: config.dbPort,
  DB_NAME: config.dbName,
  DB_USER: config.dbUser,
  DB_PASS: config.dbPass,
  DB_POOL_SIZE: config.dbPoolSize,
  DB_DEBUG: config.dbDebug,
  normalizar,
  escaparRegex,
  esc,
  csvCell,
  fechaDia,
  hoyInicio,
  numDeCelular
};