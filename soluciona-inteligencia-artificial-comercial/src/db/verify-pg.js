'use strict';
process.env.DB_ENGINE = 'postgres';

const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { config } = require('../../config.js');
const db = require('../../core/db.js');

const sqlitePath = path.join(config.dataDir, 'neurallgo.db');
const sq = new DatabaseSync(sqlitePath, { readOnly: true });

let fallos = 0;
let pasos = 0;
function check(nombre, cond, detalle) {
  pasos++;
  if (cond) {
    console.log(`  OK   ${nombre}`);
  } else {
    fallos++;
    console.log(`  FAIL ${nombre}  ${detalle || ''}`);
  }
}

const TEST_TEL = '9990000001';
const TEST_LID = '999000000000000';

try {
  // ---- Lecturas ----
  const nSqlite = sq.prepare('SELECT COUNT(*) AS n FROM pedidos').get().n;
  const nPg = db.leerPedidos().length;
  check('pedidos: pg === sqlite', nPg === nSqlite, `pg=${nPg} sqlite=${nSqlite}`);

  const cSqlite = sq.prepare('SELECT COUNT(*) AS n FROM clientes').get().n;
  const cPg = db.listarClientes().length;
  check('clientes: pg === sqlite', cPg === cSqlite, `pg=${cPg} sqlite=${cSqlite}`);

  const lidSqlite = sq.prepare('SELECT COUNT(*) AS n FROM lid_map').get().n;
  const lidPg = Object.keys(db.leerLidMaps()).length;
  check('lid_map: pg === sqlite', lidPg === lidSqlite, `pg=${lidPg} sqlite=${lidSqlite}`);

  const convSqlite = sq.prepare('SELECT COUNT(*) AS n FROM conversaciones').get().n;
  const hilosPg = db.hilosConversacion();
  const totalConvPg = hilosPg.reduce((a, h) => a + h.total, 0);
  check('conversaciones: pg === sqlite', totalConvPg === convSqlite, `pg=${totalConvPg} sqlite=${convSqlite}`);
  check('hilosConversacion devuelve hilos', hilosPg.length > 0);

  if (hilosPg.length) {
    const hilo = hilosPg[0].telefono;
    const mensajes = db.leerHiloConversacion(hilo);
    check('leerHiloConversacion devuelve mensajes', Array.isArray(mensajes) && mensajes.length > 0);
    check('leerHiloConversacion mapea rol/texto', mensajes.every(m => 'rol' in m && 'texto' in m));
  }

  const lidExistente = Object.keys(db.leerLidMaps())[0];
  if (lidExistente) {
    const resuelto = db.resolverLid(lidExistente);
    check('resolverLid resuelve lid existente', !!resuelto);
  }

  const pend = db.lidsPendientes();
  check('lidsPendientes devuelve array', Array.isArray(pend));

  const uso = db.consumoIADia('chatbot');
  check('consumoIADia devuelve llamadas/tokens', typeof uso.llamadas === 'number' && typeof uso.tokens === 'number');
  const usoMes = db.consumoIAMes('chatbot');
  check('consumoIAMes devuelve llamadas/tokens', typeof usoMes.llamadas === 'number' && typeof usoMes.tokens === 'number');

  const citas = db.leerCitas();
  check('leerCitas devuelve array', Array.isArray(citas));

  // ---- Escrituras (con limpieza) ----
  const nuevoId = db.siguienteId();
  const maxSqlite = sq.prepare('SELECT COALESCE(MAX(id),0)+1 AS n FROM pedidos').get().n;
  check('siguienteId coincide con sqlite', Number(nuevoId) === Number(maxSqlite), `pg=${nuevoId} sqlite=${maxSqlite}`);

  db.guardarPedido({ id: nuevoId, telefono: TEST_TEL, items: [{ producto: 'TEST', cantidad: 1, subtotal: 100 }], total: 100, fecha: new Date().toISOString() });
  const pedidoNuevo = db.leerPedidos().find(p => p.id === nuevoId);
  check('guardarPedido persiste', !!pedidoNuevo);
  check('guardarPedido items JSON', pedidoNuevo && Array.isArray(pedidoNuevo.items) && pedidoNuevo.items[0].producto === 'TEST');
  check('guardarPedido actualiza perfil (cliente)', !!db.obtenerCliente(TEST_TEL));
  db._sql('DELETE FROM pedidos WHERE tenant_id=$1 AND id=$2', [config.clienteId, nuevoId]);
  db._sql('DELETE FROM clientes WHERE tenant_id=$1 AND telefono=$2', [config.clienteId, TEST_TEL]);
  check('guardarPedido limpieza', !db.leerPedidos().find(p => p.id === nuevoId));

  db.guardarLidMap(TEST_LID, TEST_TEL);
  check('guardarLidMap persiste', db.resolverLid(TEST_LID) === TEST_TEL);
  db._sql('DELETE FROM lid_map WHERE lid=$1', [TEST_LID]);

  db.registrarConversacion(TEST_TEL, 'Test', 'bot', 'mensaje de prueba');
  check('registrarConversacion persiste', db.hilosConversacion().some(h => h.telefono === TEST_TEL));
  db._sql('DELETE FROM conversaciones WHERE tenant_id=$1 AND hilo=$2', [config.clienteId, TEST_TEL]);

  db.guardarCita({ id: db.siguienteCitaId(), fecha: '2099-01-01', hora: '10:00', servicio: 'TEST', paciente: 'Test', telefono: TEST_TEL });
  const citaNueva = db.leerCitas().find(c => c.servicio === 'TEST');
  check('guardarCita persiste', !!citaNueva);
  db.cambiarEstadoCita(citaNueva.id, 'cancelada');
  check('cambiarEstadoCita actualiza', db.leerCitas().find(c => c.id === citaNueva.id).estado === 'cancelada');
  db._sql('DELETE FROM citas WHERE tenant_id=$1 AND servicio=$2', [config.clienteId, 'TEST']);

  db.registrarUsoIA('test_rol', 'modelo-x', 'prov', 5, 10);
  const usoTest = db.consumoIADia('test_rol');
  check('registrarUsoIA + consumoIADia', usoTest.llamadas >= 1);
  db._sql('DELETE FROM uso_ia WHERE tenant_id=$1 AND rol=$2', [config.clienteId, 'test_rol']);

  check('ping()', db.ping() === true);
  check('_sql SELECT 1', db._sql('SELECT 1').rows.length === 1);
} catch (e) {
  fallos++;
  console.error('  ERROR inesperado:', e && e.stack || e);
}

sq.close();
console.log(`\n[VERIFY-PG] ${pasos} pasos, ${fallos} fallos.`);
process.exit(fallos ? 1 : 0);
