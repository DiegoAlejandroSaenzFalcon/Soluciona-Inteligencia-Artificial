'use strict';

// Lógica pura de lotes para inventario alimentario (sin acceso a base de datos).
// H1: validación de lote + orden FEFO + alerta de próximos a vencer.

const CONDICIONES = ['ambiente', 'refrigerado', 'congelado', 'seco'];

const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function esFechaValida(s) {
  if (!REGEX_FECHA.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  // Verificación de ida y vuelta: new Date hace rollover de días inválidos
  // (p.ej. 2026-02-30 -> 2026-03-02); comparamos componentes para evitarlo.
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// Valida y normaliza un lote de entrada. Obligatorio para todo producto
// que maneje stock alimentario: número de lote, fecha de vencimiento y condición.
function normalizarLote(input) {
  const numeroLote = String((input && input.numeroLote) || '').trim();
  if (!numeroLote) throw Object.assign(new Error('numero_lote_requerido'), { status: 400 });
  if (numeroLote.length > 64) throw Object.assign(new Error('numero_lote_demasiado_largo'), { status: 400 });

  const fechaVencimiento = String((input && input.fechaVencimiento) || '').trim();
  if (!fechaVencimiento) throw Object.assign(new Error('fecha_vencimiento_requerida'), { status: 400 });
  if (!esFechaValida(fechaVencimiento)) throw Object.assign(new Error('fecha_vencimiento_invalida'), { status: 400 });

  const condicion = String((input && input.condicion) || '').trim().toLowerCase() || 'ambiente';
  if (!CONDICIONES.includes(condicion)) {
    throw Object.assign(new Error(`condicion_invalida (valores: ${CONDICIONES.join(', ')})`), { status: 400 });
  }

  return { numeroLote, fechaVencimiento, condicion };
}

// Lotes con existencia ordenados por vencimiento ascendente (FEFO:
// lo que vence primero se consume primero). Desempate por número de lote.
function ordenFEFO(lotes) {
  return (lotes || [])
    .filter(l => l && (Number(l.cantidad_actual) || 0) > 0)
    .sort((a, b) => {
      const fa = a.fecha_vencimiento || '';
      const fb = b.fecha_vencimiento || '';
      if (fa !== fb) return fa < fb ? -1 : 1;
      return String(a.numero_lote || '').localeCompare(String(b.numero_lote || ''));
    });
}

// Lotes con existencia cuyo vencimiento cae dentro de [hoy, hoy+días], incluye
// los ya vencidos (alerta crítica). Devuelve la lista ordenada por FEFO.
function proximosVencer(lotes, dias = 7, ahora = new Date()) {
  const ref = new Date(ahora);
  if (Number.isNaN(ref.getTime())) return [];
  const limite = new Date(ref.getTime() + (Number(dias) || 0) * 86400000)
    .toISOString()
    .slice(0, 10);
  return ordenFEFO(lotes).filter(l => {
    const fv = l.fecha_vencimiento;
    return fv && fv <= limite;
  });
}

module.exports = { CONDICIONES, esFechaValida, normalizarLote, ordenFEFO, proximosVencer };