/**
 * Authentication Routes - Login, Register, 2FA, Password Management
 */
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getConfig } from '../../shared/config';
import { 
  login, 
  verifyTwoFactor, 
  refresh, 
  logout, 
  changePassword, 
  getCurrentUser,
  signAccessToken,
  createRefreshToken,
  getPermissionsForUser,
  toPublicUser
} from '../../../src/auth/index';
import { getLogger } from '../../shared/utils/logger';

const logger = getLogger('auth-routes');

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantId: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const verify2faSchema = z.object({
  twoFactorToken: z.string(),
  code: z.string().length(6),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});

const setup2faSchema = z.object({
  secret: z.string().optional(),
  code: z.string().length(6),
});

const enable2faSchema = z.object({
  secret: z.string(),
  code: z.string().length(6),
});

const disable2faSchema = z.object({
  code: z.string().length(6),
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nombre: z.string().min(1),
  telefono: z.string().optional(),
  role: z.enum(['admin', 'operador', 'cocina', 'domiciliario', 'contador', 'asesor', 'solo_lectura']),
  activo: z.boolean().default(true),
});

const updateUserSchema = z.object({
  id: z.string().uuid(),
  password: z.string().min(8).optional(),
  nombre: z.string().optional(),
  telefono: z.string().optional(),
  role: z.enum(['admin', 'operador', 'cocina', 'domiciliario', 'contador', 'asesor', 'solo_lectura']).optional(),
  activo: z.boolean().optional(),
});

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const config = getConfig();

  // POST /api/auth/login
  fastify.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
          tenantId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const body = loginSchema.parse(request.body);
    
    const result = await login(body.email, body.password, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      tenantId: body.tenantId,
    });

    if (result.error) {
      const status = result.error === 'inactive' ? 403 : 401;
      return reply.status(status).send({ error: result.error });
    }

    if (result.requiresTwoFactor) {
      return reply.send({ 
        requiresTwoFactor: true, 
        twoFactorToken: result.twoFactorToken 
      });
    }

    // Set refresh token as HttpOnly cookie
    const cookie = `refresh_token=${result.refreshToken}; HttpOnly; Path=/; SameSite=Lax; Secure=${getConfig().environment === 'production'}; Max-Age=${30 * 24 * 60 * 60}`;
    reply.setCookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: getConfig().environment === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return reply.send(result);
  });

  // POST /api/auth/verify-2fa
  fastify.post('/verify-2fa', {
    schema: {
      body: {
        type: 'object',
        required: ['twoFactorToken', 'code'],
        properties: {
          twoFactorToken: { type: 'string' },
          code: { type: 'string', pattern: '^\\d{6}$' },
        },
      },
    },
  }, async (request, reply) => {
    const body = verify2faSchema.parse(request.body);
    
    const result = await verifyTwoFactor(body.twoFactorToken, body.code, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });

    if (result.error) {
      return reply.status(401).send({ error: result.error });
    }

    // Set refresh token as HttpOnly cookie
    reply.setCookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: getConfig().environment === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return reply.send(result);
  });

  // POST /api/auth/refresh
  fastify.post('/refresh', {
    schema: {
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const body = refreshSchema.parse(request.body);
    
    const result = await refresh(body.refreshToken, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });

    if (result.error) {
      return reply.status(401).send({ error: result.error });
    }

    // Set new refresh token cookie
    reply.setCookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: getConfig().environment === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return reply.send(result);
  });

  // POST /api/auth/logout
  fastify.post('/logout', async (request, reply) => {
    const body = logoutSchema.parse(request.body);
    const refreshToken = body.refreshToken || request.cookies.refresh_token;
    
    await logout(refreshToken);
    
    reply.clearCookie('refresh_token', { path: '/' });
    return { ok: true };
  });

  // POST /api/auth/change-password
  fastify.post('/change-password', {
    preHandler: [fastify.verifyAuth],
    schema: {
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string' },
          newPassword: { type: 'string', minLength: 8 },
        },
      },
    },
  }, async (request, reply) => {
    const body = changePasswordSchema.parse(request.body);
    const user = request.user!;

    const { verifyPassword, hashPassword } = require('../../../src/auth/index');
    const c = require('../../../src/db/connection').getClient();

    // Verify current password
    const userRows = await c.unsafe(
      'SELECT password_hash FROM users WHERE id = $1',
      [user.id]
    );

    if (!userRows.length) {
      return reply.status(404).send({ error: 'user_not_found' });
    }

    const { verifyPassword: verifyPwd } = require('../../../src/auth/index');
    const ok = await verifyPwd(body.currentPassword, userRows[0].password_hash);
    if (!ok) {
      return reply.status(401).send({ error: 'password_actual_incorrecta' });
    }

    // Hash new password
    const { hashPassword } = require('../../../src/auth/index');
    const passwordHash = await hashPassword(body.newPassword);

    // Update password and clear must_change_password flag
    await c.unsafe(
      'UPDATE users SET password_hash = $1, must_change_password = 0 WHERE id = $2',
      [passwordHash, user.id]
    );

    return { ok: true };
  });

  // GET /api/auth/me
  fastify.get('/me', {
    preHandler: [fastify.verifyAuth],
  }, async (request, reply) => {
    const user = request.user!;
    const perms = await require('../../../src/auth/index').getPermissionsForUser({
      id: user.id,
      tenant_id: user.tenantId,
      email: user.email,
      role: user.role,
    });

    return reply.send({ 
      user: require('../../../src/auth/index').toPublicUser({
        id: user.id,
        tenant_id: user.tenantId,
        email: user.email,
        nombre: user.nombre,
        role: user.role,
        activo: true,
        two_factor_enabled: false,
        last_login_at: null,
        must_change_password: false,
      }), 
      permissions: perms 
    });
  });

  // GET /api/auth/permissions
  fastify.get('/permissions', {
    preHandler: [fastify.verifyAuth],
  }, async (request, reply) => {
    const user = request.user!;
    const perms = await getPermissionsForUser({
      id: user.id,
      tenant_id: user.tenantId,
      email: user.email,
      role: user.role,
    });
    return { permissions: perms };
  });

  // POST /api/auth/setup-2fa
  fastify.post('/setup-2fa', {
    preHandler: [fastify.verifyAuth],
  }, async (request, reply) => {
    const user = request.user!;
    const { generateTotpSecret, totpUri } = require('../../../src/auth/index');
    const config = getConfig();

    const secret = generateTotpSecret();
    const uri = totpUri(secret, user.email, config.negocio || 'Mi Negocio');

    return { secret, uri, code: require('../../../src/auth/index').currentTotp(secret) };
  });

  // POST /api/auth/enable-2fa
  fastify.post('/enable-2fa', {
    preHandler: [fastify.verifyAuth],
    schema: {
      body: {
        type: 'object',
        required: ['secret', 'code'],
        properties: {
          secret: { type: 'string' },
          code: { type: 'string', pattern: '^\\d{6}$' },
        },
      },
    },
  }, async (request, reply) => {
    const user = request.user!;
    const body = enable2faSchema.parse(request.body);

    const { verifyTotp } = require('../../../src/auth/index');
    if (!verifyTotp(body.secret, body.code)) {
      return reply.status(400).send({ error: 'codigo_invalido' });
    }

    const c = require('../../../src/db/connection').getClient();
    await c.unsafe(
      'UPDATE users SET two_factor_enabled = true, two_factor_secret = $1 WHERE id = $2',
      [body.secret, request.user!.id]
    );

    return { ok: true };
  });

  // POST /api/auth/disable-2fa
  fastify.post('/disable-2fa', {
    preHandler: [fastify.verifyAuth],
    schema: {
      body: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string', pattern: '^\\d{6}$' },
        },
      },
    },
  }, async (request, reply) => {
    const user = request.user!;
    const body = disable2faSchema.parse(request.body);

    const c = require('../../../src/db/connection').getClient();
    const rows = await c.unsafe('SELECT two_factor_secret FROM users WHERE id = $1', [user.id]);

    if (!rows.length || !rows[0].two_factor_secret) {
      return reply.status(400).send({ error: 'no_2fa_enabled' });
    }

    const { verifyTotp } = require('../../../src/auth/index');
    if (!verifyTotp(rows[0].two_factor_secret, body.code)) {
      return reply.status(400).send({ error: 'codigo_invalido' });
    }

    await c.unsafe(
      'UPDATE users SET two_factor_enabled = false, two_factor_secret = NULL WHERE id = $1',
      [user.id]
    );

    return { ok: true };
  });

  // GET /api/users - List users (admin only)
  fastify.get('/api/users', {
    preHandler: [fastify.verifyAuth],
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

    const c = require('../../../src/db/connection').getClient();
    const rows = await c.unsafe(
      'SELECT id, tenant_id, email, nombre, telefono, role, activo, two_factor_enabled, last_login_at, created_at FROM users ORDER BY id'
    );

    return { users: rows };
  });

  // POST /api/users - Create user (admin only)
  fastify.post('/api/users', {
    preHandler: [fastify.verifyAuth],
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password', 'nombre', 'role'],
        properties: {
          email: { type: 'string', format: 'email' },
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

    if (!perms.includes('users:create')) {
      return reply.status(403).send({ error: 'sin_permiso' });
    }

    const body = createUserSchema.parse(request.body);
    const c = require('../../../src/db/connection').getClient();
    const { hashPassword } = require('../../../src/auth/index');

    const passwordHash = await require('../../../src/auth/index').hashPassword(body.password);

    try {
      const rows = await c.unsafe(
        `INSERT INTO users (tenant_id, email, password_hash, nombre, telefono, role, activo, must_change_password)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
         RETURNING id, tenant_id, email, nombre, telefono, role, activo, two_factor_enabled, must_change_password`,
        [user.tenantId, body.email.toLowerCase().trim(), passwordHash, body.nombre, body.telefono || null, body.role, body.activo !== false]
      );

      return reply.status(201).send({ user: rows[0] });
    } catch (e: any) {
      if (e.code === '23505') {
        return reply.status(409).send({ error: 'email_existe' });
      }
      throw e;
    }
  });

  // PUT /api/users - Update user (admin only)
  fastify.put('/api/users', {
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

    const body = updateUserSchema.parse(request.body);
    const c = require('../../../src/db/connection').getClient();

    if (body.password) {
      const passwordHash = await require('../../../src/auth/index').hashPassword(body.password);
      await c.unsafe(
        'UPDATE users SET password_hash = $1, nombre = COALESCE($2, nombre), telefono = COALESCE($3, telefono), role = COALESCE($4, role), activo = COALESCE($5, activo) WHERE id = $6',
        [passwordHash, body.nombre || null, body.telefono || null, body.role || null, body.activo == null ? null : body.activo, Number(body.id)]
      );
    } else {
      await c.unsafe(
        'UPDATE users SET nombre = COALESCE($1, nombre), telefono = COALESCE($2, telefono), role = COALESCE($3, role), activo = COALESCE($4, activo) WHERE id = $5',
        [body.nombre || null, body.telefono || null, body.role || null, body.activo == null ? null : body.activo, Number(body.id)]
      );
    }

    return { ok: true };
  });
};

export const authRoutes = authRoutes;