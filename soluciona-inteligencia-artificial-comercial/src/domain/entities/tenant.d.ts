/**
 * Tenant Entity - Multi-tenant isolation root
 */
import { AggregateRoot } from './base';
import { Result } from '../../shared/kernel/result';
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
export declare class Tenant extends AggregateRoot<TenantProps> {
    private constructor();
    static create(props: Omit<TenantProps, 'id' | 'createdAt' | 'updatedAt'>): Result<Tenant, Error>;
    static reconstitute(props: TenantProps): Tenant;
    get name(): string;
    get slug(): string;
    get segment(): string;
    get subscriptionTier(): string;
    get subscriptionStatus(): string;
    updateName(name: string): Result<void, Error>;
    updateSubscription(tier: 'free' | 'pro' | 'enterprise', status: 'active' | 'past_due' | 'canceled' | 'trial'): void;
    canAccessFeature(feature: string): boolean;
    isTrialActive(): boolean;
}
//# sourceMappingURL=tenant.d.ts.map