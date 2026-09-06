/**
 * Configuration System - Type-safe configuration with Zod validation
 */
import { z } from 'zod';

export const DatabaseConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.number().int().positive().default(5432),
  name: z.string().default('soluciona_ia'),
  user: z.string().default('postgres'),
  password: z.string().default('postgres'),
  poolSize: z.number().int().positive().default(10),
  debug: z.boolean().default(false),
  ssl: z.boolean().default(false),
});

export const RedisConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.number().int().positive().default(6379),
  password: z.string().optional(),
  db: z.number().int().nonnegative().default(0),
  keyPrefix: z.string().default('soluciona:'),
});

export const MinIOConfigSchema = z.object({
  endpoint: z.string().default('localhost:9000'),
  accessKey: z.string().default('minioadmin'),
  secretKey: z.string().default('minioadmin'),
  bucket: z.string().default('soluciona'),
  region: z.string().default('us-east-1'),
  secure: z.boolean().default(false),
});

export const JWTConfigSchema = z.object({
  secret: z.string().min(32),
  issuer: z.string().default('soluciona-ia'),
  audience: z.string().default('dashboard'),
  accessTtl: z.string().default('15m'),
  refreshTtlDays: z.number().int().positive().default(30),
  rotationDays: z.number().int().positive().default(30),
});

export const LLMConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'google', 'nvidia', 'local']).default('nvidia'),
  baseUrl: z.string().url().default('https://integrate.api.nvidia.com/v1'),
  model: z.string().default('meta/llama-3.1-8b-instruct'),
  apiKey: z.string().optional(),
  dailyLimit: z.number().int().nonnegative().default(0),
  monthlyLimit: z.number().int().nonnegative().default(0),
});

export const AppConfigSchema = z.object({
  // Core
  name: z.string().default('SOLUCIA INTELIGENCIA ARTIFICIAL'),
  version: z.string().default('1.0.0'),
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  port: z.number().int().positive().default(3000),
  host: z.string().default('0.0.0.0'),

  // Database
  database: DatabaseConfigSchema,

  // Redis
  redis: RedisConfigSchema,

  // MinIO
  minio: MinIOConfigSchema,

  // JWT
  jwt: JWTConfigSchema,

  // LLM Providers
  llm: LLMConfigSchema,
  assistants: LLMConfigSchema.default({}),
  vision: LLMConfigSchema.default({}),

  // Business
  business: z.object({
    name: z.string().default('Mi Comercio'),
    segment: z.enum(['comidas', 'salud', 'retail', 'belleza', 'servicios', 'manufactura', 'agro', 'otros']).default('comidas'),
    ciiu: z.string().default('5611'),
    currency: z.string().length(3).default('COP'),
    timezone: z.string().default('America/Bogota'),
    locale: z.string().default('es-CO'),
    ownerNumber: z.string().default(''),
    address: z.object({
      lat: z.number().default(0),
      lng: z.number().default(0),
      address: z.string().default(''),
    }).default({}),
  }).default({}),

  // WhatsApp
  whatsapp: z.object({
    authDir: z.string().default('./auth_info'),
    qrRefreshInterval: z.number().int().positive().default(30000),
    reconnectBaseDelay: z.number().int().positive().default(5000),
    reconnectMaxDelay: z.number().int().positive().default(300000),
    reconnectJitter: z.number().min(0).max(1).default(0.2),
  }).default({}),

  // Integrations
  integrations: z.record(z.unknown()).default({}),

  // Billing
  billing: z.object({
    provider: z.enum(['stripe', 'mercadopago', 'wompi', 'none']).default('none'),
    webhookSecret: z.string().optional(),
  }).default({}),

  // Observability
  observability: z.object({
    metricsPort: z.number().int().positive().default(9090),
    tracingEnabled: z.boolean().default(true),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    logFormat: z.enum(['json', 'pretty']).default('json'),
  }).default({}),

  // Security
  security: z.object({
    rateLimitWindowMs: z.number().int().positive().default(60000),
    rateLimitMaxRequests: z.number().int().positive().default(100),
    csrfEnabled: z.boolean().default(true),
    corsOrigins: z.array(z.string().url()).default(['http://localhost:3000']),
    helmetEnabled: z.boolean().default(true),
  }).default({}),

  // Feature Flags
  features: z.object({
    whatsapp: z.boolean().default(true),
    orders: z.boolean().default(true),
    inventory: z.boolean().default(true),
    accounting: z.boolean().default(true),
    crm: z.boolean().default(false),
    hr: z.boolean().default(false),
    bi: z.boolean().default(false),
    ai: z.boolean().default(true),
  }).default({}),
});

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export type RedisConfig = z.infer<typeof RedisConfigSchema>;
export type MinIOConfig = z.infer<typeof MinIOConfigSchema>;
export type JWTConfig = z.infer<typeof JWTConfigSchema>;
export type LLMConfig = z.infer<typeof LLMConfigSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;

let configCache: AppConfig | null = null;

export function loadConfig(envOverrides: Record<string, string | undefined> = process.env): AppConfig {
  if (configCache) return configCache;

  // Parse environment variables with proper type conversion
  const parseEnv = <T>(schema: z.ZodSchema<T>, prefix: string): T => {
    const envObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(envOverrides)) {
      if (key.startsWith(prefix)) {
        const configKey = key.slice(prefix.length).toLowerCase();
        // Try to parse as JSON, fallback to string
        try {
          envObj[configKey] = JSON.parse(value as string);
        } catch {
          envObj[configKey] = value;
        }
      }
    }
    return schema.parse(envObj);
  };

  const config = AppConfigSchema.parse({
    environment: envOverrides['NODE_ENV'] || 'development',
    port: envOverrides['PORT'] ? parseInt(envOverrides['PORT']!, 10) : 3000,
    database: parseEnv(DatabaseConfigSchema, 'DB_'),
    redis: parseEnv(RedisConfigSchema, 'REDIS_'),
    minio: parseEnv(MinIOConfigSchema, 'MINIO_'),
    jwt: parseEnv(JWTConfigSchema, 'JWT_'),
    llm: parseEnv(LLMConfigSchema, 'LLM_'),
    assistants: parseEnv(LLMConfigSchema, 'ASISTENTES_IA_'),
    vision: parseEnv(LLMConfigSchema, 'VISION_'),
    security: parseEnv(AppConfigSchema.shape.security, 'SECURITY_'),
    observability: parseEnv(AppConfigSchema.shape.observability, 'OBSERVABILITY_'),
    features: parseEnv(AppConfigSchema.shape.features, 'FEATURE_'),
  });

  configCache = config;
  return config;
}

export function getConfig(): AppConfig {
  if (!configCache) {
    return loadConfig();
  }
  return configCache;
}

export function resetConfig(): void {
  configCache = null;
}