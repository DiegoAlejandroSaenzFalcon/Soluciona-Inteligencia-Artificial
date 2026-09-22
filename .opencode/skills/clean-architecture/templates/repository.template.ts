/**
 * Repository Interface Template - Clean Architecture Domain Layer
 * Ubicación: src/domain/repositories/<entity-name>.repository.ts
 * 
 * Reglas:
 * - SOLO define la INTERFACE (Port)
 * - NO implementación (eso va en infrastructure)
 * - Métodos retornan Result<T, Error>
 * - Incluye tenantId en TODOS los métodos (multi-tenancy)
 * - Naming: findById, findMany, save, delete, existsBy...
 */

import { Result } from '@shared/kernel/result';
import { <EntityName> } from '../entities/<entity-name>';
import { <EntityName>DTO } from '../../application/use-cases/<feature>/dto/<entity-name>.dto';

// ============================================
// QUERY INPUT TYPES
// ============================================
export interface FindManyOptions {
  tenantId: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
}

export interface FindManyResult {
  data: <EntityName>[];
  total: number;
}

// ============================================
// REPOSITORY INTERFACE (PORT)
// ============================================
export interface I<EntityName>Repository {
  // ----- BASIC CRUD -----
  
  /**
   * Buscar por ID dentro del tenant
   * @returns Entity o null si no existe
   */
  findById(id: string, tenantId: string): Promise<Result<<EntityName> | null, Error>>;

  /**
   * Buscar múltiples con paginación y filtros
   */
  findMany(options: FindManyOptions): Promise<Result<FindManyResult, Error>>;

  /**
   * Guardar (create o update - upsert)
   * @returns Entidad guardada con ID generado si era nuevo
   */
  save(entity: <EntityName>, tx?: Transaction): Promise<Result<<EntityName>, Error>>;

  /**
   * Eliminar (hard delete - usar con cuidado, preferir soft delete en entidad)
   */
  delete(id: string, tenantId: string): Promise<Result<void, Error>>;

  // ----- EXISTENCE CHECKS -----
  
  /**
   * Verificar existencia por campo único
   */
  existsByCode(code: string, tenantId: string): Promise<Result<boolean, Error>>;
  
  existsByEmail(email: string, tenantId: string): Promise<Result<boolean, Error>>;
  // ... otros campos únicos

  // ----- DOMAIN-SPECIFIC QUERIES -----
  
  /**
   * Buscar por criterios de negocio específicos
   * Ejemplos según la entidad:
   */
  
  // Para Products
  findLowStock(tenantId: string, threshold?: number): Promise<Result<<EntityName>[], Error>>;
  findByCategory(categoryId: string, tenantId: string): Promise<Result<<EntityName>[], Error>>;
  findActive(tenantId: string): Promise<Result<<EntityName>[], Error>>;

  // Para Orders
  findByStatus(status: OrderStatus, tenantId: string): Promise<Result<<EntityName>[], Error>>;
  findByDateRange(from: Date, to: Date, tenantId: string): Promise<Result<<EntityName>[], Error>>;
  findByCustomer(customerId: string, tenantId: string): Promise<Result<<EntityName>[], Error>>;

  // Para Inventory
  findExpiringLots(tenantId: string, days: number): Promise<Result<InventoryLot[], Error>>;
  findByProductAndWarehouse(productId: string, warehouse: string, tenantId: string): Promise<Result<Stock | null, Error>>;

  // ----- AGGREGATION / REPORTING -----
  
  countByStatus(tenantId: string): Promise<Result<Record<string, number>, Error>>;
  sumAmountByPeriod(from: Date, to: Date, tenantId: string): Promise<Result<number, Error>>;

  // ----- BULK OPERATIONS -----
  
  saveMany(entities: <EntityName>[], tx?: Transaction): Promise<Result<<EntityName>[], Error>>;
  deleteMany(ids: string[], tenantId: string): Promise<Result<void, Error>>;
}

// ============================================
// TRANSACTION TYPE (para infrastructure)
// ============================================
export interface Transaction {
  // Métodos necesarios para transacciones
  query<T>(sql: string, params?: unknown[]): Promise<Result<T[], Error>>;
  execute(sql: string, params?: unknown[]): Promise<Result<void, Error>>;
}

// ============================================
// FACTORY TOKEN (para DI)
// ============================================
export const I<EntityName>RepositoryToken = Symbol('I<EntityName>Repository');