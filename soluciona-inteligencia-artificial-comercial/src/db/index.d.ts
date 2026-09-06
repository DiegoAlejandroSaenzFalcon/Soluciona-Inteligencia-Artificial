import postgres from 'postgres';
import * as schema from './schema';
export declare function getDb(): import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof schema>;
export declare function getQueryClient(): postgres.Sql<{}>;
export declare function closeDb(): Promise<void>;
export declare function testConnection(): Promise<{
    ok: boolean;
    error?: never;
} | {
    ok: boolean;
    error: string;
}>;
export declare function runMigrations(): Promise<void>;
//# sourceMappingURL=index.d.ts.map