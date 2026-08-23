# Configuración de PostgreSQL para soluciona-inteligencia-artificial-comercial

## Opción 1: Docker (Recomendado)

```bash
# Levantar PostgreSQL + Redis
docker-compose up -d

# Ver logs
docker-compose logs -f postgres

# Detener
docker-compose down

# Detener y borrar volúmenes (¡CUIDADO! borra datos)
docker-compose down -v
```

## Opción 2: Instalación nativa Windows

1. Descargar PostgreSQL 16: https://www.postgresql.org/download/windows/
2. Instalar con contraseña: `postgres`
3. Puerto por defecto: 5432
4. Crear base de datos:
   ```sql
   CREATE DATABASE soluciona_inteligencia_artificial_comercial;
   CREATE USER postgres WITH PASSWORD 'postgres';
   GRANT ALL PRIVILEGES ON DATABASE soluciona_inteligencia_artificial_comercial TO postgres;
   ```

## Variables de entorno (.env)

Copiar `.env.example` a `.env` y ajustar:

```bash
DB_ENGINE=sqlite        # 'sqlite' (por defecto) | 'postgres'
DB_HOST=localhost
DB_PORT=5432
DB_NAME=soluciona_inteligencia_artificial_comercial
DB_USER=postgres
DB_PASS=postgres
DB_POOL_SIZE=10
DB_DEBUG=false
```

> **Motor operacional** (`DB_ENGINE`): controla dónde se guardan los datos del runtime
> (pedidos, clientes, conversaciones, lid_map, uso_ia, citas).
> - `sqlite` (por defecto): usa `data/neurallgo.db` (node:sqlite) — comportamiento original.
> - `postgres`: usa PostgreSQL con API síncrona vía worker thread (`core/db-pg.js`).
> La autenticación, configuración y auditoría (users, roles, config_versions, audit_logs)
> viven **siempre** en PostgreSQL.

## Migrar datos de SQLite a PostgreSQL

```bash
# 1. (una vez) el runtime debe estar con DB_ENGINE=postgres en .env
# 2. Copiar datos de data/neurallgo.db a PostgreSQL (idempotente):
npm run db:migrate-data

# 3. Verificar que el backend PostgreSQL responde igual que SQLite:
npm run db:verify-pg
```

El script `db:migrate-data` copia `pedidos`, `clientes`, `conversaciones`, `lid_map`,
`uso_ia` y `citas` (y completa el tenant en `tenants`). Es idempotente: puede ejecutarse
varias veces sin duplicar datos (usa `ON CONFLICT DO NOTHING`).

## Inicializar base de datos

```bash
# Instalar dependencias
npm install

# Generar migraciones (después de cambios en schema.ts)
npm run db:generate

# Aplicar migraciones
npm run db:migrate

# O inicializar directo (crea tablas + seed)
npm run db:init

# Ver Drizzle Studio (GUI para DB)
npm run db:studio
```

## Verificar conexión

```bash
# Test rápido
npm run db:init
```

## Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `npm run db:generate` | Genera migraciones SQL desde schema.ts |
| `npm run db:migrate` | Aplica migraciones pendientes |
| `npm run db:studio` | Abre Drizzle Studio (GUI web) |
| `npm run db:init` | Inicializa DB + seed (crea tablas, admin, PUC) |
| `npm run db:seed` | Solo seed (admin, PUC, permisos) |
| `npm run db:migrate-data` | Migra datos de SQLite a PostgreSQL |
| `npm run db:verify-pg` | Verifica el backend PostgreSQL (24 tests) |

## Estructura de tablas creada

- **tenants** - Multi-negocio
- **users, sessions** - Auth + RBAC
- **permissions, role_permissions, user_permissions** - RBAC granular
- **config_versions, config_secrets** - Config versionado + secrets
- **categories, products, product_variants** - Catálogo
- **stock, stock_movements** - Inventario + Kardex
- **suppliers, purchase_orders, purchase_receipts** - Compras
- **customers, invoices, payments, credit_notes** - CxC
- **payroll_employees, payroll_periods, payroll_details** - Nómina
- **accounts, journal_entries, journal_entry_lines** - Contabilidad PUC
- **audit_logs** - Auditoría inmutable

## Usuario admin por defecto

- Email: `admin@localhost`
- Password: **sin valor por defecto**. Se toma de la variable de entorno `ADMIN_PASSWORD`; si no está definida, en la primera creación se genera una contraseña aleatoria fuerte que se imprime en consola (guárdala).
- Definir siempre `ADMIN_PASSWORD` en producción antes del primer arranque.
- **Cambiar en primer login.**

## Drizzle Studio (GUI)

```bash
npm run db:studio
# Abre http://localhost:4983
```