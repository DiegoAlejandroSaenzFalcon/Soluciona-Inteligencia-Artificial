/**
 * Domain Events System - Event-driven architecture foundation
 */
export interface DomainEvent<T = unknown> {
  readonly eventId: string;
  readonly eventType: string;
  readonly aggregateId: string;
  readonly tenantId: string;
  readonly payload: T;
  readonly metadata: Record<string, unknown>;
  readonly occurredAt: Date;
  readonly version: number;
}

export type EventHandler<E extends DomainEvent = DomainEvent> = (event: E) => Promise<void> | void;

export interface EventStore {
  append(event: DomainEvent): Promise<void>;
  getByAggregateId(aggregateId: string): Promise<DomainEvent[]>;
  getByTenantId(tenantId: string): Promise<DomainEvent[]>;
}

export class InMemoryEventBus implements EventStore {
  private handlers: Map<string, EventHandler[]> = new Map();
  private events: DomainEvent[] = [];

  subscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): () => void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler as EventHandler);
    this.handlers.set(eventType, handlers);
    return () => this.unsubscribe(eventType, handler);
  }

  unsubscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(eventType);
    if (!handlers) return;
    const index = handlers.indexOf(handler as EventHandler);
    if (index !== -1) handlers.splice(index, 1);
  }

  async publish<T extends DomainEvent>(event: T): Promise<void> {
    this.events.push(event);
    const handlers = this.handlers.get(event.eventType) || [];
    await Promise.all(handlers.map((h) => h(event)));
  }

  async append(event: DomainEvent): Promise<void> {
    this.events.push(event);
  }

  async getByAggregateId(aggregateId: string): Promise<DomainEvent[]> {
    return this.events.filter((e) => e.aggregateId === aggregateId);
  }

  async getByTenantId(tenantId: string): Promise<DomainEvent[]> {
    return this.events.filter((e) => e.tenantId === tenantId);
  }
}

export function createDomainEvent<T>(
  eventType: string,
  aggregateId: string,
  tenantId: string,
  payload: T,
  metadata: Record<string, unknown> = {},
  version = 1
): DomainEvent<T> {
  return {
    eventId: crypto.randomUUID(),
    eventType,
    aggregateId,
    tenantId,
    payload,
    metadata,
    occurredAt: new Date(),
    version,
  };
}

export const eventBus = new InMemoryEventBus();