// tests/node/unit/inventory-lots.node.test.js
// Runner nativo de Node (`node --test`). No requiere Vitest ni la pila rota.
// Mantiene la misma cobertura lógica que tests/unit/inventory-lots.test.js.
// Regla: escrito primero contra la implementación H1 ya fusionada en main (PR #9).

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { CONDICIONES, esFechaValida, normalizarLote, ordenFEFO, proximosVencer } = require('../../../src/inventory/lotes.js');

describe('lotes — validación', () => {
  it('normaliza un lote válido', () => {
    const r = normalizarLote({ numeroLote: '  L-001 ', fechaVencimiento: '2026-12-31', condicion: 'CONGELADO' });
    assert.deepEqual(r, { numeroLote: 'L-001', fechaVencimiento: '2026-12-31', condicion: 'congelado' });
  });

  it('usa condición por defecto "ambiente" cuando no se indica', () => {
    const r = normalizarLote({ numeroLote: 'A', fechaVencimiento: '2026-01-01' });
    assert.equal(r.condicion, 'ambiente');
  });

  it('rechaza lote sin número', () => {
    assert.throws(() => normalizarLote({ fechaVencimiento: '2026-01-01' }), /numero_lote_requerido/);
  });

  it('rechaza lote sin fecha de vencimiento', () => {
    assert.throws(() => normalizarLote({ numeroLote: 'L' }), /fecha_vencimiento_requerida/);
  });

  it('rechaza fecha de vencimiento malformada', () => {
    assert.throws(() => normalizarLote({ numeroLote: 'L', fechaVencimiento: '31/12/2026' }), /fecha_vencimiento_invalida/);
    assert.throws(() => normalizarLote({ numeroLote: 'L', fechaVencimiento: '2026-02-30' }), /fecha_vencimiento_invalida/);
  });

  it('rechaza condición no permitida', () => {
    assert.throws(() => normalizarLote({ numeroLote: 'L', fechaVencimiento: '2026-01-01', condicion: 'submarino' }), /condicion_invalida/);
  });

  it('esFechaValida solo acepta ISO real', () => {
    assert.equal(esFechaValida('2026-12-31'), true);
    assert.equal(esFechaValida('2026-02-30'), false);
    assert.equal(esFechaValida('12/31/2026'), false);
    assert.equal(esFechaValida(''), false);
  });

  it('lista de condiciones cerrada', () => {
    assert.deepEqual(CONDICIONES, ['ambiente', 'refrigerado', 'congelado', 'seco']);
  });
});

describe('lotes — FEFO', () => {
  const lotes = [
    { numero_lote: 'B', fecha_vencimiento: '2026-03-01', cantidad_actual: 10 },
    { numero_lote: 'A', fecha_vencimiento: '2026-01-01', cantidad_actual: 5 },
    { numero_lote: 'C', fecha_vencimiento: '2026-01-01', cantidad_actual: 3 },
    { numero_lote: 'D', fecha_vencimiento: '2026-06-01', cantidad_actual: 0 },
  ];

  it('ordena por vencimiento ascendente y desempata por número de lote', () => {
    const r = ordenFEFO(lotes);
    assert.deepEqual(r.map(l => l.numero_lote), ['A', 'C', 'B']);
  });

  it('excluye lotes sin existencia', () => {
    assert.equal(ordenFEFO(lotes).some(l => l.numero_lote === 'D'), false);
  });
});

describe('lotes — próximos a vencer', () => {
  const hoy = '2026-09-12';
  const lotes = [
    { numero_lote: 'vencido', fecha_vencimiento: '2026-09-01', cantidad_actual: 2 },
    { numero_lote: 'dentro-rango', fecha_vencimiento: '2026-09-18', cantidad_actual: 8 },
    { numero_lote: 'fuera-rango', fecha_vencimiento: '2026-10-01', cantidad_actual: 5 },
    { numero_lote: 'sin-stock', fecha_vencimiento: '2026-09-15', cantidad_actual: 0 },
  ];

  it('detecta vencidos y por vencer dentro del horizonte, ordenados FEFO', () => {
    const r = proximosVencer(lotes, 7, new Date(`${hoy}T12:00:00Z`));
    assert.deepEqual(r.map(l => l.numero_lote), ['vencido', 'dentro-rango']);
  });

  it('excluye lotes sin stock y los que vencen después del horizonte', () => {
    const r = proximosVencer(lotes, 7, new Date(`${hoy}T12:00:00Z`));
    assert.equal(r.some(l => l.numero_lote === 'fuera-rango'), false);
    assert.equal(r.some(l => l.numero_lote === 'sin-stock'), false);
  });
});
