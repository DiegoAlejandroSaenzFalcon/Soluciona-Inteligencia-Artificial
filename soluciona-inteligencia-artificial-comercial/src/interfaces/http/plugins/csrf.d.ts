/**
 * CSRF Protection Plugin
 */
import { FastifyPluginAsync } from 'fastify';
import { Result } from '../../../shared/kernel/result';
declare module 'fastify' {
    interface FastifyInstance {
        csrf: {
            generate: (ip: string) => Promise<string>;
            validate: (ip: string, token: string) => Promise<Result<boolean, Error>>;
        };
    }
}
export declare const csrfPlugin: FastifyPluginAsync;
//# sourceMappingURL=csrf.d.ts.map