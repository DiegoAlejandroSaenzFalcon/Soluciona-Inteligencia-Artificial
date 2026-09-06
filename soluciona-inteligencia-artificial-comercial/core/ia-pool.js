// ============================================================
// POOL DE MODELOS / API KEYS CON ROTACIÓN AUTOMÁTICA
// ============================================================
// Cada rol (chatbot / asistentes / visión) pide al pool una clave
// disponible. Si el proveedor responde error de auth (401/403),
// cuota (429) o red, se rota a la siguiente clave del mismo
// proveedor y luego a otros proveedores del pool.
//
// Config en config.json -> "ia_pool":
//   "ia_pool": {
//     "gemini": { "base_url": "...", "modelos": [...], "claves": [...] },
//     "openai": { "base_url": "...", "modelos": [...], "claves": [...] },
//     ...
//   }
//
// Las claves con la marca "EJEMPLO_REEMPLAZAR" se ignoran al rotar,
// así el pool no intenta llamadas con marcadores vacíos. Cada rol
// tiene un proveedor preferido (config.llm/asistentes_ia/vision),
// pero si todas sus claves fallan, prueba los demás proveedores.
// ============================================================

const { config } = require('../config.cjs');

function POOL() { return config.ia_pool || {}; }
const PREFERIDO = {
  chatbot: (config.llm && config.llm.proveedor) || 'groq',
  asistentes: (config.asistentes_ia && config.asistentes_ia.proveedor) || (config.llm && config.llm.proveedor) || 'groq',
  vision: (config.vision && config.vision.proveedor) || (config.llm && config.llm.proveedor) || 'groq'
};

function esClaveReal(k) {
  return typeof k === 'string' && k.trim().length > 8 && !/EJEMPLO_REEMPLAZAR|^aquí|^pon/i.test(k.trim());
}

function esModeloReal(m) {
  return typeof m === 'string' && m.trim().length > 2 && !/EJEMPLO|^aquí|^pon/i.test(m);
}

function proveedorDisponible(nombre) {
  const p = POOL()[nombre];
  if (!p) return null;
  const claves = (p.claves || []).filter(esClaveReal);
  const modelos = (p.modelos || []).filter(esModeloReal);
  if (claves.length === 0 || modelos.length === 0) return null;
  return { nombre, base_url: p.base_url, claves, modelos };
}

// Orden en que se prueban los proveedores para un rol:
// el preferido primero, luego los demás del pool.
function ordenProveedores(rol) {
  const pref = PREFERIDO[rol];
  const nombres = Object.keys(POOL()).filter(n => proveedorDisponible(n));
  return [pref, ...nombres.filter(n => n !== pref)].filter(Boolean);
}

// Registro en memoria del estado de cada clave (fallos recientes).
const estadoClave = new Map(); // key -> { fallos: n, ultimo: ts, desactivada: ts }

function marcarFallo(proveedor, key, motivo) {
  const k = proveedor + '::' + key;
  const e = estadoClave.get(k) || { fallos: 0 };
  e.fallos += 1;
  e.ultimo = Date.now();
  e.motivo = motivo;
  estadoClave.set(k, e);
}

function marcarExito(proveedor, key) {
  const k = proveedor + '::' + key;
  estadoClave.set(k, { fallos: 0, ultimo: Date.now(), motivo: null });
}

// ¿Una clave está temporalmente suspendida por fallos? (15 min)
function suspendida(proveedor, key) {
  const e = estadoClave.get(proveedor + '::' + key);
  if (!e) return false;
  if (e.fallos >= 3) {
    const haceMs = Date.now() - (e.ultimo || 0);
    if (haceMs < 15 * 60 * 1000) return true;
  }
  return false;
}

// Genera la lista de candidatos { proveedor, modelo, clave } para un rol.
function candidatos(rol) {
  const lista = [];
  for (const provNombre of ordenProveedores(rol)) {
    const p = proveedorDisponible(provNombre);
    if (!p) continue;
    for (const modelo of p.modelos) {
      for (const clave of p.claves) {
        if (suspendida(p.nombre, clave)) continue;
        lista.push({ proveedor: p.nombre, modelo, clave, base_url: p.base_url });
      }
    }
  }
  return lista;
}

// Fallback "a la vieja" (una sola llave configurada fuera del pool).
function candidatoClasico(rol) {
  const cfg = rol === 'chatbot' ? (config.llm || {})
    : (config[rol === 'asistentes' ? 'asistentes_ia' : 'vision'] || {});
  const key = (cfg.api_key || (config.llm && config.llm.api_key) || '').trim();
  if (key && !/EJEMPLO_REEMPLAZAR/.test(key)) {
    return {
      proveedor: cfg.proveedor || 'nvidia',
      modelo: cfg.modelo || 'meta/llama-3.1-8b-instruct',
      clave: key,
      base_url: cfg.base_url || 'https://integrate.api.nvidia.com/v1'
    };
  }
  return null;
}

// Estado del pool para el panel (sin exponer las claves completas).
function resumenPool() {
  const porProveedor = {};
  for (const [nombre, p] of Object.entries(POOL())) {
    const claves = (p.claves || []).map(k => ({
      real: esClaveReal(k),
      corta: k.trim().length > 8 ? k.trim().slice(0, 8) + '…' : '(vacía)',
      suspendida: esClaveReal(k) && suspendida(nombre, k)
    }));
    porProveedor[nombre] = {
      base_url: p.base_url || '',
      modelos: (p.modelos || []).filter(esModeloReal),
      claves
    };
  }
  return {
    proveedor_preferido_por_rol: PREFERIDO,
    proveedores: porProveedor
  };
}

// ¿Cuántas claves reales hay disponibles (sin suspender) para un rol?
function disponiblePara(rol) {
  let total = 0;
  for (const cand of candidatos(rol)) {
    if (!suspendida(cand.proveedor, cand.clave)) total += 1;
  }
  const clasico = candidatoClasico(rol);
  return { total, clasico: !!clasico };
}

module.exports = { candidatos, candidatoClasico, marcarFallo, marcarExito, resumenPool, esClaveReal, esModeloReal, disponiblePara };