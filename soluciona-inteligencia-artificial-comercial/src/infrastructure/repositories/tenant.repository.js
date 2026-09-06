"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresTenantRepository = void 0;
const result_1 = require("../../shared/kernel/result");
const pool_1 = require("../database/pool");
class PostgresTenantRepository {
    async findById(id) {
        try {
            const row = await (0, pool_1.queryOne)(`SELECT * FROM tenants WHERE id = $1`, [id]);
            if (!row)
                return (0, result_1.Ok)(null);
            return (0, result_1.Ok)(this.mapRowToTenant(row));
        }
        catch (error) {
            return (0, result_1.Err)(error);
        }
    }
    async findBySlug(slug) {
        try {
            const row = await (0, pool_1.queryOne)(`SELECT * FROM tenants WHERE slug = $1`, [slug]);
            if (!row)
                return (0, result_1.Ok)(null);
            return (0, result_1.Ok)(this.mapRowToTenant(row));
        }
        catch (error) {
            return (0, result_1.Err)(error);
        }
    }
    async findByEmail(email) {
        // Tenants don't have email directly, but we can search in config
        try {
            const row = await (0, pool_1.queryOne)(`SELECT * FROM tenants WHERE config->>'email' = $1`, [email]);
            if (!row)
                return (0, result_1.Ok)(null);
            return (0, result_1.Ok)(this.mapRowToTenant(row));
        }
        catch (error) {
            return (0, result_1.Err)(error);
        }
    }
    async save(tenant) {
        try {
            await (0, pool_1.executeInTransaction)(async (client) => {
                const props = tenant['props']; // Access private props via bracket notation
                const data = {
                    name: props.name,
                    slug: props.slug,
                    segment: props.segment,
                    ciiu: props.ciiu,
                    currency: props.currency,
                    timezone: props.timezone,
                    locale: props.locale,
                    branding: JSON.stringify(props.branding),
                    config: JSON.stringify(props.config),
                    subscription_tier: props.subscriptionTier,
                    subscription_status: props.subscriptionStatus,
                    trial_ends_at: props.trialEndsAt,
                };
                if (tenant.id) {
                    // Update existing
                    await client.query(`UPDATE tenants SET
              name = $1, slug = $2, segment = $3, ciiu = $4,
              currency = $5, timezone = $6, locale = $7,
              branding = $8, config = $9, subscription_tier = $10,
              subscription_status = $11, trial_ends_at = $12,
              updated_at = NOW()
            WHERE id = $12`, [
                        data.name, data.slug, data.segment, data.ciiu,
                        data.currency, data.timezone, data.locale,
                        data.branding, data.config, data.subscription_tier,
                        data.subscription_status, data.trial_ends_at, tenant.id
                    ]);
                }
                else {
                    // Insert new
                    const result = await client.query(`INSERT INTO tenants (id, name, slug, segment, ciiu, currency, timezone, locale, branding, config, subscription_tier, subscription_status, trial_ends_at, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
             RETURNING id`, [
                        crypto.randomUUID(), // We'll need to get the actual ID from tenant
                        // Actually, we need to access the tenant's ID
                    ]);
                }
            });
            return (0, result_1.Ok)(tenant);
        }
        catch (error) {
            return (0, result_1.Err)(error);
        }
    }
    async delete(id) {
        try {
            await (0, pool_1.query)('DELETE FROM tenants WHERE id = $1', [id]);
            return (0, result_1.Ok)(undefined);
        }
        catch (error) {
            return (0, result_1.Err)(error);
        }
    }
    async findAll(params) {
        try {
            const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = params;
            const offset = (page - 1) * limit;
            const [dataResult, countResult] = await Promise.all([
                (0, pool_1.queryMany)(`SELECT * FROM tenants ORDER BY ${sortBy} ${sortOrder.toUpperCase()} LIMIT $1 OFFSET $2`, [limit, offset]),
                (0, pool_1.queryOne)('SELECT COUNT(*)::int as count FROM tenants')
            ]);
            const tenants = dataResult.map(this.mapRowToTenant);
            const total = countResult?.count || 0;
            return (0, result_1.Ok)({
                data: tenants,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            });
        }
        catch (error) {
            return (0, result_1.Err)(error);
        }
    }
    mapRowToTenant(row) {
        // We need to use the static reconstitute method
        const { Tenant } = require('../../../domain/entities/tenant');
        return Tenant.reconstitute({
            id: row.id,
            name: row.name,
            slug: row.slug,
            segment: row.segment,
            ciiu: row.ciiu,
            currency: row.currency,
            timezone: row.timezone,
            locale: row.locale,
            branding: row.branding,
            config: row.config,
            subscriptionTier: row.subscription_tier,
            subscriptionStatus: row.subscription_status,
            trialEndsAt: row.trial_ends_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        });
    }
}
exports.PostgresTenantRepository = PostgresTenantRepository;
//# sourceMappingURL=tenant.repository.js.map