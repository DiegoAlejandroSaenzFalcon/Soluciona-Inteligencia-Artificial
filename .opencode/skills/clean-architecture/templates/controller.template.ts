/**
 * Controller/Route Template - Clean Architecture Interfaces Layer
 * Ubicación: src/interfaces/http/routes/<feature>.routes.ts
 * 
 * Reglas:
 * - SOLO HTTP concerns: request/response, status codes, headers
 * - NO business logic (delega a Use Cases)
 * - Validación Zod en middleware (no en handler)
 * - Manejo de errores estandarizado (RFC 7807 Problem Details)
 * - Correlation ID propagado
 * - OpenAPI/JSDoc para documentación automática
 */

import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { <Action><EntityName>UseCase } from '@application/use-cases/<feature>/<action>.use-case';
import { Create<EntityName>UseCaseInput, Update<EntityName>UseCaseInput, List<EntityName>UseCaseInput } from '@application/use-cases/<feature>/dto/<entity-name>.dto';
import { validate } from '@shared/utils/validation';
import { create<EntityName>Schema, update<EntityName>Schema, list<EntityName>Schema } from '@shared/schemas/<entity-name>.schema';
import { ProblemDetails } from '@shared/utils/problem-details';

// ============================================
// SCHEMAS (OpenAPI + Zod)
// ============================================
const paramsSchema = z.object({
  id: z.string().uuid({ message: 'ID debe ser un UUID válido' }),
});

const queryListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  // Filtros específicos
  <filtro1>: z.string().optional(),
  <filtro2>: z.string().optional(),
});

// ============================================
// ROUTE HANDLERS
// ============================================
export const <feature>Routes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const useCase = fastify.diContainer.resolve('<Action><EntityName>UseCase');

  // ----- POST /api/<feature> - CREATE -----
  fastify.post('/', {
    schema: {
      description: 'Crear nuevo <EntityName>',
      tags: ['<Feature>'],
      security: [{ bearerAuth: [] }],
      body: create<EntityName>Schema.shape.body, // Zod to JSON Schema
      response: {
        201: { $ref: '<EntityName>DTO#' },
        400: { $ref: 'ProblemDetails#' },
        401: { $ref: 'ProblemDetails#' },
        403: { $ref: 'ProblemDetails#' },
        409: { $ref: 'ProblemDetails#' },
        422: { $ref: 'ProblemDetails#' },
        429: { $ref: 'ProblemDetails#' },
      },
    },
    preHandler: [
      fastify.authenticate,
      fastify.authorize('<feature>', 'create'),
      validate(create<EntityName>Schema),
    ],
  }, async (request, reply) => {
    const input: Create<EntityName>UseCaseInput = {
      ...request.body,
      tenantId: request.tenantId,
      correlationId: request.correlationId,
      idempotencyKey: request.headers['idempotency-key'] as string,
    };

    const result = await useCase.executeCreate(input);

    if (!result.ok) {
      return replyProblem(reply, result.error, request.correlationId);
    }

    reply.code(201).header('Location', `/api/<feature>/${result.value.id}`);
    return result.value;
  });

  // ----- GET /api/<feature>/:id - GET BY ID -----
  fastify.get('/:id', {
    schema: {
      description: 'Obtener <EntityName> por ID',
      tags: ['<Feature>'],
      security: [{ bearerAuth: [] }],
      params: paramsSchema,
      response: {
        200: { $ref: '<EntityName>DTO#' },
        401: { $ref: 'ProblemDetails#' },
        403: { $ref: 'ProblemDetails#' },
        404: { $ref: 'ProblemDetails#' },
      },
    },
    preHandler: [
      fastify.authenticate,
      fastify.authorize('<feature>', 'read'),
    ],
  }, async (request, reply) => {
    const result = await useCase.executeGet({
      id: request.params.id,
      tenantId: request.tenantId,
    });

    if (!result.ok) {
      return replyProblem(reply, result.error, request.correlationId);
    }

    return result.value;
  });

  // ----- GET /api/<feature> - LIST -----
  fastify.get('/', {
    schema: {
      description: 'Listar <EntityName>s con paginación y filtros',
      tags: ['<Feature>'],
      security: [{ bearerAuth: [] }],
      querystring: queryListSchema,
      response: {
        200: { $ref: 'PaginatedResult<EntityName>DTO#' },
        401: { $ref: 'ProblemDetails#' },
        403: { $ref: 'ProblemDetails#' },
      },
    },
    preHandler: [
      fastify.authenticate,
      fastify.authorize('<feature>', 'read'),
      validate(list<EntityName>Schema),
    ],
  }, async (request, reply) => {
    const result = await useCase.executeList({
      tenantId: request.tenantId,
      page: request.query.page,
      limit: request.query.limit,
      filters: request.query,
    });

    if (!result.ok) {
      return replyProblem(reply, result.error, request.correlationId);
    }

    return result.value;
  });

  // ----- PATCH /api/<feature>/:id - UPDATE -----
  fastify.patch('/:id', {
    schema: {
      description: 'Actualizar <EntityName> parcialmente',
      tags: ['<Feature>'],
      security: [{ bearerAuth: [] }],
      params: paramsSchema,
      body: update<EntityName>Schema.shape.body,
      response: {
        200: { $ref: '<EntityName>DTO#' },
        400: { $ref: 'ProblemDetails#' },
        401: { $ref: 'ProblemDetails#' },
        403: { $ref: 'ProblemDetails#' },
        404: { $ref: 'ProblemDetails#' },
        409: { $ref: 'ProblemDetails#' },
        422: { $ref: 'ProblemDetails#' },
      },
    },
    preHandler: [
      fastify.authenticate,
      fastify.authorize('<feature>', 'update'),
      validate(update<EntityName>Schema),
    ],
  }, async (request, reply) => {
    const result = await useCase.executeUpdate({
      id: request.params.id,
      tenantId: request.tenantId,
      ...request.body,
      correlationId: request.correlationId,
    });

    if (!result.ok) {
      return replyProblem(reply, result.error, request.correlationId);
    }

    return result.value;
  });

  // ----- DELETE /api/<feature>/:id - DELETE (Soft) -----
  fastify.delete('/:id', {
    schema: {
      description: 'Desactivar <EntityName> (soft delete)',
      tags: ['<Feature>'],
      security: [{ bearerAuth: [] }],
      params: paramsSchema,
      response: {
        204: { type: 'null' },
        401: { $ref: 'ProblemDetails#' },
        403: { $ref: 'ProblemDetails#' },
        404: { $ref: 'ProblemDetails#' },
      },
    },
    preHandler: [
      fastify.authenticate,
      fastify.authorize('<feature>', 'delete'),
    ],
  }, async (request, reply) => {
    const result = await useCase.executeDelete(request.params.id, request.tenantId);

    if (!result.ok) {
      return replyProblem(reply, result.error, request.correlationId);
    }

    reply.code(204).send();
  });
};

// ============================================
// ERROR HANDLING HELPER (RFC 7807)
// ============================================
function replyProblem(reply: FastifyReply, error: Error, correlationId?: string): FastifyReply {
  const problem: ProblemDetails = {
    type: `https://api.soluciona.ai/errors/${error.name}`,
    title: error.name.replace('Error', ''),
    status: getStatusCode(error),
    detail: error.message,
    instance: correlationId ? `/traces/${correlationId}` : undefined,
    correlationId,
    timestamp: new Date().toISOString(),
  };

  // Agregar detalles específicos si es ValidationError
  if (error.name === 'ValidationError' && 'errors' in error) {
    problem.extensions = {
      validationErrors: error.errors,
    };
  }

  return reply.code(problem.status).send(problem);
}

function getStatusCode(error: Error): number {
  switch (error.name) {
    case 'ValidationError': return 400;
    case 'NotFoundError': return 404;
    case 'BusinessRuleError': return 422;
    case 'ConcurrencyError': return 409;
    case 'UnauthorizedError': return 401;
    case 'ForbiddenError': return 403;
    case 'RateLimitedError': return 429;
    default: return 500;
  }
}

// ============================================
// OPENAPI COMPONENTS (para documentación)
// ============================================
/*
# En OpenAPI spec (generado automáticamente desde JSDoc + Zod)

components:
  schemas:
    <EntityName>DTO:
      type: object
      required: [id, tenantId, creadoAt, actualizadoAt]
      properties:
        id:
          type: string
          format: uuid
        tenantId:
          type: string
          format: uuid
        <campo1>:
          type: string
        <campo2>:
          type: number
        creadoAt:
          type: string
          format: date-time
        actualizadoAt:
          type: string
          format: date-time

    PaginatedResult<EntityName>DTO:
      type: object
      required: [data, pagination]
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/<EntityName>DTO'
        pagination:
          type: object
          required: [page, limit, total, totalPages]
          properties:
            page:
              type: integer
              minimum: 1
            limit:
              type: integer
              minimum: 1
              maximum: 100
            total:
              type: integer
              minimum: 0
            totalPages:
              type: integer
              minimum: 0

    ProblemDetails:
      type: object
      required: [type, title, status, detail, timestamp]
      properties:
        type:
          type: string
          format: uri
        title:
          type: string
        status:
          type: integer
          minimum: 400
          maximum: 599
        detail:
          type: string
        instance:
          type: string
          format: uri
        correlationId:
          type: string
          format: uuid
        timestamp:
          type: string
          format: date-time
        extensions:
          type: object
*/