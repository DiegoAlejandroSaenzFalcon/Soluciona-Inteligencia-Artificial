/**
 * Order Entity - Core order/domain entity
 */
import { AggregateRoot } from './base';
import { Result } from '../../shared/kernel/result';
export type OrderStatus = 'recibido' | 'confirmado' | 'en_preparacion' | 'listo' | 'en_camino' | 'entregado' | 'cancelado' | 'devuelto';
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
export declare class Order extends AggregateRoot<OrderProps> {
    private constructor();
    static create(props: Omit<OrderProps, 'id' | 'creadoAt' | 'actualizadoAt'>): Order;
    static reconstitute(props: OrderProps): Order;
    get numero(): number;
    get estado(): OrderStatus;
    get tipo(): OrderType;
    get estadoPago(): string;
    get total(): number;
    get telefono(): string;
    updateEstado(nuevoEstado: OrderStatus): Result<void, Error>;
    updateEstadoPago(nuevoEstado: PaymentStatus): void;
    setFacturaEmitida(facturaId: string): void;
    setDomicilioInfo(direccion: string, lat: string, lng: string, distanciaKm: number, costoDomicilio: number): void;
    addNota(nota: string): void;
    canCancel(): boolean;
    isCompleted(): boolean;
    getItemCount(): number;
}
//# sourceMappingURL=order.d.ts.map