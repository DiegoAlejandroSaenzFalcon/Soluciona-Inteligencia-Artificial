"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AggregateRoot = exports.ValueObject = exports.Entity = void 0;
/**
 * Base Entity - All domain entities extend this
 */
class Entity {
    props;
    constructor(props) {
        this.props = props;
    }
    get id() {
        return String(this.props.id);
    }
    equals(other) {
        if (!(other instanceof Entity))
            return false;
        return this.id === other.id;
    }
}
exports.Entity = Entity;
/**
 * Value Object base class - immutable, equality by value
 */
class ValueObject {
    value;
    constructor(value) {
        this.value = value;
    }
    equals(other) {
        if (!(other instanceof this.constructor))
            return false;
        return JSON.stringify(this.value) === JSON.stringify(other.value);
    }
    toString() {
        return JSON.stringify(this.value);
    }
}
exports.ValueObject = ValueObject;
/**
 * Aggregate Root - Consistency boundary
 */
class AggregateRoot extends Entity {
    _domainEvents = [];
    get domainEvents() {
        return this._domainEvents;
    }
    addDomainEvent(event) {
        this._domainEvents.push(event);
    }
    clearDomainEvents() {
        this._domainEvents = [];
    }
}
exports.AggregateRoot = AggregateRoot;
//# sourceMappingURL=base.js.map