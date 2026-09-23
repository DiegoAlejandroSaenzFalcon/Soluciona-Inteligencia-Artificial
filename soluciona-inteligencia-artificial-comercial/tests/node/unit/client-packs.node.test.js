// tests/node/unit/client-packs.node.test.js
// T4: carga de "clientes por packs" — suite de validación y resolución.
// Regla del proyecto: los tests deben correr igual en local que en CI (sin
// depender de archivos machine-local como el config.json del desarrollador).

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

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

  it('sin --cliente sigue en modo standalone (comportamiento histórico)', (t) => {
    // Este modo depende de que exista config.json en la raíz del proyecto, que
    // está deliberadamente excluido de git (es machine-local). En CI no existe,
    // así que el test heréticamente se salta si no hay archivo.
    const existe = fs.existsSync(path.join(raiz, 'config.json'));
    if (!existe) return t.skip('config.json raíz no existe en este entorno (CI/limpio)');
    const m = cargarConfigConArgs([]);
    assert.equal(m.config.clienteId, 'default');
    assert.equal(m.config.packValidado.esCliente, false);
  });

  it('rechaza un pack con producto mal formado con mensaje accionable', () => {
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
