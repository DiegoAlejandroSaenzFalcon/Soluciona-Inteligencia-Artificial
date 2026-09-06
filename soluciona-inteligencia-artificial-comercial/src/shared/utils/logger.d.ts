/**
 * Structured Logger - Pino-based with correlation IDs
 */
import pino, { type Logger } from 'pino';
declare const logger: pino.Logger<never, boolean>;
export declare function getLogger(moduleName: string): Logger;
export { logger };
//# sourceMappingURL=logger.d.ts.map