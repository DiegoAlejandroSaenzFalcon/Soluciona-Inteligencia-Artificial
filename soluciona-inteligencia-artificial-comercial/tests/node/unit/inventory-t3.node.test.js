// tests/node/unit/inventory-t3.node.test.js
// Runner nativo node:test — H2/H3/H4/H5 del hito inventario alimentario.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { convertir, sonCompatibles, aBase, FACTORES } = require('../../../src/inventory/unidades.js');
const { validarMotivo, detalleMermaFEFO, analizarConteo, MOTIVOS_MERMA } = require('../../../src/inventory/mermas.js');
const { validarReceta, calcularDesglose, costearProducto, producibilidad } = require('../../../src/inventory/recetas.js');

describe('H3 — unidades y conversiones', () => {
  it('convierte kg a g correctamente', () => {
    assert.equal(convertir(2.5, 'kg', 'g'), 2500);
  });
  it('convierte ml a L correctamente', () => {
    assert.equal(convertir(2500, 'ml', 'L'), 2.5);
  });
  it('und a docena y viceversa', () => {
    assert.equal(convertir(24, 'und', 'docena'), 2);
    assert.equal(convertir(2, 'docena', 'und'), 24);
  });
  it('rechaza convertir masa a volumen (física)', () => {
    assert.throws(() => convertir(1, 'kg', 'L'), /unidades_incompatibles/);
    assert.throws(() => convertir(1, 'ml', 'und'), /unidades_incompatibles/);
  });
  it('und a g funciona (conteo a masa en este sistema)', () => {
    // En el modelo actual, "und" puede ser "cada una pesa X" — ese mapeo se hace
    // en el producto, no aquí. Por eso, en este módulo und y g son incompatibles.
    assert.throws(() => convertir(3, 'und', 'g'), /unidades_incompatibles/);
  });
  it('aBase normaliza correctamente', () => {
    assert.deepEqual(aBase(2, 'kg'), { cantidad: 2000, unidad: 'g', dimension: 'masa' });
    assert.deepEqual(aBase(500, 'ml'), { cantidad: 500, unidad: 'ml', dimension: 'volumen' });
  });
});

describe('H4 — mermas y FEFO', () => {
  const lotes = [
    { id: 1, numero_lote: 'L2', cantidad_actual: 5, fecha_vencimiento: '2026-11-01' },
    { id: 2, numero_lote: 'L1', cantidad_actual: 10, fecha_vencimiento: '2026-10-01' },
    { id: 3, numero_lote: 'L3', cantidad_actual: 4, fecha_vencimiento: '2026-12-01' },
  ];

  it('descuenta siempre del lote más próximo a vencer (FEFO)', () => {
    // L1 vence primero y tiene 10; pedir 6 se resuelve ÍNTEGRO con L1, sin tocar L2/L3.
    const r = detalleMermaFEFO(lotes, 6);
    assert.equal(r.detalle.length, 1);
    assert.equal(r.detalle[0].lotId, 2);    // L1
    assert.equal(r.detalle[0].consumir, 6); // todo de L1
    assert.ok(r.fefoAplicado);
  });

  it('si el lote próximo no cubre, reparte al siguiente por FEFO', () => {
    const r = detalleMermaFEFO(lotes, 12);
    assert.equal(r.detalle.length, 2);       // L1 se agota (10) y el resto va a L2
    assert.equal(r.detalle[0].lotId, 2);
    assert.equal(r.detalle[0].consumir, 10);
    assert.equal(r.detalle[1].lotId, 1);     // L2 aporta las 2 restantes
    assert.equal(r.detalle[1].consumir, 2);
  });

  it('repasa lotes vacíos si es necesario', () => {
    const vacios = [...lotes, { id: 4, numero_lote: 'L4', cantidad_actual: 0, fecha_vencimiento: '2026-09-01' }];
    const r = detalleMermaFEFO(vacios, 10);
    assert.equal(r.detalle.find(d => d.lotId === 4), undefined); // L4 tiene 0 → no se toca
    assert.equal(r.totalRepartido, 10);
  });

  it('rechaza merma mayor que el stock disponible', () => {
    assert.throws(() => detalleMermaFEFO(lotes, 99), /stock_insuficiente/);
  });

  it('valida motivo: "otro" exige nota', () => {
    assert.throws(() => validarMotivo('otro', ''), /nota_requerida/);
    assert.equal(validarMotivo('otro', 'corte de electricidad'), 'otro');
    assert.equal(validarMotivo('vencimiento'), 'vencimiento');
    assert.throws(() => validarMotivo('desconocido', 'x'), /motivo_invalido/);
  });

  it('analizarConteo produce el ajuste correcto', () => {
    // faltante
    const f = analizarConteo(10, 6);
    assert.equal(f.tipo, 'faltante');
    assert.equal(f.diferencia, -4);
    assert.equal(f.ajustar_con, 'merma');
    assert.equal(f.requiere_ajuste, true);
    // sobrante
    const s = analizarConteo(10, 14);
    assert.equal(s.tipo, 'sobrante');
    assert.equal(s.ajustar_con, 'entrada');
    // cuadrado
    const c = analizarConteo(10, 10);
    assert.equal(c.tipo, 'cuadrado');
    assert.equal(c.requiere_ajuste, false);
  });
});

describe('H5 — recetas/BOM', () => {
  const productosById = new Map([
    [10, { id: 10, nombre: 'Pan perro 16cm', unidad_medida: 'und' }],
    [11, { id: 11, nombre: 'Salchicha americana', unidad_medida: 'und' }],
    [12, { id: 12, nombre: 'Queso', unidad_medida: 'g' }],
  ]);
  const receta = {
    nombre: 'Perro Americano',
    items: [
      { ingredientProductId: 10, cantidad: 1, unidad: 'und' },
      { ingredientProductId: 11, cantidad: 2, unidad: 'und' },
      { ingredientProductId: 12, cantidad: 30, unidad: 'g' },
    ],
  };

  it('valida receta correcta', () => {
    assert.equal(validarReceta(receta, productosById).items.length, 3);
  });

  it('rechaza ingredientes duplicados', () => {
    const mala = { ...receta, items: [...receta.items, { ingredientProductId: 10, cantidad: 1, unidad: 'und' }] };
    assert.throws(() => validarReceta(mala, productosById), /duplicado/);
  });

  it('rechaza cantidad <=0', () => {
    const mala = { ...receta, items: [{ ingredientProductId: 10, cantidad: 0, unidad: 'und' }] };
    assert.throws(() => validarReceta(mala, productosById), /cantidad_invalida/);
  });

  it('rechaza ingrediente que no existe', () => {
    const mala = { ...receta, items: [{ ingredientProductId: 999, cantidad: 1, unidad: 'und' }] };
    assert.throws(() => validarReceta(mala, productosById), /ingrediente_no_existe/);
  });

  it('rechaza unidad incompatible (masa no puede convertir a conteo)', () => {
    const mala = { ...receta, items: [{ ingredientProductId: 12, cantidad: 30, unidad: 'und' }] };
    assert.throws(() => validarReceta(mala, productosById), /incompatible/);
  });

  it('calcula desglose para N ventas', () => {
    const d = calcularDesglose(receta, 3);
    assert.equal(d.length, 3);
    assert.equal(d.find(x => x.ingredientProductId === 10).totalADescontar, 3);
    assert.equal(d.find(x => x.ingredientProductId === 11).totalADescontar, 6);
    assert.equal(d.find(x => x.ingredientProductId === 12).totalADescontar, 90);
  });

  it('costea receta con costos actuales', () => {
    const costos = new Map([[10, 800], [11, 2500], [12, 120]]); // por unidad
    const r = costearProducto(receta, 2, costos);
    // Por unidad: (1 pan × 800) + (2 salchichas × 2500) + (30 g × 120 g) = 9400
    // Para 2 unidades: 18800
    assert.equal(r.costoTotal, 18800);
    assert.equal(r.faltantes.length, 0);
  });

  it('detecta falta de costo como null, no como 0', () => {
    const r = costearProducto(receta, 1, new Map([[10, 800]]));
    assert.equal(r.faltantes.length, 2);
  });

  it('producibilidad = cuello de botella', () => {
    // con stock de: panes 5, salchichas 7 (necesita 2), queso 200 (necesita 30)
    const stock = new Map([[10, 5], [11, 7], [12, 200]]);
    // min(5/1, 7/2, 200/30) = min(5, 3, 6) = 3
    assert.equal(producibilidad(receta, stock), 3);
  });
});
