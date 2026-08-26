-- PostgreSQL Initialization Script for Soluciona IA
-- Runs automatically on first database initialization

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgvector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_partman";
CREATE EXTENSION IF NOT EXISTS "pgaudit";
CREATE EXTENSION IF NOT EXISTS "pg_stat_monitor";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS soluciona;
CREATE SCHEMA IF NOT EXISTS audit;

-- Set default search path
ALTER DATABASE soluciona_ia SET search_path = soluciona, public;

-- Create custom types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'super_admin', 'admin', 'gerente', 'operador', 
        'cocina', 'domiciliario', 'contador', 'asesor', 'solo_lectura'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM (
        'recibido', 'confirmado', 'en_preparacion', 'listo', 
        'en_camino', 'entregado', 'cancelado', 'devuelto'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE order_type AS ENUM (
        'domicilio', 'recoger', 'mesa', 'consumo_local'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM (
        'pendiente', 'pagado', 'parcial', 'reembolsado', 'fallido'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE subscription_tier AS ENUM (
        'free', 'pro', 'enterprise'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM (
        'active', 'past_due', 'canceled', 'trial'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE business_segment AS ENUM (
        'comidas', 'salud', 'retail', 'belleza', 'servicios', 
        'manufactura', 'agro', 'otros'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Grant permissions
GRANT USAGE ON SCHEMA soluciona TO PUBLIC;
GRANT USAGE ON SCHEMA audit TO PUBLIC;

-- Set default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA soluciona GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO soluciona_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA soluciona GRANT USAGE, SELECT ON SEQUENCES TO soluciona_app;

-- Create application user
DO $$ BEGIN
    CREATE USER soluciona_app WITH PASSWORD 'secure_password_change_in_production';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT CONNECT ON DATABASE soluciona_ia TO soluciona_app;
GRANT USAGE ON SCHEMA soluciona TO soluciona_app;
GRANT USAGE ON SCHEMA audit TO soluciona_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA soluciona TO soluciona_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA soluciona TO soluciona_app;

-- Set timezone
SET timezone = 'America/Bogota';

-- Log completion
DO $$ BEGIN
    RAISE NOTICE 'Soluciona IA database initialized successfully';
END $$;