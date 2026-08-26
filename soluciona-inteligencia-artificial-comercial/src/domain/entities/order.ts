/**
 * Order Entity - Core order/domain entity
 */
import { AggregateRoot } from './base';
import { createDomainEvent } from '../../shared/kernel/events';
import { Result, Ok, Err } from '../../shared/kernel/result';

export type OrderStatus =
  | 'recibido'
  | 'confirmado'
  | 'en_preparacion'
  | 'listo'
  | 'en_camino'
  | 'entregado'
  | 'cancelado'
  | 'devuelto';

export type OrderType = 'domicilio' | 'recoger' | 'mesa' | 'consumo_local';

export type PaymentStatus = 'pendiente' | 'pagado' | 'parcial' | 'reembolsado' | 'fallido';

export interface OrderItem {
  productId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  notas: string | null;
  ingredientes: string | null;
}

export interface OrderProps {
  id: string;
  tenantId: string;
  numero: number;
  fecha: Date;
  dia: string;
  remitente: string;
  telefono: string;
  items: OrderItem[];
  total: number;
  crudo: string;
  direccion: string | null;
  lat: string | null;
  lng: string | null;
  estado: OrderStatus;
  tipo: OrderType;
  estadoPago: PaymentStatus;
  facturaEmitida: string | null;
  facturaProveedor: string | null;
  distanciaKm: number | null;
  costoDomicilio: number | null;
  notas: string | null;
  creadoAt: Date;
  actualizadoAt: Date;
}

export class Order extends AggregateRoot<OrderProps> {
  private constructor(props: OrderProps) {
    super(props);
  }

  static create(props: Omit<OrderProps, 'id' | 'creadoAt' | 'actualizadoAt'>): Order {
    const order = new Order({
      ...props,
      id: crypto.randomUUID(),
      creadoAt: new Date(),
      actualizadoAt: new Date(),
    });

    order.addDomainEvent(
      createDomainEvent('OrderCreated', order.id, order.props.tenantId, {
        orderId: order.id,
        numero: order.props.numero,
        total: order.props.total,
        tipo: order.props.tipo,
      })
    );

    return order;
  }

  static reconstitute(props: OrderProps): Order {
    return new Order(props);
  }

  get numero(): number { return this.props.numero; }
  get estado(): OrderStatus { return this.props.estado; }
  get tipo(): OrderType { return this.props.tipo; }
  get estadoPago(): string { return this.props.estadoPago; }
  get total(): number { return this.props.total; }
  get telefono(): string { return this.props.telefono; }

  updateEstado(nuevoEstado: OrderStatus): Result<void, Error> {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      recibido: ['confirmado', 'cancelado'],
      confirmado: ['en_preparacion', 'cancelado'],
      en_preparacion: ['listo', 'cancelado'],
      listo: ['en_camino', 'cancelado'],
      en_camino: ['entregado', 'cancelado'],
      entregado: ['devuelto'],
      cancelado: [],
      devuelto: [],
    };

    const currentEstado = this.props.estado;
    if (!validTransitions[currentEstado].includes(nuevoEstado)) {
      return Err(new Error(`Invalid transition from ${currentEstado} to ${nuevoEstado}`));
    }

    const oldEstado = this.props.estado;
    this.props.estado = nuevoEstado;
    this.props.actualizadoAt = new Date();

    this.addDomainEvent(
      createDomainEvent('OrderStatusChanged', this.id, this.props.tenantId, {
        orderId: this.id,
        oldEstado,
        nuevoEstado,
      })
    );

    return Ok(undefined);
  }

  updateEstadoPago(nuevoEstado: PaymentStatus): void {
    this.props.estadoPago = nuevoEstado;
    this.props.actualizadoAt = new Date();

    this.addDomainEvent(
      createDomainEvent('OrderPaymentStatusChanged', this.id, this.props.tenantId, {
        orderId: this.id,
        nuevoEstado,
      })
    );
  }

  setFacturaEmitida(facturaId: string): void {
    this.props.facturaEmitida = facturaId;
    this.props.actualizadoAt = new Date();

    this.addDomainEvent(
      createDomainEvent('OrderInvoiceEmitted', this.id, this.props.tenantId, {
        orderId: this.id,
        facturaId,
      })
    );
  }

  setDomicilioInfo(direccion: string, lat: string, lng: string, distanciaKm: number, costoDomicilio: number): void {
    this.props.direccion = direccion;
    this.props.lat = lat;
    this.props.lng = lng;
    this.props.distanciaKm = distanciaKm;
    this.props.costoDomicilio = costoDomicilio;
    this.props.actualizadoAt = new Date();
  }

  addNota(nota: string): void {
    this.props.notas = this.props.notas ? `${this.props.notas}\n${nota}` : nota;
    this.props.actualizadoAt = new Date();
  }

  canCancel(): boolean {
    return ['recibido', 'confirmado', 'en_preparacion'].includes(this.props.estado);
  }

  isCompleted(): boolean {
    return this.props.estado === 'entregado';
  }

  getItemCount(): number {
    return this.props.items.reduce((sum, item) => sum + item.cantidad, 0);
  }
}