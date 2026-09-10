# AGENTS.md — Soluciona Inteligencia Artificial

## Autoridad

- Product Owner / autoridad final: Diego Alejandro Saenz Falcon.
- IA planificadora: arquitectura, auditoría, investigación, diseño y revisión.
- IA programadora: implementación, pruebas, diagnóstico y evidencia.
- Ninguna IA tiene autoridad implícita para cambiar requisitos, arquitectura crítica, licencia, datos productivos o políticas de seguridad.

## Antes de actuar

1. Leer `README.md`, `SECURITY.md`, este archivo y `docs/governance/PLAN-DIRECTOR-SOLUCIONA-IA-v1.0.md`.
2. Revisar estado de Git, rama y cambios sin commit.
3. Buscar instrucciones más específicas en el subdirectorio objetivo.
4. Comprobar si otro agente reclama los archivos mediante `CLAIMS.md`.

## Evidencia obligatoria

Nunca convertir documentación, schema, dependencia o intención en afirmación de implementación.

Usar exclusivamente estas clasificaciones:

- `IMPLEMENTADO_Y_VERIFICADO`
- `PARCIALMENTE_IMPLEMENTADO`
- `PRESENTE_PERO_NO_PROBADO_E2E`
- `DOCUMENTADO_PERO_NO_VERIFICADO`
- `NO_ENCONTRADO_TRAS_INSPECCION`
- `DESCONOCIDO`

## Cambios

- No trabajar directamente en `main` para cambios funcionales.
- Crear una rama de scope limitado.
- Registrar ownership en `CLAIMS.md` cuando exista trabajo concurrente.
- Mantener cambios pequeños y reversibles.
- No mezclar refactor, migración de datos y funcionalidad nueva sin una razón documentada.
- No eliminar legacy hasta demostrar paridad, pruebas y rollback.

## Verificación

La definición de terminado es:

`IMPLEMENTAR → TEST → VERIFICAR → DOCUMENTAR → COMMIT → PR → REVIEW → MERGE`

Un cambio sin evidencia no está terminado.

## Seguridad

- CERO secretos.
- No copiar ni transmitir credenciales detectadas.
- No ejecutar acciones destructivas sin autorización explícita cuando afecten datos o infraestructura.
- No introducir dependencias no verificadas.
- No enviar código, datos o contexto a servicios externos no autorizados.

## Git

Usar Conventional Commits. Preferir:

`feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `security`, `infra`.

Cada commit debe explicar qué cambió y por qué. No usar `--force` sobre ramas compartidas salvo autorización explícita.

## IA y arquitectura

La IA no sustituye reglas deterministas del dominio. Inventario, permisos, transacciones, estados, idempotencia y cálculos deben permanecer deterministas.

Los agentes IA operan mediante contratos/capacidades autorizadas. No deben ejecutar SQL arbitrario ni modificar directamente el estado empresarial.

## Handoff

Cada tarea debe terminar con:

- objetivo;
- archivos modificados;
- decisiones tomadas;
- pruebas ejecutadas y resultado;
- riesgos conocidos;
- commit SHA;
- siguiente tarea recomendada.

## Documentos de gobernanza

Además de este archivo, todo agente debe leer según aplique:

- `docs/governance/PLAN-DIRECTOR-SOLUCIONA-IA-v1.0.md` — autoridad suprema y roadmap
- `docs/governance/CURRENT-STATE-v1.0.md` — estado verificado
- `docs/governance/DISASTER-RECOVERY.md` — continuidad y restauración
- `docs/governance/PROCESO-DESARROLLO-PRODUCCION.md` — proceso parametrizado dev/prod
- `docs/governance/LANGGRAPH-RECOVERY-REPORT.md` — forense de la capa agentic SolucionaTIA
- `PROMPT_MAESTRO_MULTIAGENTE_CONTEXTO_TOTAL.md` — contexto total para continuidad entre IAs

## Frontera SaaS ↔ SolucionaTIA

La capa agentic (SolucionaTIA/LangGraph) es una pieza separada del SaaS. No accede directamente a tablas internas, no ejecuta SQL arbitrario y no salta RBAC/tenant isolation. La primera integración es READ ONLY sobre un límite API/event versionado. Ver `PLAN-DIRECTOR-SOLUCIONA-IA-v1.0.md` §15.3.
