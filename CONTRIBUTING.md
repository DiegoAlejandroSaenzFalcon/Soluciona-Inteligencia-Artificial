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
