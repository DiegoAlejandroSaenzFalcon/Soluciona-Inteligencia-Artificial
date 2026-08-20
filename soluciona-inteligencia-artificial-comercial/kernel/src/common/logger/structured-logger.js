const { v4: uuidv4 } = require('uuid');
const { AsyncLocalStorage } = require('async_hooks');

const correlationStorage = new AsyncLocalStorage();
const LEVEL_PRIORITY = { debug: 0, info: 1, warn: 2, error: 3, fatal: 4 };

function getCorrelationContext() { return correlationStorage.getStore(); }
function getTraceId() { const s = correlationStorage.getStore(); return s?.get('traceId') || 'no-trace'; }
function getTenantId() { const s = correlationStorage.getStore(); return s?.get('tenantId') || 'system'; }
function getUserId() { const s = correlationStorage.getStore(); return s?.get('userId') || 'anonymous'; }

function runWithCorrelation(traceId, tenantId, userId, fn) {
  const store = new Map();
  store.set('traceId', traceId);
  store.set('tenantId', tenantId);
  store.set('userId', userId);
  return correlationStorage.run(store, fn);
}

class StructuredLogger {
  constructor(moduleName, minLevel = 'info') {
    this.moduleName = moduleName;
    this.minLevel = LEVEL_PRIORITY[minLevel] || LEVEL_PRIORITY.info;
  }

  shouldLog(level) { return LEVEL_PRIORITY[level] >= this.minLevel; }

  log(level, message, context, meta, error) {
    if (!this.shouldLog(level)) return;
    const entry = {
      level, timestamp: new Date().toISOString(), message,
      context: { module: this.moduleName, ...context },
      meta,
      error: error ? { name: error.name, message: error.message, stack: error.stack } : undefined
    };
    const formatted = JSON.stringify({
      ...entry, timestamp: entry.timestamp || new Date().toISOString(),
      traceId: entry.context?.traceId || getTraceId(),
      tenantId: entry.context?.tenantId || getTenantId(),
      userId: entry.context?.userId || getUserId()
    });
    switch (level) {
      case 'debug': case 'info': console.log(formatted); break;
      case 'warn': console.warn(formatted); break;
      case 'error': case 'fatal': console.error(formatted); break;
    }
  }

  debug(message, context, meta) { this.log('debug', message, context, meta); }
  info(message, context, meta) { this.log('info', message, context, meta); }
  warn(message, context, meta) { this.log('warn', message, context, meta); }
  error(message, error, context, meta) { this.log('error', message, context, meta, error); }
  fatal(message, error, context, meta) { this.log('fatal', message, context, meta, error); }

  child(context) {
    const logger = new StructuredLogger(this.moduleName);
    const originalLog = logger.log.bind(logger);
    logger.log = (level, message, ctx, meta, error) => originalLog(level, message, { ...context, ...ctx }, meta, error);
    return logger;
  }
}

function createLogger(moduleName, minLevel) { return new StructuredLogger(moduleName, minLevel); }

module.exports = {
  StructuredLogger, createLogger,
  getCorrelationContext, getTraceId, getTenantId, getUserId, runWithCorrelation, correlationStorage
};