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
export declare class InMemoryEventBus implements EventStore {
    private handlers;
    private events;
    subscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): () => void;
    unsubscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void;
    publish<T extends DomainEvent>(event: T): Promise<void>;
    append(event: DomainEvent): Promise<void>;
    getByAggregateId(aggregateId: string): Promise<DomainEvent[]>;
    getByTenantId(tenantId: string): Promise<DomainEvent[]>;
}
export declare function createDomainEvent<T>(eventType: string, aggregateId: string, tenantId: string, payload: T, metadata?: Record<string, unknown>, version?: number): DomainEvent<T>;
export declare const eventBus: InMemoryEventBus;
//# sourceMappingURL=events.d.ts.map