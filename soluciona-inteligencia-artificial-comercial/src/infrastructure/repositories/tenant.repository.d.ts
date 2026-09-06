import { Tenant } from '../../../domain/entities/tenant';
import { TenantRepository } from '../../../domain/repositories';
import { Result } from '../../shared/kernel/result';
export declare class PostgresTenantRepository implements TenantRepository {
    findById(id: string): Promise<Result<Tenant | null, Error>>;
    findBySlug(slug: string): Promise<Result<Tenant | null, Error>>;
    findByEmail(email: string): Promise<Result<Tenant | null, Error>>;
    save(tenant: Tenant): Promise<Result<Tenant, Error>>;
    delete(id: string): Promise<Result<void, Error>>;
    findAll(params: {
        page: number;
        limit: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }): Promise<Result<{
        data: Tenant[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }, Error>>;
    private mapRowToTenant;
}
//# sourceMappingURL=tenant.repository.d.ts.map