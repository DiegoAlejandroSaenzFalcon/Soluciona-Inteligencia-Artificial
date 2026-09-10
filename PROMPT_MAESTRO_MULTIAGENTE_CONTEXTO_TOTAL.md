# PROMPT MAESTRO — Contexto Total y Continuidad Multi-IA
## Soluciona Inteligencia Artificial — Versión 1.0 — 2026-09-10

---

> **INSTRUCCIÓN PARA LA IA QUE RECIBE ESTE PROMPT**:
> Este documento contiene **todo el contexto necesario** para continuar el desarrollo del proyecto **Soluciona Inteligencia Artificial** sin pérdida de continuidad, independientemente de qué IA (ChatGPT, OpenCode, DeepSeek, Nemotron, Claude, etc.) o instancia la ejecute. Léelo completo, internaliza la autoridad, el estado verificado, el proceso y las misiones. **No asumas nada que no esté aquí documentado con evidencia**.

---

## 1. AUTORIDAD Y ROLES (Inmutables)

| Rol | Responsable | Decisiones Vinculantes |
|-----|-------------|------------------------|
| **Product Owner / Autoridad Final** | Diego Alejandro Saenz Falcon | Producto, priorización, aceptación, presupuesto, licenciamiento |
| **Arquitectura / Auditoría / Revisión** | ChatGPT (GPT-5.6 Luna) | Diseño alto nivel, auditoría técnica, decisiones arquitectónicas, validación gates |
| **Ejecución Técnica / Código / Tests / Git** | OpenCode + DeepSeek V4 Pro | Implementación, testing, optimización, operaciones Git, CI/CD |
| **Capa Agentic / Orquestación** | SolucionaTIA / LangGraph | Discovery, Research, Market Intelligence, Evidence, BIC, Orchestration, Routing, Memory, Reasoning |
| **Fuente de Verdad / Versionado / CI** | GitHub | Issues, PRs, CI/CD, documentación, releases, wiki |
| **Entorno Remoto Dev/Staging/Prod** | Oracle Cloud | Docker, PostgreSQL, Redis, SaaS, SolucionaTIA/LangGraph |

**Jerarquía de decisión**: PO > Architect > Director > Developer/QA/Security/DevOps. En conflicto técnico: **Architect decide**. En conflicto de producto: **PO decide**.

---

## 2. ESTADO VERIFICADO ACTUAL (Fuente: `docs/governance/CURRENT-STATE-v1.0.md`)

### 2.1 Lo que EXISTE y está VERIFICADO ✅
- Repo público: `DiegoAlejandroSaenzFalcon/Soluciona-Inteligencia-Artificial` (rama `main`)
- Módulo **Comercial** funcional: Node 22, TS5, Fastify, Drizzle ORM, PostgreSQL, Redis/BullMQ, vitest, ESLint, Prettier, Husky
- **Dual runtime**: `index.js` (legacy, `package.json` → `node index.js`) + `src/index.ts` (Clean Architecture bootstrap) — **SIN RECONCILIAR**
- **WhatsApp**: Baileys (default) + Cloud API (opcional via `WHATSAPP_TRANSPORT=cloud`) — migración **PARCIAL**
- **DB**: SQLite (`core/db.js`) + **Doble capa PostgreSQL** (`core/db-pg.js` legacy + `src/infrastructure/database/pool.ts` Clean Arch) — **SIN RECONCILIAR**
- **DIAN Software Propio**: xml-crypto, SOAP WS-Security, BullMQ queue — **IMPLEMENTADO Y VERIFICADO**
- **Auth**: JWT, reset password, RBAC seed — **IMPLEMENTADO**
- **CI/CD**: `.github/workflows/ci-cd.yml` en submódulo comercial — **BUG CRÍTICO**: `npm ci` corre en raíz vs `package.json` en submódulo
- **Docker**: `Dockerfile.prod` multi-stage ARM64/AMD64, `docker-compose.prod.yml`
- **Gobernanza submódulo**: `AGENTS.md`, `CLAIMS.md` (zonas, edición concurrente)
- **Root governance**: `CLA.md`, `HONEYTOKEN.md`, `SECURITY.md` — **AGENTS.md y CONTRIBUTING.md raíz CREADOS EN ESTA SESIÓN**

### 2.2 Lo que NO EXISTE / ESTÁ PERDIDO ❌ (Misión 1: Recovery)
- **Capa Agentic SolucionaTIA / LangGraph** (`solucionatia/` Python package) — **AUSENTE**
- Commits reportados en chat: `eb5d42f` (E0), `b5e6b41` (WIP E0+A2A), `6fb810c` (FREEZE), `c1d4772` (E1) — **NO EN HISTORIAL GIT**
- Archivos: `channel.py`, `schemas/e1.py`, `base_schemas.py`, `tests/test_channel.py`, `ai-coordination/`, `SOLUCIONATIA_AGENTIC_SYSTEM_SPEC_v1.0.md` — **NO EN REPO**
- `docs/governance/` — **AMPLIADO EN ESTA SESIÓN** (PLAN-DIRECTOR §15, CURRENT-STATE §8-9, DISASTER-RECOVERY, PROCESO-DESARROLLO-PRODUCCION, LANGGRAPH-RECOVERY-REPORT)
- Oracle Cloud VM — **NO PROVISIONADA**
- Branch protection / Rulesets en `main` — **PENDIENTE**

### 2.3 Conflictos Técnicos Abiertos (Bloqueantes)
| Conflicto | Archivos | Riesgo |
|-----------|----------|--------|
| Dual runtime | `index.js` vs `src/index.ts` | Dos entrypoints, config distinta, dependencias distintas |
| Doble capa PG | `core/db-pg.js` vs `src/infrastructure/database/pool.ts` | Dos pools, sin fuente de verdad, migraciones divergentes |
| Legacy AI vs Model Router | `core/ai.js`/`ia-pool.js` vs (inexistente) `ModelGateway`/`ModelRouter` | Riesgo de dos routers rivales |
| CI/CD working dir | Workflow en raíz, código en submódulo | Pipeline roto, gates inoperantes |

---

## 3. PLAN DIRECTOR Y MISIONES (Fuente: `docs/governance/PLAN-DIRECTOR-SOLUCIONA-IA-v1.0.md`)

### Orden Estricto de Ejecución (No Saltar)

| Prioridad | Misión | Descripción | Entregable |
|-----------|--------|-------------|------------|
| **P0-1** | **Recovery LangGraph** | Forensics Git (`fsck`, `reflog`, `stash`, unreachable) + búsqueda `solucionatia/` + verificación commits perdidos | `docs/governance/LANGGRAPH-RECOVERY-REPORT.md` actualizado |
| **P0-2** | **Architecture Audit** (Issue #2) | Reconciliar dual runtime, doble PG, WhatsApp, Legacy AI vs Router. Completar Issue #2 | `ai-coordination/AUDIT_NOTES.md`, `CURRENT_STATUS.md` |
| **P0-3** | **CI/CD Reconciliation** | Corregir working directory / build context / gates en rama `fix/ci-cd-monorepo-context` | Pipeline verde: lint, typecheck, unit, integration, security, Docker ARM64 |
| **P0-4** | **Oracle Bootstrap** | Provisionar VM (2 OCPU/12GB ARM64 Ubuntu 24.04), hardening, `/opt/soluciona/`, Docker, red | VM accesible, stack base corriendo |
| **P1-1** | PostgreSQL + SaaS | Migraciones Drizzle, seed, healthchecks, SaaS operativo | SaaS + PG verified |
| **P1-2** | Redis + BullMQ | Colas, healthchecks, colas DIAN/WhatsApp | Redis operativo |
| **P1-3** | LangGraph / SolucionaTIA Deploy | Deployment, persistencia PG, model registry, healthcheck | Agentic desplegada |
| **P1-4** | Contrato SaaS↔Agentic READ ONLY | Primer integration slice (Issue #1) | `ai-coordination/PROTOCOL.md` + slice verificado |
| **P2** | Inventario, Compras, Recetas/Producción | Dominio comercial | Features completadas |
| **P3** | Operational AI | Modelos en producción, routing, evaluación continua | Agentic productiva |

> **REGLA**: No iniciar P1 sin P0 completado y verificado. No reconstruir Agentic sin Recovery (P0-1) exhaustivo.

---

## 4. SEPARACIÓN SAAS ↔ SOLUCIONATIA (Límite Estricto — No Negociable)

| SaaS (Fuente de Verdad) | SolucionaTIA / LangGraph (Inteligencia) |
|-------------------------|------------------------------------------|
| Tenants, Auth/RBAC, Usuarios | Market Intelligence, Discovery |
| Clientes, Conversaciones, WhatsApp | Identity Resolution, Research |
| Catálogo, Pedidos, Inventario | Evidence, Audit, Opportunity |
| Compras, Recetas, Producción | BIC, QA/Evaluation |
| Facturación DIAN, Reglas Transaccionales | Orchestration, Model Routing |
| Datos Empresariales, Auditoría | Memory, Reasoning |

**REGLAS DE ORO**:
- LangGraph **NO** accede directo a tablas SaaS → **API/Event boundary versionado**
- **NO** SQL arbitrario, **NO** saltar RBAC/tenant isolation, **NO** mutar inventario/pedidos/facturas
- Contratos mínimos: `TenantContext`, `Customer`, `Conversation`, `Message`, `Product/Catalog`, `Order`, `BusinessProfile`, `Opportunity`, `Evidence`, `AgentTask`, `AgentResult`
- IDs obligatorios: `tenant_id`, `run_id`, `trace_id`, `task_id`, `correlation_id`
- **Primera integración: READ ONLY**

---

## 5. PROCESO DE DESARROLLO (Vinculante — `docs/governance/PROCESO-DESARROLLO-PRODUCCION.md`)

### 5.1 Flujo Inquebrantable
```
Issue → Análisis → Rama → Implementación → Test → Verificación → Documentación → Commit → PR → Review → Merge
```

### 5.2 Gates de Promoción
| Promoción | Gates Automatizados | Approvals Humanos |
|-----------|---------------------|-------------------|
| `feature/*` → `develop` | Lint, Typecheck, Unit, Security | `reviewer` + `architect` |
| `develop` → Staging | + Integration Tests + Docker Build ARM64 | `devops` |
| `main` (tag `v*`) → Prod | + E2E Staging + Smoke Tests | `director` + `architect` + `security` + `devops` |

### 5.3 Convenciones
- **Commits**: Conventional Commits (`feat`, `fix`, `refactor`, `test`, `docs`, `infra`, `security`, `chore`)
- **Ramas**: `feature/<zona>-<desc>`, `fix/<zona>-<desc>`, `docs/<tema>`, `infra/<tarea>`
- **Una tarea = una unidad lógica**. No mezclar.
- **Tests obligatorios**: Unit ≥ 80%, Integration ≥ 60% código nuevo.

### 5.3 Reporte Obligatorio por Tarea (Al cerrar PR)
```
EXECUTIVE_STATUS: <resumen>
TASK: <ID>
OBJECTIVE: <objetivo>
EVIDENCE_CLASSIFICATION: <UNO_DE_6: IMPLEMENTADO_Y_VERIFICADO | PARCIALMENTE_IMPLEMENTADO | PRESENTE_PERO_NO_PROBADO_E2E | DOCUMENTADO_PERO_NO_VERIFICADO | NO_ENCONTRADO_TRAS_INSPECCION | DESCONOCIDO>
FINDINGS: <hallazgos>
FILES_CHANGED: <lista>
FILES_CREATED: <lista>
FILES_NOT_CHANGED: <revisados no tocados>
TESTS_RUN: <comandos>
TEST_RESULTS: <pass/fail/cobertura>
SECURITY_IMPACT: <ninguno/bajo/medio/alto>
ARCHITECTURE_IMPACT: <ninguno/bajo/medio/alto>
PERFORMANCE_IMPACT: <ninguno/bajo/medio/alto>
ROLLBACK: <cómo revertir>
COMMIT_SHA: <sha>
BRANCH: <rama>
PR: <url>
BLOCKERS: <bloqueos>
NEXT_TASK: <siguiente>
```

---

## 6. DISASTER RECOVERY (Fuente: `docs/governance/DISASTER-RECOVERY.md`)

**RTO Objetivo**: < 4 horas | **RPO Objetivo**: < 1 hora

### Fuentes de Verdad para Restore
| Activo | Primario | Réplicas |
|--------|----------|----------|
| Código + Git History | GitHub `main` | Local clones, Oracle `/opt/soluciona/repo/` |
| Docs Gobernanza | `docs/governance/` en GitHub | MkDocs Pages |
| Secrets | **NO en Git** → 1Password/Bitwarden (Owner) + Oracle `env/` | USB cifrado Owner |
| DB Schema + Migraciones | `src/db/schema.ts` + `drizzle/` en Git | `pg_dump` diario Oracle |
| Datos PG (Prod) | PostgreSQL Oracle | `pg_dump` diario → `/opt/soluciona/backups/` |
| Datos Redis | Redis Oracle | `BGSAVE` cada 6h → `/opt/soluciona/backups/` |
| Estado Agentic | PG (tabla `checkpoints`) + Redis | Mismo backup PG/Redis |

### Escenarios Clave
- **Pérdida Local (portátil)**: `winget install Git.Git GitHub.cli OpenCode.OpenCode` → `gh auth login --web` → `git clone` → leer `CURRENT-STATE` → continuar
- **Pérdida Oracle VM**: Re-provisionar via `infra/oracle/bootstrap-vm.sh` + `bootstrap.sh` → restore `pg_dump` + `redis BGSAVE` → `docker compose up` en orden (`PROCESO-DESARROLLO-PRODUCCION.md` §7.2) → healthchecks → E2E
- **Corrupción Git**: Clone limpio Owner → `git push --force-with-lease` / BFG Repo-Cleaner si secrets → rotación inmediata secrets
- **Fallo Proveedor IA**: Estado vive en **Git + Docs**, no en sesión IA. Cualquier IA nueva lee `PLAN-DIRECTOR` + `CURRENT-STATE` + `CURRENT_STATUS.md` → continúa

---

## 7. CONFIGURACIÓN TÉCNICA CLAVE

### 7.1 Hardware Local (Consola)
- Lenovo IdeaPad Slim 3 15IAN8, Windows 11 Pro, 8 GB RAM
- OpenCode (winget), DeepSeek V4 Pro (NVIDIA NIM), Git, SSH
- **NO** WSL, **NO** Docker Desktop, **NO** PG/Redis local, **NO** LangGraph local

### 7.2 Oracle Cloud (Target)
- VM.Standard.A1.Flex, 2 OCPU, 12 GB, ARM64, Ubuntu 24.04 LTS
- Puertos: 22, 80, 443 únicamente (PG 5432, Redis 6379, SaaS 3000, Agentic internos **NO expuestos**)
- `/opt/soluciona/{repo,env,data,backups,logs,scripts}`
- Usuario `soluciona` no root, SSH key-only, UFW + OCI Security Lists

### 7.3 Coste
- **Desarrollo**: $0 objetivo. `paid_models = DENY`, `free_endpoints = ALLOW` (NVIDIA build.nvidia.com: DeepSeek, Nemotron, Kimi, Mistral, etc.), `local_models = ALLOW`
- **Producción**: Modelos pagos según presupuesto cliente aprobado

### 7.4 Calidad (Prioridad)
1. Correctness 2. Seguridad 3. Reproducibilidad 4. Mantenibilidad 5. Rendimiento 6. Velocidad

---

## 8. ARCHIVOS CLAVE A LEER (Orden de Prioridad)

1. `docs/governance/PLAN-DIRECTOR-SOLUCIONA-IA-v1.0.md` — **Autoridad suprema**
2. `docs/governance/CURRENT-STATE-v1.0.md` — Estado verificado (este documento lo resume)
3. `docs/governance/DISASTER-RECOVERY.md` — Continuidad
4. `docs/governance/PROCESO-DESARROLLO-PRODUCCION.md` — Proceso parametrizado
5. `docs/governance/LANGGRAPH-RECOVERY-REPORT.md` — Misión 1 estado
6. `AGENTS.md` (raíz) + `CONTRIBUTING.md` (raíz) — Coordinación multi-IA
6. `CLA.md`, `HONEYTOKEN.md`, `SECURITY.md` — Seguridad/legal
7. `soluciona-inteligencia-artificial-comercial/AGENTS.md` + `CLAIMS.md` — Zonas comercial
8. `soluciona-inteligencia-artificial-comercial/package.json` — Dependencias/scripts
9. `soluciona-inteligencia-artificial-comercial/.github/workflows/ci-cd.yml` — Pipeline (bug conocido)
10. `soluciona-inteligencia-artificial-comercial/index.js` + `src/index.ts` — Dual runtime
11. `ai-coordination/` (cuando exista) — `PROTOCOL.md`, `HANDOFF.md`, `CURRENT_STATUS.md`, `AUDIT_NOTES.md`

---

## 9. COMANDOS DE REFERENCIA RÁPIDA (Para la IA Ejecutora)

```bash
# Clonar y setup
gh auth login --web
git clone https://github.com/DiegoAlejandroSaenzFalcon/Soluciona-Inteligencia-Artificial.git
cd Soluciona-Inteligencia-Artificial
gh auth setup-git

# Trabajo en submódulo comercial
cd soluciona-inteligencia-artificial-comercial
npm ci
cp .env.example .env  # completar
npm run db:generate
npm run db:migrate
npm run test:unit

# Git workflow
git checkout -b feature/comercial-whatsapp-cloud-api
# ... cambios ...
npm run lint && npm run typecheck && npm run test:unit
git add -A
git commit -m "feat(comercial): migrar WhatsApp a Cloud API"
git push origin feature/comercial-whatsapp-cloud-api
gh pr create --base develop --title "feat(comercial): WhatsApp Cloud API migration" --body "..."

# Ver estado remoto
gh repo view DiegoAlejandroSaenzFalcon/Soluciona-Inteligencia-Artificial --json issues,pullRequests

# Oracle (desde VM)
cd /opt/soluciona/repo
git pull
cd soluciona-inteligencia-artificial-comercial
docker compose -f docker-compose.prod.yml up -d
./wait-for-healthy.sh saas 60 && ./wait-for-healthy.sh agentic 60
```

---

## 10. PRÓXIMA ACCIÓN INMEDIATA (Donde Quedamos)

> **MISIÓN ACTIVA: P0-1 Recovery LangGraph**
>
> **Tarea**: Completar análisis forense Git pendiente:
> 1. `git fsck --unreachable --full` → inspeccionar **todos** los blobs unreachable buscando `solucionatia`, `channel`, `schemas`, `E0`, `A2A`, `ModelGateway`, `ModelRouter`, `ai-coordination`, `SOLUCIONATIA_AGENTIC_SYSTEM_SPEC`
> 2. `git reflog --all` exhaustivo → buscar referencias a trabajo agentic
> 3. Verificar backups locales (OneDrive, `~/.local/share/opencode/sessions/`, `.git/refs/original/`)
> 4. Actualizar `docs/governance/LANGGRAPH-RECOVERY-REPORT.md` con hallazgos
> 5. **SOLO si todo falla**: Reportar `NO_ENCONTRADO_TRAS_INSPECCION` definitivo → autorizar reconstrucción

**Estado previo**: `git fsck --unreachable` ejecutado parcialmente, análisis de blobs **PENDIENTE**. `git reflog --all` revisado parcialmente.

---

## 11. INSTRUCCIONES FINALES PARA LA IA RECEPTORA

1. **NO inventes estado**. Si no está en `CURRENT-STATE` o `LANGGRAPH-RECOVERY-REPORT` con evidencia, es `DESCONOCIDO`.
2. **NO saltes misiones**. P0-1 → P0-2 → P0-3 → P0-4 → P1... en orden.
3. **NO reconcilies dual runtime / doble PG / Legacy AI** sin Auditoría (P0-2) completada.
4. **NO arregles CI/CD** sin determinar working directory / build context correcto (monorepo vs submódulo).
5. **NO provisiones Oracle** sin hardening completo (usuario no root, SSH key-only, UFW, OCI Security Lists).
6. **CADA TAREA** termina con reporte obligatorio de evidencia (plantilla en `CONTRIBUTING.md`) y actualización de `CURRENT-STATE` si cambia algo material.
7. **SECRETOS**: Cero tolerancia. Ver `SECURITY.md` + `HONEYTOKEN.md`. Si ves secreto → señalar y no replicar.
8. **CONTINUIDAD**: Al finalizar tu sesión, actualiza `ai-coordination/HANDOFF.md` y `CURRENT_STATUS.md` para la siguiente IA.
9. **EVIDENCIA**: Solo los 6 estados permitidos. Lo no demostrado = `DESCONOCIDO`.
10. **AUTORIDAD**: En duda, consulta `PLAN-DIRECTOR`. En conflicto técnico → `architect` (ChatGPT). En conflicto producto → `PO` (Diego).

---

## 12. FIRMA DE CONTEXTO

**Proyecto**: Soluciona Inteligencia Artificial
**Repositorio**: `DiegoAlejandroSaenzFalcon/Soluciona-Inteligencia-Artificial`
**Rama base**: `main`
**Último commit verificado**: `68ee6ce` (fix: nav apunta a docs/ subdirectorios — 2026-09-06)
**Última actualización gobernanza**: 2026-09-10 (esta sesión)
**Próxima revisión programada**: Tras completar P0-1 Recovery LangGraph

---

**Este prompt es autosuficiente**. Cualquier IA que lo reciba tiene todo para continuar sin preguntar "¿qué sigue?" ni "¿dónde estamos?". El estado está en los docs de gobernanza. La autoridad está definida. El proceso está parametrizado. La recuperación está planificada.

**¡A trabajar con rigor, evidencia y continuidad!**