/**
 * Domain Event Template - DDD
 * Ubicación: src/domain/events/<aggregate-name>.events.ts
 * 
 * Reglas:
 * - Eventos son inmutables y serializables
 * - Nombrados en pasado: <Aggregate><Action>Occurred
 * - Payload mínimo necesario (no entidad completa)
 * - Incluyen metadata: correlationId, causationId, userId
 * - Versionados (v1, v2...)
 */

import { DomainEvent, createDomainEvent } from '../../shared/kernel/events';

// ============================================
// EVENT TYPES (Discriminated Union)
// ============================================
export type <AggregateName>DomainEvent =
  | <AggregateName>CreatedEvent
  | <AggregateName>UpdatedEvent
  | <AggregateName>DeletedEvent
  | <AggregateName>ActivatedEvent
  | <AggregateName>DeactivatedEvent
  | <AggregateName><SpecificAction>Event;

// ============================================
// BASE EVENT INTERFACE
// ============================================
interface Base<AggregateName>Event extends DomainEvent {
  eventType: string;
  aggregateId: string;
  tenantId: string;
  version: number;
  occurredAt: Date;
  metadata: {
    correlationId?: string;
    causationId?: string;
    userId?: string;
    ip?: string;
    userAgent?: string;
  };
}

// ============================================
// CONCRETE EVENTS
// ============================================

// --- Created ---
export interface <AggregateName>CreatedEvent extends Base<AggregateName>Event {
  eventType: '<AggregateName>Created';
  payload: {
    <campoClave1>: <Tipo>;
    <campoClave2>: <Tipo>;
    // Solo campos esenciales para identificación
  };
}

// --- Updated ---
export interface <AggregateName>UpdatedEvent extends Base<AggregateName>Event {
  eventType: '<AggregateName>Updated';
  payload: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  };
}

// --- Deleted (Soft) ---
export interface <AggregateName>DeletedEvent extends Base<AggregateName>Event {
  eventType: '<AggregateName>Deleted';
  payload: {
    deletedBy: string;
    reason?: string;
  };
}

// --- Activated/Deactivated ---
export interface <AggregateName>ActivatedEvent extends Base<AggregateName>Event {
  eventType: '<AggregateName>Activated';
  payload: { activatedBy: string };
}

export interface <AggregateName>DeactivatedEvent extends Base<AggregateName>Event {
  eventType: '<AggregateName>Deactivated';
  payload: { deactivatedBy: string; reason?: string };
}

// --- Domain-Specific Events ---
export interface <AggregateName><SpecificAction>Event extends Base<AggregateName>Event {
  eventType: '<AggregateName><SpecificAction>';
  payload: {
    <campoEspecifico1>: <Tipo>;
    <campoEspecifico2>: <Tipo>;
    // Datos relevantes para la acción
  };
}

// ============================================
// EVENT FACTORIES (Para usar en Aggregates)
// ============================================

export function create<AggregateName>CreatedEvent(
  aggregateId: string,
  tenantId: string,
  payload: <AggregateName>CreatedEvent['payload'],
  metadata: Base<AggregateName>Event['metadata'] = {}
): <AggregateName>CreatedEvent {
  return createDomainEvent(
    '<AggregateName>Created',
    aggregateId,
    tenantId,
    payload,
    metadata,
    1
  ) as <AggregateName>CreatedEvent;
}

export function create<AggregateName>UpdatedEvent(
  aggregateId: string,
  tenantId: string,
  field: string,
  oldValue: unknown,
  newValue: unknown,
  metadata: Base<AggregateName>Event['metadata'] = {}
): <AggregateName>UpdatedEvent {
  return createDomainEvent(
    '<AggregateName>Updated',
    aggregateId,
    tenantId,
    { field, oldValue, newValue },
    metadata,
    1
  ) as <AggregateName>UpdatedEvent;
}

export function create<AggregateName><SpecificAction>Event(
  aggregateId: string,
  tenantId: string,
  payload: <AggregateName><SpecificAction>Event['payload'],
  metadata: Base<AggregateName>Event['metadata'] = {}
): <AggregateName><SpecificAction>Event {
  return createDomainEvent(
    '<AggregateName><SpecificAction>',
    aggregateId,
    tenantId,
    payload,
    metadata,
    1
  ) as <AggregateName><SpecificAction>Event;
}

// ============================================
// EVENT HANDLERS TYPES (Para Application Layer)
// ============================================
export interface I<AggregateName>EventHandler {
  handle(event: <AggregateName>DomainEvent): Promise<void>;
}

// ============================================
// EXAMPLE: Order Events (Real)
// ============================================
/*
export type OrderDomainEvent =
  | OrderCreatedEvent
  | OrderStatusChangedEvent
  | OrderPaymentStatusChangedEvent
  | OrderInvoiceEmittedEvent
  | OrderCancelledEvent
  | OrderItemAddedEvent
  | OrderItemRemovedEvent;

export interface OrderCreatedEvent extends DomainEvent {
  eventType: 'OrderCreated';
  payload: {
    orderId: string;
    numero: number;
    total: number;
    tipo: OrderType;
    clienteId: string;
  };
}

export interface OrderStatusChangedEvent extends DomainEvent {
  eventType: 'OrderStatusChanged';
  payload: {
    orderId: string;
    oldEstado: OrderStatus;
    nuevoEstado: OrderStatus;
  };
}

export interface OrderPaymentStatusChangedEvent extends DomainEvent {
  eventType: 'OrderPaymentStatusChanged';
  payload: {
    orderId: string;
    nuevoEstado: PaymentStatus;
    monto: number;
  };
}

// Factory functions
export function createOrderCreatedEvent(
  orderId: string,
  tenantId: string,
  payload: OrderCreatedEvent['payload'],
  metadata?: DomainEvent['metadata']
): OrderCreatedEvent {
  return createDomainEvent('OrderCreated', orderId, tenantId, payload, metadata, 1) as OrderCreatedEvent;
}
*/