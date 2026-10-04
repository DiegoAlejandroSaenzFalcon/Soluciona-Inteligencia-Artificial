// tests/node/unit/generar-manual.node.test.js
// V2: el manual se genera desde el pack y NUNCA contiene secretos.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const script = path.resolve(__dirname, '../../../scripts/generar-manual.js');
const packReal = path.resolve(__dirname, '../../../clients/demo/config.json');

describe('generar-manual.js — manual personalizado por cliente', () => {
  it('existe el script', () => {
    assert.ok(fs.existsSync(script));
  });

  it('falla con mensaje claro si el pack no existe', () => {
    assert.throws(() => {
      execFileSync(process.execPath, [script, '--cliente', 'cliente-que-no-existe'], { encoding: 'utf8', stdio: 'pipe' });
    }, /no existe el pack/);
  });

  it('genera contenido sin secretos y con datos del pack', () => {
    const tmp = path.join(os.tmpdir(), `manual-test-${Date.now()}.md`);
    try {
      execFileSync(process.execPath, [script, '--cliente', 'demo', '--out', tmp], { encoding: 'utf8' });
      assert.ok(fs.existsSync(tmp));
      const txt = fs.readFileSync(tmp, 'utf8');
      assert.ok(txt.includes('MANUAL DE IMPLEMENTACIÓN'), 'debe tener el encabezado');
      assert.ok(txt.includes('Negocio Demo'), 'debe usar el nombre del pack demo');
      assert.ok(!/(PANEL_PASSWORD\s*=|CLOUD_TOKEN\s*=|nvidia-[a-z0-9]{20,}|sk-[a-z0-9]{20,})/i.test(txt), 'NO puede contener secretos');
      assert.ok(txt.includes('http://localhost:3000'), 'incluye el link del panel');
    } finally {
      if (fs.existsSync(tmp)) fs.rmSync(tmp, { force: true });
    }
  });
});
