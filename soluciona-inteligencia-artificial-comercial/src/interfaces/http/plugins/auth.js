"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authPlugin = void 0;
const config_1 = require("../../shared/config");
const index_1 = require("../../../src/auth/index");
const connection_1 = require("../../../src/db/connection");
const authPlugin = async (fastify) => {
    const config = (0, config_1.getConfig)();
    // Verify JWT token middleware
    async function verifyAuth(request, reply) {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw fastify.httpErrors.unauthorized('Missing or invalid authorization header');
        }
        const token = authHeader.slice(7);
        const payload = (0, index_1.verifyToken)(token);
        if (!payload) {
            throw fastify.httpErrors.unauthorized('Invalid or expired token');
        }
        // Get user from database to get permissions
        const c = (0, connection_1.getClient)();
        try {
            const rows = await c.unsafe('SELECT id, tenant_id, email, nombre, role, activo, two_factor_enabled FROM users WHERE id = $1 AND activo = true LIMIT 1', [Number(payload.sub)]);
            if (!rows.length) {
                throw fastify.httpErrors.unauthorized('User not found or inactive');
            }
            const user = rows[0];
            const perms = await getPermissionsForUser(user);
            request.user = {
                id: user.id,
                tenantId: user.tenant_id,
                email: user.email,
                role: user.role,
                nombre: user.nombre || user.email,
                permissions: perms,
            };
        }
        catch (error) {
            throw fastify.httpErrors.unauthorized('Authentication failed');
        }
    }
    async function getPermissionsForUser(user) {
        const c = (0, connection_1.getClient)();
        const rows = await c.unsafe(`SELECT p.code FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
       WHERE rp.role = $1`, [user.role]);
        const codes = new Set(rows.map((r) => r.code));
        const overrides = await c.unsafe(`SELECT p.code, up.granted FROM user_permissions up
       JOIN permissions p ON p.id = up.permission_id
       WHERE up.user_id = $1`, [user.id]);
        for (const o of overrides) {
            if (o.granted)
                codes.add(o.code);
            else
                codes.delete(o.code);
        }
        return [...codes];
    }
    // Decorate fastify with auth helpers
    fastify.decorate('verifyAuth', verifyAuth);
    // Optional auth - doesn't throw if no token
    fastify.decorate('optionalAuth', async (request, reply) => {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return;
        }
        try {
            await verifyAuth(request, reply);
        }
        catch {
            // Ignore auth errors for optional auth
        }
    });
};
exports.authPlugin = authPlugin;
//# sourceMappingURL=auth.js.map