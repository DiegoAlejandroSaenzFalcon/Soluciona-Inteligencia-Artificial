/**
 * Configuration System - Type-safe configuration with Zod validation
 */
import { z } from 'zod';
export declare const DatabaseConfigSchema: z.ZodObject<{
    host: z.ZodDefault<z.ZodString>;
    port: z.ZodDefault<z.ZodNumber>;
    name: z.ZodDefault<z.ZodString>;
    user: z.ZodDefault<z.ZodString>;
    password: z.ZodDefault<z.ZodString>;
    poolSize: z.ZodDefault<z.ZodNumber>;
    debug: z.ZodDefault<z.ZodBoolean>;
    ssl: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    poolSize: number;
    debug: boolean;
    ssl: boolean;
}, {
    host?: string | undefined;
    port?: number | undefined;
    name?: string | undefined;
    user?: string | undefined;
    password?: string | undefined;
    poolSize?: number | undefined;
    debug?: boolean | undefined;
    ssl?: boolean | undefined;
}>;
export declare const RedisConfigSchema: z.ZodObject<{
    host: z.ZodDefault<z.ZodString>;
    port: z.ZodDefault<z.ZodNumber>;
    password: z.ZodOptional<z.ZodString>;
    db: z.ZodDefault<z.ZodNumber>;
    keyPrefix: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    host: string;
    port: number;
    db: number;
    keyPrefix: string;
    password?: string | undefined;
}, {
    host?: string | undefined;
    port?: number | undefined;
    password?: string | undefined;
    db?: number | undefined;
    keyPrefix?: string | undefined;
}>;
export declare const MinIOConfigSchema: z.ZodObject<{
    endpoint: z.ZodDefault<z.ZodString>;
    accessKey: z.ZodDefault<z.ZodString>;
    secretKey: z.ZodDefault<z.ZodString>;
    bucket: z.ZodDefault<z.ZodString>;
    region: z.ZodDefault<z.ZodString>;
    secure: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    endpoint: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
    region: string;
    secure: boolean;
}, {
    endpoint?: string | undefined;
    accessKey?: string | undefined;
    secretKey?: string | undefined;
    bucket?: string | undefined;
    region?: string | undefined;
    secure?: boolean | undefined;
}>;
export declare const JWTConfigSchema: z.ZodObject<{
    secret: z.ZodString;
    issuer: z.ZodDefault<z.ZodString>;
    audience: z.ZodDefault<z.ZodString>;
    accessTtl: z.ZodDefault<z.ZodString>;
    refreshTtlDays: z.ZodDefault<z.ZodNumber>;
    rotationDays: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    secret: string;
    issuer: string;
    audience: string;
    accessTtl: string;
    refreshTtlDays: number;
    rotationDays: number;
}, {
    secret: string;
    issuer?: string | undefined;
    audience?: string | undefined;
    accessTtl?: string | undefined;
    refreshTtlDays?: number | undefined;
    rotationDays?: number | undefined;
}>;
export declare const LLMConfigSchema: z.ZodObject<{
    provider: z.ZodDefault<z.ZodEnum<["openai", "anthropic", "google", "nvidia", "local"]>>;
    baseUrl: z.ZodDefault<z.ZodString>;
    model: z.ZodDefault<z.ZodString>;
    apiKey: z.ZodOptional<z.ZodString>;
    dailyLimit: z.ZodDefault<z.ZodNumber>;
    monthlyLimit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    provider: "openai" | "anthropic" | "google" | "nvidia" | "local";
    baseUrl: string;
    model: string;
    dailyLimit: number;
    monthlyLimit: number;
    apiKey?: string | undefined;
}, {
    provider?: "openai" | "anthropic" | "google" | "nvidia" | "local" | undefined;
    baseUrl?: string | undefined;
    model?: string | undefined;
    apiKey?: string | undefined;
    dailyLimit?: number | undefined;
    monthlyLimit?: number | undefined;
}>;
export declare const AppConfigSchema: z.ZodObject<{
    name: z.ZodDefault<z.ZodString>;
    version: z.ZodDefault<z.ZodString>;
    environment: z.ZodDefault<z.ZodEnum<["development", "staging", "production"]>>;
    port: z.ZodDefault<z.ZodNumber>;
    host: z.ZodDefault<z.ZodString>;
    database: z.ZodObject<{
        host: z.ZodDefault<z.ZodString>;
        port: z.ZodDefault<z.ZodNumber>;
        name: z.ZodDefault<z.ZodString>;
        user: z.ZodDefault<z.ZodString>;
        password: z.ZodDefault<z.ZodString>;
        poolSize: z.ZodDefault<z.ZodNumber>;
        debug: z.ZodDefault<z.ZodBoolean>;
        ssl: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        host: string;
        port: number;
        name: string;
        user: string;
        password: string;
        poolSize: number;
        debug: boolean;
        ssl: boolean;
    }, {
        host?: string | undefined;
        port?: number | undefined;
        name?: string | undefined;
        user?: string | undefined;
        password?: string | undefined;
        poolSize?: number | undefined;
        debug?: boolean | undefined;
        ssl?: boolean | undefined;
    }>;
    redis: z.ZodObject<{
        host: z.ZodDefault<z.ZodString>;
        port: z.ZodDefault<z.ZodNumber>;
        password: z.ZodOptional<z.ZodString>;
        db: z.ZodDefault<z.ZodNumber>;
        keyPrefix: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        host: string;
        port: number;
        db: number;
        keyPrefix: string;
        password?: string | undefined;
    }, {
        host?: string | undefined;
        port?: number | undefined;
        password?: string | undefined;
        db?: number | undefined;
        keyPrefix?: string | undefined;
    }>;
    minio: z.ZodObject<{
        endpoint: z.ZodDefault<z.ZodString>;
        accessKey: z.ZodDefault<z.ZodString>;
        secretKey: z.ZodDefault<z.ZodString>;
        bucket: z.ZodDefault<z.ZodString>;
        region: z.ZodDefault<z.ZodString>;
        secure: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        endpoint: string;
        accessKey: string;
        secretKey: string;
        bucket: string;
        region: string;
        secure: boolean;
    }, {
        endpoint?: string | undefined;
        accessKey?: string | undefined;
        secretKey?: string | undefined;
        bucket?: string | undefined;
        region?: string | undefined;
        secure?: boolean | undefined;
    }>;
    jwt: z.ZodObject<{
        secret: z.ZodString;
        issuer: z.ZodDefault<z.ZodString>;
        audience: z.ZodDefault<z.ZodString>;
        accessTtl: z.ZodDefault<z.ZodString>;
        refreshTtlDays: z.ZodDefault<z.ZodNumber>;
        rotationDays: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        secret: string;
        issuer: string;
        audience: string;
        accessTtl: string;
        refreshTtlDays: number;
        rotationDays: number;
    }, {
        secret: string;
        issuer?: string | undefined;
        audience?: string | undefined;
        accessTtl?: string | undefined;
        refreshTtlDays?: number | undefined;
        rotationDays?: number | undefined;
    }>;
    llm: z.ZodObject<{
        provider: z.ZodDefault<z.ZodEnum<["openai", "anthropic", "google", "nvidia", "local"]>>;
        baseUrl: z.ZodDefault<z.ZodString>;
        model: z.ZodDefault<z.ZodString>;
        apiKey: z.ZodOptional<z.ZodString>;
        dailyLimit: z.ZodDefault<z.ZodNumber>;
        monthlyLimit: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        provider: "openai" | "anthropic" | "google" | "nvidia" | "local";
        baseUrl: string;
        model: string;
        dailyLimit: number;
        monthlyLimit: number;
        apiKey?: string | undefined;
    }, {
        provider?: "openai" | "anthropic" | "google" | "nvidia" | "local" | undefined;
        baseUrl?: string | undefined;
        model?: string | undefined;
        apiKey?: string | undefined;
        dailyLimit?: number | undefined;
        monthlyLimit?: number | undefined;
    }>;
    assistants: z.ZodDefault<z.ZodObject<{
        provider: z.ZodDefault<z.ZodEnum<["openai", "anthropic", "google", "nvidia", "local"]>>;
        baseUrl: z.ZodDefault<z.ZodString>;
        model: z.ZodDefault<z.ZodString>;
        apiKey: z.ZodOptional<z.ZodString>;
        dailyLimit: z.ZodDefault<z.ZodNumber>;
        monthlyLimit: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        provider: "openai" | "anthropic" | "google" | "nvidia" | "local";
        baseUrl: string;
        model: string;
        dailyLimit: number;
        monthlyLimit: number;
        apiKey?: string | undefined;
    }, {
        provider?: "openai" | "anthropic" | "google" | "nvidia" | "local" | undefined;
        baseUrl?: string | undefined;
        model?: string | undefined;
        apiKey?: string | undefined;
        dailyLimit?: number | undefined;
        monthlyLimit?: number | undefined;
    }>>;
    vision: z.ZodDefault<z.ZodObject<{
        provider: z.ZodDefault<z.ZodEnum<["openai", "anthropic", "google", "nvidia", "local"]>>;
        baseUrl: z.ZodDefault<z.ZodString>;
        model: z.ZodDefault<z.ZodString>;
        apiKey: z.ZodOptional<z.ZodString>;
        dailyLimit: z.ZodDefault<z.ZodNumber>;
        monthlyLimit: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        provider: "openai" | "anthropic" | "google" | "nvidia" | "local";
        baseUrl: string;
        model: string;
        dailyLimit: number;
        monthlyLimit: number;
        apiKey?: string | undefined;
    }, {
        provider?: "openai" | "anthropic" | "google" | "nvidia" | "local" | undefined;
        baseUrl?: string | undefined;
        model?: string | undefined;
        apiKey?: string | undefined;
        dailyLimit?: number | undefined;
        monthlyLimit?: number | undefined;
    }>>;
    business: z.ZodDefault<z.ZodObject<{
        name: z.ZodDefault<z.ZodString>;
        segment: z.ZodDefault<z.ZodEnum<["comidas", "salud", "retail", "belleza", "servicios", "manufactura", "agro", "otros"]>>;
        ciiu: z.ZodDefault<z.ZodString>;
        currency: z.ZodDefault<z.ZodString>;
        timezone: z.ZodDefault<z.ZodString>;
        locale: z.ZodDefault<z.ZodString>;
        ownerNumber: z.ZodDefault<z.ZodString>;
        address: z.ZodDefault<z.ZodObject<{
            lat: z.ZodDefault<z.ZodNumber>;
            lng: z.ZodDefault<z.ZodNumber>;
            address: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            lat: number;
            lng: number;
            address: string;
        }, {
            lat?: number | undefined;
            lng?: number | undefined;
            address?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        segment: "comidas" | "salud" | "retail" | "belleza" | "servicios" | "manufactura" | "agro" | "otros";
        ciiu: string;
        currency: string;
        timezone: string;
        locale: string;
        ownerNumber: string;
        address: {
            lat: number;
            lng: number;
            address: string;
        };
    }, {
        name?: string | undefined;
        segment?: "comidas" | "salud" | "retail" | "belleza" | "servicios" | "manufactura" | "agro" | "otros" | undefined;
        ciiu?: string | undefined;
        currency?: string | undefined;
        timezone?: string | undefined;
        locale?: string | undefined;
        ownerNumber?: string | undefined;
        address?: {
            lat?: number | undefined;
            lng?: number | undefined;
            address?: string | undefined;
        } | undefined;
    }>>;
    whatsapp: z.ZodDefault<z.ZodObject<{
        authDir: z.ZodDefault<z.ZodString>;
        qrRefreshInterval: z.ZodDefault<z.ZodNumber>;
        reconnectBaseDelay: z.ZodDefault<z.ZodNumber>;
        reconnectMaxDelay: z.ZodDefault<z.ZodNumber>;
        reconnectJitter: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        authDir: string;
        qrRefreshInterval: number;
        reconnectBaseDelay: number;
        reconnectMaxDelay: number;
        reconnectJitter: number;
    }, {
        authDir?: string | undefined;
        qrRefreshInterval?: number | undefined;
        reconnectBaseDelay?: number | undefined;
        reconnectMaxDelay?: number | undefined;
        reconnectJitter?: number | undefined;
    }>>;
    integrations: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    billing: z.ZodDefault<z.ZodObject<{
        provider: z.ZodDefault<z.ZodEnum<["stripe", "mercadopago", "wompi", "none"]>>;
        webhookSecret: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        provider: "stripe" | "mercadopago" | "wompi" | "none";
        webhookSecret?: string | undefined;
    }, {
        provider?: "stripe" | "mercadopago" | "wompi" | "none" | undefined;
        webhookSecret?: string | undefined;
    }>>;
    observability: z.ZodDefault<z.ZodObject<{
        metricsPort: z.ZodDefault<z.ZodNumber>;
        tracingEnabled: z.ZodDefault<z.ZodBoolean>;
        logLevel: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
        logFormat: z.ZodDefault<z.ZodEnum<["json", "pretty"]>>;
    }, "strip", z.ZodTypeAny, {
        metricsPort: number;
        tracingEnabled: boolean;
        logLevel: "debug" | "info" | "warn" | "error";
        logFormat: "json" | "pretty";
    }, {
        metricsPort?: number | undefined;
        tracingEnabled?: boolean | undefined;
        logLevel?: "debug" | "info" | "warn" | "error" | undefined;
        logFormat?: "json" | "pretty" | undefined;
    }>>;
    security: z.ZodDefault<z.ZodObject<{
        rateLimitWindowMs: z.ZodDefault<z.ZodNumber>;
        rateLimitMaxRequests: z.ZodDefault<z.ZodNumber>;
        csrfEnabled: z.ZodDefault<z.ZodBoolean>;
        corsOrigins: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        helmetEnabled: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        rateLimitWindowMs: number;
        rateLimitMaxRequests: number;
        csrfEnabled: boolean;
        corsOrigins: string[];
        helmetEnabled: boolean;
    }, {
        rateLimitWindowMs?: number | undefined;
        rateLimitMaxRequests?: number | undefined;
        csrfEnabled?: boolean | undefined;
        corsOrigins?: string[] | undefined;
        helmetEnabled?: boolean | undefined;
    }>>;
    features: z.ZodDefault<z.ZodObject<{
        whatsapp: z.ZodDefault<z.ZodBoolean>;
        orders: z.ZodDefault<z.ZodBoolean>;
        inventory: z.ZodDefault<z.ZodBoolean>;
        accounting: z.ZodDefault<z.ZodBoolean>;
        crm: z.ZodDefault<z.ZodBoolean>;
        hr: z.ZodDefault<z.ZodBoolean>;
        bi: z.ZodDefault<z.ZodBoolean>;
        ai: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        whatsapp: boolean;
        orders: boolean;
        inventory: boolean;
        accounting: boolean;
        crm: boolean;
        hr: boolean;
        bi: boolean;
        ai: boolean;
    }, {
        whatsapp?: boolean | undefined;
        orders?: boolean | undefined;
        inventory?: boolean | undefined;
        accounting?: boolean | undefined;
        crm?: boolean | undefined;
        hr?: boolean | undefined;
        bi?: boolean | undefined;
        ai?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    host: string;
    port: number;
    name: string;
    version: string;
    environment: "development" | "staging" | "production";
    database: {
        host: string;
        port: number;
        name: string;
        user: string;
        password: string;
        poolSize: number;
        debug: boolean;
        ssl: boolean;
    };
    redis: {
        host: string;
        port: number;
        db: number;
        keyPrefix: string;
        password?: string | undefined;
    };
    minio: {
        endpoint: string;
        accessKey: string;
        secretKey: string;
        bucket: string;
        region: string;
        secure: boolean;
    };
    jwt: {
        secret: string;
        issuer: string;
        audience: string;
        accessTtl: string;
        refreshTtlDays: number;
        rotationDays: number;
    };
    llm: {
        provider: "openai" | "anthropic" | "google" | "nvidia" | "local";
        baseUrl: string;
        model: string;
        dailyLimit: number;
        monthlyLimit: number;
        apiKey?: string | undefined;
    };
    assistants: {
        provider: "openai" | "anthropic" | "google" | "nvidia" | "local";
        baseUrl: string;
        model: string;
        dailyLimit: number;
        monthlyLimit: number;
        apiKey?: string | undefined;
    };
    vision: {
        provider: "openai" | "anthropic" | "google" | "nvidia" | "local";
        baseUrl: string;
        model: string;
        dailyLimit: number;
        monthlyLimit: number;
        apiKey?: string | undefined;
    };
    business: {
        name: string;
        segment: "comidas" | "salud" | "retail" | "belleza" | "servicios" | "manufactura" | "agro" | "otros";
        ciiu: string;
        currency: string;
        timezone: string;
        locale: string;
        ownerNumber: string;
        address: {
            lat: number;
            lng: number;
            address: string;
        };
    };
    whatsapp: {
        authDir: string;
        qrRefreshInterval: number;
        reconnectBaseDelay: number;
        reconnectMaxDelay: number;
        reconnectJitter: number;
    };
    integrations: Record<string, unknown>;
    billing: {
        provider: "stripe" | "mercadopago" | "wompi" | "none";
        webhookSecret?: string | undefined;
    };
    observability: {
        metricsPort: number;
        tracingEnabled: boolean;
        logLevel: "debug" | "info" | "warn" | "error";
        logFormat: "json" | "pretty";
    };
    security: {
        rateLimitWindowMs: number;
        rateLimitMaxRequests: number;
        csrfEnabled: boolean;
        corsOrigins: string[];
        helmetEnabled: boolean;
    };
    features: {
        whatsapp: boolean;
        orders: boolean;
        inventory: boolean;
        accounting: boolean;
        crm: boolean;
        hr: boolean;
        bi: boolean;
        ai: boolean;
    };
}, {
    database: {
        host?: string | undefined;
        port?: number | undefined;
        name?: string | undefined;
        user?: string | undefined;
        password?: string | undefined;
        poolSize?: number | undefined;
        debug?: boolean | undefined;
        ssl?: boolean | undefined;
    };
    redis: {
        host?: string | undefined;
        port?: number | undefined;
        password?: string | undefined;
        db?: number | undefined;
        keyPrefix?: string | undefined;
    };
    minio: {
        endpoint?: string | undefined;
        accessKey?: string | undefined;
        secretKey?: string | undefined;
        bucket?: string | undefined;
        region?: string | undefined;
        secure?: boolean | undefined;
    };
    jwt: {
        secret: string;
        issuer?: string | undefined;
        audience?: string | undefined;
        accessTtl?: string | undefined;
        refreshTtlDays?: number | undefined;
        rotationDays?: number | undefined;
    };
    llm: {
        provider?: "openai" | "anthropic" | "google" | "nvidia" | "local" | undefined;
        baseUrl?: string | undefined;
        model?: string | undefined;
        apiKey?: string | undefined;
        dailyLimit?: number | undefined;
        monthlyLimit?: number | undefined;
    };
    host?: string | undefined;
    port?: number | undefined;
    name?: string | undefined;
    version?: string | undefined;
    environment?: "development" | "staging" | "production" | undefined;
    assistants?: {
        provider?: "openai" | "anthropic" | "google" | "nvidia" | "local" | undefined;
        baseUrl?: string | undefined;
        model?: string | undefined;
        apiKey?: string | undefined;
        dailyLimit?: number | undefined;
        monthlyLimit?: number | undefined;
    } | undefined;
    vision?: {
        provider?: "openai" | "anthropic" | "google" | "nvidia" | "local" | undefined;
        baseUrl?: string | undefined;
        model?: string | undefined;
        apiKey?: string | undefined;
        dailyLimit?: number | undefined;
        monthlyLimit?: number | undefined;
    } | undefined;
    business?: {
        name?: string | undefined;
        segment?: "comidas" | "salud" | "retail" | "belleza" | "servicios" | "manufactura" | "agro" | "otros" | undefined;
        ciiu?: string | undefined;
        currency?: string | undefined;
        timezone?: string | undefined;
        locale?: string | undefined;
        ownerNumber?: string | undefined;
        address?: {
            lat?: number | undefined;
            lng?: number | undefined;
            address?: string | undefined;
        } | undefined;
    } | undefined;
    whatsapp?: {
        authDir?: string | undefined;
        qrRefreshInterval?: number | undefined;
        reconnectBaseDelay?: number | undefined;
        reconnectMaxDelay?: number | undefined;
        reconnectJitter?: number | undefined;
    } | undefined;
    integrations?: Record<string, unknown> | undefined;
    billing?: {
        provider?: "stripe" | "mercadopago" | "wompi" | "none" | undefined;
        webhookSecret?: string | undefined;
    } | undefined;
    observability?: {
        metricsPort?: number | undefined;
        tracingEnabled?: boolean | undefined;
        logLevel?: "debug" | "info" | "warn" | "error" | undefined;
        logFormat?: "json" | "pretty" | undefined;
    } | undefined;
    security?: {
        rateLimitWindowMs?: number | undefined;
        rateLimitMaxRequests?: number | undefined;
        csrfEnabled?: boolean | undefined;
        corsOrigins?: string[] | undefined;
        helmetEnabled?: boolean | undefined;
    } | undefined;
    features?: {
        whatsapp?: boolean | undefined;
        orders?: boolean | undefined;
        inventory?: boolean | undefined;
        accounting?: boolean | undefined;
        crm?: boolean | undefined;
        hr?: boolean | undefined;
        bi?: boolean | undefined;
        ai?: boolean | undefined;
    } | undefined;
}>;
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export type RedisConfig = z.infer<typeof RedisConfigSchema>;
export type MinIOConfig = z.infer<typeof MinIOConfigSchema>;
export type JWTConfig = z.infer<typeof JWTConfigSchema>;
export type LLMConfig = z.infer<typeof LLMConfigSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;
export declare function loadConfig(envOverrides?: Record<string, string | undefined>): AppConfig;
export declare function getConfig(): AppConfig;
export declare function resetConfig(): void;
//# sourceMappingURL=index.d.ts.map