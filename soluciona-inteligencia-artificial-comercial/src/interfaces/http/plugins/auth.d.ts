/**
 * Authentication Plugin - JWT verification and user context
 */
import { FastifyPluginAsync } from 'fastify';
declare module 'fastify' {
    interface FastifyRequest {
        user?: {
            id: number;
            tenantId: string;
            email: string;
            role: string;
            nombre: string;
            permissions: string[];
        };
    }
}
export declare const authPlugin: FastifyPluginAsync;
//# sourceMappingURL=auth.d.ts.map