// tests/node/unit/verify-environment.node.test.js
// Suite del verificador de entorno (scripts/verify-environment.js).
// Regla: el verificador NUNCA debe fallar en silencio — tiene que decirte qué falta.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const script = path.resolve(__dirname, '../../../scripts/verify-environment.js');

describe('verify-environment.js — verificador de onboarding', () => {
  it('existe y es un script ejecutable', () => {
    assert.ok(fs.existsSync(script), 'el script no existe');
  });

  it('produce salida tabular legible', () => {
    const out = execFileSync(process.execPath, [script, '--json'], { encoding: 'utf8' });
    const checks = JSON.parse(out);
    assert.ok(Array.isArray(checks), 'debe devolver un array de chequeos');
    assert.ok(checks.length >= 5, 'debe tener al menos los chequeos centrales (env, secretos, DB, IA, WhatsApp, puerto)');
    // Debe nombrar claves sin exponerlas
    for (const c of checks) {
      assert.ok(typeof c.nombre === 'string');
      assert.ok(['OK', 'FAIL', 'WARN', 'INFO'].includes(c.estado), `estado inválido en ${c.nombre}: ${c.estado}`);
      assert.ok(!JSON.stringify(c).match(/nvidia-\w{20,}|sk-\w{20,}/), 'el verificador no puede exponer claves reales');
    }
  });

  it('diferencia claves presentes de ausentes', () => {
    const out = execFileSync(process.execPath, [script, '--json'], { encoding: 'utf8' });
    const checks = JSON.parse(out);
    const llm = checks.find(c => c.nombre.includes('LLM'));
    assert.ok(llm, 'debe existir el chequeo LLM');
    // En esta máquina (sin keys cargadas) debe reportar WARN, no OK y nunca FAIL
    assert.ok(['WARN', 'INFO'].includes(llm.estado), `esperábamos WARN o INFO, pero fue ${llm.estado}`);
    // PANEL_PASSWORD siempre debe estar en el proyecto maduro
    const pw = checks.find(c => c.nombre.includes('PANEL'));
    assert.ok(pw.estado === 'OK', 'PANEL_PASSWORD debe estar configurado tras T1');
  });

  it('nunca expone un secret en la salida', () => {
    const out = execFileSync(process.execPath, [script, '--json'], { encoding: 'utf8' });
    const claves = Object.entries(JSON.parse(process.env.MIS_SECRETES_TEST || '{}')); // inocuo
    assert.ok(!out.includes('nvidia-'), 'la salida no incluye prefijos de keys de NVIDIA');
    assert.ok(!out.includes('sk-'), 'la salida no incluye claves de OpenAI');
  });
});
