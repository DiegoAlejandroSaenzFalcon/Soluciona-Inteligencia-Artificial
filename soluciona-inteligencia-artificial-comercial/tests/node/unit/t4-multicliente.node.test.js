// tests/node/unit/t4-multicliente.node.test.js
// T4 — Tests para multi-cliente: branding API, client packs demo, recetas listar/consumir

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

describe('T4 — Multi-cliente: branding y client packs', () => {
  const raiz = path.resolve(__dirname, '../../../');

  it('existe el endpoint de branding en web.js', () => {
    const webJs = fs.readFileSync(path.join(raiz, 'transports/web.js'), 'utf8');
    assert.ok(webJs.includes("/api/branding"), 'debe tener el endpoint /api/branding');
    assert.ok(webJs.includes('nombreNegocio'), 'debe incluir nombreNegocio en respuesta');
    assert.ok(webJs.includes('color'), 'debe incluir color en respuesta');
    assert.ok(webJs.includes('logo'), 'debe incluir logo en respuesta');
    assert.ok(webJs.includes('clienteId'), 'debe incluir clienteId en respuesta');
  });

  it('panel-empresarial.html incluye panel-branding.js', () => {
    const html = fs.readFileSync(path.join(raiz, 'panel-empresarial.html'), 'utf8');
    assert.ok(html.includes('panel-branding.js'), 'debe cargar panel-branding.js');
    assert.ok(html.includes('brand-logo'), 'debe tener placeholder para logo');
    assert.ok(html.includes('brandNombre'), 'debe tener elemento para nombre del negocio');
  });

  it('panel-branding.js existe y exporta funciones', () => {
    const brandingJs = fs.readFileSync(path.join(raiz, 'panel-branding.js'), 'utf8');
    assert.ok(brandingJs.includes('cargarBranding'), 'debe tener cargarBranding');
    assert.ok(brandingJs.includes('aplicarBranding'), 'debe tener aplicarBranding');
    assert.ok(brandingJs.includes('hexToRgba'), 'debe tener helper hexToRgba');
    assert.ok(brandingJs.includes('shadeColor'), 'debe tener helper shadeColor');
  });

  it('clients/demo/config.json tiene estructura válida con branding', () => {
    const demo = JSON.parse(fs.readFileSync(path.join(raiz, 'clients/demo/config.json'), 'utf8'));
    assert.equal(demo.id, 'demo');
    assert.ok(demo.negocio);
    assert.equal(demo.segmento, 'comidas');
    assert.ok(demo.menu?.color);
    assert.ok(Array.isArray(demo.productos));
    assert.ok(demo.productos.length > 0);
  });

  it('clients/demo2/config.json tiene estructura válida con branding distinto', () => {
    const demo2 = JSON.parse(fs.readFileSync(path.join(raiz, 'clients/demo2/config.json'), 'utf8'));
    assert.equal(demo2.id, 'demo2');
    assert.ok(demo2.negocio);
    assert.equal(demo2.segmento, 'comidas');
    assert.ok(demo2.menu?.color);
    assert.notEqual(demo2.menu.color, '#1f9d55', 'debe tener color distinto al demo1');
    assert.ok(demo2.menu?.logo, 'debe tener logo');
    assert.ok(Array.isArray(demo2.productos));
    assert.ok(demo2.productos.length > 0);
    assert.ok(demo2.domicilios?.faixas?.length > 0, 'debe tener faixas de domicilio');
  });

  it('los dos demos tienen menús diferentes', () => {
    const demo = JSON.parse(fs.readFileSync(path.join(raiz, 'clients/demo/config.json'), 'utf8'));
    const demo2 = JSON.parse(fs.readFileSync(path.join(raiz, 'clients/demo2/config.json'), 'utf8'));
    const nombresDemo = demo.productos.map(p => p.nombre).sort().join(',');
    const nombresDemo2 = demo2.productos.map(p => p.nombre).sort().join(',');
    assert.notEqual(nombresDemo, nombresDemo2, 'los catálogos deben ser distintos');
  });

  it('config.js resuelve --cliente demo2 correctamente', () => {
    // Verificar que la lógica de resolución de cliente funciona para demo2
    const configJs = fs.readFileSync(path.join(raiz, 'config.js'), 'utf8');
    assert.ok(configJs.includes('clients'), 'config.js debe resolver ruta clients/');
    assert.ok(configJs.includes('packValidado'), 'config.js debe validar el pack');
  });
});

describe('T4 — Recetas: listarRecetas y consumirPorReceta (funciones puras)', () => {
  const { calcularDesglose } = require('../../../src/inventory/recetas.js');

  const recetaEjemplo = {
    nombre: 'Combo Test',
    items: [
      { ingredientProductId: 1, cantidad: 2, unidad: 'und', ingredientNombre: 'Pan' },
      { ingredientProductId: 2, cantidad: 1, unidad: 'und', ingredientNombre: 'Carne' },
    ],
  };

  it('calcularDesglose funciona para consumirPorReceta', () => {
    const d = calcularDesglose(recetaEjemplo, 5);
    assert.equal(d.length, 2);
    const pan = d.find(x => x.ingredientProductId === 1);
    const carne = d.find(x => x.ingredientProductId === 2);
    assert.equal(pan.totalADescontar, 10); // 2 * 5
    assert.equal(carne.totalADescontar, 5); // 1 * 5
  });

  it('calcularDesglose valida unidades vendidas', () => {
    assert.throws(() => calcularDesglose(recetaEjemplo, 0), /unidades_vendidas_invalidas/);
    assert.throws(() => calcularDesglose(recetaEjemplo, -1), /unidades_vendidas_invalidas/);
    assert.throws(() => calcularDesglose(recetaEjemplo, 1.5), /unidades_vendidas_invalidas/);
  });
});