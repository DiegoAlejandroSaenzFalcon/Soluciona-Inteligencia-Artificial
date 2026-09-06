"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Customer = void 0;
/**
 * Customer Entity - Client/Customer management
 */
const base_1 = require("./base");
const events_1 = require("../../shared/kernel/events");
const result_1 = require("../../shared/kernel/result");
class Customer extends base_1.AggregateRoot {
    constructor(props) {
        super(props);
    }
    static create(props) {
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
        customer.addDomainEvent((0, events_1.createDomainEvent)('CustomerCreated', customer.id, customer.props.tenantId, {
            customerId: customer.id,
            nombre: customer.props.nombre,
            telefono: customer.props.telefono,
        }));
        return customer;
    }
    static reconstitute(props) {
        return new Customer(props);
    }
    get nombre() { return this.props.nombre; }
    get telefono() { return this.props.telefono; }
    get email() { return this.props.email; }
    get activo() { return this.props.activo; }
    get saldoPendiente() { return this.props.saldoPendiente; }
    registrarPedido(total, fecha) {
        this.props.totalPedidos += 1;
        this.props.totalGastado += total;
        this.props.ultimaCompra = fecha;
        if (!this.props.primeraCompra) {
            this.props.primeraCompra = fecha;
        }
        this.props.actualizadoAt = new Date();
        this.addDomainEvent((0, events_1.createDomainEvent)('CustomerOrderRegistered', this.id, this.props.tenantId, {
            customerId: this.id,
            total,
        }));
    }
    abonarSaldo(monto) {
        if (monto <= 0) {
            return (0, result_1.Err)(new Error('Monto must be positive'));
        }
        if (monto > this.props.saldoPendiente) {
            return (0, result_1.Err)(new Error('Payment exceeds pending balance'));
        }
        this.props.saldoPendiente -= monto;
        this.props.actualizadoAt = new Date();
        this.addDomainEvent((0, events_1.createDomainEvent)('CustomerPaymentReceived', this.id, this.props.tenantId, {
            customerId: this.id,
            monto,
            nuevoSaldo: this.props.saldoPendiente,
        }));
        return (0, result_1.Ok)(undefined);
    }
    cargarSaldo(monto) {
        this.props.saldoPendiente += monto;
        this.props.actualizadoAt = new Date();
        this.addDomainEvent((0, events_1.createDomainEvent)('CustomerBalanceCharged', this.id, this.props.tenantId, {
            customerId: this.id,
            monto,
            nuevoSaldo: this.props.saldoPendiente,
        }));
    }
    actualizarPerfil(data) {
        Object.assign(this.props, data);
        this.props.actualizadoAt = new Date();
        this.addDomainEvent((0, events_1.createDomainEvent)('CustomerProfileUpdated', this.id, this.props.tenantId, {
            customerId: this.id,
            changes: Object.keys(data),
        }));
    }
    agregarTag(tag) {
        if (!this.props.tags.includes(tag)) {
            this.props.tags.push(tag);
            this.props.actualizadoAt = new Date();
        }
    }
    removerTag(tag) {
        this.props.tags = this.props.tags.filter((t) => t !== tag);
        this.props.actualizadoAt = new Date();
    }
    desactivar() {
        this.props.activo = false;
        this.props.actualizadoAt = new Date();
        this.addDomainEvent((0, events_1.createDomainEvent)('CustomerDeactivated', this.id, this.props.tenantId, {
            customerId: this.id,
        }));
    }
    activar() {
        this.props.activo = true;
        this.props.actualizadoAt = new Date();
        this.addDomainEvent((0, events_1.createDomainEvent)('CustomerActivated', this.id, this.props.tenantId, {
            customerId: this.id,
        }));
    }
    getTiempoSinComprar() {
        if (!this.props.ultimaCompra)
            return null;
        return Math.floor((Date.now() - this.props.ultimaCompra.getTime()) / (1000 * 60 * 60 * 24));
    }
    getFrecuenciaCompra() {
        if (!this.props.primeraCompra || this.props.totalPedidos === 0)
            return 0;
        const dias = (Date.now() - this.props.primeraCompra.getTime()) / (1000 * 60 * 60 * 24);
        return dias > 0 ? this.props.totalPedidos / (dias / 30) : 0;
    }
}
exports.Customer = Customer;
//# sourceMappingURL=customer.js.map