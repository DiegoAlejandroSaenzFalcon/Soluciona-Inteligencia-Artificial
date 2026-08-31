/**
 * DIAN Queue - BullMQ con reintentos exponenciales
 * Maneja envío asíncrono, reintentos, dead-letter, métricas
 */

import { Queue, Worker, QueueEvents } from 'bullmq';
import { createDianMiddleware } from '../index.js';
import { config } from '../config/dian.config.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const QUEUE_NAME = 'dian-documents';

let queue = null;
let worker = null;
let middleware = null;
let isInitialized = false;

/**
 * Inicializa cola y worker
 */
export async function initDianQueue(options = {}) {
  if (isInitialized && queue) return { queue, worker };

  // Conexión Redis
  const connection = options.connection || REDIS_URL;

  // Crear cola
  queue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: options.maxAttempts || 5,
      backoff: {
        type: 'exponential',
        delay: options.baseDelayMs || 5000
      },
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 86400, count: 500 }
    }
  });

  // Inicializar middleware DIAN (singleton)
  middleware = createDianMiddleware({});
  await middleware.initialize();

  // Worker de procesamiento
  worker = new Worker(QUEUE_NAME, async (job) => {
    const { type, payload, cfg } = job.data;

    console.log(`[DIAN-QUEUE] Procesando job ${job.id}: ${type}`);

    try {
      let result;

      switch (type) {
        case 'invoice':
          result = await middleware.processInvoice(payload, { submit: true, generatePdf: true });
          break;
        case 'creditNote':
          result = await middleware.processCreditNote(payload, { submit: true, generatePdf: true });
          break;
        case 'debitNote':
          result = await middleware.processDebitNote(payload, { submit: true, generatePdf: true });
          break;
        case 'getStatus':
          result = await middleware.getDocumentStatus(payload.trackingId);
          break;
        case 'getStatusZip':
          result = await middleware.getDocumentStatusZip(payload.trackingId);
          break;
        default:
          throw new Error(`Tipo de job desconocido: ${type}`);
      }

      if (!result.success && type !== 'getStatus' && type !== 'getStatusZip') {
        const error = new Error(`DIAN rechazó: ${result.dianResponse?.error || result.dianResponse?.status}`);
        error.result = result;
        throw error;
      }

      console.log(`[DIAN-QUEUE] Job ${job.id} completado:`, result.cufe || result.cude || 'OK');
      return result;

    } catch (error) {
      console.error(`[DIAN-QUEUE] Job ${job.id} falló:`, error.message);
      throw error;
    }
  }, {
    connection,
    concurrency: options.concurrency || 3,
    limiter: {
      max: options.rateLimit || 10,
      duration: 1000
    }
  });

  // Eventos
  const queueEvents = new QueueEvents(QUEUE_NAME, { connection });

  queueEvents.on('completed', ({ jobId, returnvalue }) => {
    console.log(`[DIAN-QUEUE] Job ${jobId} completado exitosamente`);
  });

  queueEvents.on('failed', ({ jobId, failedReason }) => {
    console.error(`[DIAN-QUEUE] Job ${jobId} falló definitivamente:`, failedReason);
  });

  queueEvents.on('progress', ({ jobId, data }) => {
    console.log(`[DIAN-QUEUE] Job ${jobId} progreso:`, data);
  });

  isInitialized = true;
  console.log('[DIAN-QUEUE] Cola inicializada:', QUEUE_NAME);

  return { queue, worker, queueEvents };
}

/**
 * Agrega factura a la cola
 */
export async function addInvoiceJob(invoiceData, cfg = {}) {
  if (!queue) await initDianQueue();

  const job = await queue.add('invoice', {
    type: 'invoice',
    payload: invoiceData,
    cfg
  }, {
    priority: cfg.priority || 0,
    delay: cfg.delay || 0
  });

  console.log(`[DIAN-QUEUE] Factura encolada: ${job.id} (${invoiceData.id})`);
  return job;
}

/**
 * Agrega nota crédito a la cola
 */
export async function addCreditNoteJob(ncData, cfg = {}) {
  if (!queue) await initDianQueue();

  const job = await queue.add('creditNote', {
    type: 'creditNote',
    payload: ncData,
    cfg
  }, { priority: cfg.priority || 0 });

  console.log(`[DIAN-QUEUE] Nota crédito encolada: ${job.id} (${ncData.id})`);
  return job;
}

/**
 * Agrega consulta de estado a la cola
 */
export async function addStatusJob(trackingId, cfg = {}) {
  if (!queue) await initDianQueue();

  const job = await queue.add('getStatus', {
    type: 'getStatus',
    payload: { trackingId },
    cfg
  }, { priority: 10 });

  return job;
}

/**
 * Obtiene estado de un job
 */
export async function getJobStatus(jobId) {
  if (!queue) await initDianQueue();

  const job = await queue.getJob(jobId);
  if (!job) return null;

  const state = await job.getState();
  const progress = job.progress;
  const returnvalue = job.returnvalue;
  const failedReason = job.failedReason;
  const attemptsMade = job.attemptsMade;
  const opts = job.opts;

  return {
    id: jobId,
    state,
    progress,
    result: returnvalue,
    error: failedReason,
    attemptsMade,
    maxAttempts: opts.attempts,
    createdAt: job.timestamp,
    processedAt: job.processedOn,
    finishedAt: job.finishedOn
  };
}

/**
 * Obtiene métricas de la cola
 */
export async function getQueueMetrics() {
  if (!queue) await initDianQueue();

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaiting(),
    queue.getActive(),
    queue.getCompleted(),
    queue.getFailed(),
    queue.getDelayed()
  ]);

  return {
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length,
    delayed: delayed.length,
    total: waiting.length + active.length + completed.length + failed.length + delayed.length
  };
}

/**
 * Reintenta jobs fallidos
 */
export async function retryFailedJobs() {
  if (!queue) await initDianQueue();

  const failed = await queue.getFailed();
  let retried = 0;

  for (const job of failed) {
    await job.retry();
    retried++;
  }

  console.log(`[DIAN-QUEUE] ${retried} jobs fallidos reintentados`);
  return retried;
}

/**
 * Limpia jobs completados/fallidos antiguos
 */
export async function cleanQueue(graceMs = 3600000) {
  if (!queue) await initDianQueue();

  await queue.clean(graceMs, 1000, 'completed');
  await queue.clean(graceMs, 1000, 'failed');
  console.log('[DIAN-QUEUE] Limpieza completada');
}

/**
 * Cierra cola y worker
 */
export async function closeDianQueue() {
  if (worker) {
    await worker.close();
    worker = null;
  }
  if (queue) {
    await queue.close();
    queue = null;
  }
  isInitialized = false;
  console.log('[DIAN-QUEUE] Cerrada');
}

export default {
  initDianQueue,
  addInvoiceJob,
  addCreditNoteJob,
  addStatusJob,
  getJobStatus,
  getQueueMetrics,
  retryFailedJobs,
  cleanQueue,
  closeDianQueue
};