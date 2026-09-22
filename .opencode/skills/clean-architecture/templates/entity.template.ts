/**
 * Entity Template - Clean Architecture Domain Layer
 * Ubicación: src/domain/entities/<entity-name>.ts
 * 
 * Reglas:
 * - NO imports de infrastructure, interfaces, frameworks
 * - Solo imports de: domain (entities, VOs, events), shared (kernel)
 * - Extiende AggregateRoot o Entity base
 * - Invariantes de negocio en métodos, no en setters
 * - Emite Domain Events para cambios de estado importantes
 */

import { AggregateRoot } from '../base';
import { createDomainEvent } from '../../shared/kernel/events';
import { Result, Ok, Err } from '../../shared/kernel/result';
import { <ValueObject1>, <ValueObject2> } from './value-objects/<vo-name>'; // Si aplica

// ============================================
// PROPS INTERFACE (Estado de la entidad)
// ============================================
export interface <EntityName>Props {
  id: string;
  tenantId: string;           // OBLIGATORIO - Multi-tenancy
  <campo1>: <Tipo>;
  <campo2>: <Tipo>;
  // ... campos de negocio
  creadoAt: Date;
  actualizadoAt: Date;
}

// ============================================
// INPUT TYPES (Para creación/actualización)
// ============================================
export interface Create<EntityName>Input {
  tenantId: string;
  <campo1>: <Tipo>;
  <campo2>: <Tipo>;
  // ... campos requeridos para creación
}

export interface Update<EntityName>Input {
  <campoOpcional1>?: <Tipo>;
  <campoOpcional2>?: <Tipo>;
  // ... campos opcionales para actualización
}

// ============================================
// ENTITY CLASS
// ============================================
export class <EntityName> extends AggregateRoot<<EntityName>Props> {
  private constructor(props: <EntityName>Props) {
    super(props);
  }

  // ----- FACTORY: CREATE -----
  static create(input: Create<EntityName>Input): Result<<EntityName>, Error> {
    // 1. Validar invariantes de negocio
    const validationError = <EntityName>.validateCreate(input);
    if (validationError) {
      return Err(validationError);
    }

    // 2. Crear instancia
    const now = new Date();
    const entity = new <EntityName>({
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      <campo1>: input.<campo1>,
      <campo2>: input.<campo2>,
      // ... mapear campos
      creadoAt: now,
      actualizadoAt: now,
    });

    // 3. Emitir Domain Event
    entity.addDomainEvent(
      createDomainEvent(
        '<EntityName>Created',
        entity.id,
        entity.props.tenantId,
        {
          <campoClave1>: entity.props.<campoClave1>,
          <campoClave2>: entity.props.<campoClave2>,
        }
      )
    );

    return Ok(entity);
  }

  // Validación pura (sin side effects)
  private static validateCreate(input: Create<EntityName>Input): Error | null {
    if (!input.<campoRequerido> || input.<campoRequerido>.trim().length === 0) {
      return new Error('<CampoRequerido> is required');
    }
    // ... más validaciones
    return null;
  }

  // ----- FACTORY: RECONSTITUTE (desde BD) -----
  static reconstitute(props: <EntityName>Props): <EntityName> {
    return new <EntityName>(props);
  }

  // ----- GETTERS (Solo lectura pública) -----
  get id(): string { return this.props.id; }
  get tenantId(): string { return this.props.tenantId; }
  get <campo1>(): <Tipo> { return this.props.<campo1>; }
  get <campo2>(): <Tipo> { return this.props.<campo2>; }
  get creadoAt(): Date { return this.props.creadoAt; }
  get actualizadoAt(): Date { return this.props.actualizadoAt; }

  // ----- BUSINESS METHODS (Comportamiento + Invariantes) -----
  
  // Ejemplo: Actualizar campo con validación
  update<Campo>(nuevoValor: <Tipo>): Result<void, Error> {
    // Validar invariante
    if (<condiciónInválida>) {
      return Err(new Error('<Mensaje de error de negocio>'));
    }

    const valorAnterior = this.props.<campo>;
    this.props.<campo> = nuevoValor;
    this.props.actualizadoAt = new Date();

    // Emitir event si es cambio significativo
    this.addDomainEvent(
      createDomainEvent(
        '<EntityName><Campo>Updated',
        this.id,
        this.props.tenantId,
        {
          entityId: this.id,
          oldValue: valorAnterior,
          newValue: nuevoValor,
        }
      )
    );

    return Ok(undefined);
  }

  // Ejemplo: Método de negocio complejo
  realizarAccionCompleja(parametro: <Tipo>): Result<<TipoRetorno>, Error> {
    // 1. Validar precondiciones
    if (!this.puedeRealizarAccion()) {
      return Err(new Error('No se puede realizar la acción en el estado actual'));
    }

    // 2. Lógica de negocio
    const resultado = this.calcularResultado(parametro);

    // 3. Actualizar estado
    this.props.<campo> = resultado.nuevoEstado;
    this.props.actualizadoAt = new Date();

    // 4. Emitir events
    this.addDomainEvent(
      createDomainEvent(
        '<EntityName>AccionRealizada',
        this.id,
        this.props.tenantId,
        { parametro, resultado: resultado.valor }
      )
    );

    return Ok(resultado.valor);
  }

  // ----- QUERY METHODS (Solo lectura, no mutan) -----
  puedeRealizarAccion(): boolean {
    // Lógica de negocio para verificar precondiciones
    return this.props.<estado> === 'activo' && this.props.<otroCampo> > 0;
  }

  calcularMargen(): number {
    if (this.props.costo === null || this.props.costo === 0) return 0;
    return ((this.props.precio - this.props.costo) / this.props.precio) * 100;
  }

  // ----- STATE TRANSITIONS (Máquina de estados) -----
  activar(): void {
    if (this.props.estado === 'activo') return; // Idempotente
    this.props.estado = 'activo';
    this.props.actualizadoAt = new Date();
    this.addDomainEvent(createDomainEvent('<EntityName>Activated', this.id, this.props.tenantId, {}));
  }

  desactivar(motivo?: string): void {
    if (this.props.estado === 'inactivo') return;
    this.props.estado = 'inactivo';
    this.props.actualizadoAt = new Date();
    this.addDomainEvent(createDomainEvent('<EntityName>Deactivated', this.id, this.props.tenantId, { motivo }));
  }

  // ----- SERIALIZATION -----
  toJSON(): <EntityName>Props {
    return { ...this.props };
  }

  toDTO(): <EntityName>DTO {
    return {
      id: this.id,
      tenantId: this.tenantId,
      <campo1>: this.<campo1>,
      <campo2>: this.<campo2>,
      // ... solo campos públicos seguros
      creadoAt: this.creadoAt.toISOString(),
      actualizadoAt: this.actualizadoAt.toISOString(),
    };
  }
}

// ============================================
// DTO (Data Transfer Object - para APIs)
// ============================================
export interface <EntityName>DTO {
  id: string;
  tenantId: string;
  <campo1>: <Tipo>;
  <campo2>: <Tipo>;
  creadoAt: string;
  actualizadoAt: string;
}