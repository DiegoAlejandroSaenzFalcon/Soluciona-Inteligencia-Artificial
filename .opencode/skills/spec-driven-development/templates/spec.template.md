# SPEC-<ID>: <Título Descriptivo Corto>

**ID**: SPEC-<NNN> (auto-generado, único)
**Estado**: Draft | Review | Approved | Implemented | Deprecated
**Versión**: 1.0.0
**Fecha**: YYYY-MM-DD
**Autor**: <Nombre/Agente>
**Aprobador PO**: <Nombre> / <Fecha>
**Prioridad**: P0=Crítico | P1=Alta | P2=Media | P3=Baja
**Variante**: comercial | empresarial | residencial | shared
**Módulo**: <orders|inventory|billing|crm|ai|auth|...>

---

## 1. Contexto y Justificación

### Problema
<Descripción clara del problema que resuelve esta spec. Qué dolor tiene el usuario/negocio.>

### Solución Propuesta
<Resumen de alto nivel de la solución. Qué se va a construir.>

### Valor de Negocio
- **Usuario**: <Quién se beneficia directamente>
- **Métrica de Éxito**: <KPI medible que mejora>
- **Impacto Estimado**: <Revenue, eficiencia, compliance, satisfacción>

---

## 2. Actores y Permisos

| Actor | Rol | Permisos Requeridos |
|-------|-----|---------------------|
| <Actor 1> | <Rol> | <permiso1, permiso2> |
| <Actor 2> | <Rol> | <permiso1> |

---

## 3. Especificación Formal (Given/When/Then)

### ESCENARIO 1: <Nombre del escenario principal>

#### Given (Precondiciones)
- El sistema está en estado: <estado inicial>
- Existen los siguientes datos prerequisitos:
  - <Dato 1>: <valor/condición>
  - <Dato 2>: <valor/condición>
- Configuración activa:
  - <Feature flag / config>: <valor>
- El actor tiene permisos: <lista>

#### When (Acción)
El actor <actor> ejecuta: <acción específica>
- Endpoint: `METHOD /api/...`
- Payload: `<JSON de entrada>`
- Headers: `<relevantes: x-correlation-id, x-tenant-id, Authorization>`

#### Then (Resultado Esperado)
**Respuesta HTTP**: `<Status Code> <Mensaje>`
**Body**:
```json
{
  "campo1": "valor esperado",
  "campo2": "valor esperado"
}
```

**Cambios de Estado**:
- <Entidad 1>: <estado anterior> → <estado nuevo>
- <Entidad 2>: <se crea / actualiza / elimina>

**Eventos de Dominio Emitidos**:
- `EventName1`: { payload esperado }
- `EventName2`: { payload esperado }

**Notificaciones/Comunicaciones**:
- <Canal>: <destinatario> - <contenido>

---

### ESCENARIO 2: <Nombre escenario alternativo/error>

#### Given
- <Precondiciones específicas para este caso>

#### When
- <Acción que desencadena el caso>

#### Then
**Respuesta HTTP**: `<Status Code> <Error Code>`
**Body**:
```json
{
  "error": "Código de error",
  "message": "Mensaje legible para usuario",
  "details": {}
}
```

**Comportamiento**:
- No se persisten cambios (rollback)
- Se loggea: <qué se loggea>
- No se emiten eventos de dominio

---

## 4. Criterios de Aceptación (AC)

| AC-ID | Descripción | Tipo | Automatizado |
|-------|-------------|------|--------------|
| AC-1 | <Criterio medible 1> | Funcional | ✅ Unit/Integration |
| AC-2 | <Criterio medible 2> | Funcional | ✅ Unit/Integration |
| AC-3 | <Criterio no funcional: performance> | NFR | ✅ Load test |
| AC-4 | <Criterio seguridad: validación> | Seguridad | ✅ Unit |
| AC-5 | <Criterio UX: mensaje error> | UX | ⚠️ Manual/E2E |

---

## 5. Casos Edge y Errores (Exhaustivo)

| ID | Condición | Comportamiento Esperado | Código Error |
|----|-----------|------------------------|--------------|
| E-1 | <Input inválido: campo requerido faltante> | 400 Bad Request + mensaje específico | `VALIDATION_ERROR` |
| E-2 | <Input inválido: formato incorrecto> | 400 Bad Request + detalle campo | `VALIDATION_ERROR` |
| E-3 | <Entidad no encontrada> | 404 Not Found | `NOT_FOUND` |
| E-4 | <Conflicto: duplicado único> | 409 Conflict | `CONFLICT` |
| E-5 | <Permisos insuficientes> | 403 Forbidden | `FORBIDDEN` |
| E-6 | <Límite de tasa excedido> | 429 Too Many Requests | `RATE_LIMITED` |
| E-7 | <Error base de datos> | 500 Internal Server Error + correlation ID | `INTERNAL_ERROR` |
| E-8 | <Servicio externo caído> | 503 Service Unavailable + retry-after | `EXTERNAL_SERVICE_DOWN` |
| E-9 | <Concurrencia: versión obsoleta> | 409 Conflict + versión actual | `VERSION_CONFLICT` |
| E-10 | <Tenant inactivo> | 403 Forbidden | `TENANT_INACTIVE` |

---

## 6. Requisitos No Funcionales (NFRs)

| NFR | Requisito | Métrica | Validación |
|-----|-----------|---------|------------|
| Performance | Latencia P95 | < 200ms | Load test (k6) |
| Performance | Throughput | > 100 req/s | Load test |
| Escalabilidad | Conectividad horizontal | Stateless + Redis | Arquitectura |
| Seguridad | Validación entrada | Zod schema 100% | SAST + Unit tests |
| Seguridad | Autorización | RBAC + RLS | Integration tests |
| Observabilidad | Logs estructurados | 100% requests | Log sampling |
| Observabilidad | Trazabilidad | Correlation ID end-to-end | Integration test |
| Disponibilidad | Uptime | 99.9% | SLO monitoring |
| Recuperación | RTO / RPO | < 4h / < 1h | DR test |

---

## 7. Trazabilidad

| Elemento | Referencia | Estado |
|----------|------------|--------|
| Requisito Negocio | REQ-<ID> / JIRA-<ID> | Linked |
| Spec Padre | SPEC-<PADRE> | N/A |
| Specs Hijas | SPEC-<HIJA1>, SPEC-<HIJA2> | Planned |
| ADRs Relacionados | ADR-<NNN> | Linked |
| Tests Unitarios | `tests/unit/<feature>.test.ts` | Pending |
| Tests Integración | `tests/integration/<feature>.test.ts` | Pending |
| Tests E2E | `tests/e2e/<feature>.spec.ts` | Pending |
| Código Domain | `src/domain/entities/<entity>.ts` | Pending |
| Código Application | `src/application/use-cases/<uc>.ts` | Pending |
| Código Infrastructure | `src/infrastructure/repositories/<repo>.ts` | Pending |
| Código Interfaces | `src/interfaces/http/routes/<route>.ts` | Pending |
| Documentación | `docs/api/<endpoint>.md` | Pending |
| Runbook | `docs/runbooks/<feature>.md` | Pending |

---

## 8. Estimación y Planificación

| Fase | Esfuerzo | Responsable | Dependencias |
|------|----------|-------------|--------------|
| Spec Review | 0.5d | PO + Architect | - |
| Test Design | 1d | Test Engineer | Spec Approved |
| Domain Model | 1d | SDD Engineer | Tests Ready |
| Application Logic | 2d | SDD Engineer | Domain Ready |
| Infrastructure | 1d | SDD Engineer | Domain Ready |
| HTTP Interface | 1d | SDD Engineer | Application Ready |
| Integration Tests | 1d | Test Engineer | All Code Ready |
| E2E Tests | 0.5d | Test Engineer | Staging Deployed |
| Documentation | 0.5d | Docs Engineer | Feature Complete |
| **Total** | **8.5d** | | |

---

## 9. Riesgos y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| <Riesgo 1> | Alta/Media/Baja | Alto/Medio/Bajo | <Acción preventiva> |
| <Riesgo 2> | ... | ... | ... |

---

## 10. Notas de Implementación (Para Developers)

- **Patrón**: <Use Case + Repository + Domain Event>
- **Validación**: Zod schema en `src/shared/schemas/<feature>.ts`
- **Eventos**: Emitir desde Aggregate Root via `addDomainEvent()`
- **Transacciones**: `executeInTransaction()` para operaciones multi-repo
- **Idempotencia**: Usar `idempotency-key` header en endpoints mutantes
- **Feature Flag**: `features.<module>.<feature>` en tenant config

---

## 11. Historial de Cambios

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0.0 | YYYY-MM-DD | <Autor> | Creación inicial |