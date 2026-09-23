# INIT.md — System Software Development Initialization
# Soluciona Inteligencia Artificial

## 1. Propósito

Este documento establece la **inicialización canónica** del sistema de desarrollo para cualquier ingeniero (humano o IA) que entre al proyecto. Garantiza reproducibilidad, consistencia y onboarding < 15 min.

## 2. Entorno de Desarrollo Requerido

### 2.1 Herramientas Base (Versiones Mínimas)

```bash
# Verificar versiones
node --version    # >= 22.0.0 (LTS)
npm --version     # >= 10.0.0
git --version     # >= 2.40.0
docker --version  # >= 24.0.0
docker compose version  # >= 2.20.0
```

### 2.2 Toolchain de Calidad (Instalación Global Opcional)

```bash
# Linting/Formatting (usar versiones locales via npx preferiblemente)
npm i -g eslint@latest prettier@latest @typescript-eslint/parser@latest

# Type Checking
npm i -g typescript@latest

# Testing
npm i -g vitest@latest @vitest/ui@latest

# Database
npm i -g drizzle-kit@latest

# Git Hooks
npm i -g husky@latest lint-staged@latest

# opencode CLI
npm i -g @opencode/cli@latest
```

### 2.3 VS Code / Cursor Extensions (Recomendadas)

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "vitest.explorer",
    "github.copilot",
    "github.copilot-chat",
    "ms-azuretools.vscode-docker",
    "redhat.vscode-yaml"
  ]
}
```

## 3. Bootstrap del Proyecto (Un Solo Comando)

```bash
# 1. Clonar repositorio
git clone https://github.com/DiegoAlejandroSaenzFalcon/Soluciona-Inteligencia-Artificial.git
cd Soluciona-Inteligencia-Artificial

# 2. Instalar dependencias raíz (tooling compartido)
npm ci

# 3. Instalar dependencias por variante
cd soluciona-inteligencia-artificial-comercial && npm ci
cd ../soluciona-inteligencia-artificial-empresarial && npm ci

# 4. Configurar entorno (plantillas)
cp .env.example .env
cp config.example.json config.json

# 5. Verificar instalación completa
npm run check:all  # lint + typecheck + test (root)
```

### 3.1 Scripts Raíz (package.json)

```json
{
  "name": "soluciona-inteligencia-artificial-root",
  "private": true,
  "scripts": {
    "check:all": "npm run lint && npm run typecheck && npm run test",
    "lint": "npm run lint --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "bootstrap": "npm ci && npm run bootstrap --workspaces --if-present",
    "docker:up": "docker compose -f docker-compose.yml up -d",
    "docker:down": "docker compose -f docker-compose.yml down"
  },
  "workspaces": [
    "soluciona-inteligencia-artificial-comercial",
    "soluciona-inteligencia-artificial-empresarial"
  ]
}
```

## 4. Estructura de Directorios Canónica (SSD)

```
<variant>/
├── .github/workflows/      # CI/CD específico de la variante
├── .opencode/              # Config IA (agents, skills, permissions)
│   ├── agents/             # Agentes especializados
│   ├── skills/             # Skills SDD/SSD/DDD/CA
│   └── config.json         # Config opencode variante
├── docs/                   # Documentación técnica variante
│   ├── architecture/       # ADRs, diagramas, decisiones
│   ├── api/                # OpenAPI specs, contratos
│   ├── runbooks/           # Procedimientos operativos
│   └── adr/                # Architecture Decision Records
├── src/                    # Código fuente (Clean Architecture)
│   ├── domain/             # Entities, VOs, Events, Repositories (Interfaces)
│   ├── application/        # Use Cases, DTOs, Commands, Queries
│   ├── infrastructure/     # DB, Repositories (Impl), Adapters, External
│   ├── interfaces/         # HTTP (Fastify), WS, CLI, GraphQL
│   └── shared/             # Kernel: Result, Events, Config, Utils, Observability
├── tests/                  # Tests (unit, integration, e2e)
│   ├── unit/               # Lógica pura, domain (75%)
│   ├── integration/        # DB, Redis, External APIs (20%)
│   └── e2e/                # Critical paths Playwright (5%)
├── scripts/                # Migration, seeds, utilities
├── monitoring/             # Prometheus, Grafana, Loki, Tempo, Alertmanager
├── docker-compose.yml      # Orquestación desarrollo
├── docker-compose.staging.yml
├── docker-compose.prod.yml
├── Dockerfile.dev
├── Dockerfile.prod
├── Makefile                # Comandos unificados
├── package.json
├── tsconfig.json           # Extiende @soluciona/tsconfig-base
├── SPEC.md                 # Spec de la variante
├── INIT.md                 # Init de la variante
├── README.md
├── .env.example
├── config.example.json
├── .gitignore
└── .tool-versions          # Versiones exactas (volta/asdf)
```

## 5. Convenciones de Código (Enforceadas por Tooling)

### 5.1 TypeScript Strict (tsconfig.base.json)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@soluciona/*": ["tooling/*/src"],
      "@comercial/*": ["soluciona-inteligencia-artificial-comercial/src/*"],
      "@empresarial/*": ["soluciona-inteligencia-artificial-empresarial/src/*"]
    }
  }
}
```

### 5.2 ESLint + Prettier (Config Compartida en `tooling/`)

```
tooling/
├── eslint-config/
│   ├── base.js           # Config base
│   ├── node.js           # Node.js specific
│   ├── react.js          # React (design-system)
│   └── typescript.js     # TypeScript strict
├── prettier-config/
│   └── index.js          # Single quote, trailing comma, 100 chars
├── typescript-config/
│   ├── base.json         # tsconfig.base.json
│   ├── node.json         # Node.js
│   └── react.json        # React
└── vitest-config/
    ├── base.js
    ├── node.js
    └── react.js
```

### 5.3 Naming Conventions

| Elemento | Convención | Ejemplo |
|----------|------------|---------|
| Archivos | kebab-case | `product.repository.ts` |
| Clases/Interfaces | PascalCase | `ProductRepository` |
| Funciones/Variables | camelCase | `getProductById` |
| Constantes | UPPER_SNAKE | `MAX_RETRY_ATTEMPTS` |
| Types/Enums | PascalCase | `OrderStatus` |
| Tests | `*.test.ts` | `product.test.ts` |
| Specs | `SPEC-<ID>.md` | `SPEC-042-lot-tracking.md` |
| ADRs | `<num>-<topic>.md` | `001-use-drizzle-orm.md` |

## 6. Git Workflow (Enforceado por Husky + lint-staged)

### 6.1 Branching Strategy

```
main                    ← Protected, solo PR + CI verde + approval
├── develop             ← Integration branch (auto-deploy staging)
├── feature/SPEC-<id>   ← Nueva funcionalidad (spec-driven)
├── fix/ISSUE-<id>      ← Bug fix
├── docs/<topic>        ← Documentación
├── refactor/<area>     ← Refactor sin cambio funcional
├── chore/<task>        ← Mantenimiento, deps, tooling
└── release/v<version>  ← Release preparation
```

### 6.2 Commits Convencionales (commitlint)

```bash
# Formato
<type>(<scope>): <subject>

# Types permitidos
feat      # Nueva funcionalidad
fix       # Bug fix
docs      # Documentación
style     # Formatting (no code change)
refactor  # Refactor código
perf      # Performance
test      # Tests
chore     # Build, deps, tooling
revert    # Revert commit

# Scopes por variante
comercial, empresarial, residencial, root, shared, docs, ci, deps

# Ejemplos
feat(comercial): add lot tracking for food inventory
fix(empresarial): correct SLA calculation on holidays
docs(spec): update order status transitions
refactor(domain): extract value object for Money
test(inventory): add FEFO lot selection tests
chore(deps): update drizzle-orm to 0.32
```

### 6.3 Pre-commit Hooks (Husky + lint-staged)

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml,yaml}": ["prettier --write"],
    "*.{sql,graphql}": ["prettier --write"]
  }
}
```

### 6.4 Commit Message Validation (commitlint.config.js)

```js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'revert']],
    'scope-enum': [2, 'always', ['comercial', 'empresarial', 'residencial', 'root', 'shared', 'docs', 'ci', 'deps']],
    'subject-case': [2, 'always', 'sentence-case'],
    'subject-empty': [2, 'never'],
    'subject-max-length': [2, 'always', 100],
  },
};
```

## 7. Base de Datos (Migraciones + Seeds)

### 7.1 Drizzle ORM (PostgreSQL 16 + SQLite Dev)

```bash
# Generar migración (después de cambios en schema.ts)
npm run db:generate

# Aplicar migraciones
npm run db:migrate

# Seed datos de prueba
npm run db:seed

# Studio visual (Drizzle Studio)
npm run db:studio

# Verificar migración PostgreSQL
npm run db:verify-pg
```

### 7.2 Convención Migraciones

- **Nombre**: `<timestamp>_<descripcion_breve>.sql` (ej: `1726800000000_add_inventory_lots.sql`)
- **Una migración = un cambio atómico**
- **Nunca** editar migraciones ya aplicadas a `main`/`develop`
- **Rollback**: Migración inversa explícita (nueva migración)
- **Seed**: Solo datos de referencia/configuración, no datos de prueba volátiles

### 7.3 Multi-Tenant (RLS PostgreSQL)

```sql
-- Habilitado en TODAS las tablas de negocio
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON products
  USING (tenant_id = current_setting('app.current_tenant')::varchar);

-- Contexto de tenant en cada request (middleware)
SET LOCAL app.current_tenant = 'tenant-uuid';
```

## 8. Observabilidad (Estándar CNCF)

### 8.1 OpenTelemetry (Auto-instrumentación)

```typescript
// src/shared/observability/otel.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION, ATTR_DEPLOYMENT_ENVIRONMENT } from '@opentelemetry/semantic-conventions';

export const otelSDK = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'soluciona-ia',
    [ATTR_SERVICE_VERSION]: process.env.APP_VERSION || 'dev',
    [ATTR_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
  metricReader: new PrometheusExporter({
    port: parseInt(process.env.PROMETHEUS_PORT || '9464'),
    endpoint: '/metrics',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

otelSDK.start();
```

### 8.2 Métricas Obligatorias (RED Method)

| Métrica | Descripción | SLO |
|---------|-------------|-----|
| **Rate** | Requests/second | > 100 rps |
| **Errors** | Error rate % | < 0.1% |
| **Duration** | Latency P50, P95, P99 | P95 < 200ms, P99 < 500ms |

### 8.3 Logging Estructurado (Pino + Correlation ID)

```typescript
// src/shared/utils/logger.ts
import pino from 'pino';
import { randomUUID } from 'crypto';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: 'soluciona-ia',
    version: process.env.APP_VERSION,
    environment: process.env.NODE_ENV,
  },
  redact: {
    paths: ['*.password', '*.token', '*.secret', '*.authorization'],
    censor: '[REDACTED]',
  },
});

// Correlation ID middleware para Fastify
export function correlationIdMiddleware() {
  return async (request, reply) => {
    const correlationId = request.headers['x-correlation-id'] as string || randomUUID();
    request.log = logger.child({ correlationId });
    reply.header('x-correlation-id', correlationId);
  };
}

// Helper para child loggers con contexto
export function getLogger(context: string, bindings: Record<string, unknown> = {}) {
  return logger.child({ context, ...bindings });
}
```

### 8.4 Health Checks

```typescript
// src/interfaces/http/routes/health.ts
export const healthRoutes = async (fastify) => {
  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION,
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      whatsapp: await checkWhatsApp(),
    },
  }));

  fastify.get('/health/live', async () => ({ status: 'alive' }));
  fastify.get('/health/ready', async () => ({
    status: (await checkDatabase() && await checkRedis()) ? 'ready' : 'not ready',
  }));
};
```

## 9. Seguridad (Zero Trust + Supply Chain)

### 9.1 Secretos (Cero en Git - Regla Absoluta)

| ❌ Nunca se versiona | ✅ Se versiona (plantillas) |
|----------------------|-----------------------------|
| API keys reales (NVIDIA, Gemini, Telegram, DIAN) | `.env.example` / `config.example.json` |
| Sesiones WhatsApp (`auth_info/`, `.wwebjs_auth/`) | Estructura carpetas vacías (`.gitkeep`) |
| Bases de datos con datos reales (`data/`, `*.db`, `*.sqlite`) | `init-scripts/` (SQL limpio) |
| Configuraciones reales (`config.json`, `.env`, `.pem`, `.key`) | `keycloak/realm-export.json` (placeholders) |

> **Regla**: `git add` falla si detecta secretos (gitleaks en pre-commit + CI).

### 9.2 Supply Chain Security (SLSA Level 3 Target)

- `npm ci` only (lockfile frozen en CI)
- SBOM generado en CI (`@cyclonedx/bom`)
- Cosign signing para imágenes Docker
- Dependabot + Renovate automático (PRs automáticos)
- `npm audit` + `npm audit fix` en CI
- Trivy scan para imágenes Docker

### 9.3 OWASP Top 10 Compliance

- [x] **A01: Broken Access Control** - RLS PostgreSQL + RBAC + ABAC
- [x] **A02: Cryptographic Failures** - TLS 1.3, AES-256-GCM, Argon2id
- [x] **A03: Injection** - Parameterized queries (Drizzle), Zod validation, CSP
- [x] **A04: Insecure Design** - Threat modeling, Secure by Design
- [x] **A05: Security Misconfiguration** - Helmet.js, CSP nonce, HSTS, Secure cookies
- [x] **A06: Vulnerable Components** - Dependabot, Renovate, npm audit, Trivy, SLSA
- [x] **A07: Auth Failures** - Keycloak, MFA, Passkeys, Rate limiting, Account lockout
- [x] **A08: Software Integrity** - SLSA Level 3, Sigstore, SBOM, Cosign
- [x] **A09: Logging/Monitoring Failures** - OpenTelemetry, Loki, Alertmanager, SLOs
- [x] **A10: SSRF** - Egress filtering, allowlists, no user-controlled URLs

## 10. CI/CD Pipeline (GitHub Actions)

### 10.1 Workflows Raíz (`.github/workflows/`)

```
.github/workflows/
├── gitleaks.yml          # Secret scanning (all branches) - REQUIRED
├── docs.yml              # MkDocs build + deploy GitHub Pages
├── pages.yml             # Deploy alternativo GitHub Pages
└── release.yml           # Release automation (tags)
```

### 10.2 Workflow Variante Comercial (`.github/workflows/ci-cd.yml`)

```yaml
# Simplificado - ver archivo real en variante
jobs:
  quality:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./soluciona-inteligencia-artificial-comercial
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm', cache-dependency-path: 'soluciona-inteligencia-artificial-comercial/package-lock.json' }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:unit
      - run: npm run test:integration
      - uses: github/codeql-action/init@v3
        with: { languages: 'typescript', working-directory: './soluciona-inteligencia-artificial-comercial' }
      - uses: github/codeql-action/analyze@v3
      - uses: aquasecurity/trivy-action@master
        with: { scan-type: 'fs', scan-ref: './soluciona-inteligencia-artificial-comercial' }
      - uses: returntocorp/semgrep-action@v1

  docker:
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: docker/build-push-action@v5
        with:
          context: ./soluciona-inteligencia-artificial-comercial
          push: true
          tags: ghcr.io/diegoalejandrosaenzfalcon/soluciona-comercial:${{ github.sha }}

  deploy-staging:
    needs: docker
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: argoproj/argo-cd-action@v1
        with: { ... }

  deploy-prod:
    needs: docker
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: argoproj/argo-cd-action@v1
        with: { ... }
```

## 11. Onboarding Checklist (Nuevo Ingeniero - Target < 15 min)

- [ ] **Leer**: `SPEC.md` + `INIT.md` + `GOVERNANCE.md` + `QUALITY_GATES.md`
- [ ] **Ejecutar**: `npm run bootstrap` (script único en raíz)
- [ ] **Verificar**: `npm run check:all` pasa (lint + typecheck + test)
- [ ] **Levantar stack local**: `docker compose -f docker-compose.yml up -d`
- [ ] **Acceder a panel**: `http://localhost:3000` (comercial)
- [ ] **Ejecutar tests**: `npm run test` (en variante comercial)
- [ ] **Crear primera branch**: `git checkout -b feat/onboarding-test`
- [ ] **Hacer cambio trivial** + PR + ver CI pasar
- [ ] **Revisar**: `docs/architecture/` y `docs/api/` de la variante asignada
- [ ] **Configurar opencode**: `opencode auth` + `opencode run` (si aplica)

## 12. Comandos Útiles Unificados (Makefile Raíz)

```makefile
# Makefile (raíz)
.PHONY: help bootstrap check lint typecheck test docker-up docker-down clean

help:
	@echo "Soluciona IA - Comandos disponibles:"
	@echo "  make bootstrap    - Instala todo (root + workspaces)"
	@echo "  make check        - Lint + Typecheck + Tests (todas las variantes)"
	@echo "  make lint         - ESLint + Prettier check"
	@echo "  make typecheck    - TypeScript strict check"
	@echo "  make test         - Todos los tests"
	@echo "  make docker-up    - Levanta stack Docker completo"
	@echo "  make docker-down  - Detiene stack Docker"
	@echo "  make clean        - Limpia node_modules + dist + cache"

bootstrap:
	npm ci
	npm run bootstrap --workspaces --if-present

check: lint typecheck test

lint:
	npm run lint --workspaces --if-present

typecheck:
	npm run typecheck --workspaces --if-present

test:
	npm run test --workspaces --if-present

docker-up:
	docker compose -f soluciona-inteligencia-artificial-comercial/docker-compose.yml up -d
	docker compose -f soluciona-inteligencia-artificial-empresarial/docker-compose.yml up -d

docker-down:
	docker compose -f soluciona-inteligencia-artificial-comercial/docker-compose.yml down
	docker compose -f soluciona-inteligencia-artificial-empresarial/docker-compose.yml down

clean:
	rm -rf node_modules
	rm -rf soluciona-inteligencia-artificial-comercial/node_modules
	rm -rf soluciona-inteligencia-artificial-empresarial/node_modules
	rm -rf soluciona-inteligencia-artificial-comercial/dist
	rm -rf soluciona-inteligencia-artificial-empresarial/dist
```

---

*Última actualización: 2026-09-21 | Versión 1.0.0*