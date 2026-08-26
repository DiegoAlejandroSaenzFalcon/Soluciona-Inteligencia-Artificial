/**
 * Tenant Entity - Multi-tenant isolation root
 */
import { AggregateRoot } from './base';
import { createDomainEvent } from '../../shared/kernel/events';
import { Result, Ok, Err } from '../../shared/kernel/result';

export interface TenantProps {
  id: string;
  name: string;
  slug: string;
  segment: 'comidas' | 'salud' | 'retail' | 'belleza' | 'servicios' | 'manufactura' | 'agro' | 'otros';
  ciiu: string;
  currency: string;
  timezone: string;
  locale: string;
  branding: Record<string, unknown>;
  config: Record<string, unknown>;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  subscriptionStatus: 'active' | 'past_due' | 'canceled' | 'trial';
  trialEndsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Tenant extends AggregateRoot<TenantProps> {
  private constructor(props: TenantProps) {
    super(props);
  }

  static create(props: Omit<TenantProps, 'id' | 'createdAt' | 'updatedAt'>): Result<Tenant, Error> {
    const slug = props.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return Err(new Error('Invalid tenant name for slug generation'));
    }

    const tenant = new Tenant({
      ...props,
      id: crypto.randomUUID(),
      slug,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    tenant.addDomainEvent(
      createDomainEvent('TenantCreated', tenant.id, tenant.id, {
        name: tenant.name,
        slug: tenant.slug,
        segment: tenant.segment,
      })
    );

    return Ok(tenant);
  }

  static reconstitute(props: TenantProps): Tenant {
    return new Tenant(props);
  }

  get name(): string { return this.props.name; }
  get slug(): string { return this.props.slug; }
  get segment(): string { return this.props.segment; }
  get subscriptionTier(): string { return this.props.subscriptionTier; }
  get subscriptionStatus(): string { return this.props.subscriptionStatus; }

  updateName(name: string): Result<void, Error> {
    const oldSlug = this.props.slug;
    const newSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    if (!/^[a-z0-9-]+$/.test(newSlug)) {
      return Err(new Error('Invalid name for slug generation'));
    }

    this.props.name = name;
    this.props.slug = newSlug;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      createDomainEvent('TenantUpdated', this.id, this.id, {
        name: this.props.name,
        slug: this.props.slug,
        oldSlug,
      })
    );

    return Ok(undefined);
  }

  updateSubscription(tier: 'free' | 'pro' | 'enterprise', status: 'active' | 'past_due' | 'canceled' | 'trial'): void {
    this.props.subscriptionTier = tier;
    this.props.subscriptionStatus = status;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      createDomainEvent('SubscriptionUpdated', this.id, this.id, {
        tier,
        status,
      })
    );
  }

  canAccessFeature(feature: string): boolean {
    const tierFeatures: Record<string, string[]> = {
      free: ['whatsapp', 'orders', 'basic_inventory'],
      pro: ['whatsapp', 'orders', 'inventory', 'accounting', 'crm', 'ai_basic', 'suppliers_basic'],
      enterprise: ['whatsapp', 'orders', 'inventory', 'accounting', 'crm', 'hr', 'bi', 'ai_advanced', 'suppliers', 'multi_tenant', 'white_label'],
    };

    const features = tierFeatures[this.props.subscriptionTier] || [];
    return features.includes(feature);
  }

  isTrialActive(): boolean {
    return this.props.subscriptionStatus === 'trial' && this.props.trialEndsAt
      ? new Date() < this.props.trialEndsAt
      : false;
  }
}