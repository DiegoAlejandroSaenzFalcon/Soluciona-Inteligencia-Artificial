'use strict';
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { config } = require('../../config.cjs');
const { getClient, closeConnection } = require('./connection.cjs');
const { OPERATIONAL_DDL } = require('./operationalSchema.cjs');

const TABLAS = [
  {
    tabla: 'pedidos',
    columnas: ['id','tenant_id','fecha','dia','remitente','telefono','items','total','crudo','direccion','lat','lng','estado','tipo','estado_pago','factura_emitida','factura_proveedor','distancia_km','costo_domicilio']
  },
  {
    tabla: 'clientes',
    columnas: ['tenant_id','telefono','nombre','total_pedidos','ultima_compra','creado']
  },
  {
    tabla: 'conversaciones',
    columnas: ['id','tenant_id','hilo','remitente','rol','texto','fecha']
  },
  {
    tabla: 'lid_map',
    columnas: ['lid','telefono','actualizado']
  },
  {
    tabla: 'uso_ia',
    columnas: ['id','tenant_id','rol','modelo','proveedor','tokens_prompt','tokens_completados','fecha']
  },
  {
    tabla: 'citas',
    columnas: ['id','tenant_id','fecha','hora','servicio','profesional','paciente','telefono','estado','confirmada','creado']
  }
];

function normalizarLid(lid) {
  if (lid == null) return lid;
  return String(lid).split('@')[0].split(':')[0].replace(/\D/g, '');
}

async function main() {
  const sqlitePath = path.join(config.dataDir, 'neurallgo.db');
  if (!fs.existsSync(sqlitePath)) {
    console.error(`[MIGRAR] No existe el archivo SQLite: ${sqlitePath}`);
    process.exit(1);
  }

  const sq = new DatabaseSync(sqlitePath, { readOnly: true });
  const pg = getClient();

  console.log(`[MIGRAR] Creando/especificando tablas operativas en PostgreSQL (${config.dbName})...`);
  await pg.unsafe(OPERATIONAL_DDL);

  // tenants -> tabla drizzle (id 'default' ya existe por el seed; solo completamos nombre)
  try {
    const t = sq.prepare('SELECT * FROM tenants').all();
    for (const r of t) {
      await pg.unsafe(
        'INSERT INTO tenants (id, nombre) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
        [r.id || 'default', r.nombre || config.negocio || r.id || 'default']
      );
    }
    console.log(`[MIGRAR] tenants: ${t.length} procesado(s)`);
  } catch (e) {
    console.warn(`[MIGRAR] tenants (opcional): ${e.message}`);
  }

  const reporte = [];
  for (const t of TABLAS) {
    const filas = sq.prepare(`SELECT * FROM ${t.tabla}`).all();
    let insertados = 0;
    let duplicados = 0;
    for (const r of filas) {
      const cols = t.columnas;
      const ph = cols.map((_, i) => `$${i + 1}`).join(', ');
      const values = cols.map(c => {
        let v = r[c] === undefined ? null : r[c];
        if (t.tabla === 'lid_map' && c === 'lid') v = normalizarLid(v);
        return v;
      });
      const res = await pg.unsafe(
        `INSERT INTO ${t.tabla} (${cols.join(', ')}) VALUES (${ph}) ON CONFLICT DO NOTHING RETURNING 1`,
        values
      );
      insertados += res.length;
      duplicados += 1 - res.length;
    }
    reporte.push({ tabla: t.tabla, sqlite: filas.length, insertados, duplicados });
  }

  console.log('\n[MIGRAR] Resumen:');
  for (const r of reporte) {
    console.log(`  ${r.tabla.padEnd(16)} sqlite=${String(r.sqlite).padStart(4)}  insertados=${String(r.insertados).padStart(4)}  duplicados=${r.duplicados}`);
  }

  const totalSqlite = reporte.reduce((a, r) => a + r.sqlite, 0);
  const totalPg = reporte.reduce((a, r) => a + r.insertados, 0);
  console.log(`\n[MIGRAR] Total: ${totalSqlite} filas en SQLite, ${totalPg} insertadas en PostgreSQL.`);

  await closeConnection();
  console.log('[MIGRAR] Listo.');
}

main().catch(e => {
  console.error('[MIGRAR] Error:', e && e.message ? e.message : e);
  process.exit(1);
});