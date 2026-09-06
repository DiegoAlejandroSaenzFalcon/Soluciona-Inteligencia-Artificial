#!/usr/bin/env node
/**
 * SQLite to PostgreSQL Migration Script
 * Idempotent, validates checksums, supports rollback
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { Pool } = require('pg');
const crypto = require('crypto');

const config = require('../config.cjs');

const SQLITE_PATH = path.join(config.dataDir, 'neurallgo.db');
const BATCH_SIZE = 1000;

const TABLES = [
  'tenants',
  'users',
  'sessions',
  'permissions',
  'role_permissions',
  'user_permissions',
  'pedidos',
  'clientes',
  'conversaciones',
  'lid_map',
  'uso_ia',
  'citas',
  'products',
  'stock',
  'customers',
  'suppliers',
  'invoices',
  'payments',
  'purchase_orders',
];

function getSQLiteDb() {
  if (!fs.existsSync(SQLITE_PATH)) {
    throw new Error(`SQLite database not found at ${SQLITE_PATH}`);
  }
  return new DatabaseSync(SQLITE_PATH, { readOnly: true });
}

function getPgPool() {
  const config = require('../config.cjs');
  return new Pool({
    host: config.dbHost,
    port: config.dbPort,
    database: config.dbName,
    user: config.dbUser,
    password: config.dbPass,
    max: 20,
  });
}

function calculateChecksum(rows) {
  const hash = crypto.createHash('sha256');
  for (const row of rows) {
    hash.update(JSON.stringify(row));
  }
  return hash.digest('hex');
}

async function migrateTable(sqliteDb, pgPool, tableName) {
  console.log(`\n📦 Migrating table: ${tableName}`);

  // Get column info from SQLite
  const columns = sqliteDb.prepare(`PRAGMA table_info(${tableName})`).all();
  const columnNames = columns.map(c => c.name);
  const placeholders = columnNames.map((_, i) => `$${i + 1}`).join(', ');
  const columnsSql = columnNames.join(', ');

  // Count total rows
  const countResult = sqliteDb.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
  const totalRows = countResult.count;

  if (totalRows === 0) {
    console.log(`  ⏭️  Table ${tableName} is empty, skipping`);
    return { success: true, rows: 0, checksum: null };
  }

  console.log(`  📊 Total rows: ${totalRows}`);

  // Calculate source checksum
  const allRows = sqliteDb.prepare(`SELECT * FROM ${tableName}`).all();
  const sourceChecksum = calculateChecksum(allRows);
  console.log(`  🔐 Source checksum: ${sourceChecksum}`);

  // Check if already migrated with same checksum
  const pgClient = await pgPool.connect();
  try {
    const existing = await pgClient.query(
      `SELECT checksum FROM migration_checksums WHERE table_name = $1`,
      [tableName]
    );

    if (existing.rows.length > 0 && existing.rows[0].checksum === sourceChecksum) {
      console.log(`  ✅ Already migrated with same checksum, skipping`);
      return { success: true, rows: totalRows, checksum: sourceChecksum, skipped: true };
    }
  } finally {
    pgClient.release();
  }

  // Migrate in batches
  let migrated = 0;
  const batchSize = BATCH_SIZE;

  for (let offset = 0; offset < totalRows; offset += batchSize) {
    const rows = sqliteDb.prepare(
      `SELECT * FROM ${tableName} LIMIT $1 OFFSET $2`
    ).all(batchSize, offset);

    if (rows.length === 0) break;

    const pgClient = await pgPool.connect();
    try {
      await pgClient.query('BEGIN');

      for (const row of rows) {
        // Convert values for PostgreSQL
        const values = columnNames.map(col => {
          const val = row[col];
          if (val === undefined) return null;
          if (typeof val === 'boolean') return val ? 1 : 0;
          if (val instanceof Date) return val.toISOString();
          if (typeof val === 'object' && val !== null) return JSON.stringify(val);
          return val;
        });

        await pgClient.query(
          `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (${placeholders})
           ON CONFLICT DO NOTHING`,
          values
        );
      }

      await pgClient.query('COMMIT');
      migrated += rows.length;
    } catch (error) {
      await pgClient.query('ROLLBACK');
      throw error;
    } finally {
      pgClient.release();
    }

    if (migrated % 5000 === 0 || migrated === totalRows) {
      console.log(`  📈 Progress: ${migrated}/${totalRows} (${Math.round(migrated / totalRows * 100)}%)`);
    }
  }

  // Verify target checksum
  const pgClient = await pgPool.connect();
  try {
    const targetRows = await pgClient.query(`SELECT * FROM ${tableName}`);
    const targetChecksum = calculateChecksum(targetRows.rows);

    if (targetChecksum !== sourceChecksum) {
      throw new Error(`Checksum mismatch for ${tableName}: source=${sourceChecksum}, target=${targetChecksum}`);
    }

    // Store checksum for idempotency
    await pgClient.query(
      `INSERT INTO migration_checksums (table_name, checksum, migrated_at, row_count)
       VALUES ($1, $2, NOW(), $2)
       ON CONFLICT (table_name) DO UPDATE SET
         checksum = EXCLUDED.checksum,
         migrated_at = EXCLUDED.migrated_at,
         row_count = EXCLUDED.row_count`,
      [tableName, sourceChecksum, totalRows]
    );

    console.log(`  ✅ Migration complete. Rows: ${migrated}, Checksum: ${targetChecksum}`);
    return { success: true, rows: migrated, checksum: targetChecksum };
  } finally {
    pgClient.release();
  }
}

async function createMigrationChecksumsTable(pgPool) {
  const client = await pgPool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS migration_checksums (
        table_name TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        migrated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        row_count INTEGER NOT NULL DEFAULT 0
      )
    `);
  } finally {
    client.release();
  }
}

async function main() {
  const startTime = Date.now();
  console.log('🚀 Starting SQLite → PostgreSQL Migration');
  console.log('==========================================');

  // Validate SQLite exists
  if (!fs.existsSync(SQLITE_PATH)) {
    console.error(`❌ SQLite database not found at ${SQLITE_PATH}`);
    process.exit(1);
  }

  const sqliteDb = getSQLiteDb();
  const pgPool = getPgPool();

  try {
    // Test PostgreSQL connection
    await pgPool.query('SELECT 1');
    console.log('✅ PostgreSQL connection OK');

    // Create migration checksums table
    await createMigrationChecksumsTable(pgPool);
    console.log('✅ Migration checksums table ready');

    // Run migrations
    const results = [];
    for (const tableName of TABLES) {
      try {
        const result = await migrateTable(sqliteDb, pgPool, tableName);
        results.push({ table: tableName, ...result });
      } catch (error) {
        console.error(`❌ Failed to migrate ${tableName}:`, error.message);
        results.push({ table: tableName, success: false, error: error.message });
      }
    }

    // Summary
    console.log('\n📊 Migration Summary');
    console.log('====================');
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalRows = results.reduce((sum, r) => sum + (r.rows || 0), 0);

    for (const result of results) {
      const status = result.success ? '✅' : '❌';
      const skipped = result.skipped ? ' (skipped)' : '';
      console.log(`  ${status} ${result.table}: ${result.rows || 0} rows${skipped}`);
      if (result.error) console.log(`   Error: ${result.error}`);
    }

    console.log(`\nTotal: ${successful} successful, ${failed} failed, ${totalRows} rows migrated`);
    console.log(`Time: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    sqliteDb.close();
    await pgPool.end();
  }
}

main();