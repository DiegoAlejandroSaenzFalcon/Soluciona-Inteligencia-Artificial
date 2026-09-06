"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppConfigSchema = exports.LLMConfigSchema = exports.JWTConfigSchema = exports.MinIOConfigSchema = exports.RedisConfigSchema = exports.DatabaseConfigSchema = void 0;
exports.loadConfig = loadConfig;
exports.getConfig = getConfig;
exports.resetConfig = resetConfig;
/**
 * Configuration System - Type-safe configuration with Zod validation
 */
const zod_1 = require("zod");
exports.DatabaseConfigSchema = zod_1.z.object({
    host: zod_1.z.string().default('localhost'),
    port: zod_1.z.number().int().positive().default(5432),
    name: zod_1.z.string().default('soluciona_ia'),
    user: zod_1.z.string().default('postgres'),
    password: zod_1.z.string().default('postgres'),
    poolSize: zod_1.z.number().int().positive().default(10),
    debug: zod_1.z.boolean().default(false),
    ssl: zod_1.z.boolean().default(false),
});
exports.RedisConfigSchema = zod_1.z.object({
    host: zod_1.z.string().default('localhost'),
    port: zod_1.z.number().int().positive().default(6379),
    password: zod_1.z.string().optional(),
    db: zod_1.z.number().int().nonnegative().default(0),
    keyPrefix: zod_1.z.string().default('soluciona:'),
});
exports.MinIOConfigSchema = zod_1.z.object({
    endpoint: zod_1.z.string().default('localhost:9000'),
    accessKey: zod_1.z.string().default('minioadmin'),
    secretKey: zod_1.z.string().default('minioadmin'),
    bucket: zod_1.z.string().default('soluciona'),
    region: zod_1.z.string().default('us-east-1'),
    secure: zod_1.z.boolean().default(false),
});
exports.JWTConfigSchema = zod_1.z.object({
    secret: zod_1.z.string().min(32),
    issuer: zod_1.z.string().default('soluciona-ia'),
    audience: zod_1.z.string().default('dashboard'),
    accessTtl: zod_1.z.string().default('15m'),
    refreshTtlDays: zod_1.z.number().int().positive().default(30),
    rotationDays: zod_1.z.number().int().positive().default(30),
});
exports.LLMConfigSchema = zod_1.z.object({
    provider: zod_1.z.enum(['openai', 'anthropic', 'google', 'nvidia', 'local']).default('nvidia'),
    baseUrl: zod_1.z.string().url().default('https://integrate.api.nvidia.com/v1'),
    model: zod_1.z.string().default('meta/llama-3.1-8b-instruct'),
    apiKey: zod_1.z.string().optional(),
    dailyLimit: zod_1.z.number().int().nonnegative().default(0),
    monthlyLimit: zod_1.z.number().int().nonnegative().default(0),
});
exports.AppConfigSchema = zod_1.z.object({
    // Core
    name: zod_1.z.string().default('SOLUCIA INTELIGENCIA ARTIFICIAL'),
    version: zod_1.z.string().default('1.0.0'),
    environment: zod_1.z.enum(['development', 'staging', 'production']).default('development'),
    port: zod_1.z.number().int().positive().default(3000),
    host: zod_1.z.string().default('0.0.0.0'),
    // Database
    database: exports.DatabaseConfigSchema,
    // Redis
    redis: exports.RedisConfigSchema,
    // MinIO
    minio: exports.MinIOConfigSchema,
    // JWT
    jwt: exports.JWTConfigSchema,
    // LLM Providers
    llm: exports.LLMConfigSchema,
    assistants: exports.LLMConfigSchema.default({}),
    vision: exports.LLMConfigSchema.default({}),
    // Business
    business: zod_1.z.object({
        name: zod_1.z.string().default('Mi Comercio'),
        segment: zod_1.z.enum(['comidas', 'salud', 'retail', 'belleza', 'servicios', 'manufactura', 'agro', 'otros']).default('comidas'),
        ciiu: zod_1.z.string().default('5611'),
        currency: zod_1.z.string().length(3).default('COP'),
        timezone: zod_1.z.string().default('America/Bogota'),
        locale: zod_1.z.string().default('es-CO'),
        ownerNumber: zod_1.z.string().default(''),
        address: zod_1.z.object({
            lat: zod_1.z.number().default(0),
            lng: zod_1.z.number().default(0),
            address: zod_1.z.string().default(''),
        }).default({}),
    }).default({}),
    // WhatsApp
    whatsapp: zod_1.z.object({
        authDir: zod_1.z.string().default('./auth_info'),
        qrRefreshInterval: zod_1.z.number().int().positive().default(30000),
        reconnectBaseDelay: zod_1.z.number().int().positive().default(5000),
        reconnectMaxDelay: zod_1.z.number().int().positive().default(300000),
        reconnectJitter: zod_1.z.number().min(0).max(1).default(0.2),
    }).default({}),
    // Integrations
    integrations: zod_1.z.record(zod_1.z.unknown()).default({}),
    // Billing
    billing: zod_1.z.object({
        provider: zod_1.z.enum(['stripe', 'mercadopago', 'wompi', 'none']).default('none'),
        webhookSecret: zod_1.z.string().optional(),
    }).default({}),
    // Observability
    observability: zod_1.z.object({
        metricsPort: zod_1.z.number().int().positive().default(9090),
        tracingEnabled: zod_1.z.boolean().default(true),
        logLevel: zod_1.z.enum(['debug', 'info', 'warn', 'error']).default('info'),
        logFormat: zod_1.z.enum(['json', 'pretty']).default('json'),
    }).default({}),
    // Security
    security: zod_1.z.object({
        rateLimitWindowMs: zod_1.z.number().int().positive().default(60000),
        rateLimitMaxRequests: zod_1.z.number().int().positive().default(100),
        csrfEnabled: zod_1.z.boolean().default(true),
        corsOrigins: zod_1.z.array(zod_1.z.string().url()).default(['http://localhost:3000']),
        helmetEnabled: zod_1.z.boolean().default(true),
    }).default({}),
    // Feature Flags
    features: zod_1.z.object({
        whatsapp: zod_1.z.boolean().default(true),
        orders: zod_1.z.boolean().default(true),
        inventory: zod_1.z.boolean().default(true),
        accounting: zod_1.z.boolean().default(true),
        crm: zod_1.z.boolean().default(false),
        hr: zod_1.z.boolean().default(false),
        bi: zod_1.z.boolean().default(false),
        ai: zod_1.z.boolean().default(true),
    }).default({}),
});
let configCache = null;
function loadConfig(envOverrides = process.env) {
    if (configCache)
        return configCache;
    // Parse environment variables with proper type conversion
    const parseEnv = (schema, prefix) => {
        const envObj = {};
        for (const [key, value] of Object.entries(envOverrides)) {
            if (key.startsWith(prefix)) {
                const configKey = key.slice(prefix.length).toLowerCase();
                // Try to parse as JSON, fallback to string
                try {
                    envObj[configKey] = JSON.parse(value);
                }
                catch {
                    envObj[configKey] = value;
                }
            }
        }
        return schema.parse(envObj);
    };
    const config = exports.AppConfigSchema.parse({
        environment: envOverrides['NODE_ENV'] || 'development',
        port: envOverrides['PORT'] ? parseInt(envOverrides['PORT'], 10) : 3000,
        database: parseEnv(exports.DatabaseConfigSchema, 'DB_'),
        redis: parseEnv(exports.RedisConfigSchema, 'REDIS_'),
        minio: parseEnv(exports.MinIOConfigSchema, 'MINIO_'),
        jwt: parseEnv(exports.JWTConfigSchema, 'JWT_'),
        llm: parseEnv(exports.LLMConfigSchema, 'LLM_'),
        assistants: parseEnv(exports.LLMConfigSchema, 'ASISTENTES_IA_'),
        vision: parseEnv(exports.LLMConfigSchema, 'VISION_'),
        security: parseEnv(exports.AppConfigSchema.shape.security, 'SECURITY_'),
        observability: parseEnv(exports.AppConfigSchema.shape.observability, 'OBSERVABILITY_'),
        features: parseEnv(exports.AppConfigSchema.shape.features, 'FEATURE_'),
    });
    configCache = config;
    return config;
}
function getConfig() {
    if (!configCache) {
        return loadConfig();
    }
    return configCache;
}
function resetConfig() {
    configCache = null;
}
//# sourceMappingURL=index.js.map