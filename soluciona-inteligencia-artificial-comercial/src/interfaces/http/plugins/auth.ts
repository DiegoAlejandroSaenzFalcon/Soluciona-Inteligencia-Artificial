/**
 * Authentication Plugin - JWT verification and user context
 */
import { FastifyPluginAsync } from 'fastify';
import { getConfig } from '../../shared/config';
import { verifyToken, signAccessToken, createRefreshToken, findSession, revokeRefreshToken } from '../../../src/auth/index';
import { getClient } from '../../../src/db/connection';

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

const authPlugin: FastifyPluginAsync = async (fastify) => {
  const config = getConfig();

  // Verify JWT token middleware
  async function verifyAuth(request: any, reply: any) {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw fastify.httpErrors.unauthorized('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token);

    if (!payload) {
      throw fastify.httpErrors.unauthorized('Invalid or expired token');
    }

    // Get user from database to get permissions
    const c = getClient();
    try {
      const rows = await c.unsafe(
        'SELECT id, tenant_id, email, nombre, role, activo, two_factor_enabled FROM users WHERE id = $1 AND activo = true LIMIT 1',
        [Number(payload.sub)]
      );

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
    } catch (error) {
      throw fastify.httpErrors.unauthorized('Authentication failed');
    }
  }

  async function getPermissionsForUser(user: any): Promise<string[]> {
    const c = getClient();
    const rows = await c.unsafe(
      `SELECT p.code FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
       WHERE rp.role = $1`,
      [user.role]
    );

    const codes = new Set(rows.map((r: any) => r.code));

    const overrides = await c.unsafe(
      `SELECT p.code, up.granted FROM user_permissions up
       JOIN permissions p ON p.id = up.permission_id
       WHERE up.user_id = $1`,
      [user.id]
    );

    for (const o of overrides) {
      if (o.granted) codes.add(o.code);
      else codes.delete(o.code);
    }

    return [...codes];
  }

  // Decorate fastify with auth helpers
  fastify.decorate('verifyAuth', verifyAuth);

  // Optional auth - doesn't throw if no token
  fastify.decorate('optionalAuth', async (request: any, reply: any) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return;
    }

    try {
      await verifyAuth(request, reply);
    } catch {
      // Ignore auth errors for optional auth
    }
  });
};

export const authPlugin = authPlugin;