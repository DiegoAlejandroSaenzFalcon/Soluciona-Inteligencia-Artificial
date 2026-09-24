# Plan Maestro SDD/SSD — Soluciona Inteligencia Artificial v1.0

Fecha: 2026-09-23
Estado: PROPUESTO PARA EJECUCIÓN
PO: Diego Alejandro Saenz Falcon
Fuente de verdad: GitHub

## Propósito
Integra el Plan Director existente con Spec-Driven Development (SDD) y System/Software Development (SSD) para que el proyecto pueda continuar entre sesiones, agentes y días sin depender de memoria humana, memoria de modelo o estado local.

> No desarrollamos código para recuperar contexto; desarrollamos evidencia para recuperar contexto.

Complementa y no sustituye AGENTS.md, docs/CONTINUIDAD.md, PLAN-DIRECTOR-SOLUCIONA-IA-v1.0.md ni CURRENT-STATE-v1.0.md.

## Jerarquía de verdad
1. Decisión del PO registrada en GitHub.
2. ADR aprobado.
3. Plan Director.
4. Estado verificado.
5. SPEC aprobada.
6. Arquitectura/SSD.
7. Issue/PR/handoff.
8. Código.
9. Memoria de una IA o conversación.

Si una afirmación no tiene evidencia persistida: DESCONOCIDO.

## SDD
Need → Requirement → SPEC → Acceptance Criteria → Test Design → Implementation → Verification

Toda SPEC define problema, actores, alcance, fuera de alcance, precondiciones, invariantes, errores, seguridad, observabilidad, compatibilidad, criterios de aceptación, pruebas y rollback.

## SSD
Los cambios que afecten límites, datos, runtime, infraestructura, agentes o contratos siguen:
Context → Constraints → Architecture → Interfaces → Data → Threat Model → Deployment → Operations → Verification

Los cambios de frontera arquitectónica requieren ADR.

## Ciclo oficial
DISCOVER → BASELINE → REQUIREMENTS → SPEC → ARCHITECTURE/ADR → TEST DESIGN → TASKS → IMPLEMENT → TEST → VERIFY → DOCUMENT → COMMIT → PR → REVIEW → MERGE → RELEASE/DEPLOY → POST-VERIFICATION → HANDOFF

No se saltan etapas sin registrar la excepción.

## Gates
G0 Contexto: snapshot actualizado, rama y estado conocidos.
G1 Requisito: objetivo, alcance y dependencia definidos.
G2 SPEC: criterios verificables.
G3 Arquitectura: límites y decisiones documentados.
G4 Test: pruebas derivadas de aceptación.
G5 Implementación: cambio limitado al scope.
G6 Verificación: evidencia reproducible.
G7 Integración: PR, CI y revisión.
G8 Continuidad: siguiente sesión puede continuar sin conversación previa.

## Definition of Ready
No entra a implementación sin Issue, objetivo, alcance, dependencia, SPEC cuando corresponda, criterios de aceptación, estrategia de pruebas, riesgos y rollback.

## Definition of Done
DONE exige implementación + tests + verificación + seguridad + documentación + evidencia + commit + PR + revisión/merge según gate + actualización de continuidad.

Estados oficiales:
- IMPLEMENTADO_Y_VERIFICADO
- PARCIALMENTE_IMPLEMENTADO
- PRESENTE_PERO_NO_PROBADO_E2E
- DOCUMENTADO_PERO_NO_VERIFICADO
- NO_ENCONTRADO_TRAS_INSPECCION
- DESCONOCIDO

## Prioridades integradas
### P0 — realidad técnica y continuidad
1. GitHub como fuente de verdad.
2. Recovery forense de SolucionaTIA/LangGraph antes de reconstruir.
3. Baseline reproducible.
4. SDD/SSD y continuidad formalizados.

### P1 — reconciliación arquitectónica
1. Dual runtime.
2. Doble PostgreSQL.
3. Legacy AI vs Model Gateway/Router.
4. Baileys → WhatsApp Cloud API.
5. CI/CD y working-directory del monorepo.

### P2 — infraestructura reproducible
Staging, PostgreSQL, Redis/colas, observabilidad y backups/restore.

### P3 — frontera SaaS ↔ Agentic
Primera integración estrictamente READ ONLY, versionada y auditable.

### P4 — dominio comercial
Inventario → compras → recetas/producción → ventas → facturación.

### P5 — IA operacional
Model Gateway/Router → agentes → evaluación → persistencia → HITL → optimización.

## Roadmap de entregables
| ID | Entregable | Gate |
|---|---|---|
| SDD-00 | Baseline reproducible | snapshot + evidencia |
| SDD-01 | Recovery LangGraph | búsqueda forense cerrada |
| SDD-02 | Architecture Reconciliation | ADRs + mapa runtime |
| SDD-03 | CI/CD Reconciliation | pipeline reproducible |
| SDD-04 | Staging Foundation | despliegue desde commit limpio |
| SDD-05 | Data/DB Consolidation | una ruta oficial por capacidad |
| SDD-06 | WhatsApp Cloud | envío/recepción/idempotencia E2E |
| SDD-07 | Agentic Boundary | contrato READ ONLY verificado |
| SDD-08 | Commercial MVP | flujo empresarial completo |
| SDD-09 | Production Hardening | backup/restore/security/observability |
| SDD-10 | Operational AI | evaluación + control + evidencia |

## Estructura documental objetivo
docs/governance/ — gobierno y estado
docs/specs/ — especificaciones
docs/architecture/ — diseño del sistema
docs/decisions/ — ADR
docs/handoffs/ — continuidad por tarea/sesión
docs/evidence/ — evidencia persistida

La estructura se adopta gradualmente; no se hará una migración masiva solo por estética.

## Frontera SaaS ↔ Agentic
LangGraph/SolucionaTIA no accede directamente a tablas internas del SaaS, no ejecuta SQL arbitrario y no salta RBAC/tenant isolation/auditoría.

Primera frontera:
SaaS API/Event Boundary → Agentic READ ONLY

IDs obligatorios: tenant_id, run_id, trace_id, task_id, correlation_id.

## Modelo de tareas
Una SPEC se divide en unidades pequeñas:
SPEC → contrato → tests → implementación → integración → evidencia

Una tarea debe tener un resultado observable único.

## Cambios quirúrgicos
No reescribir código funcional por comodidad. No mezclar refactor masivo con feature. No cambiar una frontera arquitectónica durante una implementación sin ADR. Mantener compatibilidad durante migraciones y eliminar legacy solo después de paridad demostrada y rollback.

## Continuidad humana
La interrupción por sueño, familia, trabajo u otras responsabilidades es un requisito normal del sistema.

La unidad de continuidad es:
PROJECT STATE + TASK STATE + EVIDENCE + NEXT ACTION + BLOCKERS

El protocolo operativo está en docs/governance/CONTINUITY-PROTOCOL-v1.0.md.

## Orden de lectura al retomar
1. docs/governance/CONTINUITY-PROTOCOL-v1.0.md
2. docs/CONTINUIDAD.md
3. AGENTS.md
4. CURRENT-STATE-v1.0.md
5. SPEC activa
6. ADR relacionado
7. Issue/PR
8. código afectado

## Próximo ciclo
SDD-00 → SDD-01 Recovery → SDD-02 Architecture Reconciliation → SDD-03 CI/CD

No se inicia una nueva reconstrucción de Agentic ni una gran migración funcional antes de cerrar los gates P0 correspondientes.

Cualquier cambio del orden P0/P1 requiere Issue/ADR y aceptación del PO.
