const { v4: uuidv4 } = require('uuid');
const { runWithCorrelation } = require('../logger/structured-logger');

const DEFAULT_OPTIONS = {
  traceIdHeader: 'x-trace-id',
  tenantIdHeader: 'x-tenant-id',
  userIdHeader: 'x-user-id',
  generateTraceId: uuidv4,
};

function createCorrelationMiddleware(options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return (req, res, next) => {
    const incomingTraceId = req.headers[opts.traceIdHeader];
    const traceId = incomingTraceId || opts.generateTraceId();
    const tenantId = req.headers[opts.tenantIdHeader] || 'unknown';
    const userId = req.headers[opts.userIdHeader] || 'anonymous';

    const { runWithCorrelation } = require('../logger/structured-logger');
    runWithCorrelation(traceId, tenantId, userId, () => {
      res.setHeader(opts.traceIdHeader, traceId);
      res.setHeader(opts.tenantIdHeader, tenantId);
      res.setHeader(opts.userIdHeader, userId);
      next();
    });
  };
}

function createWebSocketCorrelationMiddleware(options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return (ws, req) => {
    const incomingTraceId = req.headers[opts.traceIdHeader];
    const traceId = incomingTraceId || opts.generateTraceId();
    const tenantId = req.headers[opts.tenantIdHeader] || 'unknown';
    const userId = req.headers[opts.userIdHeader] || 'anonymous';

    const { runWithCorrelation } = require('../logger/structured-logger');
    runWithCorrelation(traceId, tenantId, userId, () => {
      ws.traceId = traceId;
      ws.tenantId = tenantId;
      ws.userId = userId;
    });
  };
}

function extractCorrelationIds(req) {
  return {
    traceId: req.headers['x-trace-id'] || 'unknown',
    tenantId: req.headers['x-tenant-id'] || 'unknown',
    userId: req.headers['x-user-id'] || 'anonymous',
  };
}

module.exports = { createCorrelationMiddleware, createWebSocketCorrelationMiddleware, extractCorrelationIds };