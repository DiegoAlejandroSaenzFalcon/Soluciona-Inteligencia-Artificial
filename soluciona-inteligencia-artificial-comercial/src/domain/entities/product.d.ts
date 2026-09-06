/**
 * Product Entity - Core inventory entity
 */
import { AggregateRoot } from './base';
import { Result } from '../../shared/kernel/result';
export interface ProductProps {
    id: string;
    tenantId: string;
    nombre: string;
    codigo: string | null;
    descripcion: string | null;
    precio: number;
    costo: number | null;
    categoria: string | null;
    ingredientes: string | null;
    imagenUrl: string | null;
    activo: boolean;
    manejaStock: boolean;
    stockMinimo: number;
    stockMaximo: number | null;
    unidadMedida: string;
    codigoBarras: string | null;
    impuestos: number;
    creadoAt: Date;
    actualizadoAt: Date;
}
export declare class Product extends AggregateRoot<ProductProps> {
    private constructor();
    static create(props: Omit<ProductProps, 'id' | 'creadoAt' | 'actualizadoAt'>): Result<Product, Error>;
    static reconstitute(props: ProductProps): Product;
    get nombre(): string;
    get precio(): number;
    get costo(): number | null;
    get stockMinimo(): number;
    get stockMaximo(): number | null;
    get activo(): boolean;
    get manejaStock(): boolean;
    get categoria(): string | null;
    updatePrice(nuevoPrecio: number): Result<void, Error>;
    updateStockLimits(minimo: number, maximo: number | null): Result<void, Error>;
    updateStock(cantidad: number): Result<void, Error>;
    deactivate(): void;
    activate(): void;
    updateDetails(details: Partial<Pick<ProductProps, 'descripcion' | 'categoria' | 'ingredientes' | 'imagenUrl' | 'unidadMedida' | 'codigoBarras' | 'impuestos'>>): void;
    getMargin(): number;
    isLowStock(currentStock: number): boolean;
    isOutOfStock(currentStock: number): boolean;
}
//# sourceMappingURL=product.d.ts.map