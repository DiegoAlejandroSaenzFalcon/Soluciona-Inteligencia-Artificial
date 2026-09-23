# Acceptance Criteria Template

## Formato Estándar (Tabla)

| AC-ID | Descripción | Tipo | Prioridad | Automatizado | Test Case ID |
|-------|-------------|------|-----------|--------------|--------------|
| AC-1 | <Criterio medible y verificable> | Funcional | P0 | ✅ Unit/Integration | TC-001 |
| AC-2 | <Criterio medible y verificable> | Funcional | P0 | ✅ Unit/Integration | TC-002 |
| AC-3 | <Criterio performance: P95 < 200ms> | NFR | P1 | ✅ Load Test | TC-003 |
| AC-4 | <Criterio seguridad: validación Zod> | Seguridad | P0 | ✅ Unit | TC-004 |
| AC-5 | <Criterio UX: mensaje error claro> | UX | P2 | ⚠️ Manual/E2E | TC-005 |

## Tipos de Criterios

### Funcional (Functional)
- **Entrada → Salida**: Dado X, cuando Y, entonces Z
- **Cambio de estado**: Entidad pasa de A a B
- **Evento emitido**: Evento X con payload Y se dispara
- **Integración**: Servicio externo responde correctamente

### No Funcional (NFR)
| Categoría | Ejemplos de Criterios |
|-----------|----------------------|
| **Performance** | Latencia P95 < 200ms, Throughput > 100 req/s, Memory < 512MB |
| **Escalabilidad** | Horizontal scaling sin session affinity, stateless |
| **Seguridad** | 0 vulnerabilidades high/critical, Zod validation 100%, RBAC enforced |
| **Observabilidad** | 100% requests con correlation ID, logs estructurados, métricas RED |
| **Disponibilidad** | Uptime 99.9%, RTO < 4h, RPO < 1h |
| **Usabilidad** | Mensajes error en español, tiempo respuesta UI < 100ms |
| **Mantenibilidad** | Cobertura > 80%, complejidad ciclomática < 10, 0 duplicación |

### Seguridad (Security)
- Validación de entrada (Zod) en 100% endpoints
- Autorización (RBAC + RLS) verificada
- Rate limiting en endpoints públicos
- Sin secretos en código/logs
- Headers de seguridad (CSP, HSTS, X-Frame-Options)
- Auditoría de acciones sensibles (audit log)

### Cumplimiento (Compliance)
- DIAN: Factura electrónica válida (CUFE, QR, XML, PDF)
- Ley 1581: Consentimiento, ARCO, DPIA, ROPA
- Ley 1480: Retracto 5d, garantía, PQR 15d
- ISO 27001: Controles A.5-A.18 mapeados

## Criterios por Capa

### Domain Layer
```markdown
| AC-ID | Descripción | Test |
|-------|-------------|------|
| AC-D1 | Entity creation valida invariantes de negocio | Unit |
| AC-D2 | Value Object equality por valor (no referencia) | Unit |
| AC-D3 | Aggregate Root emite Domain Events correctos | Unit |
| AC-D4 | Transiciones de estado válidas (state machine) | Unit |
| AC-D5 | Métodos de negocio retornan Result<T, Error> | Unit |
```

### Application Layer
```markdown
| AC-ID | Descripción | Test |
|-------|-------------|------|
| AC-A1 | Use Case orquesta domain + infrastructure | Integration |
| AC-A2 | Command valida input con Zod antes de ejecutar | Unit |
| AC-A3 | Query retorna DTO tipado (no entity directa) | Unit |
| AC-A4 | Transacciones: commit/rollback atómico | Integration |
| AC-A5 | Idempotencia en commands mutantes | Integration |
```

### Infrastructure Layer
```markdown
| AC-ID | Descripción | Test |
|-------|-------------|------|
| AC-I1 | Repository implementa interface completa | Integration |
| AC-I2 | Queries SQL parameterizadas (Drizzle) - 0 concat | Unit |
| AC-I3 | Migraciones reversibles (up/down) | Integration |
| AC-I4 | External API: retry + circuit breaker + timeout | Integration |
| AC-I5 | Event Bus: publish/subscribe con retry | Integration |
```

### Interfaces Layer (HTTP)
```markdown
| AC-ID | Descripción | Test |
|-------|-------------|------|
| AC-H1 | Endpoint valida input con Zod schema | Unit |
| AC-H2 | Response serializa DTO (no entity) | Unit |
| AC-H3 | Error handling: Problem Details RFC 7807 | Unit |
| AC-H4 | Correlation ID propagado en headers | Integration |
| AC-H5 | Rate limiting + auth + tenant context | Integration |
| AC-H6 | OpenAPI 3.1 spec generada y válida | Unit |
```

## Definición de "Done" por AC

Un AC se considera **Done** cuando:

- [ ] Test escrito y pasando (Unit/Integration/E2E según tipo)
- [ ] Código implementado y revisado
- [ ] Documentación actualizada (JSDoc, README, API docs)
- [ ] No rompe tests existentes (regresión)
- [ ] Cumple NFRs asociados (performance, seguridad)
- [ ] Aprobado en Code Review

## Ejemplo Completo: SPEC-042 Lot Tracking

| AC-ID | Descripción | Tipo | Prioridad | Automatizado | Test Case |
|-------|-------------|------|-----------|--------------|-----------|
| AC-01 | Crear lote con número, vencimiento, condición, cantidad, costo | Funcional | P0 | ✅ Unit + Integration | TC-042-01 |
| AC-02 | Rechazar creación si faltan campos obligatorios (lote, vencimiento) | Funcional | P0 | ✅ Unit | TC-042-02 |
| AC-03 | Validar formato fecha vencimiento (YYYY-MM-DD, fecha real) | Funcional | P0 | ✅ Unit | TC-042-03 |
| AC-04 | Validar condición ∈ {ambiente, refrigerado, congelado, seco} | Funcional | P0 | ✅ Unit | TC-042-04 |
| AC-05 | Listar lotes de un producto ordenados por vencimiento (FEFO) | Funcional | P0 | ✅ Integration | TC-042-05 |
| AC-06 | Consultar lotes por vencer en N días | Funcional | P0 | ✅ Integration | TC-042-06 |
| AC-07 | Recepción de OC exige lote y lo persiste | Funcional | P0 | ✅ Integration | TC-042-07 |
| AC-08 | Salida de inventario descuenta del lote más próximo a vencer (FEFO) | Funcional | P1 | ✅ Integration | TC-042-08 |
| AC-09 | Alerta automática si lote vence en < 3 días | Funcional | P1 | ✅ Integration | TC-042-09 |
| AC-10 | Latencia P95 endpoints lotes < 150ms | NFR | P1 | ✅ Load Test | TC-042-10 |
| AC-11 | RLS PostgreSQL aísla lotes por tenant | Seguridad | P0 | ✅ Integration | TC-042-11 |
| AC-12 | Audit log registra creación/modificación lotes | Compliance | P1 | ✅ Integration | TC-042-12 |

## Checklist de Validación de ACs

- [ ] Cada AC es **medible** (no subjetivo)
- [ ] Cada AC es **verificable** (test automatizado o manual definido)
- [ ] Cada AC tiene **prioridad** clara (P0-P3)
- [ ] ACs cubren **happy path + edge cases + errores**
- [ ] ACs trazables a **código + tests + docs**
- [ ] ACs de seguridad **no opcionales** (P0 obligatorio)
- [ ] ACs de performance **con métricas numéricas**