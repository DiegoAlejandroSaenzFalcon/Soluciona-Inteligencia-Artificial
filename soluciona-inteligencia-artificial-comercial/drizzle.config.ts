import { defineConfig } from 'drizzle-kit';
import { config } from './config';

const dbUrl = process.env.DATABASE_URL || `postgresql://${config.dbUser || 'postgres'}:${config.dbPass || 'postgres'}@${config.dbHost || 'localhost'}:${config.dbPort || 5432}/${config.dbName || 'soluciona_inteligencia_artificial_comercial'}`;

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: dbUrl,
  },
  verbose: true,
  strict: true,
});