# Protocolo de Continuidad de Desarrollo v1.0

Fecha: 2026-09-23
Propósito: detener y retomar el desarrollo sin pérdida de contexto, aunque cambie la sesión, la IA, el equipo o transcurran días.

## 1. Principio
CONVERSACIÓN = INTERFAZ TEMPORAL
GITHUB = MEMORIA PERSISTENTE DEL PROYECTO

Una sesión puede terminar en cualquier momento. El proyecto debe quedar reanudable.

## 2. START CHECKPOINT
Antes de programar:
1. Leer continuidad.
2. Verificar branch y SHA.
3. Revisar Issue/PR.
4. Detectar cambios locales.
5. Confirmar SPEC y ADR.
6. Confirmar bloqueadores.
7. Ejecutar baseline mínimo.
8. Solo entonces modificar código.

## 3. END CHECKPOINT
Antes de abandonar:
1. Detener cambios.
2. Ejecutar pruebas relevantes.
3. Registrar evidencia.
4. Documentar estado.
5. Registrar siguiente acción exacta.
6. Commit.
7. Push.
8. Confirmar el estado remoto.
9. Registrar handoff.

Si algo está incompleto, se preserva como WIP en una rama y se documenta. Nunca depende únicamente del disco local.

## 4. Interrupción inesperada
La siguiente IA debe inspeccionar Git, identificar branch/SHA, detectar cambios sin commit, preservarlos primero y solo después continuar. No debe asumir que el trabajo local desconocido está terminado.

## 5. Handoff canónico
# HANDOFF — PROYECTO
Fecha/hora:
Agente:
PO:

Objetivo:
Tarea activa:
SPEC:
Estado:
Branch / SHA:
Trabajo realizado:
Evidencia:
Archivos modificados:
Archivos revisados y deliberadamente no modificados:
Decisiones:
Bloqueadores:
Riesgos:
Siguiente acción exacta:
No hacer todavía:
Comandos de reanudación:
Próximo gate:

## 6. Regla de reanudación
Otra IA debe poder ejecutar la siguiente acción sin preguntar “¿qué hago ahora?”. Si necesita recuperar la respuesta desde la conversación, el handoff está incompleto.

## 7. Registro append-only
| Fecha | Agente | Inicio | Fin | Tarea | Estado | Commit | Próximo paso |
|---|---|---|---|---|---|---|---|

No se sobrescriben registros históricos.

## 8. CLAIMS
Antes de editar:
- comprobar CLAIMS.md;
- identificar zona;
- evitar archivos reclamados;
- coordinar conflictos antes de modificar.

Continuidad responde “qué ocurrió”; claims responde “quién puede tocarlo”.

## 9. Contexto humano
Las pausas normales del PO no son fallos del proceso. El sistema se mide por unidades verificables preservadas, no por horas continuas de sesión.

## 10. Preservación
LOCAL UNCOMMITTED → PRESERVE → COMMIT → PUSH → DOCUMENT → CONTINUE

No borrar trabajo desconocido para “limpiar” el proyecto.

## 11. Auditoría al retomar
Comparar handoff contra Issue/PR, SHA, branch, cambios, CI y documentación. Si hay discrepancia, corregir primero el estado documental.

## 12. Relación SDD/SSD
SPEC = qué debe hacer
ADR = por qué
TASK = qué unidad se ejecuta
EVIDENCE = qué ocurrió realmente
HANDOFF = dónde continuar

Un handoff no sustituye una SPEC.

## 13. Estados de sesión
- READY_FOR_NEXT_STEP
- BLOCKED
- WAITING_PO
- WAITING_EXTERNAL
- PARTIAL
- VERIFIED

Son estados operativos y no sustituyen la clasificación oficial de evidencia.

## 14. Pregunta de continuidad
Toda sesión debe poder responder desde GitHub:
WHAT → WHY → WHERE → PROOF → NEXT

## 15. Objetivo
Reducir a minutos el costo de recuperación de contexto y eliminar la dependencia de memoria humana, memoria de modelo o estado de una laptop.

Complementa AGENTS.md y docs/CONTINUIDAD.md.
