# 🚀 SOLUCIA INTELIGENCIA ARTIFICIAL

> **Plataforma de Automatización Empresarial Integral** — 100% Open Source, 100% Gratuita, Comercialmente Competitiva

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Ready-326CE5.svg)](https://kubernetes.io/)
[![DIAN Compliant](https://img.shields.io/badge/DIAN-Compliant-green)](https://www.dian.gov.co/)
[![UBL 2.1](https://img.shields.io/badge/UBL-2.1-blue)](https://www.oasis-open.org/committees/ubl/)
[![XAdES-BES](https://img.shields.io/badge/XAdES-BES-orange)](https://www.etsi.org/)
[![RSA-SHA384](https://img.shields.io/badge/RSA-SHA384-red)](https://www.ietf.org/)
[![Open Source](https://img.shields.io/badge/Open%20Source-MIT-green)](https://opensource.org/licenses/MIT)
[![Gratis](https://img.shields.io/badge/Costo-%240-brightgreen)](https://opensource.org/licenses/MIT)
[![Security](https://img.shields.io/badge/Security-Hardened-brightgreen)](https://owasp.org/)
[![Tests](https://img.shields.io/badge/Tests-Vitest-yellow)](https://vitest.dev/)
[![Coverage](https://img.shields.io/badge/Coverage-v8-orange)](https://github.com/vitest-dev/vitest)
[![CI/CD](https://img.shields.io/badge/CI-GitHub%20Actions-blue)](https://github.com/features/actions)

---

## 🎯 Visión

**SOLUCIA INTELIGENCIA ARTIFICIAL** no es un bot, no es un CRM, no es un POS. Es una **Plataforma de Automatización Empresarial Integral** — 100% Open Source, 100% Gratuita, Comercialmente Competitiva — que cubre **TODO** el ciclo de vida de un negocio:

- 🛒 **Pedidos & Ventas** (WhatsApp, Web, App, Telefonía)
- 📦 **Inventario & SCM** (Multi-bodega, lotes, seriales, auto-pedido a proveedores)
- 🚚 **Logística & Última Milla** (Ruteo VRP, GPS tiempo real, POD blockchain)
- 💰 **Facturación DIAN** (Colombia) + Multi-país (CFDI México, SUNAT Perú, AFIP Argentina, SII Chile)
- 📊 **Contabilidad & Finanzas** (NIIF, multi-moneda, consolidación, tesorería)
- 👥 **Nómina & RRHH** (Contratos, liquidación, seguridad social, evaluaciones, reclutamiento)
- 🎯 **CRM & Marketing** (Leads, pipeline, campañas WhatsApp/Email/SMS, loyalty, gamificación)
- 🤖 **IA Nativa** (Pipeline unificado, RAG, Function Calling, Multi-LLM Router, Guardrails, Fine-tuning)
- 📊 **BI & Analytics** (Self-service BI, Text-to-SQL, alertas anomalías, forecasting)
- 🤝 **Asesorías IA + Humanas** (Knowledge base, expert network, co-pilot, certifications)

---

## 🏗 Arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SOLUCIA IA PLATFORM                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    EDGE / API GATEWAY (Kong)                 │   │
│  │  Rate Limit │ Auth (OIDC) │ Logging │ Circuit Breaker       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                    │                              │
│        ┌───────────┬──────────────┼──────────────┬────────────┐   │
│        ▼           ▼              ▼              ▼            ▼   │
│  ┌──────────┐ ┌───────────┐ ┌────────────┐ ┌──────────┐ ┌──────┐ │
│  │ WHATSAPP │ │   CORE    │ │ INTEGRACIONES│ │  IA/ML   │ │MOBILE│ │
│  │ TRANSPORT│ │ SERVICES  │ │  EXTERNAS    │ │ PLATFORM │ │ APPS │ │
│  └──────────┘ └───────────┘ └────────────┘ └──────────┘ └──────┘ │
│         │           │              │              │            │   │
│         └───────────┴──────────────┴──────────────┴────────────┘   │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              DATA LAYER (PostgreSQL 16 + Redis + MinIO)      │   │
│  │  Multi-tenant (RLS) │ Event Sourcing │ Event Bus │ pgvector │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 22 LTS
- Docker & Docker Compose
- PostgreSQL 16 (o usa Docker)
- Redis 7
- MinIO (o S3 compatible)

### Desarrollo Local

```bash
# 1. Clonar repositorio
git clone https://github.com/soluciona-ia/soluciona-inteligencia-artificial-comercial.git
cd soluciona-inteligencia-artificial-comercial

# 2. Configurar entorno
cp .env.example .env
# Editar .env con tus credenciales

# 2. Levantar stack completo
docker-compose up -d

# 3. Verificar salud
curl http://localhost:3000/api/health

# 4. Acceder al panel
# Dashboard: http://localhost:3000
# Panel Empresarial: http://localhost:3000/panel-empresarial
# Grafana: http://localhost:3001 (admin/admin)
# Keycloak: http://localhost:8080 (admin/admin)
```

### Variables de Entorno Críticas

```bash
# .env - Configuración mínima requerida
DB_HOST=localhost
DB_PORT=5432
DB_NAME=soluciona_ia
DB_USER=postgres
DB_PASS=postgres

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=your-32-char-min-secret-key-change-in-production
LLM_API_KEY=your-nvidia-api-key
NVIDIA_API_KEY=your-nvidia-api-key
```

---

## 🏗 Arquitectura Técnica

### Stack Tecnológico

| Capa | Tecnología | Justificación |
|------|------------|---------------|
| **Runtime** | Node.js 22 LTS + TypeScript 5.x + Fastify | Type safety, performance, ecosystem |
| **Base de Datos** | PostgreSQL 16 + PgBouncer + pgvector | ACID, concurrencia, vector search nativo |
| **Cache/Colas** | Redis Cluster (Valkey) + BullMQ | Distribuido, persistente, pub/sub |
| **API** | Fastify + TypeBox/Zod + OpenAPI 3.1 | Performance #1, validation, codegen |
| **Auth** | Keycloak (OIDC/OAuth2/SAML2) + Passkeys | Estándar, MFA, SSO, sin vendor lock-in |
| **Observabilidad** | OpenTelemetry + Prometheus + Loki + Tempo + Grafana | Estándar CNCF, vendor-neutral |
| **Deploy** | Docker + K8s (EKS/GKE) + ArgoCD + Helm | GitOps, canary, rollback, multi-env |
| **CI/CD** | GitHub Actions + Trivy + CodeQL + ArgoCD | Security-first, GitOps, rollback auto |

### Principios Arquitectónicos

- **Clean Architecture**: Domain/Application/Infrastructure/Interfaces separation
- **Domain-Driven Design**: Entities, Value Objects, Aggregates, Domain Events
- **Event-Driven**: Redis Streams Event Bus, Outbox Pattern, CQRS ligero
- **Multi-Tenant Real**: Row-Level Security (RLS) PostgreSQL en TODAS las tablas
- **AI-First**: Pipeline unificado, RAG, Function Calling, Guardrails, Evaluation Harness
- **Security by Design**: Zero Trust, mTLS, CSP, CSP nonce, Passkeys, Rate Limiting, CSRF
- **Observabilidad Nativa**: OpenTelemetry, SLOs, Error Budgets, Burn Rate Alerting
- **Chaos Engineering**: LitmusChaos, Game Days mensuales
- **Supply Chain Security**: SLSA Level 3, SBOM, Cosign, Dependabot, SAST/DAST

---

## 📦 Módulos Funcionales

| Módulo | Descripción | Estado |
|--------|-------------|--------|
| **Pedidos & Ventas** | Omnicanal (WhatsApp, Web, App, Tel), carrito inteligente, suscripciones, KDS | ✅ Core |
| **Inventario & SCM** | Multi-bodega, lotes/series, auto-pedido proveedores, alertas stock | ✅ Core |
| **Proveedores & SRM** | Catálogo proveedores, RFQ, auto-OC, portal proveedor, scorecards | ✅ Core |
| **Facturación DIAN** | Proveedores certificados, Factura 2.1, timbre auto, multi-país | ✅ Core |
| **Contabilidad & Finanzas** | PUC Colombia/NIIF/IFRS, asientos auto, conciliación bancaria, activos | ✅ Core |
| **Nómina & RRHH** | Contratos, liquidación, seguridad social, nómina electrónica DIAN | 🟡 En progreso |
| **CRM & Marketing** | Leads, pipeline, campañas WhatsApp/Email/SMS, loyalty, A/B testing | 🟡 En progreso |
| **IA Nativa** | Pipeline unificado, RAG, Function Calling, Multi-LLM, Guardrails | ✅ Core |
| **Logística/TMS** | VRP/OR-Tools, tracking GPS, POD blockchain, devoluciones | 🔴 Pendiente |
| **BI/Analytics** | dbt + MetricFlow, dashboards, Text-to-SQL, alertas anomalías | 🟡 En progreso |
| **Asesorías IA+Humanas** | KB semántico, co-pilot, expert network, certifications | 🔴 Pendiente |

---

## 📱 Apps Móviles (3 Apps Nativas)

### Stack: Kotlin Multiplatform (KMP) + Compose + SQLDelight

| App | Usuario | Funcionalidades Clave |
|-----|---------|----------------------|
| **SOLUCIA OWNER** | Dueño/Gerente | Dashboard ejecutivo, aprobaciones workflow, reportes PDF/Excel, alertas push, config módulos |
| **SOLUCIA DELIVERY** | Domiciliarios | Ruteo VRP dinámico, navegación offline, GPS tracking, POD (firma+foto+QR), gamificación |
| **SOLUCIA CLIENTE** | Cliente Final | Catálogo semántico IA, carrito cross-device, tracking GPS, fidelización (puntos/tiers/cashback/referidos), suscripciones, pagos tokenizados |

> Stack: Kotlin 2.0 + Compose Multiplatform + KMP + SQLDelight + MapLibre + Firebase + Passkeys + ML Kit / TensorFlow Lite

---

## ⚖️ Cumplimiento Legal Colombiano

| Normativa | Ámbito | Requisitos Clave | Estado |
|-----------|--------|------------------|--------|
| **Ley 1581/2012** | Protección Datos | DPO, ROPA, DPIA, ARCO, consentimiento granular, brechas 72h | ✅ Implementado |
| **Ley 1480/2011** | Consumidor | Retracto 5d, garantía, PQR 15d, cláusulas abusivas nulas | ✅ Implementado |
| **Ley 527/1999** | Comercio Electrónico | Validez mensajes, firma electrónica ONAC | ✅ Implementado |
| **Res. DIAN 000042** | Factura Electrónica | Facturador certificado, XML+PDF, timbre auto | ✅ Proveedor certificado |
| **Res. DIAN 000091** | Nómina Electrónica | Envío automático, firma digital ONAC | 🟡 En progreso |
| **ISO 27001/27701** | Seguridad/Privacidad | SGSI, controles A.5-A.18, DPIA | 🟡 En progreso |
| **ISO 22301** | Continuidad | BIA, RTO<4h, RPO<1h, DR test trimestral | 🔴 Pendiente |

---

## 🏷 3 Versiones (Tiers) - Product-Led Growth

| Capacidad | **FREE** (Comunidad) | **PRO** (PyME) | **ENTERPRISE** (Corporativo) |
|-----------|----------------------|----------------|------------------------------|
| Usuarios | 2 | 25 | Ilimitados |
| Sucursales | 1 | 5 | Ilimitadas |
| Pedidos/mes | 500 | 10,000 | Ilimitados |
| WhatsApp Business | ✅ (1 número) | ✅ (3 números) | Ilimitados |
| IA Chatbot | 100/día | 5,000/día | Ilimitado |
| Asistentes IA Panel | 50/día | 2,000/día | Ilimitado |
| Visión (Foto Menú) | 10/día | 100/día | Ilimitado |
| Inventario Avanzado | ❌ | ✅ | ✅ |
| Auto-pedido Proveedores | ❌ | ✅ (3 prov.) | Ilimitado |
| Facturación DIAN | ✅ (50/mes) | ✅ (500/mes) | Ilimitado |
| Contabilidad Avanzada | ❌ | ❌ | ✅ |
| Nómina Avanzada | ❌ | ❌ | ✅ |
| CRM + Marketing | ❌ | ✅ (1k contactos) | Ilimitado |
| IA Avanzada (RAG, FC, Guardrails) | ❌ | ✅ | ✅ |
| Multi-LLM Router | ❌ | ✅ | ✅ |
| Fine-tuning LoRA | ❌ | ❌ | ✅ |
| Apps Android | ✅ (básico) | ✅ | ✅ (white-label) |
| API + Webhooks | ✅ (100/día) | ✅ (10k/día) | Ilimitado |
| SSO + Passkeys | ❌ | ✅ | ✅ |
| Multi-tenant | ❌ | ❌ | ✅ |
| White-label Apps | ❌ | ❌ | ✅ |
| SLA Soporte | Community | Email 24h/Chat 8h | Tel 24/7/TAM/SLA 99.9% |
| **Precio** | **GRATIS PARA SIEMPRE** | **$49 USD/mes** | **$299 USD/mes + usage** |

> **Filosofía**: FREE no es "demo capado". Es **usable en producción** para micro-negocio. PRO cubre 90% PyMEs. ENTERPRISE = sin límites + white-label + SLA + soporte dedicado.

---

## 🛠 Desarrollo

### Estructura del Proyecto

```
soluciona-ia/
├── src/
│   ├── domain/           # Entities, Value Objects, Events, Repositories
│   ├── application/      # Use Cases, DTOs, Commands, Queries
│   ├── infrastructure/   # Database, Repositories, Adapters, External
│   ├── interfaces/       # HTTP (Fastify), WebSocket, CLI, GraphQL
│   └── shared/           # Kernel: Result, Events, Config, Utils
├── scripts/              # Migration scripts, seeds, utilities
├── monitoring/           # Prometheus, Grafana, Loki, Tempo, Alertmanager
├── keycloak/             # Realm export, themes
├── nginx/                # Nginx configs (prod, staging)
├── .github/workflows/    # CI/CD pipelines
├── docker-compose.yml    # Development stack
├── docker-compose.staging.yml
├── docker-compose.prod.yml
├── Dockerfile.dev / .prod
├── Makefile
└── package.json
```

### Comandos Útiles

```bash
# Desarrollo
make dev                    # Inicia servidor dev con hot reload
make docker-up              # Levanta stack completo (DB, Redis, MinIO, Jaeger, Prometheus, Grafana, Loki, Tempo)
make docker-down            # Detiene servicios
make docker-logs            # Ver logs

# Base de datos
make migrate                # Ejecuta migraciones
make migrate:verify         # Verifica integridad migración
make db:seed                # Datos de prueba
make db:reset               # Reset completo (drop + migrate + seed)

# Calidad
make lint                   # ESLint
make typecheck              # TypeScript strict
make format                 # Prettier
check                       # lint + typecheck + format

# Testing
make test                   # Todos los tests
make test:unit              # Solo unitarios
make test:integration       # Integración con Testcontainers
make test:e2e               # E2E con Playwright
make test:coverage          # Cobertura

# CI/CD Local
ci-local                    # Simula pipeline CI completo

# Deployment
make docker-build           # Build imagen producción
make deploy:staging         # Deploy a staging
make deploy:prod            # Deploy a producción
```

---

## 🧪 Testing

### Pirámide de Testing

```
                    ┌─────────────┐
                    │   E2E (5%)  │  Playwright - Critical paths
                    ├─────────────┤
                    │ Integration │  Testcontainers - DB, Redis, MinIO
                    │   (20%)     │
                    ├─────────────┤
                    │  Unit (75%) │  Vitest - Pure functions, domain logic
                    └─────────────┘
```

```bash
# Ejecutar tests
make test                    # Todos
make test:unit               # Solo unitarios (>80% coverage)
make test:integration        # Integración con BD real
make test:e2e                # E2E crítico (login, pedido, pago)
make test:coverage           # Cobertura >80%
```

---

## 🚀 Deployment

### Staging (Auto en push a `develop`)

```bash
# GitHub Actions automático en push a develop
# 1. CI: lint → typecheck → test → build → scan
# 2. CD: Deploy a staging (ArgoCD + Helm)
# 3. Health checks + smoke tests
# 4. Notificación Slack
```

### Producción (Manual via Release)

```bash
# 1. Crear release en GitHub (tag v1.2.3)
# 2. GitHub Actions: build → scan → sign (cosign) → push GHCR
# 3. ArgoCD: Promote staging → production (canary 10% → 50% → 100%)
# 3. Health checks + smoke tests automatizados
# 4. Rollback automático si error rate > 1% o latency P95 > 1s
```

### Rollback

```bash
# Automático si health checks fallan
# Manual:
kubectl rollout undo deployment/soluciona-app -n production
# O via ArgoCD UI: Rollback to previous version
```

---

## 🔐 Seguridad

### Checklist OWASP Top 10

- [x] **A01: Broken Access Control** - RLS PostgreSQL + RBAC + ABAC
- [x] **A02: Cryptographic Failures** - TLS 1.3, AES-256-GCM, Argon2id, TLS 1.3
- [x] **A03: Injection** - Parameterized queries, Zod validation, CSP
- [x] **A04: Insecure Design** - Threat modeling, Secure by Design
- [x] **A05: Security Misconfiguration** - Helmet.js, CSP nonce, HSTS, Secure cookies
- [x] **A06: Vulnerable Components** - Dependabot, Renovate, npm audit, Trivy, SLSA
- [x] **A07: Auth Failures** - Keycloak, MFA, Passkeys, Rate limiting, Account lockout
- [x] **A08: Software Integrity** - SLSA Level 3, Sigstore, SBOM, Cosign
- [x] **A08: Logging/Monitoring Failures** - OpenTelemetry, Loki, Alertmanager, SLOs
- [x] **A10: SSRF** - Egress filtering, allowlists, no user-controlled URLs

### Penetration Testing

```bash
# Anual por proveedor certificado
# Continuo: OWASP ZAP en CI, CodeQL, Semgrep, npm audit
```

---

## 🤝 Contribuir

```bash
# 1. Fork del repo
# 2. Crear rama: git checkout -b feature/amazing-feature
# 3. Commit: git commit -m 'feat: add amazing feature'
# 3. Push: git push origin feature/amazing-feature
# 4. Pull Request
```

### Estándares de Código

- **TypeScript Strict**: `strict: true`, `noUncheckedIndexedAccess: true`
- **ESLint + Prettier**: Config estricta, `prettier/prettier: error`
- **Commits Convencionales**: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- **Tests**: Unit >80%, Integration críticos, E2E paths críticos
- **Documentación**: JSDoc en APIs públicas, README por módulo

---

## 📄 Licencia

**MIT License** - Ver [LICENSE](LICENSE) para detalles.

> **Libre para uso comercial, modificación, distribución.**
> **Sin vendor lock-in. Soberanía total de datos.**

---

## 🙏 Agradecimientos

- **NVIDIA** - APIs de IA gratuitas (Nemotron, Llama 3.1)
- **Keycloak** - Identity & Access Management
- **PostgreSQL** - Base de datos robusta
- **Redis** - Cache & queues ultrarrápidos
- **MinIO** - S3 compatible on-premise
- **Grafana Stack** - Observabilidad completa
- **Keycloak** - IAM enterprise-grade
- **Comunidad Open Source** - Por hacer esto posible

---

## 📞 Soporte & Comunidad

- **Documentación**: https://docs.soluciona.ai
- **Issues**: https://github.com/soluciona-ia/soluciona-inteligencia-artificial-comercial/issues
- **Discord**: https://discord.gg/soluciona-ia
- **Email**: soporte@soluciona.ai
- **Seguridad**: security@soluciona.ai (GPG: 0x...)

---

**Hecho con ❤️ en Colombia 🇨🇴 para el mundo**

> **Soluciona Inteligencia Artificial** — Democratizando la automatización empresarial de clase mundial.

---

*Última actualización: 2025-08-23 | Versión 1.0.0*
---

## Desarrollo local en Linux (sin Docker / sin PostgreSQL)

Este entorno corre la app directamente con Node.js 22 y SQLite (sin dependencias externas). Los scripts `.bat` del repo son para Windows; aquí se usa `node` directo.

### 1. Dependencias
El `package.json` está alineado con `package-lock.json` (dependencias reales de runtime). Instalar:
```bash
npm ci
```

### 2. Configuración
```bash
cp config.example.json config.json
cp .env.example .env
# En .env dejar DB_ENGINE=sqlite (default del código, no requiere PostgreSQL)
```

### 3. Arrancar
```bash
node index.js
```
- Dashboard/API: http://localhost:3000
- Panel empresarial: http://localhost:3000/panel-empresarial
- Panel global: http://localhost:3000/panel-global
- El bot de WhatsApp (Baileys) genera un QR en la consola y en el panel; escanéalo con el WhatsApp del negocio para conectar.
- Primer arranque crea el admin `admin@localhost` y muestra la contraseña generada en consola (guárdala). Para fijarla: `ADMIN_PASSWORD=tu_clave node index.js` o `npm run reset-admin -- <clave>`.

### 4. Variables de entorno críticas
LLM_API_KEY / ASISTENTES_IA_API_KEY / VISION_API_KEY (NVIDIA o Gemini) ─ sin ellas la IA responde con error controlado pero el resto funciona.

### 5. Tests
```bash
npm test          # vitest run (tests/unit)
```

### 6. DIAN middleware (facturación electrónica)
Módulo ESM aparte, con su propia BD/cert de prueba:
```bash
cd dian-middleware
npm install
cp .env.example .env        # placeholders de prueba (DIAN_NIT=900123456, etc.)
# generar cert de prueba auto-firmado si no existe (pass test1234):
node -e "import('node-forge').then(f=>{/* ver ESTADO_PROYECTO.md */})"
node src/habilitacion/run-habilitacion.js   # prueba local submit:false (60F+20NC+20ND)
```
El envío real a DIAN requiere credenciales y certificado `.p12` reales (pendiente del repo).

---

*Nota: este README describe el arranque funcional verificado en Linux. El resto del archivo documenta la arquitectura objetivo (Docker/K8s/PostgreSQL) del proyecto.*
