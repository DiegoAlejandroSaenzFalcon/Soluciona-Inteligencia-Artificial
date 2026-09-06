/**
 * Structured Logger - Pino-based with correlation IDs
 */
import pino, { type Logger } from 'pino';
import { getConfig } from '../config';

const config = getConfig();

const logger = pino({
  level: config.observability.logLevel,
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: 'soluciona-ia',
    version: getConfig().version,
    environment: config.environment,
  },
  redact: {
    paths: [
      '*.password',
      '*.token',
      '*.secret',
      '*.key',
      '*.authorization',
      'req.headers.authorization',
      'headers.authorization',
    ],
    censor: '[REDACTED]',
  },
});

export function getLogger(moduleName: string): Logger {
  return logger.child({ module: moduleName });
}

export { logger };