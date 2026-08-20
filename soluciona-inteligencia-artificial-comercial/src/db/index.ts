import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { sql } from 'drizzle-orm';
import { config } from '../../config';

let queryClient: ReturnType<typeof postgres> | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!dbInstance) {
    if (!queryClient) {
      const dbUrl = process.env.DATABASE_URL || `postgresql://${config.dbUser || 'postgres'}:${config.dbPass || 'postgres'}@${config.dbHost || 'localhost'}:${config.dbPort || 5432}/${config.dbName || 'soluciona_inteligencia_artificial_comercial'}`;
      queryClient = postgres(dbUrl, {
        max: config.dbPoolSize || 10,
        idle_timeout: 20,
        connect_timeout: 10,
        prepare: false,
        onnotice: () => {},
      });
    }
    dbInstance = drizzle(queryClient, { schema, logger: config.dbDebug === 'true' });
  }
  return dbInstance;
}

export function getQueryClient() {
  if (!queryClient) getDb();
  return queryClient!;
}

export async function closeDb() {
  if (queryClient) {
    await queryClient.end();
    queryClient = null;
    dbInstance = null;
  }
}

export async function testConnection() {
  try {
    const db = getDb();
    await db.execute(sql`SELECT 1`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function runMigrations() {
  const db = getDb();
  // Drizzle migrations would run here if using drizzle-kit migrate
  // For now, we'll use the schema directly
  console.log('[DB] Using Drizzle schema directly (run drizzle-kit migrate for migrations)');
}