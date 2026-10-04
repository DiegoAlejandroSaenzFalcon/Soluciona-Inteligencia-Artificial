# Proceso Parametrizado de Desarrollo y Producción
## Soluciona Inteligencia Artificial — Versión 1.0 — 2026-09-10

---

## 1. Principios Rectores

1. **Configuración sobre convención**: Todo parametrizable via variables de entorno / archivos `.env` / `config.yaml`. Nada hardcodeado.
2. **Entornos como código**: Dev, Staging, Prod definidos en `infra/environments/{dev,staging,prod}.yaml` + Docker Compose overlays.
3. **Promoción unidireccional**: `feature/*` → `develop` → `main` (release tags) → `prod`. No saltos.
4. **Gates obligatorios**: Cada promoción requiere gates automatizados + approvals humanos.
5. **Observabilidad desde el día 1**: Healthchecks, métricas, logs estructurados en todo servicio.
6. **Rollback < 5 min**: Imágenes versionadas, blue/green, DB migraciones reversibles.

---

## 2. Definición de Entornos

| Parámetro | **Development (Local)** | **Staging (Oracle)** | **Production (Oracle)** |
|-----------|-------------------------|----------------------|-------------------------|
| **Trigger** | `git push` a `feature/*` o `develop` | Merge a `develop` | Git tag `v*` (release) |
| **Infra** | Docker Compose local (SQLite/PG opcional) | Oracle VM (1 VM, stack completo) | Oracle VM (1 VM, stack completo) + futuro HA |
| **DB** | SQLite (default) / PG local opcional | PostgreSQL 16 + pgvector (datos sintéticos/anónimos) | PostgreSQL 16 + pgvector (datos reales) |
| **Redis** | Local / Docker | Redis/Valkey + BullMQ | Redis/Valkey + BullMQ (AOF + RDB) |
| **WhatsApp** | Baileys (simulado) / Cloud API sandbox | Cloud API (número test) | Cloud API (número productivo) |
| **DIAN** | Modo test (certificado prueba) | Modo test (certificado prueba) | Modo producción (certificado real) |
| **IA / Modelos** | Free endpoints NVIDIA / Ollama local | Free endpoints NVIDIA / Ollama local | Mix free + paid (según presupuesto cliente) |
| **Secrets** | `.env.local` (gitignored) | `/opt/soluciona/env/.env.staging` (montado) | `/opt/soluciona/env/.env.production` (montado) |
| **Dominio** | `localhost:3000` | `staging.soluciona.ai` | `soluciona.ai` / cliente.custom |
| **TLS** | mkcert (local) | Let's Encrypt (staging) | Let's Encrypt (prod) |
| **Replicas** | 1 (dev) | 1 (staging) | 1 (prod) → futuro 2+ HA |
| **Resources** | Host local | 2 OCPU / 12 GB ARM64 | 2 OCPU / 12 GB ARM64 |

---

## 3. Variables de Entorno (Parámetros Maestros)

### 3.1 Archivo Maestro: `infra/environments/<env>.yaml`
```yaml
# infra/environments/dev.yaml (ejemplo)
environment: "development"
domain: "localhost"
port: 3000
protocol: "http"

database:
  provider: "sqlite"  # o "postgresql"
  sqlite_path: "./data/dev.db"
  postgresql:
    host: "localhost"
    port: 5432
    name: "soluciona_dev"
    user: "postgres"
    password: "${DEV_DB_PASS}"  # resuelto desde .env.local
    ssl: false
    pool_size: 5

redis:
  host: "localhost"
  port: 6379
  password: "${DEV_REDIS_PASS}"
  db: 0

whatsapp:
  transport: "baileys"  # o "cloud"
  cloud:
    phone_id: "${DEV_WHATSAPP_CLOUD_PHONE_ID}"
    access_token: "${DEV_WHATSAPP_CLOUD_TOKEN}"
    waba_id: "${DEV_WHATSAPP_BUSINESS_ACCOUNT_ID}"
    app_secret: "${DEV_WHATSAPP_APP_SECRET}"
    webhook_verify_token: "${DEV_WHATSAPP_WEBHOOK_VERIFY_TOKEN}"

dian:
  mode: "test"
  cert_path: "./certs/dian_test.p12"
  cert_password: "${DEV_DIAN_CERT_PASS}"
  endpoint: "https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc"
  test_set_id: "0"

ai:
  provider: "nvidia"  # nvidia, ollama, openai
  model: "deepseek-v4-pro"
  free_only: true
  fallback_models: ["nemotron-3-ultra", "kimi-k3", "mistral"]

observability:
  log_level: "debug"
  metrics_port: 9090
  healthcheck_interval: 30s

feature_flags:
  whatsapp_cloud_api: false
  dian_propio: true
  agentic_read_only: true
  multi_tenant: true
```

### 3.2 Resolución de Variables (Precedencia)
1. **Defaults** en `config.example.json` / `config.js` / `src/shared/config/index.ts`
2. **Environment file** `.env.<environment>` (gitignored, montado en runtime)
3. **Shell env vars** (CI/CD, Docker `-e`, Kubernetes `envFrom`)
4. **Runtime overrides** (feature flags via API admin)

**Regla**: Nunca commitear `.env.*` real. Solo `.env.example` en repo.

---

## 4. Pipeline CI/CD (Gates Parametrizados)

### 4.1 Estructura de Jobs (`.github/workflows/ci-cd.yml` corregido)

```yaml
# Working directory corregido: soluciona-inteligencia-artificial-comercial/
jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./soluciona-inteligencia-artificial-comercial
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm', cache-dependency-path: soluciona-inteligencia-artificial-comercial/package-lock.json }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npx prettier --check .

  unit-tests:
    needs: lint-and-typecheck
    defaults:
      run:
        working-directory: ./soluciona-inteligencia-artificial-comercial
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - uses: codecov/codecov-action@v4

  integration-tests:
    needs: lint-and-typecheck
    defaults:
      run:
        working-directory: ./soluciona-inteligencia-artificial-comercial
    services:
      postgres: { image: postgres:16-alpine, env: { POSTGRES_DB: soluciona_test, POSTGRES_USER: postgres, POSTGRES_PASSWORD: postgres }, ports: [5432:5432], options: "healthcheck..." }
      redis: { image: redis:7-alpine, ports: [6379:6379], options: "healthcheck..." }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run db:migrate
        env: { DB_HOST: localhost, DB_PORT: 5432, DB_NAME: soluciona_test, DB_USER: postgres, DB_PASS: postgres }
      - run: npm run test:integration
        env: { DB_HOST: localhost, DB_PORT: 5432, DB_NAME: soluciona_test, DB_USER: postgres, DB_PASS: postgres, REDIS_HOST: localhost, REDIS_PORT: 6379 }

  security-scan:
    needs: lint-and-typecheck
    defaults:
      run:
        working-directory: ./soluciona-inteligencia-artificial-comercial
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=high
      - uses: github/codeql-action/init@v3 { languages: [javascript, typescript] }
      - uses: github/codeql-action/analyze@v3
      - uses: returntocorp/semgrep-action@v1 { config: "p/ci p/secrets p/security-audit p/nodejs" }
      - uses: aquasecurity/trivy-action@master { scan-type: 'fs', severity: 'HIGH,CRITICAL' }

  docker-build:
    needs: [lint-and-typecheck, unit-tests, integration-tests, security-scan]
    if: github.event_name == 'push' || github.event_name == 'release'
    defaults:
      run:
        working-directory: ./soluciona-inteligencia-artificial-comercial
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3 { registry: ghcr.io, username: ${{ github.actor }}, password: ${{ secrets.GITHUB_TOKEN }} }
      - uses: docker/metadata-action@v5 { images: ghcr.io/${{ github.repository }}, tags: "type=ref,event=branch|type=semver,pattern={{version}}|type=raw,value=latest,enable={{is_default_branch}}" }
      - uses: docker/build-push-action@v5 { context: ., file: ./Dockerfile.prod, push: true, tags: ${{ steps.meta.outputs.tags }}, platforms: linux/amd64,linux/arm64, cache-from: type=gha, cache-to: type=gha,mode=max }
```

### 4.2 Gates de Promoción (Obligatorios)

| Promoción | Gates Automatizados | Approvals Humanos |
|-----------|---------------------|-------------------|
| `feature/*` → `develop` (PR) | Lint, Typecheck, Unit Tests, Security Scan | `reviewer` + `architect` (si breaking) |
| `develop` → Staging (auto deploy) | Todo lo anterior + Integration Tests + Docker Build (ARM64/AMD64) | `devops` (confirma staging saludable) |
| `main` (release tag `v*`) → Prod | Todo lo anterior + Integration Tests en staging + E2E smoke tests | `director` + `architect` + `security` + `devops` |
| Hotfix `hotfix/*` → `main` → Prod | Lint, Typecheck, Unit Tests, Security, **Integration Tests obligatorios** | `director` + `architect` + `security` |

---

## 5. Estrategia de Versionado

### 5.1 SemVer Estricto
- **MAJOR**: Breaking changes en API pública, contrato SaaS↔Agentic, schema DB incompatible
- **MINOR**: Features backward-compatible, nuevos endpoints, nuevos modelos IA
- **PATCH**: Bug fixes, security patches, docs, refactors internos

### 5.2 Tags y Releases
- Tag formato: `v<MAJOR>.<MINOR>.<PATCH>` (ej. `v1.2.3`)
- GitHub Release auto-generado desde `CHANGELOG.md` (conventional commits)
- Docker tags: `v1.2.3`, `v1.2`, `v1`, `latest` (solo en `main`)

### 5.3 Changelog
- Generado automáticamente desde conventional commits (`git cliff` o similar)
- Sección por tipo: `### Features`, `### Fixes`, `### Breaking Changes`, `### Security`, `### Docs`, `### Chore`

---

## 6. Base de Datos — Migraciones y Datos

### 6.1 Migraciones (Drizzle)
```bash
# Generar (tras cambios en schema.ts)
npm run db:generate    # crea carpeta drizzle/ con .sql

# Aplicar (en entorno destino)
npm run db:migrate     # ejecuta migraciones pendientes

# Verificar
npm run db:verify-pg   # compara schema real vs schema.ts
```

### 6.2 Reglas de Migración
- **Siempre forward-only** en `main`/`develop`. No editar migraciones aplicadas.
- **Rollback**: Nueva migración `down` (reversible) o script manual documentado en `ROLLBACK` del reporte.
- **Datos sensibles**: Seed solo en dev/staging (`npm run db:seed`). Prod: **nunca** seed automático.
- **Naming**: `YYYYMMDDHHMMSS_descripcion_corta.sql` (timestamp + snake_case)

### 6.3 Datos de Referencia (Reference Data)
- Tablas `permissions`, `role_permissions`, `config_versions` → migraciones `data:` (Drizzle) o scripts idempotentes en `init-scripts/`
- Versionados en Git, aplicados en `db:migrate`

---

## 7. Despliegue (Deployment)

### 7.1 Stack Docker Compose (Producción)
```yaml
# docker-compose.prod.yml (en submódulo comercial)
services:
  postgres:
    image: postgres:16-alpine
    volumes:
      - /opt/soluciona/data/postgres:/var/lib/postgresql/data
      - /opt/soluciona/backups:/backups
    env_file: /opt/soluciona/env/.env.production
    healthcheck: { test: ["CMD-SHELL", "pg_isready -U postgres"], interval: 10s, timeout: 5s, retries: 5 }

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - /opt/soluciona/data/redis:/data
    healthcheck: { test: ["CMD", "redis-cli", "ping"], interval: 10s, timeout: 5s, retries: 5 }

  saas:
    image: ghcr.io/diegoalejandrosaenzfalcon/soluciona-inteligencia-artificial-comercial:v1.2.3
    ports: ["3000:3000"]
    env_file: /opt/soluciona/env/.env.production
    depends_on: { postgres: { condition: service_healthy }, redis: { condition: service_healthy } }
    healthcheck: { test: ["CMD", "curl", "-f", "http://localhost:3000/health"], interval: 30s, timeout: 10s, retries: 3 }
    deploy:
      resources: { limits: { cpus: '1.5', memory: '8G' }, reservations: { cpus: '0.5', memory: '2G' } }

  agentic:
    image: ghcr.io/diegoalejandrosaenzfalcon/soluciona-tia:latest
    env_file: /opt/soluciona/env/.env.production
    depends_on: { postgres: { condition: service_healthy }, redis: { condition: service_healthy } }
    healthcheck: { test: ["CMD", "curl", "-f", "http://localhost:8000/health"], interval: 30s, timeout: 10s, retries: 3 }

  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - /opt/soluciona/env/nginx:/etc/nginx/conf.d:ro
      - /opt/soluciona/env/certs:/etc/ssl/certs:ro
    depends_on: [saas, agentic]
```

### 7.2 Orden de Arranque (Hardening)
```bash
# 1. Docker daemon
systemctl start docker

# 2. PostgreSQL
docker compose up -d postgres
./wait-for-healthy.sh postgres 60

# 3. Verificar migraciones aplicadas
docker exec soluciona-postgres psql -U postgres -d soluciona -c "SELECT * FROM _drizzle_migrations ORDER BY created_at DESC LIMIT 5;"

# 4. SaaS
docker compose up -d saas
./wait-for-healthy.sh saas 60

# 5. Redis
docker compose up -d redis
./wait-for-healthy.sh redis 30

# 6. Agentic (LangGraph)
docker compose up -d agentic
./wait-for-healthy.sh agentic 60

# 7. Contrato SaaS↔Agentic READ ONLY
curl -f http://localhost:3000/api/agentic/contract/verify

# 8. Nginx (TLS termination)
docker compose up -d nginx

# 9. E2E Smoke Tests
./run-smoke-tests.sh
```

### 7.3 Rollback (< 5 min)
```bash
# Imagen anterior
PREV_TAG=$(docker images --format "{{.Tag}}" ghcr.io/.../saas | grep -v latest | head -2 | tail -1)
docker compose down saas
docker compose up -d saas  # con tag previo en .env o docker-compose.override.yml

# DB rollback (si migración reversible)
npm run db:migrate:down  # o script manual documentado

# Verificar
./healthcheck-all.sh
```

---

## 8. Feature Flags (Runtime)

| Flag | Default Dev | Default Staging | Default Prod | Descripción |
|------|-------------|-----------------|--------------|-------------|
| `WHATSAPP_CLOUD_API` | `false` | `true` | `true` | Usar Cloud API vs Baileys |
| `DIAN_PROPIO` | `true` | `true` | `true` | Software Propio DIAN activado |
| `AGENTIC_READ_ONLY` | `true` | `true` | `true` | Primer slice: solo lectura |
| `MULTI_TENANT` | `true` | `true` | `true` | Aislamiento por tenant_id |
| `PAID_MODELS_ALLOWED` | `false` | `false` | `config` | Modelos pagos en prod |
| `DEBUG_LOGGING` | `true` | `false` | `false` | Log level debug |

**Gestión**: API `/admin/feature-flags` (protegida RBAC `admin:config`) + persistencia en `config_versions` table.

---

## 9. Testing Strategy (Pirámide)

| Nivel | Herramienta | Cobertura Objetivo | Cuándo |
|-------|-------------|-------------------|--------|
| **Unit** | Vitest | ≥ 80% líneas, ≥ 70% branches | Todo PR (CI) |
| **Integration** | Vitest + Testcontainers (PG/Redis) | ≥ 60% flujos críticos | PR a `develop`/`main`, nightly |
| **Contract** | Pact / OpenAPI validation | 100% endpoints públicos | Cambios API |
| **E2E** | Playwright (UI) + custom (WhatsApp/API) | Happy paths críticos | Pre-deploy staging/prod |
| **Security** | npm audit, CodeQL, Semgrep, Trivy | 0 HIGH/CRITICAL | Todo PR (CI) |
| **Performance** | k6 (load) | p95 < 500ms API, < 2s UI | Release candidate |

---

## 10. Observabilidad (Mínimo Viable)

| Componente | Implementación |
|------------|----------------|
| **Logs** | Pino JSON → stdout → Docker → Loki (futuro) / archivos rotados `/opt/soluciona/logs/` |
| **Métricas** | Prometheus client (`/metrics`) → Prometheus (futuro) / scraping manual |
| **Tracing** | OpenTelemetry JS (solo spans HTTP + DB + WhatsApp) → Tempo (futuro) |
| **Healthchecks** | `/health` (liveness: proceso vivo), `/ready` (readiness: DB+Redis+WhatsApp OK) |
| **Alertas** | Cron healthcheck → Telegram/Email Owner si falla 3x consecutivas |

---

## 11. Seguridad en Pipeline

- **Dependabot** activado (weekly) → PRs automáticos `chore/deps-*`
- **CodeQL** en cada PR (JS/TS)
- **Semgrep** rules: `p/ci`, `p/secrets`, `p/security-audit`, `p/nodejs`
- **Trivy** filesystem scan en Docker build
- **Cosign** signing en releases (`v*`)
- **SBOM** generado (`syft`) adjunto a release

---

## 12. Checklist de Release (Pre-deploy Prod)

```markdown
## Release vX.Y.Z Checklist
- [ ] CHANGELOG.md actualizado (git cliff)
- [ ] Version bump en package.json + package-lock.json
- [ ] Tag `vX.Y.Z` creado y push
- [ ] GitHub Release generado (notas auto)
- [ ] Docker images multi-arch (amd64/arm64) en ghcr.io
- [ ] Imágenes firmadas (cosign) y verificadas
- [ ] Staging deploy verificado (E2E pass)
- [ ] Backup PG/Redis previo a prod confirmado
- [ ] Feature flags prod revisados
- [ ] Secrets rotados si corresponde (JWT, DB)
- [ ] Owner approval explícito en PR release
- [ ] Deploy prod ejecutado (manual trigger)
- [ ] Healthchecks prod verdes (5 min post-deploy)
- [ ] Smoke tests E2E prod pasan
- [ ] Rollback plan verificado (imagen anterior disponible)
- [ ] Post-deploy monitoring 30 min sin alertas
```

---

## 13. Parámetros por Entorno (Matriz Resumen)

| Parámetro | Dev | Staging | Prod |
|-----------|-----|---------|------|
| `NODE_ENV` | `development` | `staging` | `production` |
| `LOG_LEVEL` | `debug` | `info` | `warn` |
| `DB_PROVIDER` | `sqlite` / `postgresql` | `postgresql` | `postgresql` |
| `DB_SSL` | `false` | `true` | `true` |
| `REDIS_TLS` | `false` | `false` | `true` |
| `WHATSAPP_TRANSPORT` | `baileys` | `cloud` | `cloud` |
| `DIAN_MODE` | `test` | `test` | `production` |
| `AI_FREE_ONLY` | `true` | `true` | `false` (condicional) |
| `FEATURE_AGENTIC_READ_ONLY` | `true` | `true` | `true` (fase 1) |
| `RATE_LIMIT_RPS` | `100` | `50` | `20` |
| `BACKUP_CRON` | `disabled` | `0 2 * * *` | `0 2 * * *` |

---

## 14. Referencias

- `docs/governance/PLAN-DIRECTOR-SOLUCIONA-IA-v1.0.md` (§5 Arquitectura, §8 Boot, §9 CI/CD, §11 IaC)
- `docs/governance/DISASTER-RECOVERY.md` (runbooks, rollback)
- `infra/environments/{dev,staging,prod}.yaml` (params maestros)
- `soluciona-inteligencia-artificial-comercial/.github/workflows/ci-cd.yml` (pipeline)
- `soluciona-inteligencia-artificial-comercial/docker-compose.{prod,staging}.yml` (stacks)
- `ai-coordination/PROTOCOL.md` (AI↔Orchestrator)

---

**FIN** — Este proceso es **vinculante**. Cualquier desviación requiere ADR documentado y approval `architect` + `director`.