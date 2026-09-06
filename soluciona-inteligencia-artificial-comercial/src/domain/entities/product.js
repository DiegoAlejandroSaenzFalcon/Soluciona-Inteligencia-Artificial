"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Product = void 0;
/**
 * Product Entity - Core inventory entity
 */
const base_1 = require("./base");
const events_1 = require("../../shared/kernel/events");
const result_1 = require("../../shared/kernel/result");
class Product extends base_1.AggregateRoot {
    constructor(props) {
        super(props);
    }
    static create(props) {
        if (!props.nombre || props.nombre.trim().length === 0) {
            return (0, result_1.Err)(new Error('Product name is required'));
        }
        if (props.precio < 0) {
            return (0, result_1.Err)(new Error('Price cannot be negative'));
        }
        if (props.costo !== null && props.costo < 0) {
            return (0, result_1.Err)(new Error('Cost cannot be negative'));
        }
        const product = new Product({
            ...props,
            id: crypto.randomUUID(),
            creadoAt: new Date(),
            actualizadoAt: new Date(),
        });
        product.addDomainEvent((0, events_1.createDomainEvent)('ProductCreated', product.id, product.props.tenantId, {
            nombre: product.props.nombre,
            codigo: product.props.codigo,
            precio: product.props.precio,
        }));
        return (0, result_1.Ok)(product);
    }
    static reconstitute(props) {
        return new Product(props);
    }
    get nombre() { return this.props.nombre; }
    get precio() { return this.props.precio; }
    get costo() { return this.props.costo; }
    get stockMinimo() { return this.props.stockMinimo; }
    get stockMaximo() { return this.props.stockMaximo; }
    get activo() { return this.props.activo; }
    get manejaStock() { return this.props.manejaStock; }
    get categoria() { return this.props.categoria; }
    updatePrice(nuevoPrecio) {
        if (nuevoPrecio < 0) {
            return (0, result_1.Err)(new Error('Price cannot be negative'));
        }
        const oldPrice = this.props.precio;
        this.props.precio = nuevoPrecio;
        this.props.actualizadoAt = new Date();
        this.addDomainEvent((0, events_1.createDomainEvent)('ProductPriceUpdated', this.id, this.props.tenantId, {
            productId: this.id,
            oldPrice,
            newPrice: nuevoPrecio,
        }));
        return (0, result_1.Ok)(undefined);
    }
    updateStockLimits(minimo, maximo) {
        if (minimo < 0) {
            return (0, result_1.Err)(new Error('Minimum stock cannot be negative'));
        }
        if (maximo !== null && maximo < minimo) {
            return (0, result_1.Err)(new Error('Maximum stock cannot be less than minimum'));
        }
        this.props.stockMinimo = minimo;
        this.props.stockMaximo = maximo;
        this.props.actualizadoAt = new Date();
        return (0, result_1.Ok)(undefined);
    }
    updateStock(cantidad) {
        if (!this.props.manejaStock) {
            return (0, result_1.Err)(new Error('Product does not manage stock'));
        }
        this.props.actualizadoAt = new Date();
        return (0, result_1.Ok)(undefined);
    }
    deactivate() {
        this.props.activo = false;
        this.props.actualizadoAt = new Date();
        this.addDomainEvent((0, events_1.createDomainEvent)('ProductDeactivated', this.id, this.props.tenantId, {
            productId: this.id,
        }));
    }
    activate() {
        this.props.activo = true;
        this.props.actualizadoAt = new Date();
        this.addDomainEvent((0, events_1.createDomainEvent)('ProductActivated', this.id, this.props.tenantId, {
            productId: this.id,
        }));
    }
    updateDetails(details) {
        Object.assign(this.props, details);
        this.props.actualizadoAt = new Date();
    }
    getMargin() {
        if (this.props.costo === null || this.props.costo === 0)
            return 0;
        return ((this.props.precio - this.props.costo) / this.props.precio) * 100;
    }
    isLowStock(currentStock) {
        return currentStock <= this.props.stockMinimo;
    }
    isOutOfStock(currentStock) {
        return currentStock <= 0;
    }
}
exports.Product = Product;
//# sourceMappingURL=product.js.map