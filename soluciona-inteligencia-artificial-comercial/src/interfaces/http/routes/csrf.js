"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.csrfRoutes = void 0;
const csrfRoutes = async (fastify) => {
    // GET /api/csrf-token - Get CSRF token
    fastify.get('/csrf-token', async (request, reply) => {
        const ip = request.ip || 'unknown';
        const token = await fastify.csrf.generate(ip);
        // Set cookie
        const cookie = `csrf_token=${token}; HttpOnly; Path=/; SameSite=Lax`;
        reply.setCookie('csrf_token', token, {
            httpOnly: true,
            secure: fastify.getConfig().environment === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60,
            path: '/',
        });
        return { csrfToken: token };
    });
};
exports.csrfRoutes = csrfRoutes;
//# sourceMappingURL=csrf.js.map