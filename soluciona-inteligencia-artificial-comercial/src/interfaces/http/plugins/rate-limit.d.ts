/**
 * Rate Limiting Plugin - Distributed rate limiting with Redis
 */
import { FastifyPluginAsync } from 'fastify';
declare module 'fastify' {
    interface FastifyInstance {
        rateLimiter: {
            check: (key: string, max?: number, windowMs?: number) => Promise<{
                allowed: boolean;
                remaining: number;
                reset: number;
            }>;
        };
    }
}
export declare const rateLimitPlugin: FastifyPluginAsync;
//# sourceMappingURL=rate-limit.d.ts.map