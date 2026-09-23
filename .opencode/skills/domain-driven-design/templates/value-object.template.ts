/**
 * Value Object Template - DDD
 * Ubicación: src/domain/value-objects/<vo-name>.ts
 * 
 * Reglas:
 * - Inmutable (readonly properties)
 * - Igualdad por valor (structural equality)
 * - Auto-validación en constructor
 * - Sin identidad (no ID)
 * - Métodos de fábrica estáticos para creación
 * - Serialización JSON controlada
 */

// ============================================
// TIPOS BASE
// ============================================
type Primitive = string | number | boolean | Date;

// ============================================
// VALUE OBJECT BASE CLASS
// ============================================
abstract class ValueObject<T extends Primitive | Primitive[]> {
  protected constructor(protected readonly value: T) {
    Object.freeze(this);
  }

  equals(other: ValueObject<T>): boolean {
    if (!(other instanceof this.constructor)) return false;
    return this.valueEqual(this.value, other.value);
  }

  protected valueEqual(a: T, b: T): boolean {
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.length === b.length && a.every((v, i) => this.valueEqual(v, b[i]));
    }
    return a === b;
  }

  toString(): string {
    return JSON.stringify(this.value);
  }

  toJSON(): T {
    return this.value;
  }

  protected static validateString(value: string, fieldName: string, rules?: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    allowedValues?: string[];
  }): void {
    if (!value || value.trim().length === 0) {
      throw new Error(`${fieldName} cannot be empty`);
    }
    if (rules?.minLength && value.length < rules.minLength) {
      throw new Error(`${fieldName} must be at least ${rules.minLength} characters`);
    }
    if (rules?.maxLength && value.length > rules.maxLength) {
      throw new Error(`${fieldName} must be at most ${rules.maxLength} characters`);
    }
    if (rules?.pattern && !rules.pattern.test(value)) {
      throw new Error(`${fieldName} has invalid format`);
    }
    if (rules?.allowedValues && !rules.allowedValues.includes(value)) {
      throw new Error(`${fieldName} must be one of: ${rules.allowedValues.join(', ')}`);
    }
  }

  protected static validateNumber(value: number, fieldName: string, rules?: {
    min?: number;
    max?: number;
    integer?: boolean;
    positive?: boolean;
  }): void {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new Error(`${fieldName} must be a valid number`);
    }
    if (rules?.integer && !Number.isInteger(value)) {
      throw new Error(`${fieldName} must be an integer`);
    }
    if (rules?.positive && value <= 0) {
      throw new Error(`${fieldName} must be positive`);
    }
    if (rules?.min !== undefined && value < rules.min) {
      throw new Error(`${fieldName} must be at least ${rules.min}`);
    }
    if (rules?.max !== undefined && value > rules.max) {
      throw new Error(`${fieldName} must be at most ${rules.max}`);
    }
  }
}

// ============================================
// EXAMPLE: Money Value Object
// ============================================
export class Money extends ValueObject<number> {
  private constructor(
    readonly amount: number,
    readonly currency: string
  ) {
    super(amount);
    Money.validateCurrency(currency);
  }

  static create(amount: number, currency = 'COP'): Money {
    return new Money(Math.round(amount), currency.toUpperCase());
  }

  static fromDecimal(decimal: number, currency = 'COP'): Money {
    return new Money(Math.round(decimal * 100), currency.toUpperCase());
  }

  static zero(currency = 'COP'): Money {
    return new Money(0, currency.toUpperCase());
  }

  private static validateCurrency(currency: string): void {
    const valid = ['COP', 'USD', 'EUR', 'MXN', 'PEN', 'ARS', 'CLP'];
    if (!valid.includes(currency)) {
      throw new Error(`Invalid currency: ${currency}. Must be one of: ${valid.join(', ')}`);
    }
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.create(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.create(this.amount - other.amount, this.currency);
  }

  multiply(factor: number): Money {
    if (!Number.isInteger(factor) && factor % 1 !== 0) {
      throw new Error('Multiplication factor must not lose precision');
    }
    return Money.create(this.amount * factor, this.currency);
  }

  divide(divisor: number): Money {
    if (divisor === 0) throw new Error('Cannot divide by zero');
    return Money.create(Math.round(this.amount / divisor), this.currency);
  }

  isZero(): boolean { return this.amount === 0; }
  isPositive(): boolean { return this.amount > 0; }
  isNegative(): boolean { return this.amount < 0; }
  greaterThan(other: Money): boolean { this.assertSameCurrency(other); return this.amount > other.amount; }
  lessThan(other: Money): boolean { this.assertSameCurrency(other); return this.amount < other.amount; }

  toDecimal(): number { return this.amount / 100; }
  toString(): string { return `${this.toDecimal().toLocaleString('es-CO', { minimumFractionDigits: 2 })} ${this.currency}`; }
  toJSON(): { amount: number; currency: string } { return { amount: this.toDecimal(), currency: this.currency }; }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
  }
}

// ============================================
// EXAMPLE: Email Value Object
// ============================================
export class Email extends ValueObject<string> {
  private constructor(readonly value: string) {
    super(value.toLowerCase().trim());
  }

  static create(email: string): Email {
    const normalized = email.toLowerCase().trim();
    if (!Email.isValid(normalized)) {
      throw new Error(`Invalid email format: ${email}`);
    }
    return new Email(normalized);
  }

  static isValid(email: string): boolean {
    const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    return regex.test(email) && email.length <= 254;
  }

  get domain(): string { return this.value.split('@')[1]; }
  get localPart(): string { return this.value.split('@')[0]; }
  toJSON(): string { return this.value; }
}

// ============================================
// EXAMPLE: LotNumber Value Object (Domain-specific)
// ============================================
export class LotNumber extends ValueObject<string> {
  private constructor(readonly value: string) {
    super(value.toUpperCase().trim());
  }

  static create(lotNumber: string): LotNumber {
    const normalized = lotNumber.toUpperCase().trim();
    if (!LotNumber.isValid(normalized)) {
      throw new Error(`Invalid lot number format: ${lotNumber}. Expected: alphanumeric, hyphens, 3-50 chars`);
    }
    return new LotNumber(normalized);
  }

  static isValid(lotNumber: string): boolean {
    return /^[A-Z0-9\-]{3,50}$/.test(lotNumber);
  }

  static generate(prefix = 'LOT'): LotNumber {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return new LotNumber(`${prefix}-${datePart}-${randomPart}`);
  }

  toJSON(): string { return this.value; }
}

// ============================================
// EXAMPLE: ExpiryDate Value Object
// ============================================
export class ExpiryDate extends ValueObject<Date> {
  private constructor(readonly value: Date) {
    super(value);
  }

  static create(date: string | Date): ExpiryDate {
    const parsed = typeof date === 'string' ? new Date(date) : date;
    
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Invalid date: ${date}`);
    }

    const normalized = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    
    if (normalized.getDate() !== parsed.getDate() || 
        normalized.getMonth() !== parsed.getMonth() || 
        normalized.getFullYear() !== parsed.getFullYear()) {
      throw new Error(`Invalid date: ${date} (day/month mismatch)`);
    }

    return new ExpiryDate(normalized);
  }

  static today(): ExpiryDate {
    return new ExpiryDate(new Date());
  }

  static daysFromNow(days: number): ExpiryDate {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return new ExpiryDate(date);
  }

  isExpired(reference = new Date()): boolean {
    const ref = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
    return this.value < ref;
  }

  daysUntilExpiry(reference = new Date()): number {
    const ref = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
    const diff = this.value.getTime() - ref.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  isExpiringSoon(daysThreshold = 7, reference = new Date()): boolean {
    return this.daysUntilExpiry(reference) <= daysThreshold && !this.isExpired(reference);
  }

  toISOString(): string { return this.value.toISOString().split('T')[0]; }
  toJSON(): string { return this.toISOString(); }
}

// ============================================
// EXAMPLE: StorageCondition Value Object (Enum-like)
// ============================================
export class StorageCondition extends ValueObject<string> {
  static readonly AMBIENTE = new StorageCondition('ambiente');
  static readonly REFRIGERADO = new StorageCondition('refrigerado');
  static readonly CONGELADO = new StorageCondition('congelado');
  static readonly SECO = new StorageCondition('seco');

  private static readonly VALUES = ['ambiente', 'refrigerado', 'congelado', 'seco'] as const;
  private constructor(readonly value: string) {
    super(value);
    if (!StorageCondition.VALUES.includes(value as any)) {
      throw new Error(`Invalid storage condition: ${value}. Must be one of: ${StorageCondition.VALUES.join(', ')}`);
    }
  }

  static create(value: string): StorageCondition {
    return new StorageCondition(value.toLowerCase());
  }

  static fromString(value: string): StorageCondition {
    return StorageCondition.create(value);
  }

  requiresColdChain(): boolean {
    return this.value === 'refrigerado' || this.value === 'congelado';
  }

  get maxTemperatureCelsius(): number {
    switch (this.value) {
      case 'congelado': return -18;
      case 'refrigerado': return 4;
      case 'seco': return 25;
      default: return 30;
    }
  }

  toJSON(): string { return this.value; }
}

// ============================================
// TEMPLATE PARA NUEVOS VALUE OBJECTS
// ============================================
/*
export class <ValueObjectName> extends ValueObject<<PrimitiveType>> {
  private constructor(readonly value: <PrimitiveType>) {
    super(value);
    <ValueObjectName>.validate(value);
  }

  static create(value: <PrimitiveType>): <ValueObjectName> {
    return new <ValueObjectName>(value);
  }

  private static validate(value: <PrimitiveType>): void {
    if (<condiciónInválida>) {
      throw new Error(`Invalid <ValueObjectName>: ${value}`);
    }
  }

  <metodoNegocio>(): <TipoRetorno> {
    return <resultado>;
  }

  toJSON(): <PrimitiveType> { return this.value; }
}
*/