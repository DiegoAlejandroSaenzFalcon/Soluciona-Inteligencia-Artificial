# 🎯 PROPUESTA DE REDESEÑO PROFESIONAL INTEGRAL
## Soluciona Inteligencia Artificial - Plataforma Empresarial

---

## 📋 1. ESTADO ACTUAL - DIAGNÓSTICO TÉCNICO

### 1.1 Arquitectura Híbrida Fragmentada
| Capa | Tecnología Actual | Problemas |
|------|-------------------|-----------|
| **Frontend Legacy** | 4 paneles HTML + JS vanilla inline | Sin build system, CSS inline duplicado, sin componentes, sin TypeScript |
| **Frontend Moderno** | Panel Empresarial (panel-empresarial.html/.js) | 40KB+ JS monolítico, sin modularidad, sin testing |
| **Backend Legacy** | `transports/web.js` (1311 líneas) | Servidor HTTP nativo, lógica mezclada, sin DI, rutas hardcoded |
| **Backend Moderno** | Fastify + Clean Architecture (`src/interfaces/http/`) | Bien estructurado pero **no usado en producción** |
| **Database** | SQLite (db-sqlite.js 35KB) + PostgreSQL (drizzle) | Dos ORMs, migraciones manuales, sin transacciones consistentes |
| **WhatsApp** | Baileys + Cloud API + Calling Sidecar | Tres implementaciones, sidecar WebRTC experimental |
| **DIAN** | Custom XAdES-BES + UBL 2.1 | Funcional pero acoplado, difícil de testear |

### 1.2 Deuda Técnica Crítica
- **Frontend**: 4 paneles con ~80% código duplicado (login, nav, modals, tables, forms)
- **CSS**: Variables CSS en cada HTML, sin design system, sin responsive coherente
- **JS**: Funciones globales, sin módulos ES6, sin bundler, sin tree-shaking
- **Testing**: 4 tests unitarios, 0 integración, 0 E2E, 0 visual regression
- **Documentation**: Comentarios esporádicos, sin JSDoc/TSDoc, sin ADRs
- **Observability**: Logs básicos, sin métricas, sin tracing distribuido
- **Security**: CSRF manual, rate-limiting básico, sin CSP estricto, sin security headers completos

---

## 🎯 2. OBJETIVOS DEL REDESEÑO

### 2.1 Principios Rectores
1. **Single Source of Truth**: Un solo panel, una sola API, una sola arquitectura
2. **Developer Experience First**: TypeScript estricto, hot reload, testing automatizado
3. **Design System Obligatorio**: Tokens, componentes, patrones documentados
4. **Clean Architecture Real**: Separación estricta Domain/Application/Infrastructure/Interfaces
5. **Performance by Default**: Code splitting, lazy loading, caching estratégico
6. **Accessibility First**: WCAG 2.1 AA mínimo, RTL ready, i18n nativo
7. **Security by Design**: CSP, HSTS, COOP/COEP, CSP nonce, secret scanning
8. **Observabilidad Nativa**: OpenTelemetry, métricas Prometheus, logs estructurados

### 2.2 Métricas de Éxito
| Métrica | Actual | Objetivo |
|---------|--------|----------|
| Bundle JS inicial | ~400KB | < 80KB (gzipped) |
| Time to Interactive | ~3.5s | < 1.2s |
| Lighthouse Performance | ~45 | > 95 |
| Cobertura tests | < 5% | > 85% |
| TypeScript strict | Parcial | 100% |
| Accesibilidad | No auditada | WCAG 2.1 AA |
| Tiempo deploy | Manual | < 5 min CI/CD |

---

## 🏗️ 3. ARQUITECTURA OBJETIVO - CLEAN ARCHITECTURE PURA

```
soluciona-ia/
├── apps/
│   ├── web/                    # Frontend React/Next.js (ÚNICO PANEL)
│   │   ├── src/
│   │   │   ├── app/            # Next.js App Router (RSC)
│   │   │   ├── components/     # Design System + Feature Components
│   │   │   ├── features/       # Módulos de negocio (inventario, contabilidad, etc.)
│   │   │   ├── hooks/          # Custom hooks tipados
│   │   │   ├── lib/            # Utilidades, clientes API, config
│   │   │   ├── styles/         # Design tokens + globals
│   │   │   └── types/          # Tipos compartidos frontend
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── api/                    # Backend Fastify (Clean Architecture)
│   │   ├── src/
│   │   │   ├── domain/         # Entidades, Value Objects, Eventos, Repositorios (interfaces)
│   │   │   ├── application/    # Use Cases, DTOs, Commands, Queries (CQRS)
│   │   │   ├── infrastructure/ # DB, External APIs, Queue, Email, WhatsApp
│   │   │   ├── interfaces/     # HTTP (Fastify), GraphQL, WebSocket, CLI
│   │   │   └── shared/         # Kernel, Config, Logger, Errors, Utils
│   │   ├── prisma/             # Schema + Migraciones
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── worker/                 # Background jobs (BullMQ + Redis)
│       ├── src/
│       │   ├── jobs/           # Procesadores async
│       │   └── schedules/      # Cron jobs
│       └── package.json
│
├── packages/                   # Shared packages (Monorepo Turbo/Nx)
│   ├── design-system/          # Componentes UI + Tokens + Storybook
│   ├── shared-types/           # Tipos TypeScript compartidos (API contracts)
│   ├── shared-utils/           # Utilidades puras (fecha, moneda, validación)
│   ├── dian-sdk/               # SDK tipado para DIAN (publicable)
│   ├── whatsapp-sdk/           # SDK tipado WhatsApp Cloud API
│   ├── config/                 # Configuración tipada con Zod
│   ├── logger/                 # Logger estructurado (Pino wrapper)
│   └── testing/                # Testing utilities (MSW, fixtures, matchers)
│
├── tooling/
│   ├── eslint-config/          # Config ESLint compartida
│   ├── prettier-config/        # Config Prettier
│   ├── typescript-config/      # TS configs base
│   └── vitest-config/          # Config testing
│
├── infra/                      # Infrastructure as Code
│   ├── docker/                 # Dockerfiles multi-stage
│   ├── kubernetes/             # K8s manifests (Helm/Kustomize)
│   ├── terraform/              # Cloud resources
│   └── ansible/                # Server provisioning
│
├── docs/                       # Documentación técnica
│   ├── adr/                    # Architecture Decision Records
│   ├── api/                    # OpenAPI/Swagger specs
│   ├── architecture/           # Diagramas C4, decisiones
│   └── contributing/           # Guías contribución
│
├── turbo.json                  # Turborepo config
├── package.json                # Root workspace
├── pnpm-workspace.yaml         # pnpm workspaces
└── README.md
```

---

## 🎨 4. DESIGN SYSTEM - ESPECIFICACIÓN COMPLETA

### 4.1 Referencias Premium (Benchmarking)
| Producto | Fortalezas a Adoptar |
|----------|---------------------|
| **Linear** | Velocidad, keyboard-first, command palette, dark mode nativo, motion reducido |
| **Notion** | Bloques componibles, slash commands, empty states elegantes, onboarding progresivo |
| **Vercel Dashboard** | Data density, tables potentes, real-time updates, feature flags UI |
| **Stripe Dashboard** | Consistencia extrema, forms accesibles, error handling, webhooks UI |
| **Retool** | Composable UI, query builder, permission system, audit logs |
| **Raycast** | Command palette, extensibilidad, keyboard shortcuts, search everywhere |
| **GitHub Dashboard** | Navigation patterns, code review UI, security alerts, dependency graph |

### 4.2 Design Tokens (JSON + CSS Custom Properties)
```json
// packages/design-system/tokens/tokens.json
{
  "color": {
    "primitive": {
      "blue": { "50": "#eff6ff", "100": "#dbeafe", ..., "950": "#172554" },
      "emerald": { "50": "#ecfdf5", ..., "950": "#022c22" },
      "slate": { "50": "#f8fafc", ..., "950": "#020617" },
      "amber": { "50": "#fffbeb", ..., "950": "#451a03" },
      "rose": { "50": "#fff1f2", ..., "950": "#4c0519" }
    },
    "semantic": {
      "background": { "primary": "{slate.50}", "secondary": "{slate.100}", "tertiary": "{slate.200}", "inverse": "{slate.950}" },
      "surface": { "primary": "{white}", "secondary": "{slate.50}", "elevated": "{white}", "overlay": "{slate.950/80}" },
      "border": { "subtle": "{slate.200}", "default": "{slate.300}", "strong": "{slate.400}", "focus": "{blue.500}", "error": "{rose.500}", "success": "{emerald.500}", "warning": "{amber.500}" },
      "text": { "primary": "{slate.950}", "secondary": "{slate.600}", "tertiary": "{slate.400}", "inverse": "{white}", "link": "{blue.600}", "linkHover": "{blue.700}", "error": "{rose.600}", "success": "{emerald.600}" },
      "brand": { "primary": "{blue.600}", "primaryHover": "{blue.700}", "primaryActive": "{blue.800}", "primarySubtle": "{blue.50}", "onPrimary": "{white}" }
    }
  },
  "spacing": { "0": "0", "1": "0.25rem", "2": "0.5rem", "3": "0.75rem", "4": "1rem", "5": "1.25rem", "6": "1.5rem", "8": "2rem", "10": "2.5rem", "12": "3rem", "16": "4rem", "20": "5rem", "24": "6rem" },
  "typography": {
    "fontFamily": { "sans": ["Inter", "system-ui", "sans-serif"], "mono": ["JetBrains Mono", "monospace"], "display": ["Cal Sans", "Inter", "sans-serif"] },
    "fontSize": { "xs": ["0.75rem", { lineHeight: "1.5" }], "sm": ["0.875rem", { lineHeight: "1.5" }], "base": ["1rem", { lineHeight: "1.6" }], "lg": ["1.125rem", { lineHeight: "1.6" }], "xl": ["1.25rem", { lineHeight: "1.5" }], "2xl": ["1.5rem", { lineHeight: "1.4" }], "3xl": ["1.875rem", { lineHeight: "1.3" }], "4xl": ["2.25rem", { lineHeight: "1.2" }] },
    "fontWeight": { "normal": "400", "medium": "500", "semibold": "600", "bold": "700" }
  },
  "borderRadius": { "none": "0", "sm": "0.25rem", "md": "0.375rem", "lg": "0.5rem", "xl": "0.75rem", "2xl": "1rem", "full": "9999px" },
  "shadow": { "xs": "0 1px 2px 0 rgb(0 0 0 / 0.05)", "sm": "0 1px 3px 0 rgb(0 0 0 / 0.1)", "md": "0 4px 6px -1px rgb(0 0 0 / 0.1)", "lg": "0 10px 15px -3px rgb(0 0 0 / 0.1)", "xl": "0 20px 25px -5px rgb(0 0 0 / 0.1)" },
  "transition": { "fast": "150ms cubic-bezier(0.4, 0, 0.2, 1)", "normal": "200ms cubic-bezier(0.4, 0, 0.2, 1)", "slow": "300ms cubic-bezier(0.4, 0, 0.2, 1)" },
  "zIndex": { "hide": -1, "base": 0, "dropdown": 1000, "sticky": 1100, "modal": 1300, "popover": 1400, "tooltip": 1500, "toast": 1700 }
}
```

### 4.3 Componentes Base (Atomic Design)
```
packages/design-system/src/
├── primitives/           # Tokens + Theme Provider
├── atoms/
│   ├── Button/           # Variants: primary, secondary, ghost, danger, link | Sizes: sm, md, lg | States: loading, disabled
│   ├── Input/            # Text, textarea, select, checkbox, radio, switch, slider
│   ├── Label/
│   ├── Badge/            # Status, count, category
│   ├── Avatar/           # Image, fallback initials, status indicator
│   ├── Icon/             # Lucide/Tabler icons wrapper
│   ├── Tooltip/
│   ├── Toaster/          # Toast notifications (Sonner-style)
│   └── Spinner/
├── molecules/
│   ├── FormField/        # Label + Input + Error + Hint + Validation
│   ├── SearchInput/      # Con command palette trigger
│   ├── SelectSearchable/ # Combobox con search + async options
│   ├── DataTable/        # TanStack Table wrapper: sort, filter, pagination, column visibility, row selection, virtualization
│   ├── Card/             # Header, content, footer variants
│   ├── Dialog/           # Modal, AlertDialog, ConfirmDialog, Sheet, Drawer
│   ├── DropdownMenu/     # Con keyboard nav, submenus, separators
│   ├── Tabs/             # Con lazy loading panels
│   ├── Breadcrumb/
│   ├── Pagination/
│   ├── EmptyState/       # Ilustración + título + descripción + action
│   ├── StatCard/         # KPI con trend, sparkline, comparación
│   ├── UserMenu/         # Avatar + nombre + rol + acciones
│   └── CommandPalette/   # Cmd+K global search + actions
├── organisms/
│   ├── Header/           # Logo, search, notificaciones, user menu, breadcrumbs
│   ├── Sidebar/          # Navigation collapsible, groups, badges, keyboard nav
│   ├── DashboardLayout/  # Grid responsive, widgets arrastrables
│   ├── DataTableToolbar/ # Search, filters, column picker, export, bulk actions
│   ├── FormWizard/       # Multi-step con validación por paso
│   ├── SettingsPanel/    # Sections, tabs, forms, danger zone
│   ├── InvoiceViewer/    # PDF embed + XML raw + validation status
│   ├── WhatsAppChat/     # Conversation list + message thread + composer
│   └── OnboardingFlow/   # Progressive disclosure, checklists, tooltips
└── templates/
    ├── AuthLayout/       # Login, Register, 2FA, Password Reset, MFA
    ├── AppLayout/        # Header + Sidebar + Main + Footer
    ├── DashboardTemplate/
    ├── ListDetailTemplate/
    └── SettingsTemplate/
```

### 4.4 Patrones de UX/UI Obligatorios
| Patrón | Implementación |
|--------|----------------|
| **Command Palette** | Cmd+K global (Raycast-style) - búsqueda universal + acciones rápidas |
| **Keyboard Shortcuts** | Mapa completo: `g d` dashboard, `g i` inventario, `g c` contabilidad, `/` search, `n` nuevo, `?` help |
| **Empty States** | Ilustración SVG + título accionable + descripción + CTA principal + secundario |
| **Loading States** | Skeleton screens (no spinners), progressive hydration, suspense boundaries |
| **Error Boundaries** | Por feature, con retry, fallback UI, reporte automático (Sentry) |
| **Optimistic UI** | Mutations con rollback automático, conflict resolution visual |
| **Real-time Indicators** | Presence dots, typing indicators, live cursors, connection status |
| **Onboarding** | Checklist progresiva, tooltips contextuales, video shorts integrados |
| **Feature Flags UI** | Toggle por tenant/usuario, rollout gradual, kill switch |

---

## ⚙️ 5. STACK TECNOLÓGICO DEFINITIVO

### 5.1 Frontend (apps/web)
| Categoría | Tecnología | Justificación |
|-----------|------------|---------------|
| **Framework** | **Next.js 15 (App Router, RSC, Turbopack)** | React Server Components, streaming, partial prerendering, zero-config |
| **Language** | **TypeScript 5.5+ (strict mode)** | Type safety end-to-end, better DX, refactoring seguro |
| **Styling** | **Tailwind CSS v4 + CSS Variables** | Design tokens native, JIT, tree-shaking, dark mode nativo |
| **Components** | **Radix UI / shadcn/ui + Custom** | Headless, accessible, unstyled, composable |
| **State** | **TanStack Query v5 + Zustand** | Server state (cache, sync, dedupe) + Client state (simple, typed) |
| **Forms** | **React Hook Form + Zod v4** | Performance, validation schema-first, type inference |
| **Tables** | **TanStack Table v8** | Headless, virtualización, sorting, filtering, grouping |
| **Charts** | **Recharts / Tremor** | Composables, responsive, accessible, tree-shakable |
| **Date** | **date-fns v4 + @date-fns/tz** | Modular, tree-shakable, i18n, timezone support |
| **i18n** | **next-intl** | Type-safe, namespace, locale detection, middleware |
| **Auth** | **NextAuth v5 (Auth.js)** | Session management, providers, callbacks, edge compatible |
| **Real-time** | **Socket.io Client + TanStack Query** | WebSocket + query invalidation automática |
| **Testing** | **Vitest + React Testing Library + Playwright + MSW** | Unit, integration, E2E, API mocking |
| **Storybook** | **Storybook 8 + Vite** | Component documentation, visual testing, a11y addon |
| **Linting** | **ESLint 9 (flat) + TypeScript ESLint + Prettier** | Flat config, type-aware rules, auto-fix |
| **Git Hooks** | **lefthook** | Fast, parallel, conventional commits |
| **Bundle Analysis** | **@next/bundle-analyzer + knip** | Dead code detection, bundle size monitoring |

### 5.2 Backend (apps/api)
| Categoría | Tecnología | Justificación |
|-----------|------------|---------------|
| **Runtime** | **Node.js 22 LTS + --experimental-sqlite** | Native SQLite, performance, support largo plazo |
| **Framework** | **Fastify v5 + TypeScript** | Performance, schema validation, plugins, decorators |
| **Architecture** | **Clean Architecture + CQRS + Event Sourcing (opcional)** | Separación estricta, testabilidad, escalabilidad |
| **Database** | **PostgreSQL 16 + Prisma ORM v6** | Type-safe, migrations, connection pool, middleware |
| **Cache/Queue** | **Redis 7 + BullMQ v5** | Jobs, rate limiting, sessions, pub/sub |
| **Validation** | **Zod v4 + fastify-type-provider-zod** | Schema-first, runtime + compile-time |
| **Auth** | **JWT + Refresh Rotation + Argon2id** | Stateless, secure, revocable, timing-safe |
| **DIAN** | **Custom SDK tipado (packages/dian-sdk)** | Reutilizable, testeable, versionado semver |
| **WhatsApp** | **Custom SDK tipado (packages/whatsapp-sdk)** | Cloud API + Baileys abstraction, typesafe |
| **Logging** | **Pino + OpenTelemetry** | Structured, sampling, correlation IDs |
| **Metrics** | **Prometheus Client + Grafana** | RED metrics, custom business metrics |
| **Tracing** | **OpenTelemetry JS + Jaeger/Tempo** | Distributed tracing, span attributes |
| **Testing** | **Vitest + Testcontainers + MSW** | Unit, integration, contract, E2E |
| **API Docs** | **Scalar/OpenAPI 3.1 + TypeBox** | Interactive, type-generated, versioned |
| **Security** | **Helmet + CSP Nonce + Rate Limit + CORS** | Defense in depth, nonce-based CSP |

### 5.3 Infraestructura
| Componente | Tecnología |
|------------|------------|
| **Container Runtime** | Docker + BuildKit + Multi-stage |
| **Orchestration** | Kubernetes (EKS/GKE) + Helm/Kustomize |
| **Service Mesh** | Istio (mTLS, traffic splitting, observability) |
| **CI/CD** | GitHub Actions + Turbo + Changesets |
| **Secrets** | 1Password CLI / Vault / Sealed Secrets |
| **DNS/SSL** | Cloudflare + Cert Manager (Let's Encrypt) |
| **Monitoring** | Grafana Stack (Loki, Tempo, Mimir, Pyroscope) |
| **Alerting** | Alertmanager + PagerDuty/Opsgenie |
| **CDN** | Cloudflare R2 + Workers (edge) |

---

## 📦 6. PLAN DE MIGRACIÓN POR FASES

### FASE 0: FUNDACIÓN (Semanas 1-2) ✅ *Parcialmente hecho*
- [x] Monorepo setup (Turborepo + pnpm workspaces)
- [x] TypeScript strict config base
- [x] ESLint 9 flat config + Prettier + Husky/Lefthook
- [x] CI/CD pipeline base (lint, typecheck, test, build)
- [ ] **Design System Package** - Tokens + Theme Provider + Button + Input + Storybook
- [ ] **Shared Types Package** - API contracts (Zod schemas → TypeScript types)
- [ ] **Shared Utils Package** - date, money, validation, string helpers
- [ ] **Config Package** - Zod-validated env config con tipos
- [ ] **Logger Package** - Pino wrapper con child loggers, correlation IDs

### FASE 1: BACKEND CLEAN ARCHITECTURE (Semanas 3-6)
| Semana | Entregable |
|--------|------------|
| 3 | Domain Layer: Entities (User, Tenant, Product, Order, Invoice, Payment), Value Objects, Domain Events, Repository Interfaces |
| 4 | Application Layer: Use Cases (CQRS), Commands/Queries/Handlers, DTOs, Validation (Zod), Authorization Policies |
| 5 | Infrastructure: Prisma Schema + Migraciones, PostgreSQL Repositories, Redis Cache, BullMQ Queue, Email Adapter, WhatsApp SDK, DIAN SDK |
| 6 | Interfaces: Fastify Server + Plugins (Auth, RateLimit, CSP, CORS, WebSocket), REST Routes (OpenAPI), GraphQL (opcional), WebSocket Server, Health Checks |

### FASE 2: FRONTEND NEXT.JS + DESIGN SYSTEM (Semanas 7-12)
| Semana | Entregable |
|--------|------------|
| 7 | Next.js 15 App Router setup, Theme Provider, Global Styles, Layouts (Auth, App, Dashboard), Middleware (Auth, i18n, CSP) |
| 8 | Design System Atoms completados + Storybook + Chromatic + a11y tests |
| 9 | Molecules: FormField, DataTable, Dialog, Dropdown, Tabs, Command Palette |
| 10 | Organisms: Header, Sidebar, DashboardLayout, SettingsPanel, InvoiceViewer, WhatsAppChat |
| 11 | Features: Auth Flow (Login, 2FA, MFA, Password Reset), Dashboard (KPIs, Charts, Activity), Navigation |
| 12 | Features: Inventario CRUD, Contabilidad (CxC/CxP, Facturas, Asientos), Configuración v2, Usuarios/Roles/2FA |

### FASE 3: INTEGRACIONES AVANZADAS (Semanas 13-16)
| Semana | Entregable |
|--------|------------|
| 13 | DIAN SDK: XAdES-BES signing, UBL 2.1 builders, NC/ND, QR/PDF417, Validación XSD, Envío async con retry + webhook |
| 14 | WhatsApp SDK: Cloud API mensajería, Webhooks, Llamadas (WebRTC + STT/TTS), Plantillas, Media, Flujos |
| 15 | Módulo IA: Asistentes (RAG), Clasificador, Extracción menú (Vision), Pool de modelos, Streaming responses |
| 16 | Observabilidad: OpenTelemetry (traces, metrics, logs), Dashboards Grafana, Alertas, Sentry, Feature Flags |

### FASE 4: MIGRACIÓN DE DATOS + LEGACY SUNSET (Semanas 17-18)
| Semana | Entregable |
|--------|------------|
| 17 | Migración SQLite → PostgreSQL (scripts idempotentes, validación checksum, rollback plan) |
| 18 | Sunset panels legacy: Redirects, feature flags, datos migrados, docs usuario, decomision `transports/web.js`, `dashboard.html`, `kds.html`, `panel-*.html/.js` |

### FASE 5: PULIDO + LAUNCH (Semanas 19-20)
| Semana | Entregable |
|--------|------------|
| 19 | Performance: Bundle analysis, code splitting, prefetching, caching headers, image optimization, font subsetting |
| 20 | Accessibility Audit (axe-core + manual), Security Audit (SAST/DAST/SCA), Load Testing (k6), Documentation completa, Runbooks, Post-launch monitoring |

---

## 💻 7. ESTÁNDARES DE CÓDIGO - ESPECIFICACIÓN TÉCNICA

### 7.1 TypeScript Strict Configuration
```json
// packages/typescript-config/base.json
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2024"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": false
  }
}
```

### 7.2 Convenciones de Nomenclatura
| Elemento | Convención | Ejemplo |
|----------|------------|---------|
| **Archivos/Dirs** | kebab-case | `user-profile.tsx`, `use-cases/` |
| **Componentes React** | PascalCase | `UserProfile.tsx`, `DataTable.tsx` |
| **Hooks** | camelCase + `use` prefix | `useUser.ts`, `useDebounce.ts` |
| **Types/Interfaces** | PascalCase + sufijo semántico | `UserEntity`, `CreateUserDTO`, `UserRepository` |
| **Enums/Constantes** | UPPER_SNAKE_CASE | `USER_ROLES`, `MAX_RETRY_ATTEMPTS` |
| **Funciones/Variables** | camelCase | `getUserById`, `isActive` |
| **Private/Internal** | Prefijo `_` | `_internalCache`, `_validateInput` |
| **Tests** | `*.test.ts` / `*.spec.ts` | `user.service.test.ts` |
| **Stories** | `*.stories.tsx` | `Button.stories.tsx` |

### 7.3 Patrones de Código Obligatorios

#### Domain Entities (Rico, Inmutable, Validado)
```typescript
// apps/api/src/domain/entities/invoice.entity.ts
export class InvoiceEntity extends BaseEntity<InvoiceId> {
  private constructor(
    public readonly id: InvoiceId,
    public readonly tenantId: TenantId,
    public readonly number: InvoiceNumber,
    public readonly prefix: InvoicePrefix,
    public readonly status: InvoiceStatus,
    public readonly issueDate: Date,
    public readonly dueDate: Date,
    public readonly subtotal: Money,
    public readonly taxTotal: Money,
    public readonly total: Money,
    public readonly currency: Currency,
    public readonly customerId: CustomerId,
    public readonly lines: ReadonlyArray<InvoiceLine>,
    public readonly cufe?: CUFE,
    public readonly xmlSigned?: SignedXML,
    public readonly pdfUrl?: URL,
    public readonly qrCode?: QRCodeData,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
    public readonly version: number = 1
  ) {
    super(id);
    this.validate();
    Object.freeze(this);
  }

  static create(input: CreateInvoiceInput): Result<InvoiceEntity, DomainError> {
    // Validación rica, factory method
  }

  markAsSent(): Result<InvoiceEntity, DomainError> {
    // Transición de estado validada
    return this.transitionTo(InvoiceStatus.SENT);
  }

  private validate(): void {
    // Invariantes de negocio
    if (this.total.lessThan(Money.zero(this.currency))) {
      throw new DomainError('INVALID_TOTAL', 'Total cannot be negative');
    }
  }
}
```

#### Use Cases (Single Responsibility, Typed Input/Output)
```typescript
// apps/api/src/application/use-cases/invoice/create-invoice.use-case.ts
export interface CreateInvoiceCommand {
  tenantId: TenantId;
  customerId: CustomerId;
  lines: CreateInvoiceLineDTO[];
  issueDate: Date;
  dueDate: Date;
  currency: Currency;
  notes?: string;
}

export interface CreateInvoiceResult {
  invoice: InvoiceEntity;
  cufe: CUFE;
  pdfUrl: URL;
  qrCode: QRCodeData;
}

export class CreateInvoiceUseCase
  implements UseCase<CreateInvoiceCommand, CreateInvoiceResult> {

  constructor(
    private readonly invoiceRepo: InvoiceRepository,
    private readonly customerRepo: CustomerRepository,
    private readonly productRepo: ProductRepository,
    private readonly dianService: DIANService,
    private readonly eventBus: EventBus,
    private readonly idGenerator: IdGenerator
  ) {}

  async execute(command: CreateInvoiceCommand): Promise<Result<CreateInvoiceResult, ApplicationError>> {
    // 1. Validar comando (Zod schema)
    // 2. Verificar reglas de negocio (cliente existe, productos activos, stock)
    // 3. Calcular totales e impuestos
    // 4. Crear entidad Invoice (factory)
    // 5. Persistir (transacción)
    // 6. Firmar XML DIAN (async, background job)
    // 7. Publicar eventos de dominio
    // 8. Retornar resultado
  }
}
```

#### API Routes (Schema-First, Typed)
```typescript
// apps/api/src/interfaces/http/routes/invoice.routes.ts
import { Type } from '@sinclair/typebox';
import { FastifySchema } from 'fastify';

const CreateInvoiceBody = Type.Object({
  customerId: Type.String({ format: 'uuid' }),
  lines: Type.Array(Type.Object({
    productId: Type.String({ format: 'uuid' }),
    quantity: Type.Number({ minimum: 0.01 }),
    unitPrice: Type.Number({ minimum: 0 }),
    taxRate: Type.Number({ minimum: 0, maximum: 100 }),
    discount: Type.Optional(Type.Number({ minimum: 0, maximum: 100 })),
  }), { minItems: 1 }),
  issueDate: Type.String({ format: 'date-time' }),
  dueDate: Type.String({ format: 'date-time' }),
  currency: Type.String({ pattern: '^[A-Z]{3}$' }),
  notes: Type.Optional(Type.String({ maxLength: 1000 })),
});

export const createInvoiceSchema: FastifySchema = {
  body: CreateInvoiceBody,
  response: {
    201: Type.Object({
      invoice: InvoiceResponseSchema,
      cufe: Type.String(),
      pdfUrl: Type.String({ format: 'uri' }),
      qrCode: Type.String(),
    }),
    400: ErrorResponseSchema,
    401: ErrorResponseSchema,
    403: ErrorResponseSchema,
    422: ValidationErrorResponseSchema,
  },
  security: [{ bearerAuth: [] }],
  tags: ['Invoices'],
  summary: 'Crear factura electrónica',
  description: 'Crea una factura, la firma con XAdES-BES y la envía a DIAN de forma asíncrona',
};

export async function createInvoiceRoute(fastify: FastifyInstance) {
  fastify.post<{ Body: CreateInvoiceCommand }>('/invoices', {
    schema: createInvoiceSchema,
    preValidation: [fastify.authenticate, fastify.requirePermission('invoices:create')],
  }, async (request, reply) => {
    const result = await fastify.diContainer.resolve(CreateInvoiceUseCase).execute(request.body);
    return result.match(
      (data) => reply.status(201).send(data),
      (error) => reply.status(error.statusCode).send(error.toResponse())
    );
  });
}
```

### 7.4 Frontend Patterns (React + TypeScript)

#### Component Composition (Compound Components)
```tsx
// packages/design-system/src/molecules/DataTable/DataTable.tsx
interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  getRowId: (row: T) => string;
  selection?: {
    mode: 'single' | 'multiple';
    selected: Set<string>;
    onChange: (selected: Set<string>) => void;
  };
  sorting?: { defaultColumn?: keyof T; defaultDirection?: 'asc' | 'desc' };
  pagination?: { pageSize: number; serverSide?: boolean };
  filtering?: { globalFilter?: string; columnFilters?: ColumnFiltersState };
  actions?: RowAction<T>[];
  emptyState?: React.ReactNode;
  loading?: boolean;
}

// Uso tipado y declarativo
<DataTable<InvoiceEntity>
  columns={invoiceColumns}
  data={invoices}
  getRowId={(i) => i.id.value}
  selection={{ mode: 'multiple', selected, onChange: setSelected }}
  pagination={{ pageSize: 25, serverSide: true }}
  actions={[
    { label: 'Ver', icon: Eye, onClick: (row) => navigate(`/invoices/${row.id.value}`) },
    { label: 'Descargar PDF', icon: Download, onClick: downloadPDF },
    { label: 'Enviar DIAN', icon: Send, onClick: sendToDIAN, disabled: (r) => r.status !== 'PENDING' },
  ]}
  emptyState={<EmptyState icon={FileText} title="Sin facturas" description="Crea tu primera factura" action={<Button onClick={createNew}>Crear factura</Button>} />}
/>
```

#### Server Components + Client Boundaries
```tsx
// apps/web/src/app/(app)/invoices/page.tsx (Server Component)
import { InvoiceList } from '@/features/invoices/components/InvoiceList';
import { getInvoices } from '@/features/invoices/queries/get-invoices';

export default async function InvoicesPage({
  searchParams,
}: { searchParams: Promise<{ page?: string; status?: string }> }) {
  const { page = '1', status } = await searchParams;
  const { data: invoices, pagination } = await getInvoices({ page: Number(page), status });

  return <InvoiceList initialData={invoices} pagination={pagination} />;
}

// apps/web/src/features/invoices/components/InvoiceList.tsx (Client Component)
'use client';
import { DataTable } from '@/design-system/molecules/DataTable';
import { useQuery, useMutation } from '@tanstack/react-query';

export function InvoiceList({ initialData, pagination }) {
  const { data, isLoading } = useQuery({
    queryKey: ['invoices', pagination],
    queryFn: fetchInvoices,
    initialData,
    placeholderData: keepPreviousData,
  });

  return <DataTable data={data?.invoices ?? []} loading={isLoading} ... />;
}
```

---

## 🧪 8. ESTRATEGIA DE TESTING PIRÁMIDE INVERTIDA

```
                    ┌─────────────────┐
                    │   E2E (Playwright)  │  ← 10% - Critical user journeys
                    │   15-20 tests     │
           ┌────────┴────────┐
           │ Integration     │  ← 20% - API contracts, DB, External services
           │  (Vitest +      │     Testcontainers, MSW
           │   Supertest)    │
           │  100-150 tests  │
  ┌────────┴────────┐
  │    Unit         │  ← 70% - Pure functions, Use Cases, Components
  │ (Vitest + RTL)  │     Fast, isolated, deterministic
  │  500+ tests     │
  └─────────────────┘
```

### 8.1 Testing Standards
```typescript
// Unit: Use Case test (fast, no I/O)
describe('CreateInvoiceUseCase', () => {
  it('should create invoice and publish domain events', async () => {
    // Arrange
    const mockRepo = createMockInvoiceRepository();
    const mockDIAN = createMockDIANService();
    const useCase = new CreateInvoiceUseCase(mockRepo, mockDIAN, ...);

    // Act
    const result = await useCase.execute(validCommand);

    // Assert
    expect(result.isSuccess()).toBe(true);
    expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      status: InvoiceStatus.PENDING,
    }));
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'InvoiceCreated' })
    );
  });
});

// Integration: API Contract test
describe('POST /api/invoices', () => {
  it('returns 201 with invoice data on valid input', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/invoices',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: validInvoicePayload,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchSchema(CreateInvoiceResponseSchema);
  });
});

// E2E: Critical journey
test('admin creates invoice, sends to DIAN, downloads PDF', async ({ page }) => {
  await login(page, 'admin@test.com');
  await page.goto('/invoices/new');
  await fillInvoiceForm(page, validData);
  await page.click('[data-testid=submit]');
  await expect(page.locator('[data-testid=status]')).toHaveText('Enviada a DIAN');
  await page.click('[data-testid=download-pdf]');
  await expectDownload(page, /factura-\d+\.pdf/);
});
```

---

## 📚 9. DOCUMENTACIÓN Y ESTÁNDARES DE COMENTARIOS

### 9.1 JSDoc/TSDoc Obligatorio
```typescript
/**
 * Calcula el CUFE (Código Único de Factura Electrónica) según algoritmo DIAN.
 * 
 * @param params - Parámetros requeridos para el cálculo
 * @param params.numFac - Número de factura concatenado: prefijo + número (ej: "SETP001")
 * @param params.fecFac - Fecha de emisión en formato YYYYMMDD (ej: "20260825")
 * @param params.horFac - Hora de emisión en formato HHMMSS (ej: "143022")
 * @param params.valFac - Valor total de la factura sin decimales (ej: "119000" para $1.190,00)
 * @param params.nitOfe - NIT del obligado a facturar (ej: "900123456")
 * @param params.numAdq - Número de identificación del adquiriente
 * @param params.clTec - Clave técnica (8 chars alfanuméricos)
 * @param params.tipoAmbiente - "1" para producción, "2" para habilitación
 * @returns CUFE de 96 caracteres hexadecimales (SHA-384)
 * 
 * @throws {ValidationError} Si algún parámetro no cumple el formato DIAN
 * 
 * @example
 * ```typescript
 * const cufe = generateCufe({
 *   numFac: 'SETP001',
 *   fecFac: '20260825',
 *   horFac: '143022',
 *   valFac: '119000',
 *   nitOfe: '900123456',
 *   numAdq: '123456789',
 *   clTec: 'A1B2C3D4',
 *   tipoAmbiente: '2'
 * });
 * // Returns: "a1b2c3d4e5f6..." (96 chars)
 * ```
 * 
 * @see {@link https://www.dian.gov.co/} Resolución 000042 de 2020 - Anexo Técnico
 */
export function generateCufe(params: CUFEParams): CUFE {
  // Implementation...
}
```

### 9.2 Architecture Decision Records (ADR)
```markdown
# docs/adr/003-use-nextjs-for-frontend.md

# ADR 003: Adopt Next.js 15 App Router for Frontend

## Status: Accepted

## Context
Current frontend consists of 4 legacy HTML panels with vanilla JS, inline CSS, no build system,
and significant code duplication. We need a unified, modern frontend architecture.

## Decision
Adopt Next.js 15 with App Router, React Server Components, and Turbopack.

## Consequences
- **Positive**: RSC reduces bundle size, streaming SSR improves TTFB, Turbopack fast HMR,
  built-in i18n/image/font optimization, edge runtime support
- **Negative**: Learning curve for RSC, server/client boundary complexity,
  requires Node.js 20+ runtime
- **Mitigation**: Training sessions, component templates, codemods for migration

## Alternatives Considered
- Vite + React SPA: Simpler but no RSC, worse SEO/TTFB
- Remix: Great but smaller ecosystem, no Turbopack
- Astro: Excellent for content, less suited for complex app dashboards
```

---

## 🔐 10. SEGURIDAD - HARDENING COMPLETO

### 10.1 Security Headers (CSP Nonce-based)
```typescript
// apps/api/src/interfaces/http/plugins/security.ts
export const securityHeaders = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'strict-dynamic'", (req, res) => `'nonce-${res.locals.cspNonce}'`],
      styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind JIT needs inline
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      fontSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "wss:", "https:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true, preload: true },
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'DENY',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
    payment: [],
  },
  crossOriginEmbedderPolicy: 'require-corp',
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginResourcePolicy: 'same-origin',
};
```

### 10.2 Secret Management
- **Desarrollo**: 1Password CLI + `.env.local` (gitignored)
- **Staging/Prod**: HashiCorp Vault + Kubernetes Secrets + Sealed Secrets
- **Rotación**: Automática cada 90 días (JWT, DB passwords, API keys)
- **Scanning**: TruffleHog en CI + pre-commit hooks

---

## 📊 11. OBSERVABILIDAD - THREE PILLARS

### 11.1 Métricas (Prometheus + Grafana)
```typescript
// packages/shared/src/metrics/business.metrics.ts
export const businessMetrics = {
  invoicesCreated: new Counter({
    name: 'soluciona_invoices_created_total',
    help: 'Total facturas creadas',
    labelNames: ['tenant_id', 'status', 'currency'],
  }),
  invoiceAmount: new Histogram({
    name: 'soluciona_invoice_amount_cents',
    help: 'Monto facturas en centavos',
    labelNames: ['tenant_id', 'currency'],
    buckets: [10000, 50000, 100000, 500000, 1000000, 5000000, 10000000],
  }),
  dianSubmissionDuration: new Histogram({
    name: 'soluciona_dian_submission_duration_seconds',
    help: 'Tiempo envío a DIAN',
    labelNames: ['tenant_id', 'status', 'document_type'],
    buckets: [1, 5, 10, 30, 60, 120, 300],
  }),
  whatsappMessagesSent: new Counter({
    name: 'soluciona_whatsapp_messages_sent_total',
    help: 'Mensajes WhatsApp enviados',
    labelNames: ['tenant_id', 'type', 'status'],
  }),
  activeUsers: new Gauge({
    name: 'soluciona_active_users',
    help: 'Usuarios activos en los últimos 5 min',
    labelNames: ['tenant_id', 'role'],
  }),
};
```

### 11.2 Trazas Distribuidas (OpenTelemetry)
```typescript
// apps/api/src/shared/telemetry/tracing.ts
export const tracer = trace.getTracer('soluciona-api', '1.0.0');

export async function withTracing<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  attributes?: SpanAttributes
): Promise<T> {
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  });
}

// Uso en Use Case
async execute(command: CreateInvoiceCommand) {
  return withTracing('CreateInvoiceUseCase.execute', async (span) => {
    span.setAttribute('tenant_id', command.tenantId.value);
    span.setAttribute('customer_id', command.customerId.value);
    span.setAttribute('lines_count', command.lines.length);
    // ...
  });
}
```

---

## 🚀 12. CI/CD PIPELINE (GitHub Actions + Turbo)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run lint --filter=./packages/* --filter=./apps/*

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run typecheck

  test:
    runs-on: ubuntu-latest
    services:
      postgres: { image: postgres:16, env: { POSTGRES_PASSWORD: test }, ports: [5432] }
      redis: { image: redis:7, ports: [6379] }
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run test:unit test:integration --filter=./packages/* --filter=./apps/*

  test:e2e:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run build --filter=./apps/web --filter=./apps/api
      - run: pnpm --filter=./apps/web exec playwright install --with-deps
      - run: pnpm --filter=./apps/web exec playwright test

  build:
    runs-on: ubuntu-latest
    needs: [lint, typecheck, test]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run build --filter=./apps/web --filter=./apps/api

  docker:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/soluciona-ia/web:${{ github.sha }},ghcr.io/soluciona-ia/api:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

---

## 💰 13. ESTIMACIÓN DE ESFUERZO Y RECURSOS

| Fase | Semanas | Desarrolladores | Esfuerzo (dev-semanas) |
|------|---------|-----------------|------------------------|
| 0: Fundación | 2 | 2 | 4 |
| 1: Backend Clean Architecture | 4 | 2 | 8 |
| 2: Frontend + Design System | 6 | 2 | 12 |
| 3: Integraciones Avanzadas | 4 | 2 | 8 |
| 4: Migración + Legacy Sunset | 2 | 1 | 2 |
| 5: Pulido + Launch | 2 | 2 | 4 |
| **TOTAL** | **20** | **2-3** | **38 dev-semanas** |

### Equipo Recomendado
- **1 Tech Lead / Architect** (tú) - Arquitectura, decisiones, code review
- **1 Senior Fullstack** - Backend + Frontend, design system
- **1 Mid Fullstack** - Features, testing, documentación
- **0.5 DevOps** (shared) - Infra, CI/CD, observabilidad
- **0.5 QA** (shared) - Testing manual, accessibility, exploratory

---

## ❓ 14. DECISIONES PENDIENTES - REQUIEREN TU INPUT

| Decisión | Opciones | Recomendación | Tu Decisión |
|----------|----------|---------------|-------------|
| **Monorepo Tool** | Turborepo vs Nx | **Turborepo** (más simple, rápido, nativo pnpm) | ☐ |
| **Frontend Framework** | Next.js 15 vs Remix vs Vite+React | **Next.js 15** (RSC, streaming, enterprise ready) | ☐ |
| **Styling** | Tailwind v4 vs Panda CSS vs Vanilla Extract | **Tailwind v4** (ecosystem, tokens native, performance) | ☐ |
| **State Management** | TanStack Query + Zustand vs Redux Toolkit vs Jotai | **TQ + Zustand** (separation of concerns, minimal boilerplate) | ☐ |
| **Database ORM** | Prisma vs Drizzle vs Kysely | **Prisma** (migrations, studio, type safety, ecosystem) | ☐ |
| **Auth** | NextAuth v5 vs Clerk vs Auth0 vs Custom JWT | **NextAuth v5** (self-hosted, flexible, edge, free) | ☐ |
| **Component Library Base** | Radix UI vs Headless UI vs AriaKit | **Radix UI** (más completo, mantenido, a11y) | ☐ |
| **Testing E2E** | Playwright vs Cypress | **Playwright** (multi-browser, parallel, trace viewer) | ☐ |
| **Deployment Target** | Kubernetes vs Vercel + Railway vs AWS ECS | **Kubernetes** (control total, DIAN on-prem compatible) | ☐ |
| **Real-time** | Socket.io vs PartyKit vs Ably vs Native WebSocket | **Socket.io** (fallback, rooms, typing, reconnection) | ☐ |

---

## 📝 15. PRÓXIMOS PASOS INMEDIATOS

1. **Validar este documento** - Revisar, comentar, aprobar/modificar decisiones pendientes
2. **Setup Monorepo** - `pnpm init -w`, `turbo.json`, workspace packages
3. **Design System Foundation** - Tokens, ThemeProvider, Button, Input, Storybook
4. **Shared Types** - API contracts con Zod → TypeScript
5. **Backend Skeleton** - Clean Architecture folders, Prisma schema, Fastify bootstrap
6. **Frontend Skeleton** - Next.js 15, App Router, Auth layout, Design System integration

---

## 🎯 RESUMEN EJECUTIVO

> **Objetivo**: Transformar Soluciona IA de un conjunto de scripts/paneles fragmentados a una **plataforma empresarial cohesiva, tipada, testeada, documentada y lista para escalar** — comparable a Linear, Stripe o Vercel en calidad de ingeniería y UX.

> **Inversión**: ~20 semanas, 2-3 devs full-time → **ROI**: Mantenibilidad 10x, velocidad features 5x, onboarding devs 3x, confianza deploy 100x.

> **Riesgo principal**: Migración datos legacy + adopción usuarios → **Mitigación**: Feature flags, migración incremental, sunset plan comunicado, training.

---

**¿Aprobamos esta dirección? ¿Qué decisiones de la tabla 14 quieres confirmar o cambiar antes de iniciar la Fase 0?**