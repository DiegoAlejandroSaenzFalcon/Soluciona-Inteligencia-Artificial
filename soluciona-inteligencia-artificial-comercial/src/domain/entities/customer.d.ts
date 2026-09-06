/**
 * Customer Entity - Client/Customer management
 */
import { AggregateRoot } from './base';
import { Result } from '../../shared/kernel/result';
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
export declare class Customer extends AggregateRoot<CustomerProps> {
    private constructor();
    static create(props: Omit<CustomerProps, 'id' | 'totalPedidos' | 'totalGastado' | 'ultimaCompra' | 'primeraCompra' | 'saldoPendiente' | 'creadoAt' | 'actualizadoAt'>): Customer;
    static reconstitute(props: CustomerProps): Customer;
    get nombre(): string | null;
    get telefono(): string;
    get email(): string | null;
    get activo(): boolean;
    get saldoPendiente(): number;
    registrarPedido(total: number, fecha: Date): void;
    abonarSaldo(monto: number): Result<void, Error>;
    cargarSaldo(monto: number): void;
    actualizarPerfil(data: Partial<Pick<CustomerProps, 'nombre' | 'email' | 'direccion' | 'lat' | 'lng' | 'diasCredito' | 'limiteCredito' | 'notas' | 'tags'>>): void;
    agregarTag(tag: string): void;
    removerTag(tag: string): void;
    desactivar(): void;
    activar(): void;
    getTiempoSinComprar(): number | null;
    getFrecuenciaCompra(): number;
}
//# sourceMappingURL=customer.d.ts.map