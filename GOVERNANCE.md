# GOVERNANCE.md — Políticas de Desarrollo y Gobernanza
# Soluciona Inteligencia Artificial

## 1. Autoridad y Toma de Decisiones

| Rol | Responsabilidad | Autoridad |
|-----|-----------------|-----------|
| **Dueño de Producto (PO)** | Diego Alejandro Saenz Falcon | Decisión final: specs, prioridades, releases, arquitectura |
| **Tech Lead** | Ingeniero senior designado | Decisiones técnicas día a día, code reviews, ADRs |
| **Spec Analyst** | IA / Ingeniero | Redacción y mantenimiento de specs |
| **Security Officer** | PO / Tech Lead | Aprobación security reviews, incident response |
| **Compliance Owner** | PO | Cumplimiento legal (DIAN, Ley 1581, ISO 27001) |

**Regla de Oro**: La IA asesora, audita y programa, pero **no inventa estado ni declara "terminado" sin evidencia**. Autoridad final: humano (PO).

## 2. Modelo de Desarrollo

### 2.1 Spec Driven Development (SDD) - Obligatorio

```
NO SE ESCRIBE CÓDIGO SIN SPEC APROBADA
```

1. **Requisito** → Documentado en SPEC (Given/When/Then)
2. **Spec** → Revisada por Architect + PO
3. **Spec** → Aprobada por PO (firma en PR o issue)
4. **Tests** → Escritos FIRST (RED) basados en AC de la spec
5. **Implementación** → GREEN (hacer pasar tests)
6. **Refactor** → Limpieza manteniendo tests verdes
7. **Docs** → Actualizadas (JSDoc, README, CHANGELOG)
8. **PR** → Code review + CI verde + PO approval → Merge

### 2.2 System Software Development (SSD) - Principios

- **Reproducibilidad**: `npm run bootstrap` → entorno idéntico
- **Observabilidad nativa**: Logs, métricas, traces desde día 1
- **Seguridad by design**: Threat modeling en cada spec
- **Zero Trust**: RLS, mTLS, least privilege, no secrets in git
- **Chaos Engineering**: Game days mensuales (fase 5+)

### 2.3 Clean Architecture + DDD (Enforceado)

```
src/
├── domain/           # 🟢 Puro - Sin dependencias externas
│   ├── entities/     # Aggregate Roots, Entities, Value Objects
│   ├── events/       # Domain Events
│   ├── repositories/ # Interfaces (Repository Ports)
│   └── services/     # Domain Services
├── application/      # 🟡 Orquesta - Depende solo de domain
│   ├── use-cases/    # Commands + Queries (CQRS ligero)
│   ├── dto/          # Data Transfer Objects
│   └── ports/        # Interfaces para infrastructure
├── infrastructure/   # 🔴 Implementaciones - Depende de application + domain
│   ├── database/     # Drizzle repositories, migrations
│   ├── repositories/ # Implementaciones de Repository Ports
│   ├── external/     # APIs externas (WhatsApp, DIAN, NVIDIA)
│   └── messaging/    # Redis Streams, Event Bus
├── interfaces/       # 🔴 Entrada - HTTP, WS, CLI, GraphQL
│   ├── http/         # Fastify routes, plugins, middleware
│   ├── websocket/    # Socket.io handlers
│   └── cli/          # Comandos administrativos
└── shared/           # 🟢 Kernel - Usado por todas las capas
    ├── kernel/       # Result, Events, DomainEvent
    ├── config/       # Configuración tipada (Zod)
    ├── utils/        # Logger, Date, Crypto, Validation
    └── observability/# OTEL, Metrics, Tracing
```

**Regla de Dependencias**: `domain` ← `application` ← `infrastructure` / `interfaces` → `shared`

### 2.4 Event-Driven Architecture

- **Event Bus**: Redis Streams (producción) / InMemory (tests)
- **Outbox Pattern**: Para consistencia eventual DB → Event Bus
- **Domain Events**: Emitidos desde Aggregate Roots
- **Correlation ID**: Propagado en toda la cadena (headers, logs, traces)

## 3. Gestión de Cambios y Releases

### 3.1 Branching Strategy (GitFlow Simplificado)

```
main (protected) ← Solo PR + CI verde + 1 approval + PO sign-off
  ↑
develop (integration) ← Auto-deploy staging, CI verde
  ↑
feature/SPEC-<id>     ← 1 spec = 1 branch = 1 PR
fix/ISSUE-<id>        ← 1 bug = 1 branch = 1 PR
release/v<version>    ← Preparación release, solo bugfixes
hotfix/<id>           ← Solo main, urgencia producción
```

### 3.2 Release Process

```bash
# 1. Crear release branch desde develop
git checkout develop
git pull
git checkout -b release/v1.2.3

# 2. Actualizar versión + changelog
npm version minor --no-git-tag-version  # o patch/major
npm run changelog  # conventional-changelog -p angular -i CHANGELOG.md -s

# 3. PR release/v1.2.3 → main (review + CI + PO approval)

# 4. Merge a main → Tag automático v1.2.3

# 5. GitHub Actions: build → scan → sign (cosign) → push GHCR

# 6. ArgoCD: Promote staging → production (canary 10% → 50% → 100%)

# 7. Health checks + smoke tests automatizados

# 8. Rollback automático si error rate > 1% o latency P95 > 1s
```

### 3.3 Versionado Semántico

| Tipo Cambio | Versión | Ejemplo |
|-------------|---------|---------|
| Breaking API/DB | MAJOR | `1.0.0` → `2.0.0` |
| Nueva funcionalidad | MINOR | `1.0.0` → `1.1.0` |
| Bug fix | PATCH | `1.0.0` → `1.0.1` |
| Pre-release | `-alpha.<n>`, `-beta.<n>`, `-rc.<n>` | `1.1.0-beta.1` |

## 4. Calidad y Testing (Pirámide Obligatoria)

```
                    ┌─────────────┐
                    │   E2E (5%)  │  Playwright - Critical paths only
                    ├─────────────┤
                    │ Integration │  Vitest + Testcontainers - DB, Redis, External APIs
                    │   (20%)     │
                    ├─────────────┤
                    │  Unit (75%) │  Vitest - Pure functions, domain logic, VOs
                    └─────────────┘
```

### 4.1 Cobertura Mínima

| Tipo | Cobertura | Enforcement |
|------|-----------|-------------|
| Unit | > 80% | `npm run test:unit -- --coverage` |
| Integration | Critical paths | Manual review en PR |
| E2E | Login, Order, Payment | Playwright CI |

### 4.2 Test Naming & Structure

```typescript
// tests/unit/domain/product.test.ts
describe('Product Entity', () => {
  describe('create', () => {
    it('should create product with valid props', () => {
      // Arrange
      // Act
      // Assert
    });

    it('should reject negative price', () => {
      // ...
    });

    it('should emit ProductCreated domain event', () => {
      // ...
    });
  });

  describe('updatePrice', () => {
    // ...
  });
});
```

## 5. Seguridad y Cumplimiento

### 5.1 Política Cero Secretos (Zero Secrets in Git)

- **Pre-commit**: Gitleaks scan local
- **CI**: Gitleaks scan full history (required check)
- **Plantillas**: `.env.example`, `config.example.json` versionadas
- **Runtime**: Variables de entorno + Secret Manager (1Password CLI / AWS Secrets Manager / HashiCorp Vault)

### 5.2 Cumplimiento Legal Colombiano

| Normativa | Ámbito | Estado | Evidencia |
|-----------|--------|--------|-----------|
| Ley 1581/2012 | Protección Datos | ✅ Implementado | DPO, ROPA, DPIA, ARCO |
| Ley 1480/2011 | Consumidor | ✅ Implementado | Retracto 5d, garantía, PQR 15d |
| Ley 527/1999 | Comercio Electrónico | ✅ Implementado | Validez mensajes, firma ONAC |
| Res. DIAN 000042 | Factura Electrónica | ✅ Proveedor certificado | XML+PDF, timbre auto |
| Res. DIAN 000091 | Nómina Electrónica | 🟡 En progreso | Envío automático |
| ISO 27001/27701 | Seguridad/Privacidad | 🟡 En progreso | SGSI, controles A.5-A.18 |
| ISO 22301 | Continuidad | 🔴 Pendiente | BIA, RTO<4h, RPO<1h |

### 5.3 Security Review Process

1. **Spec Phase**: Threat modeling (STRIDE) en cada spec P0/P1
2. **Code Phase**: SAST (CodeQL, Semgrep) en PR
3. **Build Phase**: SCA (npm audit, Trivy, SBOM)
4. **Deploy Phase**: DAST (OWASP ZAP) en staging
5. **Runtime**: Runtime security (Falco - futuro), WAF rules

## 6. Arquitectura de Decisiones (ADRs)

### 6.1 Formato ADR (Markdown en `docs/adr/`)

```markdown
# ADR-<NNN>: <Título corto>

**Status**: Proposed | Accepted | Superseded | Deprecated
**Date**: YYYY-MM-DD
**Deciders**: <Nombres>
**Technical Story**: <Link a issue/spec>

## Context
<Qué problema enfrentamos, qué opciones consideramos>

## Decision
<Qué decidimos hacer, con justificación técnica>

## Consequences
### Positive
- ...
### Negative
- ...
### Risks
- ...

## Alternatives Considered
1. <Alternativa 1> - Rechazada porque...
2. <Alternativa 2> - Rechazada porque...

## Links
- Spec: SPEC-<ID>
- PR: #<number>
- Related ADRs: ADR-<NNN>
```

### 6.2 ADRs Existentes (Ejemplos)

- `ADR-001`: Use Drizzle ORM over Prisma/TypeORM
- `ADR-002`: PostgreSQL with RLS for multi-tenancy
- `ADR-003`: Fastify over Express/NestJS
- `ADR-004`: Vitest over Jest for testing
- `ADR-005`: Baileys (legacy) → WhatsApp Cloud API migration
- `ADR-006`: Node.js native test runner for unit tests (Vitest fix)
- `ADR-007`: opencode + DeepSeek V4 Flash for empresarial agents

## 7. Gestión de Incidentes y Postmortems

### 7.1 Severidad

| Severidad | Definición | Respuesta | Ejemplo |
|-----------|------------|-----------|---------|
| **SEV-1** | Servicio caído / Data loss / Security breach | Inmediata (24/7), war room | DB down, breach |
| **SEV-2** | Funcionalidad crítica degradada | < 1 hora | Pagos fallan, WhatsApp down |
| **SEV-3** | Funcionalidad no crítica / Bug menor | < 4 horas | Reportes lentos, UI bug |
| **SEV-4** | Mejora / Tech debt / Docs | Próximo sprint | Refactor, update deps |

### 7.2 Postmortem Template (Blameless)

```markdown
# Postmortem: <INC-YYYY-MM-DD-<id>>

**Fecha**: YYYY-MM-DD
**Severidad**: SEV-<1-4>
**Duración**: Xh Ym
**Impacto**: <Usuarios afectados, revenue, data>

## Resumen
<Qué pasó en 3 líneas>

## Línea de Tiempo
| Hora | Evento |
|------|--------|
| HH:MM | Detected |
| HH:MM | Investigating |
| HH:MM | Root cause identified |
| HH:MM | Mitigation applied |
| HH:MM | Resolved |

## Causa Raíz (5 Whys)
1. Why? →
2. Why? →
3. Why? →
4. Why? →
5. Why? → **Root Cause**

## Acciones Correctivas
| Acción | Responsable | Fecha Límite | Estado |
|--------|-------------|--------------|--------|
| ... | ... | ... | ... |

## Lecciones Aprendidas
- ...
```

## 8. Métricas de Gobernanza (Revisión Mensual)

| Métrica | Objetivo | Fuente | Revisión |
|---------|----------|--------|----------|
| Specs aprobadas vs implementadas | 100% | GitHub Issues/PRs | Mensual |
| PRs con spec asociada | 100% | GitHub PR template | Semanal |
| Cobertura tests (unit) | > 80% | Vitest coverage | Semanal |
| CI/CD pass rate | > 95% | GitHub Actions | Semanal |
| Security findings (high/critical) | 0 | CodeQL, Semgrep, Trivy | Diario |
| Secret leaks detected | 0 | Gitleaks | Diario |
| ADRs creados vs archivados | Balance | docs/adr/ | Mensual |
| Technical debt ratio | < 5% | SonarQube (futuro) | Mensual |
| Onboarding time (nuevo dev) | < 15 min | Survey | Trimestral |

## 9. Políticas de IA (opencode / DeepSeek / Claude)

### 9.1 Uso Autorizado

- ✅ Análisis de código, debugging, refactoring
- ✅ Escritura de tests (TDD)
- ✅ Generación de specs (Given/When/Then)
- ✅ Documentación (JSDoc, README, ADRs)
- ✅ Code review asistido
- ✅ Arquitectura: propuesta de ADRs

### 9.2 Uso PROHIBIDO

- ❌ Commits directos a `main`/`develop` sin PR
- ❌ Cambios en infraestructura productiva
- ❌ Manejo de secretos/credenciales
- ❌ Decisiones de arquitectura sin revisión humana
- ❌ Deploy a staging/producción
- ❌ Acceso a datos de clientes reales

### 9.3 Configuración Modelos

```yaml
# .opencode/config.json
model: "opencode/deepseek-v4-flash-free"  # Default (gratis)
paid_models: DENY                          # Requiere autorización PO
free_endpoints: ALLOW
local_models: ALLOW
thinking_mode: "on_demand"                 # Solo diagnósticos complejos
```

## 10. Comunicación y Documentación

### 10.1 Canales

- **GitHub Issues**: Bugs, features, specs, ADRs
- **GitHub PRs**: Code review, discusión técnica
- **GitHub Discussions**: Preguntas, RFCs, decisiones mayores
- **MkDocs (GitHub Pages)**: Documentación técnica unificada
- **Slack/Discord (futuro)**: Alertas, incidentes, coordination

### 10.2 Documentación Viva

- **README.md**: Inicio rápido, arquitectura high-level
- **SPEC.md**: Especificaciones ejecutables
- **INIT.md**: Bootstrap y convenciones
- **ADRs**: Decisiones arquitectónicas
- **Runbooks**: Procedimientos operativos
- **API Docs**: OpenAPI 3.1 (generado desde Zod/Fastify)
- **CHANGELOG.md**: Historial de cambios (auto-generado)

---

*Última actualización: 2026-09-21 | Versión 1.0.0 | Aprobado por: PO (Diego Alejandro Saenz Falcon)*