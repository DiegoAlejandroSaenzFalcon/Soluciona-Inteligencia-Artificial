// Type declarations for config.js module
// This provides TypeScript types for the config.js CommonJS module

import { PoolConfig } from 'pg';

declare module 'config' {
  // Configuración de base de datos
  export interface DatabaseConfig {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    poolSize: number;
    debug: boolean;
    ssl: boolean;
  }

  export interface RedisConfig {
    host: string;
    port: number;
    password?: string;
    db: number;
    keyPrefix: string;
  }

  export interface MinIOConfig {
    endpoint: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
    region: string;
    secure: boolean;
  }

  export interface JWTConfig {
    secret: string;
    issuer: string;
    audience: string;
    accessTtl: string;
    refreshTtlDays: number;
    rotationDays: number;
  }

  export interface LLMConfig {
    proveedor: string;
    base_url: string;
    modelo: string;
    api_key: string;
    limite_diario: number;
    limite_mensual: number;
  }

  export interface IntegracionConfig {
    tipo: string;
    // Siigo
    username?: string;
    access_key?: string;
    partner_id?: string;
    document_id?: number;
    payment_id?: number;
    tax_id?: number;
    customer_identification?: string;
    stamp_dian?: boolean;
    // Alegra
    email?: string;
    token?: string;
    id_type?: string;
    customer_identification?: string;
    tax_id?: string;
    payment_form?: string;
    stamp_dian?: boolean;
    // Factus
    email?: string;
    password?: string;
    prefijo?: string;
    customer_email?: string;
    city_code?: string;
    payment_form?: string;
    payment_method?: string;
    // Alanube
    username?: string;
    password?: string;
    prefijo?: string;
    customer_type_id?: string;
    customer_email?: string;
    customer_city?: string;
    payment_form?: string;
    payment_method?: string;
    // OpenData
    api_key?: string;
    secret_key?: string;
    prefijo?: string;
    cliente_tipo_id?: string;
    cliente_email?: string;
    cliente_ciudad?: string;
    forma_pago?: string;
    metodo_pago?: string;
    // DIAN Gratuito
    nit?: string;
    password?: string;
    codigo_software?: string;
    pin_software?: string;
    cert_path?: string;
    cert_pass?: string;
    ambiente?: string;
    prefijo?: string;
    cliente_tipo_id?: string;
    cliente_email?: string;
    cliente_municipio?: string;
    cliente_departamento?: string;
    empresa_ciudad?: string;
    empresa_depto?: string;
    // Webhook
    url?: string;
    token?: string;
    header?: string;
    valor?: string;
    timeout?: number;
    // Telegram
    token?: string;
    chat_id?: string;
  }

  export interface AlertasConfig {
    telegram: {
      token?: string;
      chat_id?: string;
    };
  }

  export interface AppConfig {
    // Core
    name: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
    port: number;
    host: string;

    // Database
    database: DatabaseConfig;

    // Redis
    redis: RedisConfig;

    // MinIO
    minio: MinIOConfig;

    // JWT
    jwt: JWTConfig;

    // LLM Providers
    llm: {
      proveedor: string;
      base_url: string;
      modelo: string;
      api_key: string;
      limite_diario: number;
      limite_mensual: number;
    };
    asistentes_ia: {
      modelo: string;
      api_key: string;
      limite_diario: number;
      limite_mensual: number;
    };
    vision: {
      modelo: string;
      api_key: string;
      limite_diario: number;
      limite_mensual: number;
    };
    gemini_model: string;

    // Business
    business: {
      name: string;
      segment: string;
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

    // WhatsApp
    whatsapp: {
      authDir: string;
      qrRefreshInterval: number;
      reconnectBaseDelay: number;
      reconnectMaxDelay: number;
      reconnectJitter: number;
    };

    // Integrations
    integracion: IntegracionConfig;

    // Billing
    billing: {
      provider: string;
      webhookSecret?: string;
    };

    // Observability
    observability: {
      metricsPort: number;
      tracingEnabled: boolean;
      logLevel: string;
      logFormat: string;
    };

    // Security
    security: {
      rateLimitWindowMs: number;
      rateLimitMaxRequests: number;
      csrfEnabled: boolean;
      corsOrigins: string[];
      helmetEnabled: boolean;
    };

    // Feature Flags
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
  }

  // Exported config object
  const config: AppConfig & {
    softwareNombre: string;
    nombreNegocio: () => string;
    clienteId: string;
    dataDir: string;
    authDir: string;
    dbEngine: string;
    db_engine: string;
    dbHost: string;
    dbPort: number;
    dbName: string;
    dbUser: string;
    dbPass: string;
    dbPoolSize: number;
    dbDebug: boolean;
    db_engine: string;
    dbHost: string;
    dbPort: number;
    dbName: string;
    dbUser: string;
    dbPass: string;
    dbPoolSize: number;
    dbDebug: boolean;
    puerto: number;
    nombreNegocio: () => string;
    clienteId: string;
    dataDir: string;
    authDir: string;
    auth_dir: string;
    dbEngine: string;
    db_engine: string;
    dbHost: string;
    dbPort: number;
    dbName: string;
    dbUser: string;
    dbPass: string;
    dbPoolSize: number;
    dbDebug: boolean;
    panel_password: string;
    segmento: string;
    ciiu: string;
    moneda: string;
    hora_reporte: string;
    numero_dueno: string;
    ubicacion_negocio: { lat: number; lng: number };
    domicilios: {
      faixas: Array<{
        hasta_km: number;
        tipo: 'gratis' | 'fijo' | 'por_km';
        valor: number;
        minimo?: number;
        pedido_minimo?: number;
      }>;
      radio_max_entrega_km: number;
      gratis_si_total_sobre: number;
    };
    hora_reporte: string;
    numero_dueno: string;
    ubicacion_negocio: { lat: number; lng: number };
    domicilios: {
      faixas: Array<{
        hasta_km: number;
        tipo: 'gratis' | 'fijo' | 'por_km';
        valor: number;
        minimo?: number;
        pedido_minimo?: number;
      }>;
      radio_max_entrega_km: number;
      gratis_si_total_sobre: number;
    };
    max_unidades_confirmar: number;
    pregunta_direccion: string;
    mensaje_bienvenida: string;
    mensaje_fallback: string;
    segmento: string;
    ciiu: string;
    moneda: string;
    hora_reporte: string;
    numero_dueno: string;
    pregunta_direccion: string;
    mensaje_bienvenida: string;
    mensaje_fallback: string;
    segment: string;
    ciiu: string;
    currency: string;
    report_time: string;
    owner_number: string;
    business_location: { lat: number; lng: number };
    domicilios: any;
    report_hour: string;
    owner_phone: string;
    business_location: { lat: number; lng: number };
    delivery: any;
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
    llm: {
      proveedor: string;
      base_url: string;
      modelo: string;
      api_key: string;
      limite_diario: number;
      limite_mensual: number;
    };
    asistentes_ia: {
      modelo: string;
      api_key: string;
      limite_diario: number;
      limite_mensual: number;
    };
    vision: {
      modelo: string;
      api_key: string;
      limite_diario: number;
      limite_mensual: number;
    };
    gemini_model: string;
    integracion: {
      tipo: string;
      username?: string;
      access_key?: string;
      partner_id?: string;
      document_id?: number;
      payment_id?: number;
      tax_id?: number;
      customer_identification?: string;
      stamp_dian?: boolean;
      email?: string;
      token?: string;
      id_type?: string;
      customer_identification?: string;
      tax_id?: string;
      payment_form?: string;
      stamp_dian?: boolean;
      email?: string;
      password?: string;
      prefijo?: string;
      customer_email?: string;
      city_code?: string;
      payment_form?: string;
      payment_method?: string;
      username?: string;
      password?: string;
      prefijo?: string;
      customer_type_id?: string;
      customer_email?: string;
      customer_city?: string;
      payment_form?: string;
      payment_method?: string;
      api_key?: string;
      secret_key?: string;
      prefijo?: string;
      cliente_tipo_id?: string;
      cliente_email?: string;
      cliente_ciudad?: string;
      forma_pago?: string;
      metodo_pago?: string;
      nit?: string;
      password?: string;
      codigo_software?: string;
      pin_software?: string;
      cert_path?: string;
      cert_pass?: string;
      ambiente?: string;
      prefijo?: string;
      cliente_tipo_id?: string;
      cliente_email?: string;
      cliente_municipio?: string;
      cliente_departamento?: string;
      empresa_ciudad?: string;
      empresa_depto?: string;
      url?: string;
      token?: string;
      header?: string;
      valor?: string;
      timeout?: number;
      token?: string;
      chat_id?: string;
    };
    alertas: {
      telegram: {
        token?: string;
        chat_id?: string;
      };
    };
    panel_password: string;
    segmento: string;
    ciiu: string;
    moneda: string;
    hora_reporte: string;
    numero_dueno: string;
    ubicacion_negocio: { lat: number; lng: number };
    domicilios: {
      faixas: Array<{
        hasta_km: number;
        tipo: 'gratis' | 'fijo' | 'por_km';
        valor: number;
        minimo?: number;
        pedido_minimo?: number;
      }>;
      radio_max_entrega_km: number;
      gratis_si_total_sobre: number;
    };
    max_unidades_confirmar: number;
    pregunta_direccion: string;
    mensaje_bienvenida: string;
    mensaje_fallback: string;
    segmento: string;
    ciiu: string;
    moneda: string;
    hora_reporte: string;
    numero_dueno: string;
    ubicacion_negocio: { lat: number; lng: number };
    domicilios: {
      faixas: Array<{
        hasta_km: number;
        tipo: 'gratis' | 'fijo' | 'por_km';
        valor: number;
        minimo?: number;
        pedido_minimo?: number;
      }>;
      radio_max_entrega_km: number;
      gratis_si_total_sobre: number;
    };
    max_unidades_confirmar: number;
    pregunta_direccion: string;
    mensaje_bienvenida: string;
    mensaje_fallback: string;
    plan_basico: {
      limite_diario: number;
      limite_mensual: number;
      precio_mensual: number;
    };
    plan_pro: {
      limite_diario: number;
      limite_mensual: number;
      precio_mensual: number;
    };
    plan_empresa: {
      limite_diario: number;
      limite_mensual: number;
      precio_mensual: number;
    };
    alertas: {
      telegram: {
        token?: string;
        chat_id?: string;
      };
    };
    planes_ia: {
      basico: {
        nombre: string;
        limite_diario: number;
        limite_mensual: number;
        precio_mensual: number;
        descripcion: string;
      };
      pro: {
        nombre: string;
        limite_diario: number;
        limite_mensual: number;
        precio_mensual: number;
        descripcion: string;
      };
      empresa: {
        nombre: string;
        limite_diario: number;
        limite_mensual: number;
        precio_mensual: number;
        descripcion: string;
      };
    };
    alertas: {
      telegram: {
        token?: string;
        chat_id?: string;
      };
    };
    planes_ia: {
      basico: {
        nombre: string;
        limite_diario: number;
        limite_mensual: number;
        precio_mensual: number;
        descripcion: string;
      };
      pro: {
        nombre: string;
        limite_diario: number;
        limite_mensual: number;
        precio_mensual: number;
        descripcion: string;
      };
      empresa: {
        nombre: string;
        limite_diario: number;
        limite_mensual: number;
        precio_mensual: number;
        descripcion: string;
      };
    };
    alertas: {
      telegram: {
        token?: string;
        chat_id?: string;
      };
    };
    mensaje_fallback: string;
    menu: {
      url: string;
      imagenes: string[];
      color: string;
      logo: string;
    };
    integracion: {
      tipo: string;
      username?: string;
      access_key?: string;
      partner_id?: string;
      document_id?: number;
      payment_id?: number;
      tax_id?: number;
      customer_identification?: string;
      stamp_dian?: boolean;
      email?: string;
      token?: string;
      id_type?: string;
      customer_identification?: string;
      tax_id?: string;
      payment_form?: string;
      stamp_dian?: boolean;
      email?: string;
      password?: string;
      prefijo?: string;
      customer_email?: string;
      city_code?: number;
      payment_form?: string;
      payment_method?: string;
      username?: string;
      password?: string;
      prefijo?: string;
      customer_type_id?: string;
      customer_email?: string;
      customer_city?: string;
      payment_form?: string;
      payment_method?: string;
      api_key?: string;
      secret_key?: string;
      prefijo?: string;
      cliente_tipo_id?: string;
      cliente_email?: string;
      cliente_ciudad?: string;
      forma_pago?: string;
      metodo_pago?: string;
      nit?: string;
      password?: string;
      codigo_software?: string;
      pin_software?: string;
      cert_path?: string;
      cert_pass?: string;
      ambiente?: string;
      prefijo?: string;
      cliente_tipo_id?: string;
      cliente_email?: string;
      cliente_municipio?: string;
      cliente_departamento?: string;
      empresa_ciudad?: string;
      empresa_depto?: string;
      url?: string;
      token?: string;
      header?: string;
      valor?: string;
      timeout?: number;
      token?: string;
      chat_id?: string;
    };
    facturacion: {
      proveedor: string;
      emision_automatica: boolean;
      estado_dispara: string;
      enviar_mail: boolean;
      dian_propio: {
        ambiente: string;
        nit: string;
        dv: string;
        razonSocial: string;
        direccion: string;
        municipio: string;
        departamento: string;
        codigoPostal: string;
        telefono: string;
        email: string;
        responsabilidadFiscal: string[];
        regimenFiscal: string;
        codigoSoftware: string;
        pinSoftware: string;
        testSetId: string;
        certPath: string;
        certPass: string;
        prefijo: string;
        resolucionNumero: string;
        resolucionFecha: string;
        resolucionPrefijo: string;
        resolucionDesde: string;
        resolucionHasta: string;
      };
    };
    alertas: {
      telegram: {
        token?: string;
        chat_id?: string;
      };
    };
    planes_ia: {
      basico: {
        nombre: string;
        limite_diario: number;
        limite_mensual: number;
        precio_mensual: number;
        descripcion: string;
      };
      pro: {
        nombre: string;
        limite_diario: number;
        limite_mensual: number;
        precio_mensual: number;
        descripcion: string;
      };
      empresa: {
        nombre: string;
        limite_diario: number;
        limite_mensual: number;
        precio_mensual: number;
        descripcion: string;
      };
    };
    mensaje_fallback: string;
    menu: {
      url: string;
      imagenes: string[];
      color: string;
      logo: string;
    };
  };

  // Utility functions exported from config
  export const config: AppConfig;
  export const LLM_API_KEY: string;
  export const ASISTENTES_IA_API_KEY: string;
  export const VISION_API_KEY: string;
  export const GEMINI_API_KEY: string;
  export const SIIGO_API_KEY: string;
  export const ALEGRA_API_KEY: string;
  export const WEBHOOK_API_KEY: string;
  export const TELEGRAM_BOT_TOKEN: string;
  export const TELEGRAM_CHAT_ID: string;
  export const ALERTAS_TELEGRAM_TOKEN: string;
  export const ALERTAS_TELEGRAM_CHAT_ID: string;
  export const DB_HOST: string;
  export const DB_PORT: number;
  export const DB_NAME: string;
  export const DB_USER: string;
  export const DB_PASS: string;
  export const DB_POOL_SIZE: number;
  export const DB_DEBUG: boolean;
  export function normalizar(t: string): string;
  export function escaparRegex(s: string): string;
  export function esc(s: string): string;
  export function csvCell(v: string): string;
  export function fechaDia(): string;
  export function hoyInicio(): string;
  export function numDeCelular(id: string): string;
  export function env(key: string, fallback?: string): string;
  export function envInt(key: string, fallback?: number): number;
  export function envBool(key: string, fallback?: boolean): boolean;
  export function nombreNegocio(): string;
  export function env(key: string, fallback?: string): string;
  export function envInt(key: string, fallback?: number): number;
  export function envBool(key: string, fallback?: boolean): boolean;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV?: string;
      PORT?: string;
      HOST?: string;
      DB_HOST?: string;
      DB_PORT?: string;
      DB_NAME?: string;
      DB_USER?: string;
      DB_PASS?: string;
      DB_POOL_SIZE?: string;
      DB_DEBUG?: string;
      DB_ENGINE?: string;
      REDIS_HOST?: string;
      REDIS_PORT?: string;
      REDIS_PASSWORD?: string;
      REDIS_DB?: string;
      MINIO_ENDPOINT?: string;
      MINIO_ACCESS_KEY?: string;
      MINIO_SECRET_KEY?: string;
      MINIO_BUCKET?: string;
      MINIO_REGION?: string;
      MINIO_SECURE?: string;
      JWT_SECRET?: string;
      JWT_ISSUER?: string;
      JWT_AUDIENCE?: string;
      JWT_ACCESS_TTL?: string;
      JWT_REFRESH_TTL_DAYS?: string;
      JWT_ROTATION_DAYS?: string;
      LLM_PROVEEDOR?: string;
      LLM_BASE_URL?: string;
      LLM_MODEL?: string;
      LLM_API_KEY?: string;
      LLM_LIMITE_DIARIO?: string;
      LLM_LIMITE_MENSUAL?: string;
      ASISTENTES_IA_PROVEEDOR?: string;
      ASISTENTES_IA_BASE_URL?: string;
      ASISTENTES_IA_MODEL?: string;
      ASISTENTES_IA_API_KEY?: string;
      ASISTENTES_IA_LIMITE_DIARIO?: string;
      ASISTENTES_IA_LIMITE_MENSUAL?: string;
      VISION_PROVEEDOR?: string;
      VISION_BASE_URL?: string;
      VISION_MODEL?: string;
      VISION_API_KEY?: string;
      VISION_LIMITE_DIARIO?: string;
      VISION_LIMITE_MENSUAL?: string;
      GEMINI_API_KEY?: string;
      GEMINI_MODEL?: string;
      JWT_SECRET?: string;
      JWT_ISSUER?: string;
      JWT_AUDIENCE?: string;
      JWT_ACCESS_TTL?: string;
      JWT_REFRESH_TTL_DAYS?: string;
      JWT_ROTATION_DAYS?: string;
      REFRESH_PEPPER?: string;
      JWT_SECRET_ROTATION?: string;
      REFRESH_PEPPER?: string;
      DB_PASS?: string;
      MINIO_ACCESS_KEY?: string;
      MINIO_SECRET_KEY?: string;
      KEYCLOAK_ADMIN_PASSWORD?: string;
      GRAFANA_PASSWORD?: string;
      JWT_REFRESH_PEPPER?: string;
      JWT_SECRET_ROTATION?: string;
      REFRESH_PEPPER?: string;
      PANEL_PASSWORD?: string;
    }
  }
}