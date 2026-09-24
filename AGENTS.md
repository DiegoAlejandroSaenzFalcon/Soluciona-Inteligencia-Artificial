# AGENTS.md — Soluciona Inteligencia Artificial

Reglas obligatorias que todo agente (opencode / DeepSeek / Kimi / Codex / Claude…) debe seguir al operar en este repositorio.

---

## 0. Autoridad

- Product Owner / autoridad final: Diego Alejandro Saenz Falcon.
- IA planificadora: arquitectura, auditoría, investigación, diseño y revisión.
- IA programadora: implementación, pruebas, diagnóstico y evidencia.
- Ninguna IA tiene autoridad implícita para cambiar requisitos, arquitectura crítica, licencia, datos productivos o políticas de seguridad.

---

## 1. Contexto del Proyecto

- **Producto**: Soluciona Inteligencia Artificial — Plataforma de automatización empresarial
- **Variantes**: Comercial (SaaS), Empresarial (Soporte TI), Residencial (Futuro)
- **Arquitectura**: Clean Architecture + DDD + Event-Driven + Multi-tenant RLS
- **Stack**: Node.js 22 + TypeScript + Fastify + Drizzle + PostgreSQL/SQLite
- **Dueño**: Diego Alejandro Saenz Falcon (Girardot, Cundinamarca, Colombia)
- **Idioma**: Español (todas las respuestas, docs, commits)

---

## 2. Antes de actuar (checklist obligatorio)

1. Leer `README.md`, `SECURITY.md`, este archivo y `docs/CONTINUIDAD.md`.
2. Revisar estado de Git, rama actual y cambios sin commit.
3. Buscar instrucciones más específicas en el subdirectorio objetivo.
4. Comprobar si otro agente reclama los archivos mediante `CLAIMS.md`.
5. Consultar `docs/PLAN-DE-TERMINACION-SOFTWARE.md` si la tarea toca el producto comercial.

---

## 3. Evidencia obligatoria (clasificación oficial)

Nunca convertir documentación, schema, dependencia o intención en afirmación de implementación.

Estados permitidos (usar EXACTAMENTE estos):

- `IMPLEMENTADO_Y_VERIFICADO`
- `PARCIALMENTE_IMPLEMENTADO`
- `PRESENTE_PERO_NO_PROBADO_E2E`
- `DOCUMENTADO_PERO_NO_VERIFICADO`
- `NO_ENCONTRADO_TRAS_INSPECCION`
- `DESCONOCIDO`

**Definición de terminado:**
`IMPLEMENTAR → TEST → VERIFICAR → DOCUMENTAR → COMMIT → PR → REVIEW → MERGE`

Un cambio sin evidencia no está terminado. Nada existe si no está commiteado y pusheado.

---

## 4. Reglas de Seguridad (NO NEGOCIABLES)

1. **NUNCA** ejecutar cambios destructivos, instalar software o modificar sistemas de clientes sin aprobación registrada en ticket/PR.
2. **NUNCA** escribir credenciales, tokens, contraseñas o secretos en ningún archivo (usar variables de entorno o secret manager).
3. **NUNCA** hacer commit directo a `main` o `develop` — solo PRs con CI verde.
4. **NUNCA** acceder a datos reales de clientes en desarrollo.
5. **AISLAR cada cliente**: rutas de archivos por tenant. No mezclar datos.
6. **Principio append-only**: tickets, bitácoras, logs, specs — solo se agregan entradas.
7. **Cero secretos en Git**: Gitleaks en pre-commit + CI (check requerido).
8. No copiar ni transmitir credenciales detectadas.
9. No introducir dependencias no verificadas.
10. No enviar código, datos o contexto a servicios externos no autorizados.

---

## 5. Flujo Obligatorio SDD (Spec Driven Development)

```
REQUERIMIENTO → SPEC (Given/When/Then) → TESTS (RED) → IMPLEMENT (GREEN) → REFACTOR → DOCS
```

**ANTES de escribir código:**
1. Verificar que existe SPEC aprobada (link en PR).
2. Si no existe → crearla con el agente `spec-analyst`.
3. La spec debe ser aprobada por el PO antes de implementar.
4. Tests escritos FIRST a partir de los AC de la spec.
5. La implementación hace pasar los tests.
6. Refactor manteniendo tests en verde.
7. Docs actualizadas (JSDoc, README, CHANGELOG, ADR si aplica).

---

## 6. Estándares de Código

### 6.1 TypeScript Strict (obligatorio en la migración; el código JS heredado se migra gradualmente)
`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`.

### 6.2 Convenciones de naming
| Elemento | Convención | Ejemplo |
|---|---|---|
| Archivos | kebab-case | `product.repository.ts` |
| Clases/Interfaces | PascalCase | `ProductRepository` |
| Funciones/Variables | camelCase | `getProductById` |
| Constantes | UPPER_SNAKE | `MAX_RETRY_ATTEMPTS` |
| Types/Enums | PascalCase | `OrderStatus` |
| Tests | `*.test.ts` / `*.test.js` | `product.test.ts` |
| Specs | `SPEC-<ID>.md` | `SPEC-042-lot-tracking.md` |
| ADRs | `<num>-<topic>.md` | `001-use-drizzle-orm.md` |

### 6.3 Arquitectura por capas

```
domain/          entities, events, repositories (ports), services (puro)
application/     use-cases, dto, ports
infrastructure/  database, repositories (impl), external, messaging
interfaces/      http, websocket, cli
shared/          kernel, config, utils, observability
```

Regla de dependencias: `domain` ← `application` ← `infrastructure`/`interfaces` → `shared`.

---

## 7. Git Workflow

```
main (protected) ← PR + CI verde + PO sign-off
  ↑
feature/SPEC-<id> | fix/ISSUE-<id> | docs/<tema>   ← scope limitado, 1 tema = 1 rama = 1 PR
```

- Commits convencionales: `feat|fix|docs|style|refactor|perf|test|chore|revert|security|infra` (+ scope).
- No `--force` en ramas compartidas.
- Pre-commit: lint-staged + gitleaks + commitlint.
- Cambios pequeños y reversibles. No mezclar refactor + migración + feature en un mismo PR sin justificación.

---

## 8. Testing

- Unit: cobertura >80% en lógica de dominio.
- Integration: caminos críticos (BD, APIs externas).
- E2E: flujos de login, pedido, pago.
- Cada requisito importante queda probado.
- Runner actual: en reparación — ver `docs/PLAN-DE-TERMINACION-SOFTWARE.md` §T1.2 (Vitest roto en esta máquina → se adopta `node:test` para lógica pura).

---

## 9. Observabilidad

- Logs: Pino estructurado + Correlation ID en todo request.
- Métricas: RED (Rate, Errors, Duration) + Prometheus.
- Traces: OpenTelemetry + OTLP.
- Health: `/health/live`, `/health/ready`, `/health` (deep).

---

## 10. Uso de Modelos de IA

```yaml
model: "opencode/deepseek-v4-flash-free"   # Default (gratis)
paid_models: DENY                           # Requiere autorización PO
free_endpoints: ALLOW
local_models: ALLOW
thinking_mode: "on_demand"                  # Solo diagnósticos complejos
```

La IA no sustituye reglas deterministas del dominio. Inventario, permisos, transacciones, estados, idempotencia y cálculos son deterministas. Los agentes IA operan mediante contratos/capacidades autorizadas; no ejecutan SQL arbitrario ni mutan directamente estado empresarial.

---

## 11. Comunicación y Entregables

- Respuestas técnicas, directas, en español, sin inventar datos.
- Si no sabes: "No sé / Necesito X" — nunca adivinar.
- Todo documento externo: revisado por PO antes de enviarse al cliente.
- Cierra siempre con: estado actual + siguiente paso concreto.

---

## 12. Agentes especializados disponibles

| Agente | Uso | Permisos |
|---|---|---|
| `sdd-engineer` | Implementar specs aprobadas | edit, bash, task |
| `spec-analyst` | Escribir specs Given/When/Then | edit, webfetch |
| `test-engineer` | TDD, coverage, datos de prueba | edit, bash, task |
| `security-auditor` | Threat modeling, OWASP, secrets | webfetch, websearch (read-only) |
| `architect` | ADRs, arquitectura, code review | webfetch (read-only) |
| `devops-engineer` | CI/CD, Docker, K8s, monitoring | edit, bash, task |
| `client-onboarding` | Discovery, config, migración, training | edit, bash, webfetch |
| `docs-engineer` | JSDoc, README, ADRs, runbooks | edit, webfetch |

---

## 13. Escalación

- **Bloqueador técnico**: preguntar al Tech Lead / PO vía GitHub Issue.
- **Decisión de arquitectura**: crear ADR → revisión Architect + PO.
- **Seguridad**: `security-auditor` + PO inmediato.
- **Cliente**: `client-onboarding` + PO aprobación.

---

## 14. Continuidad multi-IA y preservación (añadido 2026-09-21)

Origen: la máquina del PO se formateó ese día; quedó demostrado que el disco no es confiable.

- **Regla-CERO:** "La máquina local es caché; GitHub es la verdad." Nada existe si no está commiteado y pusheado.
- Toda IA que entre (Codex, DeepSeek, Kimi — esta u otra sesión) lee primero `docs/CONTINUIDAD.md`, luego este AGENTS.md, luego `docs/PLAN-DE-TERMINACION-SOFTWARE.md`.
- Si una IA encuentra trabajo local sin commitear: lo preserva (commit + push) y lo registra en `docs/CONTINUIDAD.md` antes de seguir con su tarea.
- Clientes: datos de clientes NUNCA en este repo público. Cada cliente vive en su propio repo privado (ej.: `San-Angel`). El core se mantiene limpio y genérico.

---

## 15. Documentos de gobernanza (referencias canónicas)

- `docs/governance/PLAN-DIRECTOR-SOLUCIONA-IA-v1.0.md` — autoridad suprema y roadmap.
- `docs/governance/CURRENT-STATE-v1.0.md` — estado verificado.
- `docs/governance/DISASTER-RECOVERY.md` — continuidad y restauración.
- `docs/governance/PROCESO-DESARROLLO-PRODUCCION.md` — proceso parametrizado dev/prod.
- `docs/governance/LANGGRAPH-RECOVERY-REPORT.md` — forense de la capa agentic.
- `PROMPT_MAESTRO_MULTIAGENTE_CONTEXTO_TOTAL.md` — contexto total entre IAs.
- `docs/CONTINUIDAD.md` — preservación y continuidad (añadido 2026-09-21).

## 16. Frontera SaaS ↔ SolucionaTIA

La capa agentic (SolucionaTIA/LangGraph) es pieza separada del SaaS. No accede directamente a tablas internas, no ejecuta SQL arbitrario, no salta RBAC ni tenant isolation. La primera integración es READ ONLY sobre un límite API/event versionado. Ver `PLAN-DIRECTOR-SOLUCIONA-IA-v1.0.md` §15.3.

---

*Última actualización: 2026-09-22 | Versión 1.2.0 (merge gobernanza + reglas) | Aprobado por: PO (Diego Alejandro Saenz Falcon)*


## 17. SDD/SSD y continuidad operacional (añadido 2026-09-23)

- Método rector: `docs/governance/SDD-SSD-MASTER-PLAN-v1.0.md`.
- Protocolo de continuidad: `docs/governance/CONTINUITY-PROTOCOL-v1.0.md`.
- Plantilla de handoff: `docs/templates/SESSION-HANDOFF.md`.
- Antes de implementar una tarea nueva, comprobar el Gate SDD correspondiente.
- Antes de cerrar una sesión, persistir WHAT/WHY/WHERE/PROOF/NEXT y verificar commit + push.
- Una conversación no puede ser la única fuente de contexto para continuar.
