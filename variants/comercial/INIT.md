# INIT.md — System Software Development: Variante Comercial
# Soluciona Inteligencia Artificial - SaaS Multi-tenant

## 1. Propósito

Inicialización canónica para desarrollo en la variante **Comercial**. Garantiza onboarding < 15 min y entorno reproducible.

## 2. Prerrequisitos Específicos

```bash
# Versiones mínimas
Node.js    >= 22.0.0 (LTS)
npm        >= 10.0.0
Docker     >= 24.0.0
Docker Compose >= 2.20.0
PostgreSQL 16 (o Docker)
Redis      7 (o Docker)
MinIO      (o S3 compatible)
```

## 3. Bootstrap Comercial (Un Comando)

```bash
# Desde raíz del monorepo
cd soluciona-inteligencia-artificial-comercial

# 1. Instalar dependencias
npm ci

# 2. Configurar entorno
cp .env.example .env
cp config.example.json config.json

# 3. Levantar stack completo (DB, Redis, MinIO, Monitoring)
docker compose -f docker-compose.yml up -d

# 4. Ejecutar migraciones
npm run db:migrate

# 5. Seed datos de prueba
npm run db:seed

# 6. Verificar instalación
npm run check  # lint + typecheck + test
```

## 4. Variables de Entorno Críticas (.env)

```bash
# App
NODE_ENV=development
APP_VERSION=1.0.0-dev
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/soluciona_comercial
# Para SQLite dev (sin Docker):
# DATABASE_URL=file:./data/dev.db

# Redis
REDIS_URL=redis://localhost:6379

# MinIO / S3
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=soluciona-files
MINIO_USE_SSL=false

# Auth
JWT_SECRET=change-me-min-32-chars-in-production
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
JWT_KID=soluciona-key-1

# WhatsApp (Baileys legacy)
WHATSAPP_SESSION_PATH=./data/whatsapp-session

# WhatsApp Cloud API (Migración en progreso)
WHATSAPP_CLOUD_PHONE_NUMBER_ID=your-phone-id
WHATSAPP_CLOUD_ACCESS_TOKEN=your-access-token
WHATSAPP_CLOUD_WEBHOOK_VERIFY_TOKEN=your-verify-token

# DIAN (Facturación electrónica)
DIAN_ENVIRONMENT=habilitacion  # habilitacion | produccion
DIAN_SOFTWARE_ID=your-software-id
DIAN_SOFTWARE_PIN=your-pin
DIAN_CERT_PATH=./certs/dian.p12
DIAN_CERT_PASSWORD=test1234

# NVIDIA AI (Gratis)
NVIDIA_API_KEY=your-nvidia-api-key
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1

# Observability
LOG_LEVEL=debug
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
PROMETHEUS_PORT=9464
```

## 5. Estructura de Directorios Comercial

```
soluciona-inteligencia-artificial-comercial/
├── .github/workflows/      # CI/CD específico
├── .opencode/              # Config IA (agents, skills)
├── docs/
│   ├── architecture/       # ADRs, diagramas C4
│   ├── api/                # OpenAPI 3.1 specs
│   ├── runbooks/           # Procedimientos operativos
│   └── adr/                # Architecture Decision Records
├── src/
│   ├── domain/
│   │   ├── entities/       # Order, Product, Customer, Invoice, Lot, Employee...
│   │   ├── aggregates/     # OrderAggregate, InventoryAggregate
│   │   ├── value-objects/  # Money, Email, LotNumber, ExpiryDate, StorageCondition
│   │   ├── repositories/   # Interfaces (Ports)
│   │   └── events/         # Domain Events
│   ├── application/
│   │   ├── use-cases/      # CreateOrder, AllocateStockFEFO, CalculatePrice...
│   │   └── dto/            # Data Transfer Objects
│   ├── infrastructure/
│   │   ├── database/       # Drizzle repositories, migrations
│   │   ├── repositories/   # Implementaciones
│   │   ├── external/       # WhatsApp, DIAN, NVIDIA, Email adapters
│   │   └── messaging/      # Redis Streams Event Bus
│   ├── interfaces/
│   │   ├── http/           # Fastify routes, plugins, middleware
│   │   ├── websocket/      # Socket.io handlers
│   │   └── graphql/        # Schema + resolvers (futuro)
│   └── shared/
│       ├── kernel/         # Result, Events, DomainEvent
│       ├── config/         # Zod schemas tipados
│       ├── utils/          # Logger, Validation, Crypto
│       └── observability/  # OTEL, Metrics, Tracing
├── packages/design-system/ # React + Storybook
├── dian-middleware/        # Facturación electrónica standalone
├── monitoring/             # Prometheus, Grafana, Loki, Tempo
├── nginx/                  # Reverse proxy configs
├── tests/
│   ├── unit/               # 75% - Domain logic, VOs, Services
│   ├── integration/        # 20% - DB, Redis, External APIs
│   └── e2e/                # 5% - Critical paths (Playwright)
├── scripts/                # Migration, seeds, utilities
├── docker-compose.yml      # Dev stack completo
├── docker-compose.staging.yml
├── docker-compose.prod.yml
├── Dockerfile.dev
├── Dockerfile.prod
├── Makefile
├── package.json
├── tsconfig.json
├── SPEC.md
├── INIT.md
├── README.md
├── .env.example
├── config.example.json
└── .gitignore
```

## 6. Comandos Útiles (Makefile + npm scripts)

```bash
# Desarrollo
npm run dev              # Hot reload con tsx watch
make dev                 # Equivalente + docker compose up

# Base de datos
npm run db:generate      # Generar migración (drizzle-kit)
npm run db:migrate       # Aplicar migraciones
npm run db:seed          # Datos de prueba
npm run db:studio        # Drizzle Studio UI
npm run db:verify-pg     # Verificar migración PG

# Calidad
npm run lint             # ESLint + Prettier check
npm run format           # Prettier --write
npm run typecheck        # TypeScript strict
npm run check            # lint + typecheck + test

# Testing
npm run test             # Todos (vitest)
npm run test:unit        # Solo unitarios (>85%)
npm run test:integration # Integración con Testcontainers
npm run test:e2e         # E2E Playwright
npm run test:coverage    # Cobertura >85%

# DIAN Middleware
cd dian-middleware && npm run habilitacion  # Prueba local DIAN

# Build & Deploy
npm run build            # TypeScript compile
docker build -f Dockerfile.prod -t soluciona-comercial .
docker compose -f docker-compose.prod.yml up -d
```

## 7. Accesos de Desarrollo

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| Panel Web | http://localhost:3000 | admin@localhost / (ver consola) |
| Panel Empresarial | http://localhost:3000/panel-empresarial | Same |
| Panel Global | http://localhost:3000/panel-global | Same |
| Health Check | http://localhost:3000/health | Public |
| Grafana | http://localhost:3001 | admin / admin |
| Prometheus | http://localhost:9090 | Public |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |
| Keycloak | http://localhost:8080 | admin / admin |
| Drizzle Studio | http://localhost:4983 | Public |

## 8. Testing Strategy Comercial

```bash
# Pirámide de Testing
# Unit (75%): Domain entities, VOs, Domain Services, Pricing, FEFO
# Integration (20%): Drizzle repos, DIAN API, WhatsApp, NVIDIA AI
# E2E (5%): Login → Order → Invoice → Payment → Stock update

# Ejecutar tests
npm run test:unit           # Rápido, sin BD externa
npm run test:integration    # Requiere PostgreSQL + Redis (Testcontainers)
npm run test:e2e            # Requiere stack completo up

# Coverage targets
# Lines: >85%
# Functions: >85%
# Branches: >75%
# Statements: >85%
```

## 9. Convenciones Específicas Comercial

### 9.1 Naming Entidades Principales
```typescript
// Entidades core (sufijo Entity implícito)
Order, OrderItem, Payment
Product, ProductVariant, Category
Customer, Supplier
Invoice, InvoiceItem, CreditNote, Payment
InventoryLot, Stock, StockMovement
PurchaseOrder, PurchaseOrderItem, PurchaseReceipt
Employee, PayrollPeriod, PayrollDetail
Account, JournalEntry, JournalEntryLine
User, Session, Role, Permission
Tenant, ConfigVersion, ConfigSecret
```

### 9.2 Multi-Tenant (Obligatorio)
```typescript
// TODAS las entidades tienen tenantId
interface BaseEntity {
  tenantId: string;  // UUID del tenant
}

// RLS en PostgreSQL: SET LOCAL app.current_tenant = 'tenant-uuid'
// Middleware setea automáticamente en cada request
```

### 9.3 Feature Flags por Tier
```typescript
// Verificar antes de funcionalidad
const features = await getClientFeatures(tenantId);
if (!features.inventoryAdvanced) {
  throw new BusinessError('Inventory advanced not enabled for this tier');
}
```

## 10. CI/CD Pipeline Comercial

```yaml
# .github/workflows/ci-cd.yml (resumen)
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - checkout + setup-node + npm ci
      - lint + typecheck + test:unit
      - CodeQL + Semgrep + Trivy
  
  integration:
    needs: quality
    services: postgres, redis
    steps:
      - npm run db:migrate + test:integration
  
  docker:
    needs: integration
    steps:
      - build + push GHCR
  
  deploy-staging:
    needs: docker
    if: branch == develop
    steps: ArgoCD deploy staging
  
  deploy-prod:
    needs: docker
    if: tag starts with v
    steps: ArgoCD canary deploy (10%→50%→100%)
```

## 11. Troubleshooting Común

| Problema | Solución |
|----------|----------|
| `Vitest` falla en Windows + Node 24 | Usar `node --test` para unit tests puros; Vitest solo integration |
| `Drizzle` migración falla | Verificar `DATABASE_URL`, ejecutar `npm run db:generate` primero |
| `WhatsApp` QR no aparece | Verificar `WHATSAPP_SESSION_PATH` permisos; limpiar carpeta session |
| `DIAN` error certificado | Regenerar `.p12` con `node-forge`; verificar password `test1234` |
| `NVIDIA AI` rate limit | Usar `deepseek-v4-flash-free` via opencode; cache responses |
| `RLS` no filtra | Verificar middleware `tenant-context` ejecuta `SET LOCAL app.current_tenant` |

## 12. Próximos Pasos Post-Bootstrap

1. **Leer SPEC.md** - Entender roadmap y specs prioritarias
2. **Ejecutar test suite** - `npm run test` debe pasar todo verde
3. **Crear primera branch** - `git checkout -b feat/SPEC-XXX`
4. **Implementar spec P0** - Seguir ciclo SDD: Spec → Tests → Code → Docs
5. **PR + Review** - CI verde + 1 approval + PO sign-off → merge

---

*Versión: 1.0.0 | Actualizado: 2026-09-21 | Variante: Comercial*