/**
 * Tenant Routes - Multi-tenant management
 */
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const tenantRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/tenants - List all tenants (super_admin only)
  fastify.get('/', {
    preHandler: [fastify.verifyAuth],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          sortBy: { type: 'string', default: 'created_at' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
        },
      },
    },
  }, async (request, reply) => {
    const user = request.user!;
    if (user.role !== 'super_admin') {
      return reply.status(403).send({ error: 'sin_permiso' });
    }

    const { TenantRepository } = require('../../../domain/repositories');
    const repo = fastify.container?.tenants();
    
    if (!repo) {
      return reply.status(500).send({ error: 'repository_not_available' });
    }

    const params = {
      page: Number(request.query.page) || 1,
      limit: Number(request.query.limit) || 20,
      sortBy: request.query.sortBy as string || 'created_at',
      sortOrder: (request.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const result = await repo.findAll(params);
    if (!result.ok) {
      return reply.status(500).send({ error: result.error.message });
    }

    return reply.send(result.value);
  });

  // GET /api/tenants/:id - Get tenant by ID
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

    if (user.role !== 'super_admin' && user.tenantId !== id) {
      return reply.status(403).send({ error: 'sin_permiso' });
    }

    const { getClient } = require('../../../src/db/connection');
    const c = getClient();
    const rows = await c.unsafe('SELECT * FROM tenants WHERE id = $1', [id]);

    if (!rows.length) {
      return reply.status(404).send({ error: 'tenant_not_found' });
    }

    const tenant = rows[0];
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      segment: tenant.segment,
      ciiu: tenant.ciiu,
      currency: tenant.currency,
      timezone: tenant.timezone,
      locale: tenant.locale,
      branding: tenant.branding,
      config: tenant.config,
      subscriptionTier: tenant.subscription_tier,
      subscriptionStatus: tenant.subscription_status,
      trialEndsAt: tenant.trial_ends_at,
      createdAt: tenant.created_at,
      updatedAt: tenant.updated_at,
    };
  });

  // POST /api/tenants - Create new tenant (super_admin only)
  fastify.post('/', {
    preHandler: [fastify.verifyAuth],
    schema: {
      body: {
        type: 'object',
        required: ['name', 'segment'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          segment: { type: 'string', enum: ['comidas', 'salud', 'retail', 'belleza', 'servicios', 'manufactura', 'agro', 'otros'] },
          ciiu: { type: 'string' },
          currency: { type: 'string', pattern: '^[A-Z]{3}$', default: 'COP' },
          timezone: { type: 'string', default: 'America/Bogota' },
          locale: { type: 'string', default: 'es-CO' },
          subscriptionTier: { type: 'string', enum: ['free', 'pro', 'enterprise'], default: 'free' },
        },
      },
    },
  }, async (request, reply) => {
    const user = request.user!;
    if (user.role !== 'super_admin') {
      return reply.status(403).send({ error: 'sin_permiso' });
    }

    const body = request.body as any;
    const { Tenant } = require('../../../domain/entities/tenant');
    const tenantResult = Tenant.create({
      name: body.name,
      segment: body.segment,
      ciiu: body.ciiu || '',
      currency: body.currency || 'COP',
      timezone: body.timezone || 'America/Bogota',
      locale: body.locale || 'es-CO',
      branding: {},
      config: {},
      subscriptionTier: body.subscriptionTier || 'free',
      subscriptionStatus: 'trial',
      trialEndsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    });

    if (!tenantResult.ok) {
      return reply.status(400).send({ error: tenantResult.error.message });
    }

    // Save to database
    const { getClient } = require('../../../src/db/connection');
    const c = getClient();
    const tenant = tenantResult.value;

    await require('../../../src/db/connection').getClient().unsafe(
      `INSERT INTO tenants (id, name, slug, segment, ciiu, currency, timezone, locale, branding, config, subscription_tier, subscription_status, trial_ends_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())`,
      [tenant.id, tenant.name, tenant.slug, tenant.segment, tenant.ciiu, tenant.currency, tenant.timezone, tenant.locale, '{}', '{}', tenant.subscriptionTier, 'trial', tenant.trialEndsAt]
    );

    return reply.status(201).send({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      segment: tenant.segment,
      subscriptionTier: tenant.subscriptionTier,
      subscriptionStatus: 'trial',
    });
  });

  // PUT /api/tenants/:id - Update tenant
  fastify.put('/:id', {
    preHandler: [fastify.verifyAuth],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          segment: { type: 'string', enum: ['comidas', 'salud', 'retail', 'belleza', 'servicios', 'manufactura', 'agro', 'otros'] },
          ciiu: { type: 'string' },
          currency: { type: 'string', pattern: '^[A-Z]{3}$' },
          timezone: { type: 'string' },
          locale: { type: 'string' },
          branding: { type: 'object' },
          config: { type: 'object' },
          subscriptionTier: { type: 'string', enum: ['free', 'pro', 'enterprise'] },
          subscriptionStatus: { type: 'string', enum: ['active', 'past_due', 'canceled', 'trial'] },
          trialEndsAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const body = request.body as any;

    if (user.role !== 'super_admin' && user.tenantId !== id) {
      return reply.status(403).send({ error: 'sin_permiso' });
    }

    const { getClient } = require('../../../src/db/connection');
    const c = getClient();

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(body.name);
    }
    if (body.segment !== undefined) {
      updates.push(`segment = $${paramIndex++}`);
      values.push(body.segment);
    }
    if (body.ciiu !== undefined) {
      updates.push(`ciiu = $${paramIndex++}`);
      values.push(body.ciiu);
    }
    if (body.currency !== undefined) {
      updates.push(`currency = $${paramIndex++}`);
      values.push(body.currency);
    }
    if (body.timezone !== undefined) {
      updates.push(`timezone = $${paramIndex++}`);
      values.push(body.timezone);
    }
    if (body.locale !== undefined) {
      updates.push(`locale = $${paramIndex++}`);
      values.push(body.locale);
    }
    if (body.branding !== undefined) {
      updates.push(`branding = $${paramIndex++}`);
      values.push(JSON.stringify(body.branding));
    }
    if (body.config !== undefined) {
      updates.push(`config = $${paramIndex++}`);
      values.push(JSON.stringify(body.config));
    }
    if (body.subscriptionTier !== undefined) {
      updates.push(`subscription_tier = $${paramIndex++}`);
      values.push(body.subscriptionTier);
    }
    if (body.subscriptionStatus !== undefined) {
      updates.push(`subscription_status = $${paramIndex++}`);
      values.push(body.subscriptionStatus);
    }
    if (body.trialEndsAt !== undefined) {
      updates.push(`trial_ends_at = $${paramIndex++}`);
      values.push(body.trialEndsAt);
    }

    if (updates.length === 0) {
      return reply.status(400).send({ error: 'no_fields_to_update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    await require('../../../src/db/connection').getClient().unsafe(
      `UPDATE tenants SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    return { ok: true };
  });

  // DELETE /api/tenants/:id - Delete tenant (super_admin only)
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
    if (user.role !== 'super_admin') {
      return reply.status(403).send({ error: 'sin_permiso' });
    }

    const { id } = request.params as { id: string };
    const { getClient } = require('../../../src/db/connection');
    const c = getClient();

    await c.unsafe('DELETE FROM tenants WHERE id = $1', [id]);

    return { ok: true };
  });
};

export const tenantRoutes = tenantRoutes;