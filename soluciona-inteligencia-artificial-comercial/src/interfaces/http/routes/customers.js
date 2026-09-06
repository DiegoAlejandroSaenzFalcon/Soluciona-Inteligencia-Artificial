"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerRoutes = void 0;
const customerRoutes = async (fastify) => {
    // GET /api/customers - List customers
    fastify.get('/', {
        preHandler: [fastify.verifyAuth],
        schema: {
            querystring: {
                type: 'object',
                properties: {
                    page: { type: 'integer', minimum: 1, default: 1 },
                    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
                    active: { type: 'boolean' },
                    search: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const user = request.user;
        const { getClient } = require('../../../src/db/connection');
        const c = getClient();
        const page = Number(request.query.page) || 1;
        const limit = Math.min(Number(request.query.limit) || 20, 100);
        const offset = (page - 1) * limit;
        const active = request.query.active;
        const search = request.query.search;
        let whereClause = 'WHERE tenant_id = $1';
        const params = [user.tenantId];
        let paramIndex = 2;
        if (active !== undefined) {
            params.push(active === 'true');
            whereClause += ` AND activo = $${paramIndex++}`;
        }
        if (search) {
            params.push(`%${search}%`);
            whereClause += ` AND (nombre ILIKE $${paramIndex++} OR telefono ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
            paramIndex++;
        }
        const [rows, countResult] = await Promise.all([
            require('../../../src/db/connection').getClient().unsafe(`SELECT * FROM customers ${whereClause} ORDER BY ultima_compra DESC NULLS LAST, nombre ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, [...params, limit, offset]),
            require('../../../src/db/connection').getClient().unsafe(`SELECT COUNT(*)::int as total FROM customers ${whereClause}`, params)
        ]);
        return {
            data: rows,
            total: countResult[0]?.total || 0,
            page,
            limit,
            totalPages: Math.ceil((countResult[0]?.total || 0) / limit),
        };
    });
    // GET /api/customers/:id - Get customer by ID
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
        const user = request.user;
        const { id } = request.params;
        const { getClient } = require('../../../src/db/connection');
        const c = getClient();
        const rows = await c.unsafe('SELECT * FROM customers WHERE id = $1 AND tenant_id = $2', [id, user.tenantId]);
        if (!rows.length) {
            return reply.status(404).send({ error: 'customer_not_found' });
        }
        return rows[0];
    });
    // GET /api/customers/telefono/:telefono - Get customer by phone
    fastify.get('/telefono/:telefono', {
        preHandler: [fastify.verifyAuth],
        schema: {
            params: {
                type: 'object',
                required: ['telefono'],
                properties: { telefono: { type: 'string' } },
            },
        },
    }, async (request, reply) => {
        const user = request.user;
        const { telefono } = request.params;
        const { getClient } = require('../../../src/db/connection');
        const c = getClient();
        const rows = await c.unsafe('SELECT * FROM customers WHERE telefono = $1 AND tenant_id = $2', [telefono, user.tenantId]);
        if (!rows.length) {
            return reply.status(404).send({ error: 'customer_not_found' });
        }
        return rows[0];
    });
    // POST /api/customers - Create customer
    fastify.post('/', {
        preHandler: [fastify.verifyAuth],
        schema: {
            body: {
                type: 'object',
                required: ['telefono'],
                properties: {
                    nombre: { type: 'string' },
                    telefono: { type: 'string', minLength: 10 },
                    email: { type: 'string', format: 'email' },
                    direccion: { type: 'string' },
                    lat: { type: 'string' },
                    lng: { type: 'string' },
                    diasCredito: { type: 'integer', minimum: 0, default: 0 },
                    limiteCredito: { type: 'number', minimum: 0, default: 0 },
                    notas: { type: 'string' },
                    tags: { type: 'array', items: { type: 'string' } },
                },
            },
        },
    }, async (request, reply) => {
        const user = request.user;
        const body = request.body;
        const { getClient } = require('../../../src/db/connection');
        const c = getClient();
        const customer = {
            id: crypto.randomUUID(),
            tenant_id: user.tenantId,
            nombre: body.nombre || null,
            telefono: body.telefono,
            email: body.email || null,
            direccion: body.direccion || null,
            lat: body.lat || null,
            lng: body.lng || null,
            dias_credito: body.diasCredito || 0,
            limite_credito: body.limiteCredito || 0,
            saldo_pendiente: 0,
            activo: true,
            notas: body.notas || null,
            tags: body.tags || [],
            creado_at: new Date(),
            actualizado_at: new Date(),
        };
        await c.unsafe(`INSERT INTO customers (id, tenant_id, nombre, telefono, email, direccion, lat, lng, dias_credito, limite_credito, saldo_pendiente, activo, notas, tags, creado_at, actualizado_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())`, [
            customer.id, user.tenantId, customer.nombre, customer.telefono, customer.email,
            customer.direccion, customer.lat, customer.lng, customer.dias_credito,
            customer.limite_credito, customer.saldo_pendiente, customer.activo,
            customer.notas, JSON.stringify(customer.tags)
        ]);
        return reply.status(201).send({ customer });
    });
    // PUT /api/customers/:id - Update customer
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
                    nombre: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    direccion: { type: 'string' },
                    lat: { type: 'string' },
                    lng: { type: 'string' },
                    diasCredito: { type: 'integer', minimum: 0 },
                    limiteCredito: { type: 'number', minimum: 0 },
                    notas: { type: 'string' },
                    tags: { type: 'array', items: { type: 'string' } },
                    activo: { type: 'boolean' },
                },
            },
        },
    }, async (request, reply) => {
        const user = request.user;
        const { id } = request.params;
        const body = request.body;
        const { getClient } = require('../../../src/db/connection');
        const c = getClient();
        const existing = await require('../../../src/db/connection').getClient().unsafe('SELECT * FROM customers WHERE id = $1 AND tenant_id = $2', [id, user.tenantId]);
        if (!existing.length) {
            return reply.status(404).send({ error: 'customer_not_found' });
        }
        const updates = [];
        const values = [];
        let paramIndex = 1;
        if (body.nombre !== undefined) {
            updates.push(`nombre = $${paramIndex++}`);
            values.push(body.nombre);
        }
        if (body.email !== undefined) {
            updates.push(`email = $${paramIndex++}`);
            values.push(body.email);
        }
        if (body.direccion !== undefined) {
            updates.push(`direccion = $${paramIndex++}`);
            values.push(body.direccion);
        }
        if (body.lat !== undefined) {
            updates.push(`lat = $${paramIndex++}`);
            values.push(body.lat);
        }
        if (body.lng !== undefined) {
            updates.push(`lng = $${paramIndex++}`);
            values.push(body.lng);
        }
        if (body.diasCredito !== undefined) {
            updates.push(`dias_credito = $${paramIndex++}`);
            values.push(body.diasCredito);
        }
        if (body.limiteCredito !== undefined) {
            updates.push(`limite_credito = $${paramIndex++}`);
            values.push(body.limiteCredito);
        }
        if (body.notas !== undefined) {
            updates.push(`notas = $${paramIndex++}`);
            values.push(body.notas);
        }
        if (body.tags !== undefined) {
            updates.push(`tags = $${paramIndex++}`);
            values.push(JSON.stringify(body.tags));
        }
        if (body.activo !== undefined) {
            updates.push(`activo = $${paramIndex++}`);
            values.push(body.activo);
        }
        if (updates.length === 0) {
            return reply.status(400).send({ error: 'no_fields_to_update' });
        }
        updates.push(`actualizado_at = NOW()`);
        values.push(id, user.tenantId);
        await require('../../../src/db/connection').getClient().unsafe(`UPDATE customers SET ${updates.join(', ')} WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}`, values);
        return { ok: true };
    });
    // DELETE /api/customers/:id - Delete customer (soft delete)
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
        const user = request.user;
        const { id } = request.params;
        const { getClient } = require('../../../src/db/connection');
        const c = getClient();
        await c.unsafe('UPDATE customers SET activo = false, actualizado_at = NOW() WHERE id = $1 AND tenant_id = $2', [id, user.tenantId]);
        return { ok: true };
    });
    // POST /api/customers/:id/abonar - Abonar saldo
    fastify.post('/:id/abonar', {
        preHandler: [fastify.verifyAuth],
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: { id: { type: 'string', format: 'uuid' } },
            },
            body: {
                type: 'object',
                required: ['monto'],
                properties: { monto: { type: 'number', minimum: 0.01 } },
            },
        },
    }, async (request, reply) => {
        const user = request.user;
        const { id } = request.params;
        const { monto } = request.body;
        const { getClient } = require('../../../src/db/connection');
        const c = getClient();
        const existing = await c.unsafe('SELECT saldo_pendiente FROM customers WHERE id = $1 AND tenant_id = $2', [id, user.tenantId]);
        if (!existing.length) {
            return reply.status(404).send({ error: 'customer_not_found' });
        }
        if (monto > existing[0].saldo_pendiente) {
            return reply.status(400).send({ error: 'monto_excede_saldo' });
        }
        await c.unsafe('UPDATE customers SET saldo_pendiente = saldo_pendiente - $1, actualizado_at = NOW() WHERE id = $2 AND tenant_id = $3', [monto, id, user.tenantId]);
        return { ok: true, nuevoSaldo: existing[0].saldo_pendiente - monto };
    });
    // POST /api/customers/:id/cargar - Cargar saldo
    fastify.post('/:id/cargar', {
        preHandler: [fastify.verifyAuth],
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: { id: { type: 'string', format: 'uuid' } },
            },
            body: {
                type: 'object',
                required: ['monto'],
                properties: { monto: { type: 'number', minimum: 0.01 } },
            },
        },
    }, async (request, reply) => {
        const user = request.user;
        const { id } = request.params;
        const { monto } = request.body;
        const { getClient } = require('../../../src/db/connection');
        const c = getClient();
        await c.unsafe('UPDATE customers SET saldo_pendiente = saldo_pendiente + $1, actualizado_at = NOW() WHERE id = $2 AND tenant_id = $3', [monto, id, user.tenantId]);
        return { ok: true };
    });
    // GET /api/customers/top - Get top customers
    fastify.get('/top', {
        preHandler: [fastify.verifyAuth],
        schema: {
            querystring: {
                type: 'object',
                properties: {
                    limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
                    by: { type: 'string', enum: ['totalGastado', 'totalPedidos', 'frecuencia'], default: 'totalGastado' },
                },
            },
        },
    }, async (request, reply) => {
        const user = request.user;
        const { getClient } = require('../../../src/db/connection');
        const c = getClient();
        const limit = Math.min(Number(request.query.limit) || 10, 100);
        const by = request.query.by || 'totalGastado';
        const orderBy = by === 'totalPedidos' ? 'total_pedidos' : by === 'frecuencia' ? 'total_pedidos / NULLIF(EXTRACT(EPOCH FROM (NOW() - primera_compra)) / 86400 / 30, 0)' : 'total_gastado';
        const rows = await require('../../../src/db/connection').getClient().unsafe(`SELECT * FROM customers WHERE tenant_id = $1 AND activo = true ORDER BY ${orderBy} DESC LIMIT $2`, [user.tenantId, limit]);
        return { data: rows };
    });
    // GET /api/customers/deuda - Customers with debt
    fastify.get('/deuda', {
        preHandler: [fastify.verifyAuth],
    }, async (request, reply) => {
        const user = request.user;
        const { getClient } = require('../../../src/db/connection');
        const c = getClient();
        const rows = await c.unsafe('SELECT * FROM customers WHERE tenant_id = $1 AND saldo_pendiente > 0 AND activo = true ORDER BY saldo_pendiente DESC', [user.tenantId]);
        return { data: rows };
    });
};
exports.customerRoutes = customerRoutes;
//# sourceMappingURL=customers.js.map