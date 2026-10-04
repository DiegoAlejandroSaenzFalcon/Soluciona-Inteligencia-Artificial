# Architecture Decision Record (ADR) Template

## Formato: `docs/adr/NNN-titulo-corto-kebab-case.md`

---

# ADR-<NNN>: <Título Descriptivo de la Decisión>

**Status**: Proposed | Accepted | Superseded | Deprecated
**Date**: YYYY-MM-DD
**Deciders**: <Nombres/Roles de quienes deciden>
**Technical Story**: <Link a Issue/SPEC/PR que motiva la decisión>
**Supersedes**: ADR-<NNN> (si aplica)
**Superseded by**: ADR-<NNN> (si aplica)

---

## Context

<Descripción del problema que enfrentamos. Qué opciones teníamos. Qué restricciones existían (técnicas, de negocio, tiempo, presupuesto). Incluir datos concretos si los hay: benchmarks, costos, riesgos.>

### Problema
- <Punto 1>
- <Punto 2>

### Opciones Consideradas
1. **Opción A**: <Descripción> - <Pros/Contras>
2. **Opción B**: <Descripción> - <Pros/Contras>
3. **Opción C**: <Descripción> - <Pros/Contras>

### Criterios de Decisión
| Criterio | Peso | Opción A | Opción B | Opción C |
|----------|------|----------|----------|----------|
| Performance | Alto | ✅ | ⚠️ | ❌ |
| Mantenibilidad | Alto | ✅ | ✅ | ⚠️ |
| Costo | Medio | 💰💰 | 💰 | 💰💰💰 |
| Tiempo implementación | Alto | 2 semanas | 1 semana | 3 semanas |
| Riesgo técnico | Alto | Bajo | Medio | Alto |
| Experiencia equipo | Medio | Alta | Media | Baja |

---

## Decision

**Elegimos: <Opción X>**

<Justificación técnica y de negocio de por qué esta opción. Referenciar criterios de la tabla anterior.>

### Detalles de Implementación
- <Punto clave 1>
- <Punto clave 2>
- <Configuración específica>

---

## Consequences

### Positive (Beneficios)
- ✅ <Beneficio 1 medible>
- ✅ <Beneficio 2 medible>
- ✅ <Beneficio 3>

### Negative (Costos/Desventajas)
- ⚠️ <Desventaja 1>
- ⚠️ <Desventaja 2>

### Risks (Riesgos)
| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| <Riesgo 1> | Media | Alto | <Acción> |
| <Riesgo 2> | Baja | Medio | <Acción> |

### Migration Path (Si aplica)
- Paso 1: <Acción>
- Paso 2: <Acción>
- Rollback: <Cómo revertir si falla>

---

## Alternatives Considered (Detalle)

### Opción A: <Nombre>
**Descripción**: <Detalle>
**Por qué se rechazó**: <Razón principal>

### Opción B: <Nombre>
**Descripción**: <Detalle>
**Por qué se rechazó**: <Razón principal>

---

## Implementation Plan

| Tarea | Responsable | Estimación | Estado |
|-------|-------------|------------|--------|
| <Tarea 1> | <Rol/Persona> | <Días> | 🟡 In Progress |
| <Tarea 2> | <Rol/Persona> | <Días> | ⏳ Pending |
| <Tarea 3> | <Rol/Persona> | <Días> | ⏳ Pending |

---

## Validation Criteria

- [ ] <Criterio medible 1: ej. "Latencia P95 < 200ms en load test">
- [ ] <Criterio medible 2: ej. "0 vulnerabilidades high en CodeQL">
- [ ] <Criterio medible 3: ej. "Tests de integración pasan en CI">

---

## Related Documents

- SPEC: SPEC-<ID>
- PR: #<número>
- Docs: `docs/architecture/<tema>.md`
- Runbook: `docs/runbooks/<tema>.md`

---

## History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | YYYY-MM-DD | <Autor> | Creación inicial |