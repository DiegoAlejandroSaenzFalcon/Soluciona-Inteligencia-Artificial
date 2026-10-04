// tests/node/unit/system-health.node.test.js
// V3: el reporte de salud es determinista y jamás finge IA.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { obtenerReporteCompleto } = require('../../../src/health/system-report.js');
const { narrarReporte } = require('../../../src/health/ai-narrator.js');

describe('V3 — salud del sistema (determinista + IA honesta)', () => {
  it('genera checks con estructura establecida', async () => {
    const r = await obtenerReporteCompleto();
    assert.ok(Array.isArray(r.checks), 'checks debe ser array');
    assert.ok(r.checks.length >= 5, 'debe tener los chequeos centrales');
    for (const c of r.checks) {
      assert.ok(['OK', 'FAIL', 'WARN', 'INFO'].includes(c.estado), `estado inválido: ${c.estado}`);
    }
    assert.ok(typeof r.meta.iaNarrativaDisponible === 'boolean');
  });

  it('nunca declara narrativa de IA que no haya pasado realmente', async () => {
    const r = await obtenerReporteCompleto();
    const narr = await narrarReporte(r);
    // Tres estados honhestos: ninguno finge análisis falso.
    if (!r.meta.iaNarrativaDisponible) {
      assert.equal(narr.modo, 'SIN IA (reglas deterministas)', 'sin key no puede haber narrativa IA');
    } else {
      assert.ok(['NARRADO POR IA', 'IA con error'].includes(narr.modo),
        `con key debe intentar/declarar el error, nunca fingir simpleza. Actual: ${narr.modo}`);
    }
    assert.ok((narr.texto || '').length > 5, 'la respuesta debe comunicar algo aunque falle');
  });
});
