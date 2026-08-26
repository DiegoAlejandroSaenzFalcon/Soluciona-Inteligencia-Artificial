/**
 * Health Check Routes - Deep health checking
 */
import { FastifyPluginAsync } from 'fastify';
import { execSync } from 'child_process';
import { getConfig } from '../../shared/config';
import { query } from '../../../infrastructure/database/pool';
import { getPool } from '../../../infrastructure/database/pool';
import { query as iaPoolQuery } from '../../../core/ia-pool';
import { getLogger } from '../../shared/utils/logger';

const logger = getLogger('health');

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  const config = getConfig();

  fastify.get('/health', async (request, reply) => {
    const start = Date.now();
    
    // WhatsApp health
    const waHealth = global.whatsappHealth ? global.whatsappHealth() : { connected: false, error: 'health not available' };
    const waMetrics = global.whatsappMetrics ? global.whatsappMetrics() : { error: 'metrics not available' };

    // Database health
    let dbHealth = { ok: false, latency: 0 };
    try {
      const dbStart = Date.now();
      await query('SELECT 1');
      dbHealth = { ok: true, latency: Date.now() - dbStart };
    } catch (error) {
      dbHealth = { ok: false, error: (error as Error).message };
    }

    // Disk health
    let diskHealth = { ok: true, freeGB: 0, usedPct: 0 };
    try {
      const out = execSync('df -B1 /', { encoding: 'utf8', timeout: 2000 });
      const lines = out.trim().split('\n');
      const parts = lines[1].split(/\s+/);
      const total = parseInt(parts[1], 10);
      const used = parseInt(parts[2], 10);
      const free = total - used;
      diskHealth = { 
        ok: free > 1024 * 1024 * 1024, 
        freeGB: (free / 1e9).toFixed(2), 
        usedPct: ((used / total) * 100).toFixed(1) 
      };
    } catch (error) {
      diskHealth = { ok: false, error: (error as Error).message };
    }

    // Memory health
    const mem = process.memoryUsage();
    const memHealth = { 
      ok: mem.heapUsed < 512 * 1024 * 1024, 
      heapUsedMB: (mem.heapUsed / 1e6).toFixed(1), 
      heapTotalMB: (mem.heapTotal / 1e6).toFixed(1), 
      rssMB: (mem.rss / 1e6).toFixed(1) 
    };

    // Backups health
    let backupHealth = { ok: true, count: 0, lastBackup: null };
    try {
      const fs = require('fs');
      const path = require('path');
      const backupDir = path.join(config.dataDir || 'data', 'backups');
      if (require('fs').existsSync(backupDir)) {
        const files = require('fs').readdirSync(backupDir).filter((f: string) => f.startsWith('auth_'));
        backupHealth.count = files.length;
        if (files.length) {
          const latest = files.sort().reverse()[0];
          const stat = require('fs').statSync(require('path').join(backupDir, latest));
          backupHealth.lastBackup = stat.mtime.toISOString();
        }
      }
    } catch {}

    // IA Pool health
    let iaPoolHealth = { ok: true, keys: 0, healthy: 0 };
    try {
      const poolMod = require('../../../core/ia-pool');
      const pool = poolMod.resumenPool();
      iaPoolHealth.keys = pool.total || 0;
      iaPoolHealth.healthy = pool.healthy || 0;
      iaPoolHealth.ok = iaPoolHealth.healthy > 0;
    } catch {}

    // Queues health
    let queueHealth = { ok: true, pending: 0, failed: 0 };
    try {
      const fs = require('fs');
      const qDir = path.join(config.dataDir || 'data', 'queue');
      if (require('fs').existsSync(qDir)) {
        const pending = require('fs').readdirSync(qDir).filter((f: string) => f.endsWith('.json')).length;
        queueHealth.pending = pending;
      }
      const failedFile = path.join(config.dataDir || 'data', 'queue', 'failed_ids.json');
      if (require('fs').existsSync(failedFile)) {
        const failed = JSON.parse(require('fs').readFileSync(failedFile, 'utf8'));
        queueHealth.failed = Array.isArray(failed) ? failed.length : 0;
      }
      queueHealth.ok = queueHealth.failed < 100;
    } catch {}

    const allOk = waHealth.connected && dbHealth.ok && diskHealth.ok && memHealth.ok && backupHealth.ok && iaPoolHealth.ok && queueHealth.ok;
    
    const response = { 
      healthy: allOk, 
      timestamp: new Date().toISOString(), 
      whatsapp: waHealth, 
      metrics: waMetrics, 
      database: dbHealth,
      disk: diskHealth,
      memory: memHealth,
      backups: backupHealth,
      iaPool: iaPoolHealth,
      queues: queueHealth,
      uptimeSec: Math.round(process.uptime())
    };

    reply.status(allOk ? 200 : 503).send(response);
  });

  // Readiness probe
  fastify.get('/ready', async (request, reply) => {
    try {
      await query('SELECT 1');
      return { ready: true };
    } catch {
      reply.status(503).send({ ready: false });
    }
  });

  // Liveness probe
  fastify.get('/live', async (request, reply) => {
    return { alive: true, timestamp: new Date().toISOString() };
  });
};

export const healthRoutes = healthRoutes;