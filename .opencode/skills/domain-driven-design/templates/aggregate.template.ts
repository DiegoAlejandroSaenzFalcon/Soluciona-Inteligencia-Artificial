/**
 * Aggregate Root Template - DDD
 * Ubicación: src/domain/aggregates/<aggregate-name>.ts
 * 
 * Reglas:
 * - Es la raíz de consistencia (consistency boundary)
 * - Controla acceso a entidades internas
 * - Emite Domain Events
 * - Invariantes de negocio cross-entity
 * - NO getters públicos para entidades internas (encapsulamiento)
 */

import { AggregateRoot } from '../base';
import { createDomainEvent } from '../../shared/kernel/events';
import { Result, Ok, Err } from '../../shared/kernel/result';
import { <EntityName> } from '../entities/<entity-name>';
import { <ValueObjectName> } from '../value-objects/<vo-name>';

// ============================================
// PROPS & INPUT TYPES
// ============================================
export interface <AggregateName>Props {
  id: string;
  tenantId: string;
  // Campos del aggregate root
  <campo1>: <Tipo>;
  <campo2>: <Tipo>;
  // Entidades internas (NO expuestas directamente)
  // Se acceden solo via métodos del aggregate
  creadoAt: Date;
  actualizadoAt: Date;
}

export interface Create<AggregateName>Input {
  tenantId: string;
  <campo1>: <Tipo>;
  <campo2>: <Tipo>;
  // Datos para entidades hijas iniciales
  <entidadHijaInicial>: {
    <campoHijo1>: <Tipo>;
    <campoHijo2>: <Tipo>;
  }[];
}

// ============================================
// AGGREGATE ROOT CLASS
// ============================================
export class <AggregateName> extends AggregateRoot<<AggregateName>Props> {
  // Entidades internas (private, no expuestas)
  private <entidadHijaList>: <EntityName>[] = [];

  private constructor(props: <AggregateName>Props) {
    super(props);
  }

  // ----- FACTORY: CREATE -----
  static create(input: Create<AggregateName>Input): Result<<AggregateName>, Error> {
    // Validar invariantes de creación
    const validationError = <AggregateName>.validateCreate(input);
    if (validationError) {
      return Err(validationError);
    }

    const now = new Date();
    const aggregate = new <AggregateName>({
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      <campo1>: input.<campo1>,
      <campo2>: input.<campo2>,
      creadoAt: now,
      actualizadoAt: now,
    });

    // Crear entidades hijas iniciales
    for (const hijaInput of input.<entidadHijaInicial>) {
      const hijaResult = <EntityName>.create({
        // ... mapear campos
        aggregateId: aggregate.id,
        tenantId: input.tenantId,
      });
      
      if (!hijaResult.ok) {
        return Err(hijaResult.error);
      }
      aggregate.<entidadHijaList>.push(hijaResult.value);
    }

    // Emitir event de creación
    aggregate.addDomainEvent(
      createDomainEvent(
        '<AggregateName>Created',
        aggregate.id,
        aggregate.props.tenantId,
        {
          <campoClave1>: aggregate.props.<campoClave1>,
          hijosCount: aggregate.<entidadHijaList>.length,
        }
      )
    );

    return Ok(aggregate);
  }

  private static validateCreate(input: Create<AggregateName>Input): Error | null {
    if (!input.<campoRequerido>) {
      return new Error('<CampoRequerido> is required');
    }
    // Validar reglas cross-entity
    return null;
  }

  // ----- FACTORY: RECONSTITUTE -----
  static reconstitute(props: <AggregateName>Props, <entidadHijaList>: <EntityName>[]): <AggregateName> {
    const aggregate = new <AggregateName>(props);
    aggregate.<entidadHijaList> = <entidadHijaList>;
    return aggregate;
  }

  // ----- GETTERS (Solo lectura, DTOs) -----
  get id(): string { return this.props.id; }
  get tenantId(): string { return this.props.tenantId; }
  get <campo1>(): <Tipo> { return this.props.<campo1>; }
  get <campo2>(): <Tipo> { return this.props.<campo2>; }

  // Acceso controlado a entidades hijas (read-only)
  get <entidadHijaList>(): ReadonlyArray<<EntityName>> {
    return [...this.<entidadHijaList>]; // Copia defensiva
  }

  get <entidadHijaCount>(): number {
    return this.<entidadHijaList>.length;
  }

  // ----- BUSINESS METHODS (Invariantes cross-entity) -----
  
  // Ejemplo: Agregar entidad hija con validación de invariante
  agregar<EntidadHija>(input: Crear<EntidadHija>Input): Result<<EntityName>, Error> {
    // 1. Validar invariante del aggregate
    if (this.<entidadHijaList>.length >= this.max<EntidadHija>s) {
      return Err(new Error(`Máximo ${this.max<EntidadHija>s} <entidadHija>s permitidos`));
    }

    // 2. Validar reglas de negocio cross-entity
    const conflict = this.<entidadHijaList>.find(h => h.<campoUnico> === input.<campoUnico>);
    if (conflict) {
      return Err(new Error(`<EntidadHija> con <campoUnico> ${input.<campoUnico>} ya existe`));
    }

    // 3. Crear entidad hija
    const hijaResult = <EntityName>.create({
      aggregateId: this.id,
      tenantId: this.props.tenantId,
      ...input,
    });

    if (!hijaResult.ok) {
      return Err(hijaResult.error);
    }

    const hija = hijaResult.value;
    this.<entidadHijaList>.push(hija);
    this.props.actualizadoAt = new Date();

    // 4. Emitir event
    this.addDomainEvent(
      createDomainEvent(
        '<AggregateName><EntidadHija>Added',
        this.id,
        this.props.tenantId,
        { hijaId: hija.id, <campoClave>: hija.<campoClave> }
      )
    );

    return Ok(hija);
  }

  // Ejemplo: Remover entidad hija
  remover<EntidadHija>(hijaId: string): Result<void, Error> {
    const index = this.<entidadHijaList>.findIndex(h => h.id === hijaId);
    if (index === -1) {
      return Err(new Error(`<EntidadHija> ${hijaId} no encontrada`));
    }

    // Validar invariante: mínimo 1 hija
    if (this.<entidadHijaList>.length <= 1) {
      return Err(new Error('Debe haber al menos una <entidadHija>'));
    }

    const [removida] = this.<entidadHijaList>.splice(index, 1);
    this.props.actualizadoAt = new Date();

    this.addDomainEvent(
      createDomainEvent(
        '<AggregateName><EntidadHija>Removed',
        this.id,
        this.props.tenantId,
        { hijaId: removida.id }
      )
    );

    return Ok(undefined);
  }

  // Ejemplo: Operación cross-entity compleja
  procesarReglaNegocioCompleja(parametro: <Tipo>): Result<<TipoRetorno>, Error> {
    // Lógica que involucra múltiples entidades hijas
    const resultado = this.<entidadHijaList>
      .filter(h => h.estaActiva())
      .reduce((acc, h) => h.calcular(acc, parametro), <valorInicial>);

    this.props.actualizadoAt = new Date();

    this.addDomainEvent(
      createDomainEvent(
        '<AggregateName>ReglaProcesada',
        this.id,
        this.props.tenantId,
        { parametro, resultado }
      )
    );

    return Ok(resultado);
  }

  // ----- STATE TRANSITIONS -----
  activar(): void {
    if (this.props.estado === 'activo') return;
    this.props.estado = 'activo';
    this.props.actualizadoAt = new Date();
    this.addDomainEvent(createDomainEvent('<AggregateName>Activated', this.id, this.props.tenantId, {}));
  }

  // ----- PRIVATE HELPERS -----
  private get max<EntidadHija>s(): number {
    // Límite configurable por tenant/plan
    return 100;
  }

  // ----- SERIALIZATION -----
  toJSON(): <AggregateName>Props & { <entidadHijaList>: <EntityName>[] } {
    return {
      ...this.props,
      <entidadHijaList>: [...this.<entidadHijaList>],
    };
  }

  toDTO(): <AggregateName>DTO {
    return {
      id: this.id,
      tenantId: this.tenantId,
      <campo1>: this.<campo1>,
      <campo2>: this.<campo2>,
      <entidadHijaCount>: this.<entidadHijaCount>,
      creadoAt: this.props.creadoAt.toISOString(),
      actualizadoAt: this.props.actualizadoAt.toISOString(),
    };
  }
}

// ============================================
// DTO
// ============================================
export interface <AggregateName>DTO {
  id: string;
  tenantId: string;
  <campo1>: <Tipo>;
  <campo2>: <Tipo>;
  <entidadHijaCount>: number;
  creadoAt: string;
  actualizadoAt: string;
}