"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Order = void 0;
/**
 * Order Entity - Core order/domain entity
 */
const base_1 = require("./base");
const events_1 = require("../../shared/kernel/events");
const result_1 = require("../../shared/kernel/result");
class Order extends base_1.AggregateRoot {
    constructor(props) {
        super(props);
    }
    static create(props) {
        const order = new Order({
            ...props,
            id: crypto.randomUUID(),
            creadoAt: new Date(),
            actualizadoAt: new Date(),
        });
        order.addDomainEvent((0, events_1.createDomainEvent)('OrderCreated', order.id, order.props.tenantId, {
            orderId: order.id,
            numero: order.props.numero,
            total: order.props.total,
            tipo: order.props.tipo,
        }));
        return order;
    }
    static reconstitute(props) {
        return new Order(props);
    }
    get numero() { return this.props.numero; }
    get estado() { return this.props.estado; }
    get tipo() { return this.props.tipo; }
    get estadoPago() { return this.props.estadoPago; }
    get total() { return this.props.total; }
    get telefono() { return this.props.telefono; }
    updateEstado(nuevoEstado) {
        const validTransitions = {
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
            return (0, result_1.Err)(new Error(`Invalid transition from ${currentEstado} to ${nuevoEstado}`));
        }
        const oldEstado = this.props.estado;
        this.props.estado = nuevoEstado;
        this.props.actualizadoAt = new Date();
        this.addDomainEvent((0, events_1.createDomainEvent)('OrderStatusChanged', this.id, this.props.tenantId, {
            orderId: this.id,
            oldEstado,
            nuevoEstado,
        }));
        return (0, result_1.Ok)(undefined);
    }
    updateEstadoPago(nuevoEstado) {
        this.props.estadoPago = nuevoEstado;
        this.props.actualizadoAt = new Date();
        this.addDomainEvent((0, events_1.createDomainEvent)('OrderPaymentStatusChanged', this.id, this.props.tenantId, {
            orderId: this.id,
            nuevoEstado,
        }));
    }
    setFacturaEmitida(facturaId) {
        this.props.facturaEmitida = facturaId;
        this.props.actualizadoAt = new Date();
        this.addDomainEvent((0, events_1.createDomainEvent)('OrderInvoiceEmitted', this.id, this.props.tenantId, {
            orderId: this.id,
            facturaId,
        }));
    }
    setDomicilioInfo(direccion, lat, lng, distanciaKm, costoDomicilio) {
        this.props.direccion = direccion;
        this.props.lat = lat;
        this.props.lng = lng;
        this.props.distanciaKm = distanciaKm;
        this.props.costoDomicilio = costoDomicilio;
        this.props.actualizadoAt = new Date();
    }
    addNota(nota) {
        this.props.notas = this.props.notas ? `${this.props.notas}\n${nota}` : nota;
        this.props.actualizadoAt = new Date();
    }
    canCancel() {
        return ['recibido', 'confirmado', 'en_preparacion'].includes(this.props.estado);
    }
    isCompleted() {
        return this.props.estado === 'entregado';
    }
    getItemCount() {
        return this.props.items.reduce((sum, item) => sum + item.cantidad, 0);
    }
}
exports.Order = Order;
//# sourceMappingURL=order.js.map