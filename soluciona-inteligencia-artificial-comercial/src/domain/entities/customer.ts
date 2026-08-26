/**
 * Customer Entity - Client/Customer management
 */
import { AggregateRoot } from './base';
import { createDomainEvent } from '../../shared/kernel/events';
import { Result, Ok, Err } from '../../shared/kernel/result';

export interface CustomerProps {
  id: string;
  tenantId: string;
  nombre: string | null;
  telefono: string;
  email: string | null;
  direccion: string | null;
  lat: string | null;
  lng: string | null;
  totalPedidos: number;
  totalGastado: number;
  ultimaCompra: Date | null;
  primeraCompra: Date | null;
  diasCredito: number;
  limiteCredito: number;
  saldoPendiente: number;
  activo: boolean;
  notas: string | null;
  tags: string[];
  creadoAt: Date;
  actualizadoAt: Date;
}

export class Customer extends AggregateRoot<CustomerProps> {
  private constructor(props: CustomerProps) {
    super(props);
  }

  static create(props: Omit<CustomerProps, 'id' | 'totalPedidos' | 'totalGastado' | 'ultimaCompra' | 'primeraCompra' | 'saldoPendiente' | 'creadoAt' | 'actualizadoAt'>): Customer {
    const customer = new Customer({
      ...props,
      id: crypto.randomUUID(),
      totalPedidos: 0,
      totalGastado: 0,
      ultimaCompra: null,
      primeraCompra: null,
      saldoPendiente: 0,
      creadoAt: new Date(),
      actualizadoAt: new Date(),
    });

    customer.addDomainEvent(
      createDomainEvent('CustomerCreated', customer.id, customer.props.tenantId, {
        customerId: customer.id,
        nombre: customer.props.nombre,
        telefono: customer.props.telefono,
      })
    );

    return customer;
  }

  static reconstitute(props: CustomerProps): Customer {
    return new Customer(props);
  }

  get nombre(): string | null { return this.props.nombre; }
  get telefono(): string { return this.props.telefono; }
  get email(): string | null { return this.props.email; }
  get activo(): boolean { return this.props.activo; }
  get saldoPendiente(): number { return this.props.saldoPendiente; }

  registrarPedido(total: number, fecha: Date): void {
    this.props.totalPedidos += 1;
    this.props.totalGastado += total;
    this.props.ultimaCompra = fecha;
    if (!this.props.primeraCompra) {
      this.props.primeraCompra = fecha;
    }
    this.props.actualizadoAt = new Date();

    this.addDomainEvent(
      createDomainEvent('CustomerOrderRegistered', this.id, this.props.tenantId, {
        customerId: this.id,
        total,
      })
    );
  }

  abonarSaldo(monto: number): Result<void, Error> {
    if (monto <= 0) {
      return Err(new Error('Monto must be positive'));
    }

    if (monto > this.props.saldoPendiente) {
      return Err(new Error('Payment exceeds pending balance'));
    }

    this.props.saldoPendiente -= monto;
    this.props.actualizadoAt = new Date();

    this.addDomainEvent(
      createDomainEvent('CustomerPaymentReceived', this.id, this.props.tenantId, {
        customerId: this.id,
        monto,
        nuevoSaldo: this.props.saldoPendiente,
      })
    );

    return Ok(undefined);
  }

  cargarSaldo(monto: number): void {
    this.props.saldoPendiente += monto;
    this.props.actualizadoAt = new Date();

    this.addDomainEvent(
      createDomainEvent('CustomerBalanceCharged', this.id, this.props.tenantId, {
        customerId: this.id,
        monto,
        nuevoSaldo: this.props.saldoPendiente,
      })
    );
  }

  actualizarPerfil(data: Partial<Pick<CustomerProps, 'nombre' | 'email' | 'direccion' | 'lat' | 'lng' | 'diasCredito' | 'limiteCredito' | 'notas' | 'tags'>>): void {
    Object.assign(this.props, data);
    this.props.actualizadoAt = new Date();

    this.addDomainEvent(
      createDomainEvent('CustomerProfileUpdated', this.id, this.props.tenantId, {
        customerId: this.id,
        changes: Object.keys(data),
      })
    );
  }

  agregarTag(tag: string): void {
    if (!this.props.tags.includes(tag)) {
      this.props.tags.push(tag);
      this.props.actualizadoAt = new Date();
    }
  }

  removerTag(tag: string): void {
    this.props.tags = this.props.tags.filter((t) => t !== tag);
    this.props.actualizadoAt = new Date();
  }

  desactivar(): void {
    this.props.activo = false;
    this.props.actualizadoAt = new Date();

    this.addDomainEvent(
      createDomainEvent('CustomerDeactivated', this.id, this.props.tenantId, {
        customerId: this.id,
      })
    );
  }

  activar(): void {
    this.props.activo = true;
    this.props.actualizadoAt = new Date();

    this.addDomainEvent(
      createDomainEvent('CustomerActivated', this.id, this.props.tenantId, {
        customerId: this.id,
      })
    );
  }

  getTiempoSinComprar(): number | null {
    if (!this.props.ultimaCompra) return null;
    return Math.floor((Date.now() - this.props.ultimaCompra.getTime()) / (1000 * 60 * 60 * 24));
  }

  getFrecuenciaCompra(): number {
    if (!this.props.primeraCompra || this.props.totalPedidos === 0) return 0;
    const dias = (Date.now() - this.props.primeraCompra.getTime()) / (1000 * 60 * 60 * 24);
    return dias > 0 ? this.props.totalPedidos / (dias / 30) : 0;
  }
}