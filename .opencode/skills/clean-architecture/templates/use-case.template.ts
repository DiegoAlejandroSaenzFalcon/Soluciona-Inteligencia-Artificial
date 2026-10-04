/**
 * Use Case Template - Clean Architecture Application Layer
 * Ubicación: src/application/use-cases/<feature>/<action>.use-case.ts
 * 
 * Reglas:
 * - SOLO imports de: domain (entities, repositories interfaces), shared (kernel, utils), application (dto, ports)
 * - NO imports de: infrastructure, interfaces, frameworks
 * - Orquesta: Validación → Domain Logic → Persistence → Events
 * - Retorna Result<T, Error> (nunca lanza excepciones de negocio)
 * - Transaccional: usa executeInTransaction para multi-repo
 */

import { Injectable } from '@shared/kernel/decorators'; // O constructor injection
import { Result, Ok, Err, fromPromise } from '@shared/kernel/result';
import { executeInTransaction } from '@infrastructure/database/transaction';
import { <EntityName> } from '@domain/entities/<entity-name>';
import { I<EntityName>Repository } from '@domain/repositories/<entity-name>.repository';
import { IEventBus } from '@shared/kernel/events';
import { validate } from '@shared/utils/validation';
import { create<EntityName>Schema, update<EntityName>Schema } from '@shared/schemas/<entity-name>.schema';
import { <EntityName>DTO, Create<EntityName>Input, Update<EntityName>Input } from './dto/<entity-name>.dto';

// ============================================
// DTOs (Data Transfer Objects)
// ============================================
export interface Create<EntityName>UseCaseInput extends Create<EntityName>Input {
  correlationId?: string;
  idempotencyKey?: string;
}

export interface Update<EntityName>UseCaseInput extends Update<EntityName>Input {
  id: string;
  correlationId?: string;
}

export interface Get<EntityName>UseCaseInput {
  id: string;
  tenantId: string;
}

export interface List<EntityName>UseCaseInput {
  tenantId: string;
  page?: number;
  limit?: number;
  filters?: Record<string, unknown>;
}

// ============================================
// USE CASE CLASS
// ============================================
@Injectable()
export class <Action><EntityName>UseCase {
  constructor(
    private readonly <entityNameLower>Repository: I<EntityName>Repository,
    private readonly eventBus: IEventBus,
    // Otros repositorios si needed
  ) {}

  // ----- CREATE -----
  async executeCreate(input: Create<EntityName>UseCaseInput): Promise<Result<<EntityName>DTO, Error>> {
    // 1. Validar input (Zod)
    const validation = validate(create<EntityName>Schema, input);
    if (!validation.ok) {
      return Err(new ValidationError(validation.errors));
    }

    // 2. Verificar reglas de negocio previas (unicidad, límites, etc.)
    const businessCheck = await this.checkBusinessRulesCreate(input);
    if (!businessCheck.ok) {
      return Err(businessCheck.error);
    }

    // 3. Ejecutar en transacción
    return executeInTransaction(async (tx) => {
      // 3.1 Crear entidad de dominio
      const entityResult = <EntityName>.create({
        tenantId: input.tenantId,
        <campo1>: input.<campo1>,
        <campo2>: input.<campo2>,
      });

      if (!entityResult.ok) {
        return Err(entityResult.error);
      }

      const entity = entityResult.value;

      // 3.2 Persistir
      const savedEntity = await this.<entityNameLower>Repository.save(entity, tx);

      // 3.3 Publicar domain events
      await this.publishDomainEvents(savedEntity);

      // 4. Retornar DTO
      return Ok(savedEntity.toDTO());
    });
  }

  // ----- UPDATE -----
  async executeUpdate(input: Update<EntityName>UseCaseInput): Promise<Result<<EntityName>DTO, Error>> {
    // 1. Validar
    const validation = validate(update<EntityName>Schema, input);
    if (!validation.ok) {
      return Err(new ValidationError(validation.errors));
    }

    // 2. Obtener entidad existente
    const existingResult = await this.<entityNameLower>Repository.findById(input.id, input.tenantId);
    if (!existingResult.ok || !existingResult.value) {
      return Err(new NotFoundError(`<EntityName> ${input.id} not found`));
    }

    const entity = existingResult.value;

    // 3. Aplicar cambios (delegar a entidad para invariantes)
    const updateResult = entity.update<Campo>(input.<campo>);
    if (!updateResult.ok) {
      return Err(updateResult.error);
    }

    // 4. Persistir + Events (transacción)
    return executeInTransaction(async (tx) => {
      const saved = await this.<entityNameLower>Repository.save(entity, tx);
      await this.publishDomainEvents(saved);
      return Ok(saved.toDTO());
    });
  }

  // ----- GET BY ID -----
  async executeGet(input: Get<EntityName>UseCaseInput): Promise<Result<<EntityName>DTO, Error>> {
    const result = await this.<entityNameLower>Repository.findById(input.id, input.tenantId);
    if (!result.ok || !result.value) {
      return Err(new NotFoundError(`<EntityName> ${input.id} not found`));
    }
    return Ok(result.value.toDTO());
  }

  // ----- LIST (con paginación/filtros) -----
  async executeList(input: List<EntityName>UseCaseInput): Promise<Result<PaginatedResult<<EntityName>DTO>, Error>> {
    const page = input.page ?? 1;
    const limit = Math.min(input.limit ?? 20, 100);

    const result = await this.<entityNameLower>Repository.findMany({
      tenantId: input.tenantId,
      page,
      limit,
      filters: input.filters,
    });

    if (!result.ok) {
      return Err(result.error);
    }

    return Ok({
      data: result.value.data.map(e => e.toDTO()),
      pagination: {
        page,
        limit,
        total: result.value.total,
        totalPages: Math.ceil(result.value.total / limit),
      },
    });
  }

  // ----- DELETE (Soft delete preferido) -----
  async executeDelete(id: string, tenantId: string): Promise<Result<void, Error>> {
    const existingResult = await this.<entityNameLower>Repository.findById(id, tenantId);
    if (!existingResult.ok || !existingResult.value) {
      return Err(new NotFoundError(`<EntityName> ${id} not found`));
    }

    const entity = existingResult.value;
    entity.desactivar(); // Soft delete

    return executeInTransaction(async (tx) => {
      await this.<entityNameLower>Repository.save(entity, tx);
      await this.publishDomainEvents(entity);
      return Ok(undefined);
    });
  }

  // ----- PRIVATE HELPERS -----
  private async checkBusinessRulesCreate(input: Create<EntityName>UseCaseInput): Promise<Result<void, Error>> {
    // Ejemplos de reglas:
    // - Unicidad: await this.repo.existsByCode(input.code, input.tenantId)
    // - Límites: await this.checkTenantLimits(input.tenantId)
    // - Dependencias: await this.otherRepo.findById(input.refId, input.tenantId)
    
    return Ok(undefined);
  }

  private async publishDomainEvents(entity: <EntityName>): Promise<void> {
    const events = entity.domainEvents;
    for (const event of events) {
      await this.eventBus.publish(event);
    }
    entity.clearDomainEvents();
  }
}

// ============================================
// ERROR TYPES (Domain Errors)
// ============================================
export class ValidationError extends Error {
  constructor(public readonly errors: z.ZodIssue[]) {
    super('Validation failed');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class BusinessRuleError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'BusinessRuleError';
  }
}

export class ConcurrencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConcurrencyError';
  }
}

// ============================================
// PAGINATION TYPES
// ============================================
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}