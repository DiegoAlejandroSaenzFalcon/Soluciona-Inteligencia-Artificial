// tests/node/unit/client-packs.node.test.js
// T4: carga de "clientes por packs" — suite de validación y resolución.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const raiz = path.resolve(__dirname, '../../../');

function cargarConfigConArgs(args) {
  // Carga config.js como si lo hubieran llamado con args concretos.
  const configPath = path.join(raiz, 'config.js');
  delete require.cache[configPath];
  const argv = process.argv;
  process.argv = ['node', 'index.js', ...args];
  try { return require(configPath); }
  finally { process.argv = argv; delete require.cache[configPath]; }
}

describe('T4 — clientes por packs', () => {
  it('resuelve "--cliente demo" al pack de demo', () => {
    const m = cargarConfigConArgs(['--cliente', 'demo']);
    assert.equal(m.config.clienteId, 'demo');
    assert.equal(m.config.packValidado.esCliente, true);
    assert.equal(m.config.packValidado.errores.length, 0);
    assert.ok(m.config.dataDir.endsWith(path.join('data', 'demo')));
  });

  it('sin --cliente sigue en modo standalone (comportamiento histórico)', () => {
    const m = cargarConfigConArgs([]);
    assert.equal(m.config.clienteId, 'default');
    assert.equal(m.config.packValidado.esCliente, false);
  });

  it('rechaza un pack con producto mal formado con mensaje accionable', () => {
    // El test crea un pack roto, lo intenta cargar, y limpia todo (incl. riesgos de residuo).
    const fs = require('fs');
    const packDir = path.join(raiz, 'clients', 'test-pack-invalido');
    fs.mkdirSync(packDir, { recursive: true });
    fs.writeFileSync(path.join(packDir, 'config.json'), JSON.stringify({
      negocio: '',
      productos: [{ nombre: '', precio: -1 }],
    }));
    try {
      assert.throws(
        () => cargarConfigConArgs(['--cliente', 'test-pack-invalido']),
        /productos\[0\]\.nombre vacío|precio inválido/
      );
    } finally {
      fs.rmSync(packDir, { recursive: true, force: true });
    }
  });
});
