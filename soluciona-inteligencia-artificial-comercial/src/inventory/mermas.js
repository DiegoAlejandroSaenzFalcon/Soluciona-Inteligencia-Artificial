'use strict';

/**
 * H4 — Mermas y conteo físico (bajas controladas del inventario).
 * Reglas de negocio:
 *   - Toda baja lleva motivo documentado (trazabilidad — es contabilidad real).
 *   - No se permite merma de más stock del disponible.
 *   - La baja por merma se registra como stock_movements tipo 'merma' con motivo.
 *   - El conteo físico computa diferencias teórico-vs-real y genera un ajuste documentado por sesión.
 */

const { normalizarLote } = require('./lotes.js');

const MOTIVOS_MERMA = [
  'vencimiento',    // producto caducado
  'deterioro',      // daño físico (quemado, aplastado, caja rota)
  'contaminacion',  // pelo/insecto/objeto extraño
  'sobreproduccion',// preparado de más que no se vendió
  'devolucion',     // devolución del cliente no reincorporable
  'producto_roto',  // empaque dañado en manipulación
  'otro'            // requiere nota obligatoria
];

function validarMotivo(motivo, nota) {
  const m = String(motivo || '').trim().toLowerCase();
  if (!MOTIVOS_MERMA.includes(m)) {
    throw Object.assign(new Error(`motivo_invalido (valores: ${MOTIVOS_MERMA.join(', ')})`), { status: 400 });
  }
  if (m === 'otro' && (!nota || !String(nota).trim())) {
    throw Object.assign(new Error('nota_requerida_para_motivo_otro'), { status: 400 });
  }
  return m;
}

/**
 * Calcula el detalle de una merma FEFO: a qué lote(s) afectar primero.
 * @param {Array} lotes  — lista con {id, cantidad_actual, fecha_vencimiento, numero_lote}
 * @param {number} cantidad — cantidad a dar de baja
 */
function detalleMermaFEFO(lotes, cantidad) {
  const n = Number(cantidad);
  if (!Number.isFinite(n) || n <= 0) throw Object.assign(new Error('cantidad_invalida'), { status: 400 });

  const stockTotal = (lotes || []).reduce((s, l) => s + (Number(l.cantidad_actual) || 0), 0);
  if (stockTotal < n) throw Object.assign(new Error(`stock_insuficiente: hay ${stockTotal}, se intentó dar de baja ${n}`), { status: 409 });

  const fefo = (lotes || [])
    .filter(l => (Number(l.cantidad_actual) || 0) > 0)
    .sort((a, b) => {
      const fa = a.fecha_vencimiento || '';
      const fb = b.fecha_vencimiento || '';
      if (fa !== fb) return fa < fb ? -1 : 1;
      return String(a.numero_lote || '').localeCompare(String(b.numero_lote || ''));
    });

  let restante = n;
  const detalle = [];
  for (const l of fefo) {
    if (restante <= 0) break;
    const consumir = Math.min(Number(l.cantidad_actual), restante);
    detalle.push({ lotId: l.id, numeroLote: l.numero_lote, consumir, resto: Number(l.cantidad_actual) - consumir });
    restante -= consumir;
  }
  return { detalle, totalRepartido: n - restante, fefoAplicado: true };
}

/**
 * Conteo físico: comparar sistema vs. contado. Devuelve ajustes (no los aplica).
 */
function analizarConteo(stockTeorico, conteoReal, opts = {}) {
  const t = Number(stockTeorico);
  const r = Number(conteoReal);
  if (!Number.isFinite(t) || t < 0) throw Object.assign(new Error('stock_teorico_invalido'), { status: 400 });
  if (!Number.isFinite(r) || r < 0) throw Object.assign(new Error('conteo_real_invalido'), { status: 400 });
  const diferencia = Number((r - t).toFixed(6));
  return {
    stockTeorico: t,
    conteoReal: r,
    diferencia,
    tipo: diferencia > 0 ? 'sobrante' : diferencia < 0 ? 'faltante' : 'cuadrado',
    requiere_ajuste: diferencia !== 0,
    ajustar_con: diferencia > 0 ? 'entrada' : 'merma',
    motivo_sugerido: diferencia < 0 ? (opts.motivo || 'otro') : null,
  };
}

module.exports = { MOTIVOS_MERMA, validarMotivo, detalleMermaFEFO, analizarConteo };
