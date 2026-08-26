/**
 * User Routes - User management
 */
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const userRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/users - List users (requires users:read permission)
  fastify.get('/', {
    preHandler: [fastify.verifyAuth],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          role: { type: 'string' },
          search: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const user = request.user!;
    const perms = await require('../../../src/auth/index').getPermissionsForUser({
      id: user.id,
      tenant_id: user.tenantId,
      role: user.role,
    });

    if (!perms.includes('users:read')) {
      return reply.status(403).send({ error: 'sin_permiso' });
    }

    const { getClient } = require('../../../src/db/connection');
    const c = getClient();

    const page = Number(request.query.page) || 1;
    const limit = Math.min(Number(request.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const role = request.query.role as string | undefined;
    const search = request.query.search as string | undefined;

    let whereClause = 'WHERE tenant_id = $1';
    const params: any[] = [user.tenantId];
    let paramIndex = 2;

    if (role) {
      params.push(role);
      whereClause += ` AND role = $${paramIndex++}`;
    }

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (email ILIKE $${paramIndex++} OR nombre ILIKE $${paramIndex++})`;
    }

    const [rows, countResult] = await Promise.all([
      require('../../../src/db/connection').getClient().unsafe(
        `SELECT id, tenant_id, email, nombre, telefono, role, activo, two_factor_enabled, last_login_at, created_at
         FROM users ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      ),
      require('../../../src/db/connection').getClient().unsafe(
        `SELECT COUNT(*)::int as total FROM users ${whereClause}`,
        params
      )
    );

    return {
      data: rows,
      total: countResult[0]?.total || 0,
      page,
      limit,
      totalPages: Math.ceil((countResult[0]?.total || 0) / limit),
    };
  });

  // GET /api/users/:id - Get user by ID
  fastify.get('/:id', {
    preHandler: [fastify.verifyAuth],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const perms = await require('../../../src/auth/index').getPermissionsForUser({
      id: user.id,
      tenant_id: user.tenantId,
      role: user.role,
    });

    if (!perms.includes('users:read') && user.id !== id) {
      return reply.status(403).send({ error: 'sin_permiso' });
    }

    const { getClient } = require('../../../src/db/connection');
    const c = getClient();
    const rows = await c.unsafe(
      'SELECT id, tenant_id, email, nombre, telefono, role, activo, two_factor_enabled, last_login_at, created_at FROM users WHERE id = $1 AND tenant_id = $2',
      [id, request.user!.tenantId]
    );

    if (!rows.length) {
      return reply.status(404).send({ error: 'user_not_found' });
    }

    const user = rows[0];
    return {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      telefono: user.telefono,
      role: user.role,
      activo: user.activo,
      twoFactorEnabled: user.two_factor_enabled,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
    };
  });

  // POST /api/users - Create user (requires users:create)
  fastify.post('/', {
    preHandler: [fastify.verifyAuth],
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password', 'nombre', 'role'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          nombre: { type: 'string', minLength: 1 },
          telefono: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'operador', 'cocina', 'domiciliario', 'contador', 'asesor', 'solo_lectura'] },
          activo: { type: 'boolean', default: true },
        },
      },
    },
  }, async (request, reply) => {
    const user = request.user!;
    const perms = await require('../../../src/auth/index').getPermissionsForUser({
      id: user.id,
      tenant_id: user.tenantId,
      role: user.role,
    });

    if (!perms.includes('users:create')) {
      return reply.status(403).send({ error: 'sin_permiso' });
    }

    const body = request.body as any;
    const { hashPassword } = require('../../../src/auth/index');
    const { getClient } = require('../../../src/db/connection');
    const c = getClient();

    const passwordHash = await require('../../../src/auth/index').hashPassword(body.password);

    try {
      const rows = await c.unsafe(
        `INSERT INTO users (tenant_id, email, password_hash, nombre, telefono, role, activo, must_change_password)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
         RETURNING id, tenant_id, email, nombre, telefono, role, activo, two_factor_enabled, must_change_password`,
        [user.tenantId, String(body.email).toLowerCase().trim(), passwordHash, body.nombre, body.telefono || null, body.role, body.activo !== false]
      );

      return reply.status(201).send({ user: rows[0] });
    } catch (e: any) {
      if (e.code === '23505') return reply.status(409).send({ error: 'email_existe' });
      throw e;
    }
  });

  // PUT /api/users - Update user
  fastify.put('/', {
    preHandler: [fastify.verifyAuth],
    schema: {
      body: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          password: { type: 'string', minLength: 8 },
          nombre: { type: 'string' },
          telefono: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'operador', 'cocina', 'domiciliario', 'contador', 'asesor', 'solo_lectura'] },
          activo: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    const user = request.user!;
    const perms = await require('../../../src/auth/index').getPermissionsForUser({
      id: user.id,
      tenant_id: user.tenantId,
      role: user.role,
    });

    if (!perms.includes('users:update')) {
      return reply.status(403).send({ error: 'sin_permiso' });
    }

    const body = request.body as any;
    const { getClient } = require('../../../src/db/connection');
    const c = getClient();

    if (body.password) {
      const passwordHash = await require('../../../src/auth/index').hashPassword(body.password);
      await c.unsafe(
        'UPDATE users SET password_hash = $1, nombre = COALESCE($2, nombre), telefono = COALESCE($3, telefono), role = COALESCE($4, role), activo = COALESCE($5, activo) WHERE id = $6 AND tenant_id = $7',
        [require('../../../src/auth/index').hashPassword(body.password), body.nombre || null, body.telefono || null, body.role || null, body.activo == null ? null : !!body.activo, Number(body.id), user.tenantId]
      );
    } else {
      await c.unsafe(
        'UPDATE users SET nombre = COALESCE($1, nombre), telefono = COALESCE($2, telefono), role = COALESCE($3, role), activo = COALESCE($4, activo) WHERE id = $5 AND tenant_id = $6',
        [body.nombre || null, body.telefono || null, body.role || null, body.activo == null ? null : !!body.activo, Number(body.id), user.tenantId]
      );
    }

    return { ok: true };
  });

  // DELETE /api/users/:id - Delete user (soft delete by deactivating)
  fastify.delete('/:id', {
    preHandler: [fastify.verifyAuth],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
  }, async (request, reply) => {
    const user = request.user!;
    const perms = await require('../../../src/auth/index').getPermissionsForUser({
      id: user.id,
      tenant_id: user.tenantId,
      role: user.role,
    });

    if (!perms.includes('users:update')) {
      return reply.status(403).send({ error: 'sin_permiso' });
    }

    const { id } = request.params as { id: string };
    const { getClient } = require('../../../src/db/connection');
    const c = getClient();

    await c.unsafe('UPDATE users SET activo = false WHERE id = $1 AND tenant_id = $2', [id, user.tenantId]);

    return { ok: true };
  });
};

export const userRoutes = userRoutes;