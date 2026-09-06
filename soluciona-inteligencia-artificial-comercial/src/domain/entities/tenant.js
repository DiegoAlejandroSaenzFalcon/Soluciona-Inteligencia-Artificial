"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tenant = void 0;
/**
 * Tenant Entity - Multi-tenant isolation root
 */
const base_1 = require("./base");
const events_1 = require("../../shared/kernel/events");
const result_1 = require("../../shared/kernel/result");
class Tenant extends base_1.AggregateRoot {
    constructor(props) {
        super(props);
    }
    static create(props) {
        const slug = props.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        if (!/^[a-z0-9-]+$/.test(slug)) {
            return (0, result_1.Err)(new Error('Invalid tenant name for slug generation'));
        }
        const tenant = new Tenant({
            ...props,
            id: crypto.randomUUID(),
            slug,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        tenant.addDomainEvent((0, events_1.createDomainEvent)('TenantCreated', tenant.id, tenant.id, {
            name: tenant.name,
            slug: tenant.slug,
            segment: tenant.segment,
        }));
        return (0, result_1.Ok)(tenant);
    }
    static reconstitute(props) {
        return new Tenant(props);
    }
    get name() { return this.props.name; }
    get slug() { return this.props.slug; }
    get segment() { return this.props.segment; }
    get subscriptionTier() { return this.props.subscriptionTier; }
    get subscriptionStatus() { return this.props.subscriptionStatus; }
    updateName(name) {
        const oldSlug = this.props.slug;
        const newSlug = name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        if (!/^[a-z0-9-]+$/.test(newSlug)) {
            return (0, result_1.Err)(new Error('Invalid name for slug generation'));
        }
        this.props.name = name;
        this.props.slug = newSlug;
        this.props.updatedAt = new Date();
        this.addDomainEvent((0, events_1.createDomainEvent)('TenantUpdated', this.id, this.id, {
            name: this.props.name,
            slug: this.props.slug,
            oldSlug,
        }));
        return (0, result_1.Ok)(undefined);
    }
    updateSubscription(tier, status) {
        this.props.subscriptionTier = tier;
        this.props.subscriptionStatus = status;
        this.props.updatedAt = new Date();
        this.addDomainEvent((0, events_1.createDomainEvent)('SubscriptionUpdated', this.id, this.id, {
            tier,
            status,
        }));
    }
    canAccessFeature(feature) {
        const tierFeatures = {
            free: ['whatsapp', 'orders', 'basic_inventory'],
            pro: ['whatsapp', 'orders', 'inventory', 'accounting', 'crm', 'ai_basic', 'suppliers_basic'],
            enterprise: ['whatsapp', 'orders', 'inventory', 'accounting', 'crm', 'hr', 'bi', 'ai_advanced', 'suppliers', 'multi_tenant', 'white_label'],
        };
        const features = tierFeatures[this.props.subscriptionTier] || [];
        return features.includes(feature);
    }
    isTrialActive() {
        return this.props.subscriptionStatus === 'trial' && this.props.trialEndsAt
            ? new Date() < this.props.trialEndsAt
            : false;
    }
}
exports.Tenant = Tenant;
//# sourceMappingURL=tenant.js.map