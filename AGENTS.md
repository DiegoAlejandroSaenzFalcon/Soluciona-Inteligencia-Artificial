# AGENTS.md — Reglas de Trabajo para IA en Soluciona IA

Reglas obligatorias que todo agente (opencode/DeepSeek/Claude) debe seguir al operar en este repositorio.

## 1. Contexto del Proyecto

- **Producto**: Soluciona Inteligencia Artificial - Plataforma de automatización empresarial
- **Variantes**: Comercial (SaaS), Empresarial (Soporte TI), Residencial (Futuro)
- **Arquitectura**: Clean Architecture + DDD + Event-Driven + Multi-tenant RLS
- **Stack**: Node.js 22 + TypeScript + Fastify + Drizzle + PostgreSQL/SQLite
- **Dueño**: Diego Alejandro Saenz Falcon (Girardot, Cundinamarca, Colombia)
- **Idioma**: Español (todas las respuestas, docs, commits)

## 2. Reglas de Seguridad (NO NEGOCIABLES)

1. **NUNCA** ejecutar cambios destructivos, instalar software o modificar sistemas de clientes sin aprobación registrada en ticket/PR
2. **NUNCA** escribir credenciales, tokens, contraseñas o secretos en ningún archivo (usar variables de entorno o secret manager)
3. **NUNCA** hacer commit directo a `main` o `develop` - solo PRs con CI verde
4. **NUNCA** acceder a datos reales de clientes en desarrollo
5. **AISLA cada cliente**: rutas de archivos por tenant. No mezclar datos.
6. **Principio append-only**: tickets, bitácoras, logs, specs - solo se agregan entradas, no se editan ni eliminan
7. **Cero secretos en Git**: Gitleaks en pre-commit + CI (required check)

## 3. Flujo Obligatorio SDD (Spec Driven Development)

```
REQUERIMIENTO → SPEC (Given/When/Then) → TESTS (RED) → IMPLEMENT (GREEN) → REFACTOR → DOCS
```

**ANTES DE ESCRIBIR CUALQUIER CÓDIGO:**
1. Verificar que existe SPEC aprobada (link en PR: `SPEC-XXX`)
2. Si no existe → Crear spec con `spec-analyst` agent
3. Spec debe ser aprobada por PO (Dueño) antes de implementar
4. Tests escritos FIRST basados en AC de la spec
5. Implementación hace pasar tests
6. Refactor manteniendo tests verdes
7. Docs actualizadas (JSDoc, README, CHANGELOG, ADR si aplica)

## 4. Estándares de Código (Enforceados)

### 4.1 TypeScript Strict
```json
// tsconfig.base.json - obligatorio
"strict": true,
"noUncheckedIndexedAccess": true,
"exactOptionalPropertyTypes": true,
"noImplicitReturns": true,
"noFallthroughCasesInSwitch": true,
"noUnusedLocals": true,
"noUnusedParameters": true
```

### 4.2 Convenciones Naming
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

### 4.3 Clean Architecture (Capas)
```
domain/           # 🟢 Puro - Sin deps externas
  entities/       # Aggregate Roots, Entities, VOs
  events/         # Domain Events
  repositories/   # Interfaces (Ports)
  services/       # Domain Services

application/      # 🟡 Orquesta - Solo domain
  use-cases/      # Commands + Queries (CQRS ligero)
  dto/            # Data Transfer Objects
  ports/          # Interfaces para infrastructure

infrastructure/   # 🔴 Impl - Deps externas
  database/       # Drizzle repos, migraciones
  repositories/   # Implementaciones Ports
  external/       # APIs (WhatsApp, DIAN, NVIDIA)
  messaging/      # Redis Streams, Event Bus

interfaces/       # 🔴 Entrada
  http/           # Fastify routes, plugins, middleware
  websocket/      # Socket.io handlers
  cli/            # Comandos admin

shared/           # 🟢 Kernel
  kernel/         # Result, Events, DomainEvent
  config/         # Config tipada (Zod)
  utils/          # Logger, Date, Crypto, Validation
  observability/  # OTEL, Metrics, Tracing
```

**Regla de Dependencias**: `domain` ← `application` ← `infrastructure` / `interfaces` → `shared`

## 5. Git Workflow

### 5.1 Branching
```
main (protected) ← PR + CI verde + 1 approval + PO sign-off
  ↑
develop ← Auto-deploy staging
  ↑
feature/SPEC-<id>  ← 1 spec = 1 branch = 1 PR
fix/ISSUE-<id>     ← 1 bug = 1 branch = 1 PR
release/v<version> ← Solo bugfixes
hotfix/<id>        ← Solo main, urgencia
```

### 5.2 Commits Convencionales (commitlint)
```bash
<type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, perf, test, chore, revert
Scopes: comercial, empresarial, residencial, root, shared, docs, ci, deps

Ejemplos:
feat(comercial): add lot tracking for food inventory
fix(empresarial): correct SLA calculation on holidays
docs(spec): update order status transitions
refactor(domain): extract value object for Money
test(inventory): add FEFO lot selection tests
chore(deps): update drizzle-orm to 0.32
```

### 5.3 Pre-commit (Husky + lint-staged)
- ESLint --fix + Prettier --write en staged files
- Gitleaks scan en staged files
- Commitlint en commit message

## 6. Testing (Pirámide Obligatoria)

```
                    ┌─────────────┐
                    │   E2E (5%)  │  Playwright - Critical paths only
                    ├─────────────┤
                    │ Integration │  Vitest + Testcontainers - DB, Redis, External
                    │   (20%)     │
                    ├─────────────┤
                    │  Unit (75%) │  Vitest - Pure functions, domain logic, VOs
                    └─────────────┘
```

- **Unit**: >80% coverage (lines, functions, branches, statements)
- **Integration**: Critical paths (DB, external APIs)
- **E2E**: Login, Order, Payment flows
- **Naming**: `describe('Entity/UseCase', () => { describe('method', () => { it('should...', () => {...}) }) })`

## 7. Observabilidad (Obligatorio desde Día 1)

- **Logs**: Pino estructurado + Correlation ID en todo request
- **Métricas**: RED Method (Rate, Errors, Duration) + Prometheus
- **Traces**: OpenTelemetry auto-instrumentación + OTLPTraceExporter
- **Health**: `/health/live` + `/health/ready` + `/health` (deep)

## 8. Uso de Modelos de IA

```yaml
# .opencode/config.json
model: "opencode/deepseek-v4-flash-free"  # Default (gratis)
paid_models: DENY                          # Requiere autorización PO
free_endpoints: ALLOW
local_models: ALLOW
thinking_mode: "on_demand"                 # Solo diagnósticos complejos
```

## 9. Comunicación y Entregables

- **Respuestas**: Técnicas, directas, en español, sin inventar datos
- **Si no sabes**: "No sé / Necesito X" - nunca adivines
- **Todo documento externo**: Revisado por PO antes de enviar a cliente
- **Cierra siempre con**: Estado actual + siguiente paso concreto

## 10. Agentes Especializados Disponibles

| Agente | Uso | Permisos |
|--------|-----|----------|
| `sdd-engineer` | Implementar desde specs aprobadas | edit, bash, task |
| `spec-analyst` | Escribir specs Given/When/Then | edit, webfetch |
| `test-engineer` | TDD, coverage, test data | edit, bash, task |
| `security-auditor` | Threat modeling, OWASP, secrets | webfetch, websearch (read-only) |
| `architect` | ADRs, arquitectura, code review | webfetch (read-only) |
| `devops-engineer` | CI/CD, Docker, K8s, monitoring | edit, bash, task |
| `client-onboarding` | Discovery, config, migración, training | edit, bash, webfetch |
| `docs-engineer` | JSDoc, README, ADRs, runbooks | edit, webfetch |

## 11. Escalación

- **Bloqueador técnico**: Preguntar al Tech Lead / PO vía GitHub Issue
- **Decisión arquitectura**: Crear ADR → Revisión Architect + PO
- **Seguridad**: `security-auditor` agent + PO inmediato
- **Cliente**: `client-onboarding` agent + PO aprobación

---

*Última actualización: 2026-09-21 | Versión 1.1.0 | Aprobado por: PO (Diego Alejandro Saenz Falcon)*

## 12. Continuidad multi-IA y preservación (NUEVO — 2026-09-21)

**Origen:** la máquina del PO se formateó ese día; quedó demostrado que el disco no es confiable.

- **Regla-CERO:** *"La máquina local es caché; GitHub es la verdad."* Nada existe hasta que esté commiteado y pusheado.
- Ninguna IA declara nada "terminado" sin haber hecho commit + push y documentado la evidencia.
- Toda IA nueva que entre (Codex, DeepSeek, Kimi, otra sesión de Kimi, etc.) OBLIGATORIAMENTE lee primero `docs/CONTINUIDAD.md`, luego este AGENTS.md, luego `docs/PLAN-DE-TERMINACION-SOFTWARE.md`.
- Si una IA encuentra trabajo local sin commitear: lo preserva (commit+push) y lo registra en `docs/CONTINUIDAD.md` antes de seguir con su tarea.
- Clientes: datos de clientes NUNCA en este repo público. Cada cliente vive en su propio repo **privado** (ej: `San-Angel`). El core se mantiene limpio y genérico.