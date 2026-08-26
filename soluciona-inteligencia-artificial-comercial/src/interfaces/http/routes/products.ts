/**
 * Product Routes - Product management
 */
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const productRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/products - List products
  fastify.get('/', {
    preHandler: [fastify.verifyAuth],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          active: { type: 'boolean' },
          category: { type: 'string' },
          search: { type: 'string' },
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
    const active = request.query.active as string | undefined;
    const category = request.query.category as string | undefined;
    const search = request.query.search as string | undefined;

    let whereClause = 'WHERE tenant_id = $1';
    const params: any[] = [user.tenantId];
    let paramIndex = 2;

    if (active !== undefined) {
      params.push(active === 'true');
      whereClause += ` AND activo = $${paramIndex++}`;
    }

    if (category) {
      params.push(category);
      whereClause += ` AND categoria = $${paramIndex++}`;
    }

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (nombre ILIKE $${paramIndex++} OR codigo ILIKE $${paramIndex})`;
      paramIndex++;
    }

    const [rows, countResult] = await Promise.all([
      require('../../../src/db/connection').getClient().unsafe(
        `SELECT * FROM products ${whereClause} ORDER BY nombre ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      ),
      require('../../../src/db/connection').getClient().unsafe(
        `SELECT COUNT(*)::int as total FROM products ${whereClause}`,
        params
      )
    ]);

    return {
      data: rows,
      total: countResult[0]?.total || 0,
      page,
      limit,
      totalPages: Math.ceil((countResult[0]?.total || 0) / limit),
    };
  });

  // GET /api/products/:id - Get product by ID
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

    const rows = await c.unsafe('SELECT * FROM products WHERE id = $1 AND tenant_id = $2', [id, user.tenantId]);

    if (!rows.length) {
      return reply.status(404).send({ error: 'product_not_found' });
    }

    return rows[0];
  });

  // POST /api/products - Create product
  fastify.post('/', {
    preHandler: [fastify.verifyAuth],
    schema: {
      body: {
        type: 'object',
        required: ['nombre', 'precio'],
        properties: {
          nombre: { type: 'string', minLength: 1 },
          codigo: { type: 'string' },
          descripcion: { type: 'string' },
          precio: { type: 'number', minimum: 0 },
          costo: { type: 'number', minimum: 0 },
          categoria: { type: 'string' },
          ingredientes: { type: 'string' },
          imagenUrl: { type: 'string' },
          activo: { type: 'boolean', default: true },
          manejaStock: { type: 'boolean', default: true },
          stockMinimo: { type: 'number', minimum: 0, default: 0 },
          stockMaximo: { type: 'number', minimum: 0 },
          unidadMedida: { type: 'string', default: 'unidad' },
          codigoBarras: { type: 'string' },
          impuestos: { type: 'number', minimum: 0, maximum: 100, default: 19 },
        },
      },
    },
  }, async (request, reply) => {
    const user = request.user!;
    const body = request.body as any;
    const { getClient } = require('../../../src/db/connection');
    const c = getClient();

    const product = {
      id: crypto.randomUUID(),
      tenant_id: user.tenantId,
      nombre: body.nombre,
      codigo: body.codigo || null,
      descripcion: body.descripcion || null,
      precio: body.precio,
      costo: body.costo || null,
      categoria: body.categoria || null,
      ingredientes: body.ingredientes || null,
      imagen_url: body.imagenUrl || null,
      activo: body.activo !== false,
      maneja_stock: body.manejaStock !== false,
      stock_minimo: body.stockMinimo || 0,
      stock_maximo: body.stockMaximo || null,
      unidad_medida: body.unidadMedida || 'unidad',
      codigo_barras: body.codigoBarras || null,
      impuestos: body.impuestos || 19,
      creado_at: new Date(),
      actualizado_at: new Date(),
    };

    await require('../../../src/db/connection').getClient().unsafe(
      `INSERT INTO products (id, tenant_id, nombre, codigo, descripcion, precio, costo, categoria, ingredientes, imagen_url, activo, maneja_stock, stock_minimo, stock_maximo, unidad_medida, codigo_barras, impuestos, creado_at, actualizado_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())`,
      [
        product.id, user.tenantId, product.nombre, product.codigo, product.descripcion,
        product.precio, product.costo, product.categoria, product.ingredientes,
        product.imagen_url, product.activo, product.maneja_stock, product.stock_minimo,
        product.stock_maximo, product.unidad_medida, product.codigo_barras,
        product.impuestos
      ]
    );

    return reply.status(201).send({ product });
  });

  // PUT /api/products/:id - Update product
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
          codigo: { type: 'string' },
          descripcion: { type: 'string' },
          precio: { type: 'number', minimum: 0 },
          costo: { type: 'number', minimum: 0 },
          categoria: { type: 'string' },
          ingredientes: { type: 'string' },
          imagenUrl: { type: 'string' },
          activo: { type: 'boolean' },
          manejaStock: { type: 'boolean' },
          stockMinimo: { type: 'number', minimum: 0 },
          stockMaximo: { type: 'number', minimum: 0 },
          unidadMedida: { type: 'string' },
          codigoBarras: { type: 'string' },
          impuestos: { type: 'number', minimum: 0, maximum: 100 },
        },
      },
    },
  }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const { getClient } = require('../../../src/db/connection');
    const c = getClient();

    // Check product exists and belongs to tenant
    const existing = await c.unsafe('SELECT * FROM products WHERE id = $1 AND tenant_id = $2', [id, user.tenantId]);
    if (!existing.length) {
      return reply.status(404).send({ error: 'product_not_found' });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.nombre !== undefined) { updates.push(`nombre = $${paramIndex++}`); values.push(body.nombre); }
    if (body.codigo !== undefined) { updates.push(`codigo = $${paramIndex++}`); values.push(body.codigo); }
    if (body.descripcion !== undefined) { updates.push(`descripcion = $${paramIndex++}`); values.push(body.descripcion); }
    if (body.precio !== undefined) { updates.push(`precio = $${paramIndex++}`); values.push(body.precio); }
    if (body.costo !== undefined) { updates.push(`costo = $${paramIndex++}`); values.push(body.costo); }
    if (body.categoria !== undefined) { updates.push(`categoria = $${paramIndex++}`); values.push(body.categoria); }
    if (body.ingredientes !== undefined) { updates.push(`ingredientes = $${paramIndex++}`); values.push(body.ingredientes); }
    if (body.imagenUrl !== undefined) { updates.push(`imagen_url = $${paramIndex++}`); values.push(body.imagenUrl); }
    if (body.activo !== undefined) { updates.push(`activo = $${paramIndex++}`); values.push(body.activo); }
    if (body.manejaStock !== undefined) { updates.push(`maneja_stock = $${paramIndex++}`); values.push(body.manejaStock); }
    if (body.stockMinimo !== undefined) { updates.push(`stock_minimo = $${paramIndex++}`); values.push(body.stockMinimo); }
    if (body.stockMaximo !== undefined) { updates.push(`stock_maximo = $${paramIndex++}`); values.push(body.stockMaximo); }
    if (body.unidadMedida !== undefined) { updates.push(`unidad_medida = $${paramIndex++}`); values.push(body.unidadMedida); }
    if (body.codigoBarras !== undefined) { updates.push(`codigo_barras = $${paramIndex++}`); values.push(body.codigoBarras); }
    if (body.impuestos !== undefined) { updates.push(`impuestos = $${paramIndex++}`); values.push(body.impuestos); }

    if (updates.length === 0) {
      return reply.status(400).send({ error: 'no_fields_to_update' });
    }

    updates.push(`actualizado_at = NOW()`);
    values.push(id, user.tenantId);

    await c.unsafe(
      `UPDATE products SET ${updates.join(', ')} WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}`,
      values
    );

    return { ok: true };
  });

  // DELETE /api/products/:id - Delete product (soft delete by deactivating)
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
    const { id } = request.params as { id: string };
    const { getClient } = require('../../../src/db/connection');
    const c = getClient();

    await c.unsafe('UPDATE products SET activo = false, actualizado_at = NOW() WHERE id = $1 AND tenant_id = $2', [id, user.tenantId]);

    return { ok: true };
  });

  // GET /api/products/low-stock - Get low stock products
  fastify.get('/low-stock', {
    preHandler: [fastify.verifyAuth],
  }, async (request, reply) => {
    const user = request.user!;
    const { getClient } = require('../../../src/db/connection');
    const c = getClient();

    const rows = await c.unsafe(
      `SELECT p.*, s.cantidad as stock_actual 
       FROM products p
       LEFT JOIN stock s ON s.product_id = p.id
       WHERE p.tenant_id = $1 AND p.activo = true AND p.maneja_stock = true
       AND (s.cantidad <= p.stock_minimo OR s.cantidad IS NULL)
       ORDER BY p.nombre`,
      [user.tenantId]
    );

    return { data: rows };
  });
};

export const productRoutes = productRoutes;