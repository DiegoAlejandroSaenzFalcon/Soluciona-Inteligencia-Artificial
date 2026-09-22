import { describe, it, expect } from 'vitest';

const { CONDICIONES, esFechaValida, normalizarLote, ordenFEFO, proximosVencer } = require('../../src/inventory/lotes.js');

describe('lotes — validación', () => {
  it('normaliza un lote válido', () => {
    const r = normalizarLote({ numeroLote: '  L-001 ', fechaVencimiento: '2026-12-31', condicion: 'CONGELADO' });
    expect(r).toEqual({ numeroLote: 'L-001', fechaVencimiento: '2026-12-31', condicion: 'congelado' });
  });

  it('usa condición por defecto "ambiente" cuando no se indica', () => {
    const r = normalizarLote({ numeroLote: 'A', fechaVencimiento: '2026-01-01' });
    expect(r.condicion).toBe('ambiente');
  });

  it('rechaza lote sin número', () => {
    expect(() => normalizarLote({ fechaVencimiento: '2026-01-01' })).toThrowError('numero_lote_requerido');
  });

  it('rechaza lote sin fecha de vencimiento', () => {
    expect(() => normalizarLote({ numeroLote: 'L' })).toThrowError('fecha_vencimiento_requerida');
  });

  it('rechaza fecha de vencimiento malformada', () => {
    expect(() => normalizarLote({ numeroLote: 'L', fechaVencimiento: '31/12/2026' })).toThrowError('fecha_vencimiento_invalida');
    expect(() => normalizarLote({ numeroLote: 'L', fechaVencimiento: '2026-02-30' })).toThrowError('fecha_vencimiento_invalida');
  });

  it('rechaza condición no permitida', () => {
    expect(() => normalizarLote({ numeroLote: 'L', fechaVencimiento: '2026-01-01', condicion: 'submarino' }))
      .toThrowError(/condicion_invalida/);
  });

  it('esFechaValida solo acepta ISO YYYY-MM-DD real', () => {
    expect(esFechaValida('2026-12-31')).toBe(true);
    expect(esFechaValida('2026-02-30')).toBe(false);
    expect(esFechaValida('12/31/2026')).toBe(false);
    expect(esFechaValida('')).toBe(false);
  });

  it('lista de condiciones permitidas es cerrada y conocida', () => {
    expect(CONDICIONES).toEqual(['ambiente', 'refrigerado', 'congelado', 'seco']);
  });
});

describe('lotes — FEFO (primero vence, primero sale)', () => {
  const lotes = [
    { numero_lote: 'B', fecha_vencimiento: '2026-03-01', cantidad_actual: 10 },
    { numero_lote: 'A', fecha_vencimiento: '2026-01-01', cantidad_actual: 5 },
    { numero_lote: 'C', fecha_vencimiento: '2026-01-01', cantidad_actual: 3 },
    { numero_lote: 'D', fecha_vencimiento: '2026-06-01', cantidad_actual: 0 },
  ];

  it('ordena por vencimiento ascendente y desempata por número de lote', () => {
    const r = ordenFEFO(lotes);
    expect(r.map(l => l.numero_lote)).toEqual(['A', 'C', 'B']);
  });

  it('excluye lotes sin existencia', () => {
    const r = ordenFEFO(lotes);
    expect(r.some(l => l.numero_lote === 'D')).toBe(false);
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
    expect(r.map(l => l.numero_lote)).toEqual(['vencido', 'dentro-rango']);
  });

  it('excluye lotes sin stock y los que vencen después del horizonte', () => {
    const r = proximosVencer(lotes, 7, new Date(`${hoy}T12:00:00Z`));
    expect(r.some(l => l.numero_lote === 'fuera-rango')).toBe(false);
    expect(r.some(l => l.numero_lote === 'sin-stock')).toBe(false);
  });
});