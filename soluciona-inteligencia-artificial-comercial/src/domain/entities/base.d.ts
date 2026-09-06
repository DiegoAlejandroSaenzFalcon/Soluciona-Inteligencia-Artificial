/**
 * Base Entity - All domain entities extend this
 */
export declare abstract class Entity<T extends {
    id: string | number;
}> {
    readonly props: T;
    protected constructor(props: T);
    get id(): string;
    equals(other: Entity<T>): boolean;
}
/**
 * Value Object base class - immutable, equality by value
 */
export declare abstract class ValueObject<T> {
    readonly value: T;
    protected constructor(value: T);
    equals(other: ValueObject<T>): boolean;
    toString(): string;
}
/**
 * Aggregate Root - Consistency boundary
 */
export declare abstract class AggregateRoot<T extends {
    id: string | number;
}> extends Entity<T> {
    private _domainEvents;
    get domainEvents(): ReadonlyArray<import('../../shared/kernel/events').DomainEvent>;
    protected addDomainEvent(event: import('../../shared/kernel/events').DomainEvent): void;
    clearDomainEvents(): void;
}
//# sourceMappingURL=base.d.ts.map