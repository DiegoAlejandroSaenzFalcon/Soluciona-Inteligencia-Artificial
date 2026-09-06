'use strict';
// Adaptador SQLite con API compatible con el paquete `postgres` (unsafe()).
// Permite que src/auth/* y demás código SQL use $1..$n / now() / RETURNING
// sobre la misma BD real (data/neurallgo.db).
const { db } = require('../../core/db-sqlite.js');

function traducirSql(sql) {
  let out = String(sql);
  // $1..$n -> ?
  out = out.replace(/\$(\d+)/g, '?');
  // now() -> CURRENT_TIMESTAMP
  out = out.replace(/\bnow\(\)/gi, 'CURRENT_TIMESTAMP');
  // Casts de Postgres (::text, ::int, ::numeric, ::int[]) -> se eliminan (SQLite es de tipado dinámico)
  out = out.replace(/::[a-zA-Z_][\w]*(?:\[\])?/g, '');
  return out;
}

function sqliteVal(v) {
  if (v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v instanceof Date) return v.toISOString();
  return v;
}

const client = {
  unsafe(sql, params = []) {
    const stmt = db.prepare(traducirSql(sql));
    const vals = params.map(sqliteVal);
    const type = String(sql).trim().slice(0, 6).toUpperCase();
    if (type === 'INSERT' || type === 'UPDATE' || type === 'DELETE') {
      const rows = stmt.all(...vals);
      return rows || [];
    }
    return stmt.all(...vals) || [];
  },
  // Transacción al estilo postgres.begin(fn): COMMIT si fn resuelve, ROLLBACK si lanza.
  async begin(fn) {
    db.exec('BEGIN');
    try {
      const out = await fn(client);
      db.exec('COMMIT');
      return out;
    } catch (e) {
      try { db.exec('ROLLBACK'); } catch (_) { /* ya cerrada */ }
      throw e;
    }
  },
  async end() {},
};

function getClient() {
  return client;
}

async function query(text, params) {
  return client.unsafe(text, params || []);
}

async function closeConnection() {
  return Promise.resolve();
}

module.exports = { getClient, query, closeConnection };
