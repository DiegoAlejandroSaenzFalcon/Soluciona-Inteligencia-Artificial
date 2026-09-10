# Estado actual verificable — Soluciona Inteligencia Artificial v1.0

**Fecha de corte:** 2026-09-10
**Rama auditada:** `main`
**Commit de referencia:** `68ee6cefb524f688e20bfd93301bd11cba0a1b8e`
**Estado de este documento:** baseline de auditoría; no sustituye pruebas técnicas.

## 1. Estado de gobierno

| Área | Estado | Evidencia / observación |
|---|---|---|
| `AGENTS.md` raíz | `NO_ENCONTRADO_TRAS_INSPECCION` en `main` | Existe en `docs/director-plan-v1`; pendiente de merge mediante PR #4. |
| `CONTRIBUTING.md` raíz | `NO_ENCONTRADO_TRAS_INSPECCION` en `main` | Existe en `docs/director-plan-v1`; pendiente de merge mediante PR #4. |
| Reglas específicas del módulo comercial | `IMPLEMENTADO_Y_VERIFICADO` como documentación | `soluciona-inteligencia-artificial-comercial/AGENTS.md` define zonas, `CLAIMS.md`, ramas y PRs. |
| Política de secretos | `IMPLEMENTADO_Y_VERIFICADO` como política | `SECURITY.md` establece CERO SECRETOS. |
| GitHub Rulesets | `NO_ENCONTRADO_TRAS_INSPECCION` | La API del repositorio devuelve una colección vacía de rulesets. |
| Protección clásica de `main` | `DESCONOCIDO` | El endpoint de protección de ramas no es accesible con la integración actual; no se presume configurado. |
| CODEOWNERS raíz | `DESCONOCIDO` | No se ha usado su existencia como supuesto de gobierno. |

## 2. Estado de CI/CD

El repositorio contiene workflows raíz de documentación/seguridad y un workflow específico dentro del módulo comercial.

### Hallazgo crítico
`soluciona-inteligencia-artificial-comercial/.github/workflows/ci-cd.yml` ejecuta `npm ci`, lint, typecheck, tests y otros comandos sin declarar `working-directory`. GitHub Actions parte por defecto de la raíz del repositorio para los `run`.

La raíz no contiene `package.json`; el package del módulo comercial está en `soluciona-inteligencia-artificial-comercial/package.json`.

Además, el job Docker define `context: .` y `file: ./Dockerfile.prod`, mientras el Dockerfile de producción auditado se encuentra en `soluciona-inteligencia-artificial-comercial/Dockerfile.prod`.

**Clasificación:** `PRESENTE_PERO_NO_PROBADO_E2E` para la intención de CI/CD; `PARCIALMENTE_IMPLEMENTADO` como pipeline ejecutable del monorepo.

**Regla:** no corregir estas rutas de forma aislada antes de decidir la estrategia de CI para el repositorio multi-módulo.

Tracking: Issue #3.

## 3. Estado de seguridad

`SECURITY.md` prohíbe versionar claves, contraseñas, tokens, certificados y credenciales, y establece que una IA que detecte un secreto debe señalarlo sin copiarlo ni transmitirlo.

El repositorio también dispone de un workflow raíz `gitleaks.yml`.

**No se interpreta la existencia del workflow como prueba de que todos los históricos están limpios.** La verificación de secretos debe seguir siendo un gate automatizado y verificable.

## 4. Estado técnico del módulo comercial

El módulo dispone actualmente de:

- `package.json` con Node >=22;
- runtime de arranque por defecto `node index.js`;
- build TypeScript mediante `tsc`;
- pruebas con Vitest;
- Drizzle/PostgreSQL y SQLite durante la transición;
- Dockerfile de producción y desarrollo;
- workflow CI/CD específico;
- `AGENTS.md` y `CLAIMS.md` de coordinación de agentes.

**Advertencia arquitectónica:** la existencia simultánea de runtime legacy y estructura TypeScript nueva debe considerarse una transición pendiente de reconciliación; no se asumirá que el runtime nuevo sea el runtime efectivo hasta verificar build y arranque end-to-end.

## 5. Reglas de evidencia

La evidencia documental no equivale a implementación. Las afirmaciones de proyecto deben usar una de estas clasificaciones:

- `IMPLEMENTADO_Y_VERIFICADO`
- `PARCIALMENTE_IMPLEMENTADO`
- `PRESENTE_PERO_NO_PROBADO_E2E`
- `DOCUMENTADO_PERO_NO_VERIFICADO`
- `NO_ENCONTRADO_TRAS_INSPECCION`
- `DESCONOCIDO`

## 6. Bloqueadores G0

No se considera cerrada la línea base mientras no estén resueltos o explícitamente aceptados:

1. estrategia y rutas del CI/CD del monorepo;
2. mecanismo real de protección de `main`;
3. política de CODEOWNERS/revisión para rutas críticas;
4. baseline verificable de build/test del módulo comercial;
5. inventario de migraciones legacy → nueva arquitectura;
6. definición de entorno Oracle como staging/integración, no producción implícita.

## 7. Siguiente puerta

**G1 — Gobernanza técnica y CI confiable.**

Solo después de G1 se deben iniciar migraciones funcionales de inventario, SaaS multi-tenant, WhatsApp oficial o SolucionaTIA.
