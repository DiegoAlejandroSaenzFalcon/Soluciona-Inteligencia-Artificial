# Contribuir a Soluciona Inteligencia Artificial

## Regla principal

El repositorio se administra como software empresarial. Todo aporte debe ser trazable, verificable y reversible.

## Flujo obligatorio

1. Crear Issue o tarea identificable.
2. Determinar dominio/scope.
3. Crear rama desde `main` actualizado.
4. Registrar ownership si existe concurrencia.
5. Implementar una unidad pequeña.
6. Ejecutar pruebas y controles aplicables.
7. Actualizar documentación y estado.
8. Crear commit convencional.
9. Abrir Pull Request.
10. Revisar contrato, seguridad, pruebas y alcance.
11. Merge únicamente después de superar los gates.

## Pull Request

Debe indicar:

- problema/responsabilidad;
- solución;
- archivos afectados;
- riesgos;
- migraciones;
- rollback;
- pruebas ejecutadas;
- evidencia;
- documentación actualizada;
- impacto sobre otras áreas/agentes.

## Migraciones

Una migración de datos o arquitectura no se considera completa si existe código nuevo sin ruta de transición, verificación de datos, prueba y rollback documentado.

## Trabajo con IA

Las IAs son colaboradores técnicos, no autoridades de producto. Deben respetar `AGENTS.md`, `SECURITY.md` y las instrucciones específicas del directorio.

Una IA que detecte contradicciones debe reportarlas antes de ocultarlas mediante cambios.

## Secretos

Nunca versionar secretos, tokens, contraseñas, claves privadas, sesiones, bases de datos reales ni configuraciones productivas.

## Definición de terminado

`implementado + probado + verificado + documentado + versionado + revisado`.

## Reporte de evidencia obligatorio

Como este proyecto se construye mayoritariamente con IA, **cada tarea se audita**. Al cerrar un ticket o PR, todo colaborador (humano o IA) adjunta un bloque de evidencia:

```text
EXECUTIVE_STATUS: <resumen ejecutivo>
TASK: <ID de issue/tarea>
OBJECTIVE: <objetivo concreto>
EVIDENCE_CLASSIFICATION: <IMPLEMENTADO_Y_VERIFICADO | PARCIALMENTE_IMPLEMENTADO | PRESENTE_PERO_NO_PROBADO_E2E | DOCUMENTADO_PERO_NO_VERIFICADO | NO_ENCONTRADO_TRAS_INSPECCION | DESCONOCIDO>
FINDINGS: <hallazgos técnicos>
FILES_CHANGED: <lista>
FILES_CREATED: <lista>
FILES_NOT_CHANGED: <revisados pero no tocados>
TESTS_RUN: <comandos ejecutados>
TEST_RESULTS: <pass/fail + cobertura>
SECURITY_IMPACT: <ninguno/bajo/medio/alto + detalle>
ARCHITECTURE_IMPACT: <ninguno/bajo/medio/alto + detalle>
PERFORMANCE_IMPACT: <ninguno/bajo/medio/alto + detalle>
ROLLBACK: <cómo revertir si falla>
COMMIT_SHA: <sha>
BRANCH: <rama>
PR: <url>
BLOCKERS: <bloqueos pendientes>
NEXT_TASK: <siguiente paso>
```

Lo no demostrable se marca `DESCONOCIDO`. No se infla el estado de evidencia.

## Documentos de gobernanza (referencia)

- `docs/governance/PLAN-DIRECTOR-SOLUCIONA-IA-v1.0.md` — plan rector y roadmap (Fase 0-9 + parámetros operativos)
- `docs/governance/CURRENT-STATE-v1.0.md` — estado verificado por auditoría
- `docs/governance/DISASTER-RECOVERY.md` — plan de continuidad y restauración
- `docs/governance/PROCESO-DESARROLLO-PRODUCCION.md` — proceso parametrizado dev/prod
- `docs/governance/LANGGRAPH-RECOVERY-REPORT.md` — forense de la capa agentic
- `PROMPT_MAESTRO_MULTIAGENTE_CONTEXTO_TOTAL.md` — contexto total para IA entrante
