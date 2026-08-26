/**
 * Base Entity - All domain entities extend this
 */
export abstract class Entity<T extends { id: string | number }> {
  protected constructor(public readonly props: T) {}

  get id(): string | number {
    return this.props.id;
  }

  equals(other: Entity<T>): boolean {
    if (!(other instanceof Entity)) return false;
    return this.id === other.id;
  }
}

/**
 * Value Object base class - immutable, equality by value
 */
export abstract class ValueObject<T> {
  protected constructor(public readonly value: T) {}

  equals(other: ValueObject<T>): boolean {
    if (!(other instanceof this.constructor)) return false;
    return JSON.stringify(this.value) === JSON.stringify(other.value);
  }

  toString(): string {
    return JSON.stringify(this.value);
  }
}

/**
 * Aggregate Root - Consistency boundary
 */
export abstract class AggregateRoot<T extends { id: string }> extends Entity<T> {
  private _domainEvents: import('../../shared/kernel/events').DomainEvent[] = [];

  get domainEvents(): ReadonlyArray<import('../../shared/kernel/events').DomainEvent> {
    return this._domainEvents;
  }

  protected addDomainEvent(event: import('../../shared/kernel/events').DomainEvent): void {
    this._domainEvents.push(event);
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }
}