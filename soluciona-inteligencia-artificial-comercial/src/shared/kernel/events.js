"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventBus = exports.InMemoryEventBus = void 0;
exports.createDomainEvent = createDomainEvent;
class InMemoryEventBus {
    handlers = new Map();
    events = [];
    subscribe(eventType, handler) {
        const handlers = this.handlers.get(eventType) || [];
        handlers.push(handler);
        this.handlers.set(eventType, handlers);
        return () => this.unsubscribe(eventType, handler);
    }
    unsubscribe(eventType, handler) {
        const handlers = this.handlers.get(eventType);
        if (!handlers)
            return;
        const index = handlers.indexOf(handler);
        if (index !== -1)
            handlers.splice(index, 1);
    }
    async publish(event) {
        this.events.push(event);
        const handlers = this.handlers.get(event.eventType) || [];
        await Promise.all(handlers.map((h) => h(event)));
    }
    async append(event) {
        this.events.push(event);
    }
    async getByAggregateId(aggregateId) {
        return this.events.filter((e) => e.aggregateId === aggregateId);
    }
    async getByTenantId(tenantId) {
        return this.events.filter((e) => e.tenantId === tenantId);
    }
}
exports.InMemoryEventBus = InMemoryEventBus;
function createDomainEvent(eventType, aggregateId, tenantId, payload, metadata = {}, version = 1) {
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
exports.eventBus = new InMemoryEventBus();
//# sourceMappingURL=events.js.map