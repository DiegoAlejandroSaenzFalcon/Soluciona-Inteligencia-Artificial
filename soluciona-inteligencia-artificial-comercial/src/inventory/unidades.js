'use strict';

/**
 * H3 — Unidades y conversiones para inventario alimentario.
 * Reglas de negocio:
 *   - Solo se puede convertir dentro de la misma dimensión.
 *   - masa:      kg | g   (1 kg = 1000 g)
 *   - volumen:   L | ml   (1 L = 1000 ml)
 *   - conteo:    und | caja | docena | paquete (1 caja = 12 docena por defecto configurable)
 *   - No se convierte masa a volumen (física).
 *   - No se convierte conteo a masa/volumen (eso es una merma/estimación del negocio).
 */

const DIM_MASA = 'masa';
const DIM_VOLUMEN = 'volumen';
const DIM_CONTEO = 'conteo';

const FACTORES = {
  // masa → base gramos
  kg: { dimension: DIM_MASA, factor: 1000 },
  g: { dimension: DIM_MASA, factor: 1 },
  // volumen → base mililitros
  L: { dimension: DIM_VOLUMEN, factor: 1000 },
  ml: { dimension: DIM_VOLUMEN, factor: 1 },
  lt: { dimension: DIM_VOLUMEN, factor: 1000 },
  // conteo → base unidad
  und: { dimension: DIM_CONTEO, factor: 1 },
  unidad: { dimension: DIM_CONTEO, factor: 1 },
  docena: { dimension: DIM_CONTEO, factor: 12 },
  caja: { dimension: DIM_CONTEO, factor: 1, nota: 'configurable por producto' }, // configurable
  paquete: { dimension: DIM_CONTEO, factor: 1 },
};

function dimensionDe(unidad) {
  const u = String(unidad || '').trim();
  const f = FACTORES[u];
  if (!f) throw Object.assign(new Error(`unidad_desconocida: ${u}`), { status: 400 });
  return f.dimension;
}

function sonCompatibles(de, a) {
  return dimensionDe(de) === dimensionDe(a);
}

/**
 * Convierte cantidad entre unidades compatibles.
 * @param {number} cantidad
 * @param {string} de — unidad origen
 * @param {string} a — unidad destino
 * @param {object} opts — { unidadesPorCaja? } para conversiones caja↔und de un producto concreto
 */
function convertir(cantidad, de, a, opts = {}) {
  const n = Number(cantidad);
  if (!Number.isFinite(n) || n < 0) throw Object.assign(new Error(`cantidad_invalida: ${cantidad}`), { status: 400 });
  if (!sonCompatibles(de, a)) {
    throw Object.assign(new Error(`unidades_incompatibles: ${de} no se puede convertir a ${a}`), { status: 400 });
  }
  const fDe = FACTORES[String(de).trim()];
  const fA = FACTORES[String(a).trim()];
  if (String(de).trim() === 'caja' && opts.unidadesPorCaja != null) {
    fDe.factor = Number(opts.unidadesPorCaja) || 1;
  }
  if (String(a).trim() === 'caja' && opts.unidadesPorCaja != null) {
    fA.factor = Number(opts.unidadesPorCaja) || 1;
  }
  const enBase = n * fDe.factor;
  const resultado = enBase / fA.factor;
  return Number(resultado.toFixed(6));
}

/**
 * Normaliza una cantidad a la unidad base de su dimensión.
 * masa → gramos | volumen → ml | conteo → und
 */
function aBase(cantidad, unidad, opts = {}) {
  const dim = dimensionDe(unidad);
  const base = dim === DIM_MASA ? 'g' : dim === DIM_VOLUMEN ? 'ml' : 'und';
  return { cantidad: convertir(cantidad, unidad, base, opts), unidad: base, dimension: dim };
}

module.exports = { FACTORES, DIM_MASA, DIM_VOLUMEN, DIM_CONTEO, dimensionDe, sonCompatibles, convertir, aBase };
