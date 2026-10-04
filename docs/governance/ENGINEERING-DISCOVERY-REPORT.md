# Engineering Discovery & Repository Forensics Report
## Soluciona Inteligencia Artificial — 2026-09-10

> **Alcance**: Fase de descubrimiento + forense de repositorio. NO se implementaron funcionalidades, NO se modificó arquitectura ni runtime, NO se hizo commit/push/merge.
> **Método**: solo lectura (git inspect, gh API, lectura de archivos).
> **Regla de evidencia aplicada**: DOCUMENTADO ≠ IMPLEMENTADO ≠ VERIFICADO.

---

## A. Executive Summary

El repositorio `DiegoAlejandroSaenzFalcon/Soluciona-Inteligencia-Artificial` es **público** y contiene un **monorepo real de 3 variantes** con estados de madurez muy distintos:

| Variante | Estado REAL (verificado) |
|----------|--------------------------|
| **Comercial** (`soluciona-inteligencia-artificial-comercial/`) | Código funcional (Node 22/TS/Fastify/Drizzle/PG/Redis/DIAN/WhatsApp) pero con **conflictos arquitectónicos sin reconciliar** (dual runtime, doble capa PG, IA legacy vs Router). |
| **Empresarial** (`soluciona-inteligencia-artificial-empresarial/`) | **Scaffolding de helpdesk/soporte TI** (AGENTS.md, `.opencode/agents/{triager,solver,revisor}.md`, `kb/`, `tickets/`, `templates/`, `docs/01-06`). Sin SaaS. |
| **Residencial** (`soluciona-inteligencia-artificial-residencial/`) | **Vacío** — solo `README.md`. |

Hallazgos de mayor impacto:

1. **La capa agentic SolucionaTIA/LangGraph NUNCA existió en este repositorio** (ver §G). El trabajo previo descrito en el contexto histórico (E0/A2A/E1, commits `eb5d42f`–`c1d4772`) no está en `main`, no está en ramas, no está en objetos unreachable y no hay repositorio separado para él. Solo sobrevive como narrativa en `SolucionaTIA_chat_completo.md`.

2. **El PR #4 está contaminado** con 11 archivos **fuera de alcance** (`docs/optimization/windows-11-pro/*` + `scripts/windows/*`) que son una auditoría/optimización del equipo personal del propietario, y que **exponen en un repo público** detalles de seguridad del equipo local (cuenta admin sin contraseña, BitLocker OFF, hostname, IP LAN). Ese contenido pertenece a los repos `Windows-11-Professional` y `Red-Hat-Enterprise-Linux`, no aquí.

3. **CI/CD roto en tres frentes independientes** (ver §F): `npm ci` en raíz sin `package.json`; y refiere scripts `npm run lint` y `npm run test:integration` que **no existen** en `package.json`.

4. **Actividad multiagente concurrente sin coordinación** (ver §B): durante esta misma auditoría apareció un commit nuevo (`90c866f`) en la rama, generado por otro proceso/IA sin register en `CLAIMS.md`.

---

## B. Repository Baseline (Git)

### B.1 Estado al momento de la auditoría

| Aspecto | Valor | Evidencia |
|---------|-------|-----------|
| Branch por defecto | `main` | `git branch -a`, GitHub API |
| HEAD de `main` | `68ee6ce` `fix: nav apunta a docs/ subdirectorios` | `git log` |
| HEAD de `docs/director-plan-v1` | `90c866f` `fix(optimization): correct scripts to match actual changes applied` | `git log` |
| Ramas remotas | `main`, `docs/director-plan-v1`, `feature/dian-software-propio`, `gh-pages` | `git branch -a` |
| Tags | **ninguno** | `git tag -l` (vacío) |
| Working tree local | limpio (sin cambios sin commit) | `git status` |

### B.2 Historial de `docs/director-plan-v1` (6 commits adelante de `main`)

```
c2e27c3 docs(governance): add Soluciona IA Plan Director v1.0
7a3214b docs(governance): add root AI collaboration policy
ab6ac1a docs(governance): define contribution and migration process
e70515e docs(governance): add verified repository baseline
3e68ae0 docs(governance): ampliar plan director, DR, proceso dev/prod y recuperación agentic
0a05554 feat(optimization): Windows 11 Pro forensic audit + performance optimization scripts
90c866f fix(optimization): correct scripts to match actual changes applied
```

`main` no tiene commits adelante (0 behind). `feature/dian-software-propio` apunta a `9ade101` sobre `07f10e1` (el trabajo DIAN ya está mergeado a `main` vía `07f10e1` → ancestro de `main`; la rama residual solo añade un commit de `CLAIMS.md`).

### B.3 Actividad concurrente NO coordinada (hallazgo operacional)

El `reflog` demuestra que **durante la auditoría** la rama avanzó de `0a05554` → `90c866f`:

```
90c866f HEAD@{0}: commit: fix(optimization): correct scripts to match actual changes applied
0a05554 HEAD@{1}: commit: feat(optimization): Windows 11 Pro forensic audit ...
3e68ae0 HEAD@{2}: commit: docs(governance): ampliar plan director ...
e70515e HEAD@{3}: checkout: moving from main to docs/director-plan-v1
68ee6ce HEAD@{4}: clone: from https://github.com/...Soluciona-Inteligencia-Artificial.git
```

**Conclusión**: hay al menos otro agente IA operando sobre la misma rama sin coordinación por `CLAIMS.md` ni control de scope. Esto viola el propio `AGENTS.md`/`CONTRIBUTING.md` del proyecto (que exige registrar ownership y no mezclar dominios).

---

## C. PR #4 Audit

### C.1 Identificación

| Campo | Valor |
|-------|-------|
| Número | #4 |
| Título | `docs(governance): establish Plan Director and AI collaboration rules v1.0` |
| Estado | OPEN, **DRAFT**, MERGEABLE |
| Head / Base | `docs/director-plan-v1` → `main` |
| Cambios | 19 archivos, +3,419 líneas, 0 eliminaciones |

### C.2 Desglose por archivo y veredicto

| # | Archivo | En alcance | Veredicto |
|---|---------|-----------|-----------|
| 1 | `AGENTS.md` | ✅ | Mantener (gobernanza multi-IA) |
| 2 | `CONTRIBUTING.md` | ✅ | Mantener |
| 3 | `PROMPT_MAESTRO_MULTIAGENTE_CONTEXTO_TOTAL.md` | ✅ | Mantener |
| 4 | `docs/governance/CURRENT-STATE-v1.0.md` | ✅ | Mantener |
| 5 | `docs/governance/DISASTER-RECOVERY.md` | ✅ | Mantener |
| 6 | `docs/governance/LANGGRAPH-RECOVERY-REPORT.md` | ✅ | Mantener (requiere actualizar con hallazgo definitivo §G) |
| 7 | `docs/governance/PLAN-DIRECTOR-SOLUCIONA-IA-v1.0.md` | ✅ | Mantener |
| 8 | `docs/governance/PROCESO-DESARROLLO-PRODUCCION.md` | ✅ | Mantener |
| 9 | `docs/optimization/windows-11-pro/AUDIT-2026-09-10.md` | ❌ | **FUERA DE ALCANCE** — auditoría del laptop personal; expone credenciales débiles en repo público |
| 10 | `docs/optimization/windows-11-pro/DECISIONS.md` | ❌ | **FUERA DE ALCANCE** |
| 11 | `docs/optimization/windows-11-pro/README.md` | ❌ | **FUERA DE ALCANCE** |
| 12 | `docs/optimization/windows-11-pro/ROLLBACK.md` | ❌ | **FUERA DE ALCANCE** |
| 13 | `scripts/windows/01-security-baseline.ps1` | ❌ | **FUERA DE ALCANCE** |
| 14 | `scripts/windows/02-performance-core.ps1` | ❌ | **FUERA DE ALCANCE** |
| 15 | `scripts/windows/03-vbs-hvci-toggle.ps1` | ❌ | **FUERA DE ALCANCE** (altera seguridad kernel) |
| 16 | `scripts/windows/04-fine-tuning.ps1` | ❌ | **FUERA DE ALCANCE** |
| 17 | `scripts/windows/05-rhel-grub-recovery.ps1` | ❌ | **FUERA DE ALCANCE** (recuperación SO, no del proyecto) |
| 18 | `scripts/windows/rollback-all.ps1` | ❌ | **FUERA DE ALCANCE** |
| 19 | `scripts/windows/verify-optimization.ps1` | ❌ | **FUERA DE ALCANCE** |

### C.3 Conclusiones sobre PR #4

- **Correcto**: Los 8 archivos de gobernanza (1-8) son pertinentes y están bien estructurados.
- **Fuera de alcance**: Los 11 archivos (9-19) son de optimización/seguridad del equipo Windows personal + recuperación RHEL. Constituyen:
  - **Mezcla de dominios** (infraestructura personal vs gobernanza del producto), prohibida por el propio `CONTRIBUTING.md`.
  - **Riesgo de exposición**: el `AUDIT-2026-09-10.md` documenta en un repo *público*: cuenta local `Diego Saenz` con **`PasswordRequired=False`**, hostname `DESKTOP-KMRGNQU`, IP LAN `192.168.20.49`, BitLocker OFF, seriales de RAM y modelo de disco.
  - **Riesgo operativo**: los scripts modifican registro, servicios y seguridad del kernel (HVCI/VBS, NetBIOS, Spooler, OneDrive) sin relación con el producto.
- **Debe salir del PR**: archivos 9-19. Destino correcto: repo `Windows-11-Professional` (scripts 01-04, verify, rollback) y repo `Red-Hat-Enterprise-Linux` (05-rhel-grub-recovery). 
- **Debe permanecer**: archivos 1-8 (gobernanza).
- **Debe modificarse**: `LANGGRAPH-RECOVERY-REPORT.md` para reflejar el veredicto definitivo (§G): "no era recuperable porque nunca estuvo en este repo".

---

## D. Architecture Baseline (Real)

### D.1 Comercial — `soluciona-inteligencia-artificial-comercial/`

Backend Node.js (runtime real `node index.js`), con estructura amplia:

- **Entrypoints (dual runtime NO reconciliado)**:
  - `index.js` (legacy, `package.json` → `"start": "node index.js"`): carga `config.js`, `core/modules`, Baileys por defecto y Cloud API opcional (`WHATSAPP_TRANSPORT=cloud`).
  - `src/index.ts` (Clean Architecture TS): `getConfig`, `buildServer`, `getPool`, bootstrap Fastify. **No** es la ruta de arranque por defecto.
- **Datos (doble capa NO reconciliada)**:
  - `core/db.js` (SQLite o PostgreSQL), `core/db-pg.js` (PG legacy), `src/infrastructure/database/pool.ts` (PG Clean Arch).
  - `src/db/schema.ts` (Drizzle: tenants, users, permissions, products, stock, movements, suppliers…; `config_secrets` con AES-256-GCM).
- **WhatsApp**: Baileys (`@whiskeysockets/baileys`) + Cloud API (`src/whatsapp/cloud/transport.js`). Migración **PARCIAL**.
- **IA (legacy)**: `core/ai.js` + `core/ia-pool.js` (rotación de proveedores/claves, cuotas, fallback). **No** es un Model Router.
- **DIAN Software Propio**: `dian-middleware/` (firma `xml-crypto`, SOAP WS-Security, cola BullMQ), integración `core/adaptadores/dian-propio.js`. Implementado (commit `07f10e1`).
- **Auth**: `src/auth/`, JWT, reset password, RBAC seed (`reset-admin.js`).
- **Paneles**: `dashboard.html`, `panel-*.html/js` (global, empresarial, central, inventario, whatsapp-lite, contabilidad, config).
- **Docker**: `Dockerfile.prod`/`Dockerfile.dev`/`Dockerfile.sidecar`, `docker-compose.*.example.yml`.
- **Tests**: Vitest (`tests/unit`, `tests/setup.js`). **Solo unit**; no hay carpeta `tests/integration`.
- **Calidad**: `.eslintrc.js`, `.prettierrc`, `husky`, `lint-staged`, `tsconfig.json`. **No hay script npm `lint`**.

### D.2 Empresarial — helpdesk (no SaaS)

`soluciona-inteligencia-artificial-empresarial/`: `AGENTS.md` (reglas soporte TI, tickets append-only, KB), `.opencode/agents/{triager,solver,revisor}.md`, `opencode.json` (model `deepseek-v4-flash-free`, permisos `ask`), `clientes/.gitkeep`, `docs/01-06`, `kb/` (runbooks), `scripts/`, `templates/`, `tickets/.gitkeep`, `index.js`.

Es un **modelo de operación de soporte TI con agentes OpenCode**, no un producto de software equivalente al Comercial.

### D.3 Residencial — vacío

`soluciona-inteligencia-artificial-residencial/` contiene únicamente `README.md`. Sin implementación.

---

## E. Security Baseline

### E.1 Hallazgos confirmados

| # | Hallazgo | Severidad | Evidencia |
|---|----------|-----------|-----------|
| E1 | Repo **público** pero `README.md` declara "repositorio **privado**" | ALTO | GitHub API `visibility=public`; `README.md` línea "Este repositorio privado…" |
| E2 | Exposición en repo público de seguridad del equipo personal (admin sin contraseña, BitLocker OFF, hostname/IP) | **CRÍTICO** | `docs/optimization/windows-11-pro/AUDIT-2026-09-10.md` |
| E3 | `SECURITY.md` (cero secretos) y `HONEYTOKEN.md` presentes y coherentes | OK | raíz |
| E4 | `gitleaks.yml` workflow en raíz (secret scanning) | OK | `.github/workflows/gitleaks.yml` |
| E5 | `config.js` y `.env.example` excluyen secretos reales | OK (documentado, no verificado E2E) | `SECURITY.md`, `.gitignore` |
| E6 | Sin branch protection / rulesets en `main` | ALTO | GitHub API `rulesets: []`; `protected=false` |

### E.2 Nota sobre `README.md`

`README.md` (raíz) está codificado en **UTF-16** (o con BOM que las herramientas detectan como binario), lo que provoca interpretación errónea ("binary file") y mojibake. Recomendable normalizar a UTF-8. Clasificación: `DESCONOCIDO` si afecta a MkDocs/escaners.

---

## F. CI/CD Baseline

### F.1 Workflows existentes

| Workflow | Ruta | Función | Estado |
|----------|------|---------|--------|
| `docs.yml` | `.github/workflows/` (raíz) | MkDocs → GitHub Pages | OK (documentado) |
| `pages.yml` | `.github/workflows/` (raíz) | GitHub Pages | OK (documentado) |
| `gitleaks.yml` | `.github/workflows/` (raíz) | Secret scanning | OK (documentado) |
| `ci-cd.yml` | `soluciona-inteligencia-artificial-comercial/.github/workflows/` | Lint/typecheck/unit/security/docker/deploy | **ROTO** |

### F.2 `ci-cd.yml` — tres defectos independientes (todos confirmados leyendo archivo)

1. **Working directory / build context erróneo**: los jobs ejecutan `npm ci` sin `working-directory` (GitHub Actions corre en la raíz del repo), pero el único `package.json` real está en `soluciona-inteligencia-artificial-comercial/`.
2. **`npm run lint` inexistente**: el workflow invoca `npm run lint`, pero `package.json` NO define script `lint` (solo existe `.eslintrc.js`).
3. **`npm run test:integration` inexistente**: el workflow invoca `npm run test:integration`, pero `package.json` NO define ese script y no existe `tests/integration/` (solo `tests/unit`).

Además: el job de Docker usa `context: .` / `file: ./Dockerfile.prod` (debería apuntar al submódulo). Clasificación global: `PARCIALMENTE_IMPLEMENTADO` (intención) / **no ejecutable** tal cual.

---

## G. Agentic / LangGraph Forensics (P0)

### G.1 Comandos ejecutados

```
git log --all --oneline --grep=<langgraph|solucionatia|agentic|SolucionaTIA|SPEC|pyproject> -i
git log --all --name-status -- 'solucionatia/*' 'ai-coordination/*'
git log --all --name-status -- '*pyproject*' '*langgraph*' 'requirements*.txt'
git fsck --full --no-reflogs --unreachable
git reflog --all
gh repo list DiegoAlejandroSaenzFalcon --limit 100
búsqueda de directorios solucionatia*/ai-coordination/ y archivos langgraph.json/pyproject.toml
```

### G.2 Resultados (verificados)

| Consulta | Resultado |
|----------|-----------|
| `grep` por `langgraph`/`solucionatia`/`agentic` en commits | **Solo** `3e68ae0` (el commit de gobernanza de esta serie; no evidencia histórica de la capa) |
| `--name-status` sobre `solucionatia/` / `ai-coordination/` | **vacío** |
| `pyproject.toml` / `langgraph.json` / `requirements*.txt` | **nunca versionados** |
| `git fsck --unreachable` | **vacío** (cero objetos dangling/unreachable) |
| `git reflog --all` | 4 entradas: `clone` (68ee6ce) → `checkout` → commit gobernanza → 2 commits Windows-opt |
| Repositorios del owner | 8 total; **no existe** ningún repo `SolucionaTIA`, `LangGraph` ni similar |
| Directorio `solucionatia/` en working tree | **no existe** |

### G.3 Veredicto forense

> **La capa SolucionaTIA/LangGraph nunca existió en este repositorio.**

- Los commits `eb5d42f`, `b5e6b41`, `6fb810c`, `c1d4772` referidos en el contexto histórico **no son alcanzables** y no están en objetos unreachable (fsck vacío).
- El `reflog` del clone local muestra que el clone se inició hoy desde `68ee6ce`; no hay rastro de un historial previo reescrito.
- No hay repositorio alternativo que contuviera esa capa.
- Conclusión: el trabajo E0/A2A/E1 vivió en **archivos locales no versionados en otro entorno/clon**, que se perdió (el propio contexto histórico documenta reinicios de Windows que hacen perder trabajo no commiteado). El único vestigio es la narrativa en `SolucionaTIA_chat_completo.md` (y su duplicado), que **no contiene código ni spec**.

**Implicación**: no hay "recuperación" posible vía Git. La única vía es **reconstruir** desde la narrativa histórica + re-especificación, o localizar un backup fuera de GitHub (a confirmar con el Owner). `LANGGRAPH-RECOVERY-REPORT.md` debe actualizarse para reflejar `NO_ENCONTRADO_TRAS_INSPECCION` como veredicto definitivo (ya no "parcial").

---

## H. Technical Debt (clasificada)

### P0 — Crítico (bloqueante)
- H1. PR #4 contaminado con contenido fuera de alcance que expone seguridad personal (E2).
- H2. CI/CD roto en 3 frentes (F.2.1–F.2.3).
- H3. Sin branch protection en `main`.
- H4. README raíz declara "privado" cuando el repo es público (E1).

### P1 — Alto
- H5. Dual runtime `index.js` vs `src/index.ts` sin reconciliar.
- H6. Doble capa PostgreSQL (`core/db-pg.js` vs `src/infrastructure/database/pool.ts`).
- H7. IA legacy (`core/ai.js`/`ia-pool.js`) sin converger hacia Model Router.
- H8. Migración Baileys → Cloud API incompleta.

### P2 — Medio
- H9. Archivos temporales en raíz del comercial: `fix-imports.js`, `fix_esc*.js`, `test_esc*.js`, `run.err`, `server.err`, `*.txt` de estado (`SUMMARY`, `FINAL_SOLUTION`, `PRODUCTION_READY`).
- H10. Scripts `.bat` Windows-only sin alternativa cross-platform.
- H11. `DEPLOY-ORACLE.md` legacy (asumía 4 OCPU/24 GB) desincronizado de la meta 2 OCPU/12 GB ARM64.
- H12. `README.md` raíz con codificación UTF-16 / BOM.

### P3 — Bajo
- H13. Módulo Residencial vacío (sin desarrollar, coherente con README).
- H14. Falta `test:integration` y CI de integración real.

---

## I. Risks

| Categoría | Riesgo | Evidencia |
|-----------|--------|-----------|
| Seguridad | Repo público con credenciales débiles del equipo del Owner expuestas | E2 |
| Seguridad | Sin branch protection: force-push / commit directo a `main` posible | E6 |
| Operación | Multiagente concurrente editando la misma rama sin CLAIMS | B.3 |
| Arquitectura | Triple ruta de arranque/persistencia/IA crea estados divergentes | H5-H8 |
| Calidad | CI/CD que referencia scripts inexistentes da falsa confianza de gates | F.2 |
| Producto | SolucionaTIA descrita como existente en docs pero nunca implementada | G |
| Continuidad | Historias reescritas/pérdidas por reinicios de host (patrón previo) | G.3 |

---

## J. Recommended Next Step

**¿Qué debemos hacer después de esta auditoría?**

En este orden estricto, y **antes de construir cualquier departamento multiagente**:

1. **Sanear PR #4** (P0): separar en dos PRs independientes.
   - PR A (gobernanza): los 8 archivos de gobernanza.
   - PR B (mover fuera): los 11 archivos Windows/RHEL → a `Windows-11-Professional` y `Red-Hat-Enterprise-Linux`, **eliminando** del repo público el `AUDIT` que expone credenciales del equipo personal.
2. **Reconciliar CI/CD** (Issue #3) con verificación real de `working-directory`, eliminando referencias a scripts inexistentes (`lint`, `test:integration`) o implementándolos.
3. **Proteger `main`** (ruleset o branch protection) + corregir `README.md` ("público") + normalizar codificación a UTF-8.
4. **Cerrar el veredicto SolucionaTIA** (P0 forense): actualizar `LANGGRAPH-RECOVERY-REPORT.md` a definitivo; decidir con el Owner si hay backup externo o se re-especifica desde cero.
5. **Solo después**: diseñar (no implementar) el departamento multiagente sobre una base saneada, con ADR de arquitectura de agentes (`.github/agents/`, LangGraph, orquestadores) **postergados** hasta que 1-4 estén verdes.

---

## K. Anexo — Evidencias de referencia

- Commit `main`: `68ee6ce` · Commit gobernanza: `3e68ae0` · Commits windows-opt: `0a05554`, `90c866f`
- PR #4: `https://github.com/DiegoAlejandroSaenzFalcon/Soluciona-Inteligencia-Artificial/pull/4`
- `git fsck --full --no-reflogs --unreachable` → sin output (vacío)
- Repos del owner (8): Soluciona-Inteligencia-Artificial, diegoalejandrosaenzfalcon.github.io, Trading-Ciencia, Windows-11-Professional, Tecnologias-de-la-Informacion, Red-Hat-Enterprise-Linux, Directivas-de-Seguridad-IA, Automatizacion-de-Datos

---

*Reporte generado en modo solo-lectura. Sin commit/push. Pendiente de revisión del CTO/Owner.*