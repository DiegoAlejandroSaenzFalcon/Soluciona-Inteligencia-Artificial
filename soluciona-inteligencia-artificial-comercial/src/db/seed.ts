import { initializeDatabase, closeDatabase } from './init';

async function main() {
  console.log('[SEED] Iniciando seed de base de datos...');
  try {
    await initializeDatabase();
    console.log('[SEED] Seed completado exitosamente');
  } catch (e) {
    console.error('[SEED] Error:', e);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

main();