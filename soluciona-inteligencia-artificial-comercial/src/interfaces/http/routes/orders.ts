/**
 * Order Routes - Order management
 */
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const orderRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/orders - List orders
  fastify.get('/', {
    preHandler: [fastify.verifyAuth],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          status: { type: 'string' },
          dateFrom: { type: 'string', format: 'date-time' },
          dateTo: { type: 'string', format: 'date-time' },
        },
      },
    },
  }, async (request, reply) => {
    const user = request.user!;
    const { getClient } = require('../../../src/db/connection');
    const c = getClient();

    const page = Number(request.query.page) || 1;
    const limit = Math.min(Number(request.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const status = request.query.status as string | undefined;
    const dateFrom = request.query.dateFrom as string | undefined;
    const dateTo = request.query.dateTo as string | undefined;

    let whereClause = 'WHERE tenant_id = $1';
    const params: any[] = [user.tenantId];
    let paramIndex = 2;

    if (status) {
      params.push(status);
      whereClause += ` AND estado = $${paramIndex++}`;
    }

    if (dateFrom) {
      params.push(dateFrom);
      whereClause += ` AND fecha >= $${paramIndex++}`;
    }

    if (dateTo) {
      params.push(dateTo);
      whereClause += ` AND fecha <= $${paramIndex++}`;
    }

    const [rows, countResult] = await Promise.all([
      c.unsafe(
        `SELECT * FROM pedidos ${whereClause} ORDER BY fecha DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      ),
      c.unsafe(`SELECT COUNT(*)::int as total FROM pedidos ${whereClause}`, params)
    );

    return {
      data: rows,
      total: countResult[0]?.total || 0,
      page,
      limit,
      totalPages: Math.ceil((countResult[0]?.total || 0) / limit),
    };
  });

  // GET /api/orders/:id - Get order by ID
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
    const { getClient } = require('../../../src/db/connection');
    const c = getClient();

    const rows = await c.unsafe('SELECT * FROM pedidos WHERE id = $1 AND tenant_id = $2', [id, user.tenantId]);

    if (!rows.length) {
      return reply.status(404).send({ error: 'order_not_found' });
    }

    return rows[0];
  });

  // GET /api/orders/numero/:numero - Get order by numero
  fastify.get('/numero/:numero', {
    preHandler: [fastify.verifyAuth],
    schema: {
      params: {
        type: 'object',
        required: ['numero'],
        properties: { numero: { type: 'integer' } },
      },
    },
  }, async (request, reply) => {
    const user = request.user!;
    const { numero } = request.params as { numero: string };
    const { getClient } = require('../../../src/db/connection');
    const c = getClient();

    const rows = await c.unsafe('SELECT * FROM pedidos WHERE numero = $1 AND tenant_id = $2', [numero, user.tenantId]);

    if (!rows.length) {
      return reply.status(404).send({ error: 'order_not_found' });
    }

    return rows[0];
  });

  // GET /api/orders/telefono/:telefono - Get orders by phone
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
    const user = request.user!;
    const { telefono } = request.params as { telefono: string };
    const { getClient } = require('../../../src/db/connection');
    const c = getClient();

    const rows = await c.unsafe('SELECT * FROM pedidos WHERE telefono = $1 AND tenant_id = $2 ORDER BY fecha DESC', [telefono, user.tenantId]);

    return { data: rows };
  });

  // POST /api/orders - Create order
  fastify.post('/', {
    preHandler: [fastify.verifyAuth],
    schema: {
      body: {
        type: 'object',
        required: ['telefono', 'items'],
        properties: {
          telefono: { type: 'string' },
          remitente: { type: 'string' },
          items: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['productId', 'cantidad'],
              properties: {
                productId: { type: 'string', format: 'uuid' },
                cantidad: { type: 'integer', minimum: 1 },
                precioUnitario: { type: 'number', minimum: 0 },
                notas: { type: 'string' },
              },
            },
          },
          direccion: { type: 'string' },
          lat: { type: 'string' },
          lng: { type: 'string' },
          tipo: { type: 'string', enum: ['domicilio', 'recoger', 'mesa', 'consumo_local'], default: 'domicilio' },
          notas: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const user = request.user!;
    const body = request.body as any;
    const { getClient } = require('../../../src/db/connection');
    const c = getClient();

    // Get next order number
    const numeroResult = await c.unsafe(
      'SELECT COALESCE(MAX(numero), 0) + 1 AS next_num FROM pedidos WHERE tenant_id = $1',
      [user.tenantId]
    );
    const numero = numeroResult[0]?.next_num || 1;

    // Calculate totals
    let total = 0;
    const items = body.items.map((item: any) => {
      const subtotal = item.cantidad * item.precioUnitario;
      total += subtotal;
      return {
        productId: item.productId,
        nombre: item.nombre || '',
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal,
        notas: item.notas || null,
        ingredientes: null,
      };
    });

    const order = {
      id: crypto.randomUUID(),
      tenant_id: user.tenantId,
      numero,
      fecha: new Date(),
      dia: new Date().toISOString().split('T')[0],
      remitente: body.remitente || 'Cliente',
      telefono: body.telefono,
      items: JSON.stringify(items),
      total,
      crudo: '',
      direccion: body.direccion || null,
      lat: body.lat || null,
      lng: body.lng || null,
      estado: 'recibido' as const,
      tipo: body.tipo || 'domicilio',
      estado_pago: 'pendiente' as const,
      factura_emitida: null,
      factura_proveedor: null,
      distancia_km: null,
      costo_domicilio: null,
      notas: body.notas || null,
      creado_at: new Date(),
      actualizado_at: new Date(),
    };

    await require('../../../src/db/connection').getClient().unsafe(
      `INSERT INTO pedidos (id, tenant_id, numero, fecha, dia, remitente, telefono, items, total, crudo, direccion, lat, lng, estado, tipo, estado_pago, factura_emitida, factura_proveedor, distancia_km, costo_domicilio, notas, creado_at, actualizado_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $16, $17, $18, $19, $20, $21, $22, NOW(), NOW())`,
      [
        order.id, user.tenantId, order.numero, order.fecha, order.dia,
        order.remitente, order.telefono, order.items, order.total, order.crudo,
        order.direccion, order.lat, order.lng, order.estado, order.tipo,
        order.estado_pago, order.factura_emitida, order.factura_proveedor,
        order.distancia_km, order.costo_domicilio, order.notas
      ]
    );

    // Emit real-time event
    fastify.emitir(user.tenantId, 'pedido:nuevo', { order });

    return reply.status(201).send({ order });
  });

  // PUT /api/orders/:id/estado - Update order status
  fastify.put('/:id/estado', {
    preHandler: [fastify.verifyAuth],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      body: {
        type: 'object',
        required: ['estado'],
        properties: {
          estado: { type: 'string', enum: ['recibido', 'confirmado', 'en_preparacion', 'listo', 'en_camino', 'entregado', 'cancelado', 'devuelto'] },
        },
      },
    },
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const { estado } = request.body as { estado: string };
    const { getClient } = require('../../../src/db/connection');
    const c = getClient();

    const validTransitions: Record<string, string[]> = {
      recibido: ['confirmado', 'cancelado'],
      confirmado: ['en_preparacion', 'cancelado'],
      en_preparacion: ['listo', 'cancelado'],
      listo: ['en_camino', 'cancelado'],
      en_camino: ['entregado', 'cancelado'],
      entregado: ['devuelto'],
      cancelado: [],
      devuelto: [],
    };

    const rows = await c.unsafe('SELECT estado FROM pedidos WHERE id = $1 AND tenant_id = $2', [id, user.tenantId]);
    if (!rows.length) {
      return reply.status(404).send({ error: 'order_not_found' });
    }

    const currentEstado = rows[0].estado;
    if (!validTransitions[currentEstado]?.includes(estado)) {
      return reply.status(400).send({ error: `Invalid transition from ${currentEstado} to ${estado}` });
    }

    await c.unsafe('UPDATE pedidos SET estado = $1, actualizado_at = NOW() WHERE id = $2 AND tenant_id = $3', [estado, id, user.tenantId]);

    // Emit real-time event
    fastify.emitir(user.tenantId, 'pedido:estado', { id, estado, oldEstado: currentEstado });

    return { ok: true };
  });

  // PUT /api/orders/:id/pago - Update payment status
  fastify.put('/:id/pago', {
    preHandler: [fastify.verifyAuth],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      body: {
        type: 'object',
        required: ['estado'],
        properties: {
          estado: { type: 'string', enum: ['pendiente', 'pagado', 'parcial', 'reembolsado', 'fallido'] },
        },
      },
    },
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const { estado } = request.body as { estado: string };
    const { getClient } = require('../../../src/db/connection');
    const c = getClient();

    await c.unsafe('UPDATE pedidos SET estado_pago = $1, actualizado_at = NOW() WHERE id = $2 AND tenant_id = $3', [estado, id, user.tenantId]);

    return { ok: true };
  });
};

export const orderRoutes = orderRoutes;