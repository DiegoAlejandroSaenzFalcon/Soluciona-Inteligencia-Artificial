/**
 * Product Entity - Core inventory entity
 */
import { AggregateRoot } from './base';
import { createDomainEvent } from '../../shared/kernel/events';
import { Result, Ok, Err } from '../../shared/kernel/result';

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
  impuestos: number; // IVA percentage
  creadoAt: Date;
  actualizadoAt: Date;
}

export class Product extends AggregateRoot<ProductProps> {
  private constructor(props: ProductProps) {
    super(props);
  }

  static create(props: Omit<ProductProps, 'id' | 'creadoAt' | 'actualizadoAt'>): Result<Product, Error> {
    if (!props.nombre || props.nombre.trim().length === 0) {
      return Err(new Error('Product name is required'));
    }

    if (props.precio < 0) {
      return Err(new Error('Price cannot be negative'));
    }

    if (props.costo !== null && props.costo < 0) {
      return Err(new Error('Cost cannot be negative'));
    }

    const product = new Product({
      ...props,
      id: crypto.randomUUID(),
      creadoAt: new Date(),
      actualizadoAt: new Date(),
    });

    product.addDomainEvent(
      createDomainEvent('ProductCreated', product.id, product.props.tenantId, {
        nombre: product.props.nombre,
        codigo: product.props.codigo,
        precio: product.props.precio,
      })
    );

    return Ok(product);
  }

  static reconstitute(props: ProductProps): Product {
    return new Product(props);
  }

  get nombre(): string { return this.props.nombre; }
  get precio(): number { return this.props.precio; }
  get costo(): number | null { return this.props.costo; }
  get stockMinimo(): number { return this.props.stockMinimo; }
  get stockMaximo(): number | null { return this.props.stockMaximo; }
  get activo(): boolean { return this.props.activo; }
  get manejaStock(): boolean { return this.props.manejaStock; }
  get categoria(): string | null { return this.props.categoria; }

  updatePrice(nuevoPrecio: number): Result<void, Error> {
    if (nuevoPrecio < 0) {
      return Err(new Error('Price cannot be negative'));
    }

    const oldPrice = this.props.precio;
    this.props.precio = nuevoPrecio;
    this.props.actualizadoAt = new Date();

    this.addDomainEvent(
      createDomainEvent('ProductPriceUpdated', this.id, this.props.tenantId, {
        productId: this.id,
        oldPrice,
        newPrice: nuevoPrecio,
      })
    );

    return Ok(undefined);
  }

  updateStockLimits(minimo: number, maximo: number | null): Result<void, Error> {
    if (minimo < 0) {
      return Err(new Error('Minimum stock cannot be negative'));
    }

    if (maximo !== null && maximo < minimo) {
      return Err(new Error('Maximum stock cannot be less than minimum'));
    }

    this.props.stockMinimo = minimo;
    this.props.stockMaximo = maximo;
    this.props.actualizadoAt = new Date();

    return Ok(undefined);
  }

  updateStock(cantidad: number): Result<void, Error> {
    if (!this.props.manejaStock) {
      return Err(new Error('Product does not manage stock'));
    }

    this.props.actualizadoAt = new Date();
    return Ok(undefined);
  }

  deactivate(): void {
    this.props.activo = false;
    this.props.actualizadoAt = new Date();

    this.addDomainEvent(
      createDomainEvent('ProductDeactivated', this.id, this.props.tenantId, {
        productId: this.id,
      })
    );
  }

  activate(): void {
    this.props.activo = true;
    this.props.actualizadoAt = new Date();

    this.addDomainEvent(
      createDomainEvent('ProductActivated', this.id, this.props.tenantId, {
        productId: this.id,
      })
    );
  }

  updateDetails(details: Partial<Pick<ProductProps, 'descripcion' | 'categoria' | 'ingredientes' | 'imagenUrl' | 'unidadMedida' | 'codigoBarras' | 'impuestos'>>): void {
    Object.assign(this.props, details);
    this.props.actualizadoAt = new Date();
  }

  getMargin(): number {
    if (this.props.costo === null || this.props.costo === 0) return 0;
    return ((this.props.precio - this.props.costo) / this.props.precio) * 100;
  }

  isLowStock(currentStock: number): boolean {
    return currentStock <= this.props.stockMinimo;
  }

  isOutOfStock(currentStock: number): boolean {
    return currentStock <= 0;
  }
}