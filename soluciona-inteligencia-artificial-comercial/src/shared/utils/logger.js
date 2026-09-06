"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.getLogger = getLogger;
/**
 * Structured Logger - Pino-based with correlation IDs
 */
const pino_1 = __importDefault(require("pino"));
const config_1 = require("../config");
const config = (0, config_1.getConfig)();
const logger = (0, pino_1.default)({
    level: config.observability.logLevel,
    formatters: {
        level: (label) => ({ level: label }),
    },
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
    base: {
        service: 'soluciona-ia',
        version: (0, config_1.getConfig)().version,
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
exports.logger = logger;
function getLogger(moduleName) {
    return logger.child({ module: moduleName });
}
//# sourceMappingURL=logger.js.map