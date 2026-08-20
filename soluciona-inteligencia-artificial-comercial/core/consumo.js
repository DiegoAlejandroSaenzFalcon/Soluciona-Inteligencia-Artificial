const { config } = require('../config');
const { registrarUsoIA, consumoIADia, consumoIAMes } = require('./db');
const pool = require('./ia-pool');

// ============================================================
// CONTROL DE CONSUMO IA (cuotas por rol)
// ============================================================
// Cada rol (chatbot WhatsApp / asistentes / visión) usa SU PROPIA API key
// de NVIDIA Build, así cada uno tiene su propio límite de la plataforma y
// el más usado (el chatbot) nunca satura a los demás.
//
// Además, cada rol puede tener un LÍMITE DE NEGOCIO configurable (lo que
// el cliente "compra" por su mensualidad). Al alcanzarlo, la IA deja de
// responder y avisa. Esto le permite al dueño del sistema cobrar por
// cuotas y mostrar el consumo en el panel.
//
// Config por cliente (config.json / clientes/<id>.json):
//   "llm": {
//     "proveedor": "nvidia",
//     "base_url": "https://integrate.api.nvidia.com/v1",
//     "modelo": "meta/llama-3.1-8b-instruct",
//     "api_key": "nvapi-...",              // key del CHATBOT WhatsApp (la que más se usa)
//     "limite_diario": 200,                 // llamadas máx por día (0 = sin límite)
//     "limite_mensual": 5000                // llamadas máx por mes (0 = sin límite)
//   },
//   "asistentes_ia": {
//     "modelo": "meta/llama-3.3-70b-instruct",
//     "api_key": "nvapi-...",              // key SEPARADA para la sección Asistentes IA
//     "limite_diario": 50,
//     "limite_mensual": 1000
//   },
//   "vision": {
//     "modelo": "meta/llama-3.2-11b-vision-instruct",
//     "api_key": "nvapi-...",              // key SEPARADA para leer fotos de menú
//     "limite_diario": 30,
//     "limite_mensual": 500
//   }
//
// Los límites de la plataforma NVIDIA (~40 req/min por key) se manejan
// solos al tener una key por rol.

const ROLES = ['chatbot', 'asistentes', 'vision'];

// Configuración de un rol (key, modelo, límites). El chatbot vive en
// "llm", los otros en "asistentes_ia"/"vision" con herencia de llm.
function cfgRol(rol) {
  const llm = config.llm || {};
  if (rol === 'chatbot') {
    return {
      proveedor: llm.proveedor || 'nvidia',
      base_url: llm.base_url || 'https://integrate.api.nvidia.com/v1',
      modelo: llm.modelo || 'meta/llama-3.1-8b-instruct',
      api_key: llm.api_key || '',
      limite_diario: llm.limite_diario || 0,
      limite_mensual: llm.limite_mensual || 0
    };
  }
  const seccion = config[rol === 'asistentes' ? 'asistentes_ia' : 'vision'] || {};
  return {
    proveedor: seccion.proveedor || llm.proveedor || 'nvidia',
    base_url: seccion.base_url || llm.base_url || 'https://integrate.api.nvidia.com/v1',
    modelo: seccion.modelo || (rol === 'vision' ? 'meta/llama-3.2-11b-vision-instruct' : 'meta/llama-3.3-70b-instruct'),
    api_key: seccion.api_key || llm.api_key || '',
    limite_diario: seccion.limite_diario || 0,
    limite_mensual: seccion.limite_mensual || 0
  };
}

// ¿El rol llegó a su límite? (0 = sin límite)
function limiteAlcanzado(rol) {
  const c = cfgRol(rol);
  const hoy = consumoIADia(rol);
  const mes = consumoIAMes(rol);
  if (c.limite_diario > 0 && hoy.llamadas >= c.limite_diario) return 'diario';
  if (c.limite_mensual > 0 && mes.llamadas >= c.limite_mensual) return 'mensual';
  return null;
}

function registrar(rol, modelo, proveedor, tokensPrompt, tokensCompletados) {
  registrarUsoIA(rol, modelo, proveedor, tokensPrompt, tokensCompletados);
}

// Resumen para el panel: consumo actual vs límite por rol.
function resumenConsumo() {
  const hoy = new Date().toISOString().slice(0, 10);
  const mes = new Date().toISOString().slice(0, 7);
  return ROLES.map(rol => {
    const c = cfgRol(rol);
    const d = consumoIADia(rol);
    const m = consumoIAMes(rol);
    const disp = pool.disponiblePara(rol);
    return {
      rol,
      modelo: c.modelo,
      proveedor: c.proveedor,
      tieneKey: !!c.api_key || disp.total > 0,
      clavesPool: disp.total,
      hoy: d.llamadas,
      mes: m.llamadas,
      tokensHoy: d.tokens,
      tokensMes: m.tokens,
      limite_diario: c.limite_diario,
      limite_mensual: c.limite_mensual,
      cortado: limiteAlcanzado(rol)
    };
  });
}

module.exports = { ROLES, cfgRol, limiteAlcanzado, registrar, resumenConsumo, consumoIADia, consumoIAMes };