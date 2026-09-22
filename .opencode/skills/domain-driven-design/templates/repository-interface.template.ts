/**
 * Repository Interface Template - DDD
 * Ubicación: src/domain/repositories/<entity-name>.repository.ts
 * 
 * Reglas:
 * - Interface PURA (Port) - NO implementación
 * - Define contrato para persistence ignorance
 * - Métodos expresan intención de dominio (no SQL)
 * - Incluye tenantId en TODOS los métodos
 * - Retorna Result<T, Error> para manejo explícito de errores
 * - Naming: findById, findBy<Criteria>, save, delete, exists...
 * - Queries complejas via Specification Pattern o Query Objects
 */

import { Result } from '@shared/kernel/result';
import { <EntityName> } from '../entities/<entity-name>';
import { <AggregateName> } from '../aggregates/<aggregate-name>';
import { <ValueObject> } from '../value-objects/<vo-name>';

// ============================================
// QUERY OBJECTS (Para queries complejas tipadas)
// ============================================

export interface Find<EntityName>Options {
  tenantId: string;
  page?: number;
  limit?: number;
  sortBy?: keyof <EntityName>;
  sortOrder?: 'asc' | 'desc';
  filters?: <EntityName>Filters;
}

export interface <EntityName>Filters {
  // Filtros tipados según entidad
  <campo1>?: <Tipo>;
  <campo2>?: <Tipo>;
  estado?: <EstadoEnum>;
  fechaDesde?: Date;
  fechaHasta?: Date;
  // Rangos
  <campoNumerico>Min?: number;
  <campoNumerico>Max?: number;
  // Arrays para IN
  ids?: string[];
  categorias?: string[];
}

export interface Find<EntityName>Result {
  data: <EntityName>[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Specification Pattern (opcional para queries muy complejas)
export interface <EntityName>Specification {
  isSatisfiedBy(entity: <EntityName>): boolean;
  toSQL(): { where: string; params: unknown[] };
}

// ============================================
// REPOSITORY INTERFACE (PORT)
// ============================================

export interface I<EntityName>Repository {
  // ----- BASIC CRUD -----
  
  /**
   * Buscar entidad por ID dentro del tenant
   * @returns Entity o null si no existe
   */
  findById(id: string, tenantId: string): Promise<Result<<EntityName> | null, Error>>;

  /**
   * Buscar múltiples entidades con paginación, orden y filtros
   */
  findMany(options: Find<EntityName>Options): Promise<Result<Find<EntityName>Result, Error>>;

  /**
   * Guardar entidad (create o update - upsert)
   * @returns Entidad guardada con timestamps actualizados
   */
  save(entity: <EntityName>, transaction?: Transaction): Promise<Result<<EntityName>, Error>>;

  /**
   * Guardar múltiples entidades en lote (bulk)
   */
  saveMany(entities: <EntityName>[], transaction?: Transaction): Promise<Result<<EntityName>[], Error>>;

  /**
   * Eliminar entidad (hard delete - preferir soft delete en entidad)
   */
  delete(id: string, tenantId: string, transaction?: Transaction): Promise<Result<void, Error>>;

  /**
   * Eliminar múltiples entidades
   */
  deleteMany(ids: string[], tenantId: string, transaction?: Transaction): Promise<Result<void, Error>>;

  // ----- EXISTENCE CHECKS -----
  
  existsById(id: string, tenantId: string): Promise<Result<boolean, Error>>;
  existsByCode(code: string, tenantId: string): Promise<Result<boolean, Error>>;
  existsByEmail(email: string, tenantId: string): Promise<Result<boolean, Error>>;
  // ... otros campos únicos

  // ----- DOMAIN-SPECIFIC QUERIES (Intención de negocio) -----
  
  // Estados
  findByStatus(status: <StatusEnum>, tenantId: string): Promise<Result<<EntityName>[], Error>>;
  findActive(tenantId: string): Promise<Result<<EntityName>[], Error>>;
  findInactive(tenantId: string): Promise<Result<<EntityName>[], Error>>;

  // Relaciones
  findBy<RelatedEntity>(relatedId: string, tenantId: string): Promise<Result<<EntityName>[], Error>>;
  findByCategory(categoryId: string, tenantId: string): Promise<Result<<EntityName>[], Error>>;
  findByCustomer(customerId: string, tenantId: string): Promise<Result<<EntityName>[], Error>>;
  findBySupplier(supplierId: string, tenantId: string): Promise<Result<<EntityName>[], Error>>;

  // Rangos temporales
  findByDateRange(from: Date, to: Date, tenantId: string): Promise<Result<<EntityName>[], Error>>;
  findCreatedAfter(date: Date, tenantId: string): Promise<Result<<EntityName>[], Error>>;

  // Búsquedas específicas del dominio
  findLowStock(tenantId: string, threshold?: number): Promise<Result<<EntityName>[], Error>>;
  findExpiringSoon(tenantId: string, days: number): Promise<Result<<EntityName>[], Error>>;
  findByCondition(condition: <ValueObject>, tenantId: string): Promise<Result<<EntityName>[], Error>>;

  // Full-text search
  search(query: string, tenantId: string, limit?: number): Promise<Result<<EntityName>[], Error>>;

  // ----- AGGREGATE ROOT PERSISTENCE -----
  
  /**
   * Guardar Aggregate Root completo (con entidades hijas)
   */
  saveAggregate(aggregate: <AggregateName>, transaction?: Transaction): Promise<Result<<AggregateName>, Error>>;

  /**
   * Reconstruir Aggregate Root completo
   */
  findAggregateById(id: string, tenantId: string): Promise<Result<<AggregateName> | null, Error>>;

  // ----- AGGREGATION / REPORTING -----
  
  countBy<GroupField>(tenantId: string): Promise<Result<Record<string, number>, Error>>;
  sum<NumericField>(tenantId: string, filters?: <EntityName>Filters): Promise<Result<number, Error>>;
  avg<NumericField>(tenantId: string, filters?: <EntityName>Filters): Promise<Result<number, Error>>;

  // Estadísticas
  getStats(tenantId: string): Promise<Result<<EntityName>Stats, Error>>;

  // ----- BULK OPERATIONS -----
  
  bulkUpdate(updates: { id: string; data: Partial<<EntityName>> }[], tenantId: string, transaction?: Transaction): Promise<Result<void, Error>>;
  bulkStatusChange(ids: string[], newStatus: <StatusEnum>, tenantId: string, transaction?: Transaction): Promise<Result<void, Error>>;
}

// ============================================
// TRANSACTION INTERFACE
// ============================================

export interface Transaction {
  // Métodos mínimos para transacciones
  query<T>(sql: string, params?: unknown[]): Promise<Result<T[], Error>>;
  execute(sql: string, params?: unknown[]): Promise<Result<void, Error>>;
  
  // Para repositorios que necesitan acceso directo
  getClient(): unknown; // pg.Client, etc.
}

// ============================================
// FACTORY TOKENS (Para Dependency Injection)
// ============================================

export const I<EntityName>RepositoryToken = Symbol('I<EntityName>Repository');

// ============================================
// STATS TYPES (Para reporting)
// ============================================

export interface <EntityName>Stats {
  total: number;
  active: number;
  inactive: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  recentCount: number; // últimos 30 días
  // Métricas específicas
  <metricaEspecifica1>: number;
  <metricaEspecifica2>: number;
}

// ============================================
// EXAMPLE: OrderRepository (Real)
// ============================================
/*
export interface IOrderRepository {
  // Basic
  findById(id: string, tenantId: string): Promise<Result<Order | null, Error>>;
  findMany(options: FindOrdersOptions): Promise<Result<FindOrdersResult, Error>>;
  save(order: Order, tx?: Transaction): Promise<Result<Order, Error>>;
  delete(id: string, tenantId: string, tx?: Transaction): Promise<Result<void, Error>>;

  // Existence
  existsByNumero(numero: number, tenantId: string): Promise<Result<boolean, Error>>;

  // Domain-specific
  findByStatus(status: OrderStatus, tenantId: string): Promise<Result<Order[], Error>>;
  findByCustomer(customerId: string, tenantId: string): Promise<Result<Order[], Error>>;
  findByDateRange(from: Date, to: Date, tenantId: string): Promise<Result<Order[], Error>>;
  findByDeliveryZone(zoneId: string, tenantId: string): Promise<Result<Order[], Error>>;
  findPendingDelivery(tenantId: string): Promise<Result<Order[], Error>>;
  findByPaymentStatus(status: PaymentStatus, tenantId: string): Promise<Result<Order[], Error>>;

  // Aggregations
  countByStatus(tenantId: string): Promise<Result<Record<OrderStatus, number>, Error>>;
  sumTotalByPeriod(from: Date, to: Date, tenantId: string): Promise<Result<number, Error>>;
  getDailyStats(tenantId: string, date: Date): Promise<Result<OrderDailyStats, Error>>;

  // Aggregate
  saveAggregate(order: Order, tx?: Transaction): Promise<Result<Order, Error>>;
  findAggregateById(id: string, tenantId: string): Promise<Result<Order | null, Error>>;

  // Bulk
  bulkStatusChange(ids: string[], status: OrderStatus, tenantId: string, tx?: Transaction): Promise<Result<void, Error>>;
}

export interface FindOrdersOptions {
  tenantId: string;
  page?: number;
  limit?: number;
  sortBy?: 'fecha' | 'numero' | 'total' | 'estado';
  sortOrder?: 'asc' | 'desc';
  filters?: OrderFilters;
}

export interface OrderFilters {
  estado?: OrderStatus;
  tipo?: OrderType;
  estadoPago?: PaymentStatus;
  clienteId?: string;
  zonaEntregaId?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
  totalMin?: number;
  totalMax?: number;
  ids?: string[];
}

export interface FindOrdersResult {
  data: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OrderDailyStats {
  fecha: Date;
  totalPedidos: number;
  totalVentas: number;
  ticketPromedio: number;
  porEstado: Record<OrderStatus, number>;
  porTipo: Record<OrderType, number>;
}
*/