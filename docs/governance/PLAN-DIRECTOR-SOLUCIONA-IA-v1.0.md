# Plan Director — Soluciona Inteligencia Artificial v1.0

**Estado:** DRAFT — revisión humana requerida  
**Rama:** `docs/director-plan-v1`  
**Propietario del producto:** Diego Alejandro Saenz Falcon  
**Arquitectura:** SaaS modular + Agentic separado por contrato  
**Objetivo inmediato:** convertir la base existente en una plataforma empresarial desplegable y demostrable mediante un piloto real.

## 1. Propósito

Este documento es el plan rector de ingeniería. Ninguna IA ni colaborador debe interpretar documentación aspiracional como implementación existente.

Cada hallazgo debe clasificarse como:

- `IMPLEMENTADO_Y_VERIFICADO`
- `PARCIALMENTE_IMPLEMENTADO`
- `PRESENTE_PERO_NO_PROBADO_E2E`
- `DOCUMENTADO_PERO_NO_VERIFICADO`
- `NO_ENCONTRADO_TRAS_INSPECCION`
- `DESCONOCIDO`

La prioridad es **entregabilidad verificable**, no cantidad de funcionalidades.

## 2. Gobernanza

### Autoridad

1. **Humano / Product Owner:** Diego — autoridad final sobre producto, prioridades, releases y decisiones irreversibles.
2. **IA Planificadora / Arquitecto:** diseña, audita, revisa y documenta; no debe inventar estado ni declarar una tarea completada sin evidencia.
3. **IA Programadora / OpenCode:** inspecciona filesystem, implementa tareas aprobadas, ejecuta pruebas y genera evidencia técnica.
4. **Otras IAs:** deben trabajar bajo las mismas reglas y no asumir autoridad sobre `main`.

### Regla de oro

> No existe "terminado" sin implementación + prueba + evidencia + documentación + commit.

## 3. Política de cambios

Todo trabajo funcional debe seguir:

```text
Issue / requisito
→ diseño o ADR si aplica
→ tarea atómica
→ rama propia
→ implementación
→ tests
→ verificación
→ actualización de documentación/estado
→ commit convencional
→ PR
→ revisión
→ merge
→ staging
→ validación E2E
→ release
```

No se permite:

- trabajar directamente sobre `main` para cambios funcionales;
- mezclar migraciones no relacionadas en un mismo PR;
- dejar migraciones incompletas;
- sustituir una prueba por una afirmación;
- borrar código legacy sin demostrar paridad o plan de rollback;
- introducir secretos;
- hacer force-push destructivo sin aprobación explícita;
- declarar producción a partir de una prueba local solamente.

## 4. Estado técnico de referencia

La base comercial actualmente contiene un runtime legacy y una arquitectura TypeScript en transición. El runtime de `package.json` continúa arrancando `index.js`. Existe un servidor Fastify/TypeScript paralelo. Esta coexistencia debe tratarse como deuda arquitectónica controlada, no como motivo para un rewrite.

WhatsApp tiene código de Meta Cloud API, pero Baileys continúa presente como ruta legacy. PostgreSQL/Drizzle existe como dirección arquitectónica, mientras SQLite continúa siendo parte del runtime. Inventario, compras, RBAC, autenticación y otras capacidades ya tienen implementación parcial.

Los artefactos locales de SolucionaTIA/E0/A2A no deben considerarse recuperados hasta comprobarlos en el entorno local o reconstruirlos con evidencia.

## 5. Arquitectura objetivo

```text
                    SOLUCIONA IA
                         │
       ┌─────────────────┴─────────────────┐
       │                                   │
   PLATFORM CORE                       VERTICALS
       │                                   │
 Auth / Tenant / RBAC                 Gastronomía
 Audit / Events                       Retail
 Config / Notifications               Servicios
       │                                   │
       └──────────── SaaS API ─────────────┘
                         │
                   PostgreSQL
                         │
                Events / Jobs / Cache
                         │
                Agentic Boundary API
                         │
                    SolucionaTIA
                  LangGraph + Router
                         │
                Model Gateway/Router
```

No se adoptan microservicios como requisito inicial. El punto de partida es un **monolito modular con límites explícitos**, desplegable en Oracle Free Tier, con extracción futura de servicios cuando exista una razón medible.

## 6. Principios de dominio

### Determinista

Base de datos, inventario, cálculos, permisos, estados, transacciones, FEFO, idempotencia y facturación pertenecen al software convencional.

### Probabilístico

Investigación, clasificación, detección de anomalías, explicación, recomendación y lenguaje natural pertenecen a la capa IA.

La IA no debe ejecutar SQL arbitrario ni modificar directamente el estado empresarial.

## 7. Fases

### Fase 0 — Baseline y recuperación

**Objetivo:** obtener una fotografía reproducible del estado real.

- inventario de ramas, commits, worktrees y artefactos locales;
- recuperación/verificación de E0/A2A/E1 si existen;
- matriz de evidencia;
- baseline de tests/build;
- snapshot funcional del runtime actual;
- ADR inicial de arquitectura.

**Gate:** estado reproducible y working tree controlado.

### Fase 1 — Gobernanza de ingeniería

- `CONTRIBUTING.md` específico del proyecto;
- `AGENTS.md` actualizado para colaboración multi-IA;
- `CLAIMS.md` con ownership por dominio;
- plantillas de Issue/PR;
- ADR index;
- CHANGELOG/release policy;
- CI mínimo obligatorio;
- secret scanning;
- política de migraciones y rollback.

**Gate:** ningún agente puede cambiar arquitectura crítica sin proceso documentado.

### Fase 2 — Staging Oracle

- provisionamiento documentado;
- hardening del servidor;
- Docker/Compose reproducible;
- PostgreSQL;
- reverse proxy HTTPS;
- backups;
- health checks;
- logs y métricas básicas;
- despliegue de baseline sin alterar funcionalidad.

**Gate:** mismo artefacto desplegable desde Git limpio.

### Fase 3 — Consolidación SaaS

- unificar entrypoint progresivamente;
- unificar acceso PostgreSQL;
- definir application/domain/infrastructure/interfaces;
- preservar adapters legacy durante transición;
- contratos API versionados;
- tenant context uniforme;
- auditoría transaccional.

**Gate:** una sola ruta oficial para cada capacidad migrada.

### Fase 4 — WhatsApp oficial

- `WhatsAppProvider` como contrato;
- Meta Cloud API como provider principal;
- webhook seguro;
- verificación de firma;
- normalización de eventos;
- idempotencia persistente;
- observabilidad;
- pruebas E2E;
- coexistencia controlada durante transición;
- deprecación y posterior eliminación de Baileys.

**Gate:** flujo completo real sin duplicación de mensajes/pedidos y con rollback definido.

### Fase 5 — Inventario empresarial

Modelo base:

```text
Producto → Presentación → Unidad → Existencia
                         ↓
                       Lote
                         ↓
                    Ubicación
                         ↓
                    Movimiento
```

Para alimentos:

- lotes;
- vencimiento;
- condición de almacenamiento;
- temperatura cuando aplique;
- FEFO;
- mermas;
- conversiones por presentación;
- conteo físico;
- diferencias;
- trazabilidad;
- costos.

La tabla de existencia representa el estado materializado; los movimientos constituyen el historial auditable y toda mutación debe ser transaccional.

### Fase 6 — Compras, recetas y producción

```text
Proveedor
→ Orden de compra
→ Recepción
→ Lote
→ Inventario

Receta
→ Consumo teórico
→ Producción
→ Consumo real
→ Merma
→ Costo
```

### Fase 7 — SolucionaTIA

- ModelProvider/Registry;
- ModelGateway;
- ModelRouter;
- resilience/circuit breaker;
- tracing;
- persistence PostgreSQL;
- contratos SaaS↔Agentic;
- LangGraph;
- evaluación;
- HITL cuando sea necesario.

Los artefactos E0/A2A recuperados se reutilizan; no se reconstruye a ciegas.

### Fase 8 — Piloto real

Flujo mínimo demostrable:

```text
Compra
→ Recepción
→ Lote
→ Almacenamiento
→ Inventario
→ Receta
→ Producción
→ Venta
→ Consumo automático
→ Merma
→ Conteo físico
→ Diferencia
→ Alerta
→ Análisis IA
```

**Gate:** un operador real puede completar el ciclo sin intervención de desarrollo.

### Fase 9 — Hardening y release

- seguridad;
- pruebas de regresión;
- backups/restore;
- observabilidad;
- performance baseline;
- documentación operativa;
- rollback;
- release candidate;
- aceptación humana;
- release.

## 8. Reglas de colaboración multi-IA

Cada IA debe:

1. leer `README.md`, `SECURITY.md`, `AGENTS.md` y la documentación aplicable;
2. comprobar la rama y estado antes de modificar;
3. registrar su área en `CLAIMS.md`;
4. modificar únicamente el scope asignado;
5. ejecutar pruebas relevantes;
6. registrar evidencia;
7. actualizar estado;
8. realizar un commit atómico;
9. entregar contexto de handoff;
10. nunca afirmar éxito sin evidencia.

Si dos agentes necesitan el mismo archivo, se debe coordinar antes de editarlo.

## 9. Convenciones Git

Ramas recomendadas:

```text
feature/<dominio>-<descripcion>
fix/<dominio>-<descripcion>
refactor/<dominio>-<descripcion>
chore/<descripcion>
docs/<descripcion>
infra/<descripcion>
security/<descripcion>
```

Commits:

```text
feat(scope): ...
fix(scope): ...
refactor(scope): ...
test(scope): ...
docs(scope): ...
chore(scope): ...
security(scope): ...
```

`main` representa código integrado y verificable. El desarrollo normal entra mediante PR.

## 10. Definition of Done

Una tarea está DONE únicamente cuando:

- código implementado;
- tests relevantes pasan;
- typecheck/lint aplicables pasan;
- no hay secretos;
- migraciones ejecutan y tienen rollback cuando corresponde;
- documentación actualizada;
- estado actualizado;
- commit identificable;
- evidencia reproducible;
- PR revisado/aceptado.

Una funcionalidad documentada pero no ejecutada se clasifica como `DOCUMENTADO_PERO_NO_VERIFICADO`.

## 11. Gates humanos

Se requiere aprobación del propietario antes de:

- cambios irreversibles de arquitectura;
- eliminación de Baileys;
- migración destructiva de datos;
- cambios de licencia;
- exposición de servicios a Internet;
- release productivo;
- cambios que comprometan datos reales;
- decisiones de proveedor con coste.

## 12. Decisiones abiertas

- versión exacta de PostgreSQL objetivo;
- estrategia definitiva Redis/colas;
- almacenamiento de objetos;
- proveedor DIAN;
- versión Graph API objetivo al implementar WhatsApp;
- estrategia de RLS y tenant isolation;
- recuperación exacta de E0/A2A/E1;
- política final de ramas/protección GitHub según capacidades disponibles de la cuenta.

Estas decisiones deben convertirse en ADR antes de quedar cerradas.

## 13. Regla de despliegue

Oracle es **staging/integration** inicialmente. No se considera producción por el mero hecho de estar accesible desde Internet.

Todo despliegue debe poder reproducirse desde un commit/tag conocido.

## 14. Criterio rector

> Soluciona IA no se desarrolla acumulando código. Se desarrolla acumulando capacidades verificadas, trazables, reversibles y documentadas.
