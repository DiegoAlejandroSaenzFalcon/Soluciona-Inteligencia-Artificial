/**
 * Repository Interfaces - Domain contracts for data access
 */
import { Result } from '../../shared/kernel/result';
import { Tenant } from '../entities/tenant';
import { User } from '../entities/user';
import { Product } from '../entities/product';
import { Order } from '../entities/order';
import { Customer } from '../entities/customer';
export interface PaginationParams {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export interface TenantRepository {
    findById(id: string): Promise<Result<Tenant | null, Error>>;
    findBySlug(slug: string): Promise<Result<Tenant | null, Error>>;
    findByEmail(email: string): Promise<Result<Tenant | null, Error>>;
    save(tenant: Tenant): Promise<Result<Tenant, Error>>;
    delete(id: string): Promise<Result<void, Error>>;
    findAll(params: PaginationParams): Promise<Result<PaginatedResult<Tenant>, Error>>;
}
export interface UserRepository {
    findById(id: string): Promise<Result<User | null, Error>>;
    findByEmail(tenantId: string, email: string): Promise<Result<User | null, Error>>;
    findByTenantId(tenantId: string, params: PaginationParams): Promise<Result<PaginatedResult<User>, Error>>;
    save(user: User): Promise<Result<User, Error>>;
    delete(id: string): Promise<Result<void, Error>>;
    findByRole(tenantId: string, role: string): Promise<Result<User[], Error>>;
}
export interface ProductRepository {
    findById(id: string): Promise<Result<Product | null, Error>>;
    findByTenantId(tenantId: string, params: PaginationParams & {
        active?: boolean;
        category?: string;
    }): Promise<Result<PaginatedResult<Product>, Error>>;
    findByCategory(tenantId: string, category: string): Promise<Result<Product[], Error>>;
    findLowStock(tenantId: string): Promise<Result<Product[], Error>>;
    save(product: Product): Promise<Result<Product, Error>>;
    delete(id: string): Promise<Result<void, Error>>;
    findByCodigo(tenantId: string, codigo: string): Promise<Result<Product | null, Error>>;
}
export interface OrderRepository {
    findById(id: string): Promise<Result<Order | null, Error>>;
    findByTenantId(tenantId: string, params: PaginationParams & {
        status?: string;
        dateFrom?: Date;
        dateTo?: Date;
    }): Promise<Result<PaginatedResult<Order>, Error>>;
    findByNumero(tenantId: string, numero: number): Promise<Result<Order | null, Error>>;
    findByTelefono(tenantId: string, telefono: string): Promise<Result<Order[], Error>>;
    findByDateRange(tenantId: string, from: Date, to: Date): Promise<Result<Order[], Error>>;
    save(order: Order): Promise<Result<Order, Error>>;
    getNextNumero(tenantId: string): Promise<Result<number, Error>>;
    getResumen(tenantId: string, from: Date, to: Date): Promise<Result<{
        totalPedidos: number;
        totalVentas: number;
        ticketPromedio: number;
    }, Error>>;
}
export interface CustomerRepository {
    findById(id: string): Promise<Result<Customer | null, Error>>;
    findByTenantId(tenantId: string, params: PaginationParams & {
        active?: boolean;
        search?: string;
    }): Promise<Result<PaginatedResult<Customer>, Error>>;
    findByTelefono(tenantId: string, telefono: string): Promise<Result<Customer | null, Error>>;
    findByEmail(tenantId: string, email: string): Promise<Result<Customer | null, Error>>;
    save(customer: Customer): Promise<Result<Customer, Error>>;
    delete(id: string): Promise<Result<void, Error>>;
    getTopCustomers(tenantId: string, limit: number): Promise<Result<Customer[], Error>>;
    getCustomersWithDebt(tenantId: string): Promise<Result<Customer[], Error>>;
}
export interface RepositoryFactory {
    tenants(): TenantRepository;
    users(): UserRepository;
    products(): ProductRepository;
    orders(): OrderRepository;
    customers(): CustomerRepository;
}
//# sourceMappingURL=index.d.ts.map