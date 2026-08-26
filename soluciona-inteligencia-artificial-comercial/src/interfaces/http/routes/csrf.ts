/**
 * CSRF Routes - CSRF token management
 */
import { FastifyPluginAsync } from 'fastify';

const csrfRoutes: FastifyPluginAsync = async (fastify) => {
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

export const csrfRoutes = csrfRoutes;