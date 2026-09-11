# P0 Remediation — Informe y Plan de Saneamiento
## 2026-09-10

> Documenta el saneamiento del PR #4 y del CI/CD, con la distinción estricta entre lo **autorizado (no destructivo)** y lo que **requiere aprobación del Owner (GATE)**.

---

## 1. PR #4 — Estado y plan de saneamiento

### 1.1 Estado
- PR #4 `docs(governance)`: OPEN, DRAFT, MERGEABLE. 19 archivos, +3,419 líneas.
- **8 archivos** de gobernanza (pertinentes). **11 archivos** Windows/RHEL fuera de alcance.

### 1.2 Qué se puede hacer SIN reescritura destructiva (autorizado)
Crear un **commit forward** que retire los 11 archivos Windows/RHEL de la rama `docs/director-plan-v1`. Al ser `git rm` (no force-push), los archivos **siguen en el historial** pero desaparecen del árbol del PR (el diff neto del PR ya no los mostraría).

### 1.3 Qué NO se puede hacer sin aprobación (GATE)
El contenido de `docs/optimization/windows-11-pro/AUDIT-2026-09-10.md` (datos del equipo: cuenta admin sin contraseña, hostname, IP LAN, BitLocker OFF) **ya está en el historial público** (commits `0a05554` y `90c866f` fueron pusheados). Para eliminarlo del historial público se requiere **reescritura de historial + force-push** → **GATE A + GATE B + GATE C**.

> **DETENIDO EN ESTE PUNTO.** La eliminación permanente de esa información del repo público requiere aprobación explícita del Owner. Evidencia: `git reflog --all` muestra `update by push` de `0a05554` y `90c866f`.

### 1.4 Recomendación
1. (autorizado, inmediato) Commit forward `git rm` de los 11 archivos → PR #4 queda solo con gobernanza.
2. (aprobación Owner) Evaluar si vale la pena el force-push con `filter-repo`/`git rm` + rewrite para purgar commits `0a05554`/`90c866f` del público. **Costo**: el repo es público desde hace ~horas y sin forks/estrellas conocidas (0 forks), así que el blast radius es bajo, pero sigue siendo una operación destructiva.

### 1.5 Evidencia de ejecución (2026-09-10) — saneamiento NO destructivo COMPLETADO

| Campo | Valor |
|-------|-------|
| Rama | `docs/director-plan-v1` |
| HEAD antes | `90c866f` |
| Commit creado | `b89f6bc` `docs: remove out-of-scope environment artifacts from governance PR` |
| HEAD después | `b89f6bc` |
| Archivos retirados | 11 (`git rm`): `docs/optimization/windows-11-pro/*` (4) + `scripts/windows/*` (7) |
| Líneas eliminadas | 1,346 |
| Push | `90c866f..b89f6bc` (push normal, **sin force-push**) |
| Verificación 8 docs gobernanza | intactos (tracked: `AGENTS.md`, `CONTRIBUTING.md`, `PROMPT_MAESTRO_MULTIAGENTE_CONTEXTO_TOTAL.md`, `PLAN-DIRECTOR`, `CURRENT-STATE`, `DISASTER-RECOVERY`, `LANGGRAPH-RECOVERY-REPORT`, `PROCESO-DESARROLLO-PRODUCCION`) |
| PR #4 resultante | 8 archivos, +1,871 additiones, 0 deletions, MERGEABLE, DRAFT |

- **NO** force-push. **NO** reescritura. **NO** filter-repo/BFG. **NO** borrados de commits históricos.
- El `AUDIT-2026-09-10.md` **sigue presente en el historial público** (commits `0a05554`/`90c866f`). Pendiente de decisión independiente del Owner (**GATE A/B/C**).

---

## 2. CI/CD — Diagnóstico completo (5 defectos)

| # | Defecto | Evidencia | Severidad |
|---|---------|-----------|-----------|
| 1 | `npm ci` corre en la raíz (sin `working-directory`) aunque `package.json` está en `soluciona-inteligencia-artificial-comercial/` | `ci-cd.yml` sin `defaults.run.working-directory` | P1 |
| 2 | `npm run lint` invocado pero **no existe** script `lint` | `package.json` scripts | P0 |
| 3 | `npm run test:integration` invocado pero **no existe** script ni `tests/integration/` | `package.json`, `tests/` | P0 |
| 4 | `npm run typecheck` falla con ~180 errores TS | `tsc --noEmit` (ejecutado) | P0 |
| 5 | `npm run test:unit` falla con parse error en 4 suites | `vitest run tests/unit` (ejecutado) | P0 |

**Conclusión**: el pipeline está roto por causas **estructurales** (bytes de TS) además de configuración. Reparar el workflow (job-config) es necesario pero **no suficiente**: hay que decidir el alcance de la consolidación TS (fuera del alcance de FASE 1, que prohíbe reescribir la arquitectura dual).

### 2.1 Reparación mínima autorizada (config, no código)
1. Añadir `defaults.run.working-directory: ./soluciona-inteligencia-artificial-comercial` y `defaults` correctos a cada job.
2. `setup-node` con `cache-dependency-path: soluciona-inteligencia-artificial-comercial/package-lock.json`.
3. Quitar/deshabilitar `npm run lint` y `npm run test:integration` hasta que existan (o crear los scripts reales).
4. `docker-build`: `context: ./soluciona-inteligencia-artificial-comercial`, `file: ./Dockerfile.prod`.
5. **No declarar verde** el pipeline hasta corregir typecheck/tests (decisiones de arquitectura en FASE posterior).

---

## 3. SolucionaTIA — no reconstruir (recordatorio)

Veredicto forense definitivo: `NO_ENCONTRADO_TRAS_INSPECCION`. No existe en el repo ni como objetos unreachable. Reconstrucción = misión futura. Ver `ENGINEERING-DISCOVERY-REPORT.md` §G y `LANGGRAPH-RECOVERY-REPORT.md`.

---

## 4. Operaciones que requieren aprobación (GATES)

| GATE | Operación | Estado |
|------|-----------|--------|
| A | Reescritura de historial Git | **PENDIENTE** (purgar AUDIT del público) |
| B | Force-push | **PENDIENTE** |
| C | Eliminación irreversible / purga | **PENDIENTE** |
| D | Rotación de credenciales reales | — |
| E | Migración destructiva de datos | — |
| F | Cambio crítico de seguridad | — |
| G | Producción real | — |
| H | Cambio arquitectónico mayor | — |

---

*Documento vivo. Actualizar conforme se autoriza y ejecuta el saneamiento.*