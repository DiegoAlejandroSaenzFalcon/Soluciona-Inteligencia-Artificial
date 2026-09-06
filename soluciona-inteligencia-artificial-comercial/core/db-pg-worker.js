'use strict';
const { parentPort, workerData } = require('worker_threads');
const postgres = require('postgres');
const { OPERATIONAL_DDL } = require('../src/db/operationalSchema.cjs');

const sql = postgres(workerData.url, {
  max: workerData.max || 10,
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => {},
});

const ctl = new Int32Array(workerData.ctlBuf);
const data = new Uint8Array(workerData.dataSab);
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8');

function isMutation(text) {
  const t = String(text).trim().toUpperCase();
  return t.startsWith('INSERT') || t.startsWith('UPDATE') || t.startsWith('DELETE');
}

async function ensureSchema() {
  await sql.unsafe(OPERATIONAL_DDL);
}

async function execute(text, params) {
  let t = String(text);
  const mutation = isMutation(t);
  if (mutation && !/\bRETURNING\b/i.test(t)) {
    t = t.replace(/;?\s*$/, '') + ' RETURNING 1 AS _ok';
  }
  const rows = await sql.unsafe(t, params || []);
  if (mutation) return { changes: rows.length, rows: [] };
  return { changes: 0, rows: Array.isArray(rows) ? rows : [] };
}

async function loop() {
  let schemaReady = false;
  while (true) {
    Atomics.wait(ctl, 0, 0);
    const state = Atomics.load(ctl, 0);
    if (state === 3) {
      await sql.end({ timeout: 2 }).catch(() => {});
      process.exit(0);
      return;
    }
    if (state !== 1) continue;
    const seq = Atomics.load(ctl, 1);
    if (seq === Atomics.load(ctl, 2)) {
      Atomics.store(ctl, 0, 0);
      continue;
    }
    const len = Atomics.load(ctl, 3);
    let req = null;
    try {
      req = JSON.parse(decoder.decode(data.subarray(0, len)));
    } catch (e) {
      req = { id: -1, sql: 'SELECT 1', params: [] };
    }
    let resp;
    try {
      if (!schemaReady) {
        await ensureSchema();
        schemaReady = true;
      }
      const r = await execute(req.sql, req.params);
      resp = { ok: true, id: req.id, changes: r.changes, rows: r.rows };
    } catch (e) {
      resp = { ok: false, id: req.id, error: { message: (e && e.message) || String(e) } };
    }
    const payload = encoder.encode(JSON.stringify(resp));
    const sab = new Uint8Array(workerData.dataSab);
    if (payload.length > sab.byteLength) {
      const err = encoder.encode(JSON.stringify({
        ok: false, id: req.id, error: { message: 'Resultado excede el buffer de datos (' + sab.byteLength + ' bytes)' }
      }));
      sab.set(err);
      Atomics.store(ctl, 3, err.length);
    } else {
      sab.set(payload);
      Atomics.store(ctl, 3, payload.length);
    }
    Atomics.store(ctl, 2, seq);
    Atomics.store(ctl, 0, 2);
    Atomics.notify(ctl, 0);
  }
}

loop().catch(e => {
  const err = encoder.encode(JSON.stringify({ ok: false, id: -1, error: { message: 'Worker fatal: ' + (e && e.message || e) } }));
  new Uint8Array(workerData.dataSab).set(err);
  Atomics.store(ctl, 3, err.length);
  Atomics.store(ctl, 0, 2);
  Atomics.notify(ctl, 0);
});