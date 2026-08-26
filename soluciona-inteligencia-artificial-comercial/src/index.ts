/**
 * Soluciona IA - Application Entry Point
 * Clean Architecture - Main bootstrap
 */
import { getConfig } from './shared/config';
import { getLogger } from './shared/utils/logger';
import { buildServer } from './interfaces/http/server';
import { getPool } from './infrastructure/database/pool';
import { closePool } from './infrastructure/database/pool';
import { scheduleJwtRotation } from './src/auth/index';
import { loadSecretVersions } from './src/auth/index';
import { rotateJwtSecret } from './src/auth/index';

const logger = getLogger('main');

async function bootstrap(): Promise<void> {
  const config = getConfig();
  
  console.log('\n==========================================');
  console.log('  SOLUCIA INTELIGENCIA ARTIFICIAL');
  console.log('  Sistema de Automatización Empresarial Integral');
  console.log('==========================================\n');

  console.log('[INIT] Cargando configuración...');
  console.log(`[INIT] Configuración cargada: ${config.nombreNegocio()} | puerto ${config.port} | software: ${config.softwareNombre}`);

  console.log('[INIT] Cargando módulos...');
  
  // Load JWT secrets and schedule rotation
  const { loadSecretVersions, scheduleJwtRotation, rotateJwtSecret } = await import('./src/auth/index');
  loadSecretVersions();
  scheduleJwtRotation();
  
  // Initialize database pool
  console.log('[INIT] Iniciando base de datos...');
  const pool = getPool();
  
  // Test database connection
  try {
    await pool.query('SELECT 1');
    console.log('[OK] Base de datos conectada');
  } catch (error) {
    console.error('[ERROR] Error conectando a la base de datos:', error);
    process.exit(1);
  }

  // Initialize JWT rotation
  rotateJwtSecret().catch(e => console.error('[JWT] Error rotando secreto:', e));

  // Start HTTP server
  console.log('[INIT] Iniciando Web...');
  const server = await buildServer();

  try {
    await server.listen({ port: getConfig().port, host: getConfig().host });
    console.log(`\n[OK] Sistema iniciado. Panel: http://${getConfig().host}:${getConfig().port}`);
    console.log('[INFO] Para detener: Ctrl+C\n');
  } catch (error) {
    console.error('[ERROR] Error iniciando servidor web:', error);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n[INFO] Recibido ${signal}, cerrando graciosamente...`);
    
    try {
      await closePool();
      logger.info('Database pool closed');
    } catch (error) {
      console.error('Error closing database pool:', error);
    }

    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Handle unhandled errors
process.on('unhandledRejection', (reason) => {
  console.error('[WARN] Rechazo no capturado:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[WARN] Excepción no capturada:', error);
  process.exit(1);
});

// Start the application
bootstrap().catch((error) => {
  console.error('[ERROR] Fatal error during bootstrap:', error);
  process.exit(1);
});