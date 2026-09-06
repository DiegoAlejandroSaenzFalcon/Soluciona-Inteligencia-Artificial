/**
 * PostgreSQL Database Connection Pool
 * Uses pg library with connection pooling
 */
import { Pool, QueryResult } from 'pg';
export declare function getPool(): Pool;
export declare function query<T = unknown>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
export declare function queryOne<T = unknown>(text: string, params?: unknown[]): Promise<T | null>;
export declare function queryMany<T = unknown>(text: string, params?: unknown[]): Promise<T[]>;
export declare function executeInTransaction<T>(callback: (client: import('pg').PoolClient) => Promise<T>): Promise<T>;
export declare function closePool(): Promise<void>;
export declare function healthCheck(): Promise<boolean>;
//# sourceMappingURL=pool.d.ts.map