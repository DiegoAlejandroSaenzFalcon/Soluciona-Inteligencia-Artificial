# SPEC.md — Spec Driven Development Maestro
# Soluciona Inteligencia Artificial

## 1. Visión del Producto

**Soluciona IA** es una plataforma de automatización empresarial integral con tres variantes:

| Variante | Carpeta | Estado | Descripción |
|----------|---------|--------|-------------|
| **Comercial** | `soluciona-inteligencia-artificial-comercial/` | ✅ Activo | Bot de pedidos por WhatsApp para establecimientos (restaurantes, locales). Sistema multi-negocio: pedidos, menú, clientes, conversaciones, consumo IA, panel web, panel central. |
| **Empresarial** | `soluciona-inteligencia-artificial-empresarial/` | ✅ Activo | Motor de soporte TI automatizado: tickets con SLA, base de conocimiento, triage con IA, agentes de opencode, paquetes de confianza y política de seguridad. |
| **Residencial** | `soluciona-inteligencia-artificial-residencial/` | 🔒 Reservado | Se desarrollará a futuro. |

## 2. Principios SDD (No Negociables)

1. **Spec-First**: Nada se codea sin spec aprobada
2. **Test-First**: Tests definen comportamiento antes que implementación
3. **Traceability**: Cada línea de código ↔ spec ↔ test ↔ req negocio
4. **Living Docs**: Specs se actualizan con cada cambio (no docs muertos)
5. **Contract-Driven**: APIs versionadas con OpenAPI 3.1 + Zod schemas

## 3. Ciclo de Desarrollo SDD

```
REQUERIMIENTO → SPEC (Given/When/Then) → TESTS (RED) → IMPLEMENT (GREEN) → REFACTOR → DOCS
     ↑                                                                              │
     └────────────────── VALIDACIÓN CONTINUA ←────────────────────────────────────┘
```

## 4. Formato de Especificación (Given/When/Then)

```markdown
## SPEC-<ID>: <Título descriptivo>

**Contexto**: <Por qué se necesita, qué problema resuelve>
**Actor**: <Quién usa esta funcionalidad>
**Prioridad**: <P0=Crítico | P1=Alta | P2=Media | P3=Baja>

### Given (Precondiciones)
- Estado del sistema antes de la acción
- Datos prerequisitos
- Configuración necesaria

### When (Acción)
- Acción específica que ejecuta el actor
- Parámetros de entrada

### Then (Resultado esperado)
- Resultado observable y verificable
- Cambios de estado del sistema
- Eventos de dominio emitidos
- Respuesta al actor

### Criterios de Aceptación (AC)
- [ ] AC-1: <Criterio medible 1>
- [ ] AC-2: <Criterio medible 2>
- [ ] AC-3: <Criterio medible 3>

### Casos Edge / Errores
- **E-1**: <Condición de error> → <Comportamiento esperado>
- **E-2**: <Condición de error> → <Comportamiento esperado>

### Trazabilidad
- **Requisito Negocio**: REQ-<ID>
- **Tests**: `tests/unit/<feature>.test.ts`, `tests/integration/<feature>.test.ts`
- **Código**: `src/domain/...`, `src/application/...`, `src/interfaces/...`
- **ADR**: `docs/adr/<id>-<topic>.md` (si aplica)
```

## 5. Especificaciones por Variante

### 5.1 Comercial → `variants/comercial/SPEC.md`
Especificación completa del SaaS multi-tenant: pedidos, inventario, facturación DIAN, contabilidad, nómina, CRM, IA nativa, logística, BI, apps móviles.

### 5.2 Empresarial → `variants/empresarial/SPEC.md`
Especificación del motor de soporte TI: triage IA, agentes opencode, ciclo ticket SLA, base conocimiento, paquetes confianza, procedimiento acceso cliente.

### 5.3 Residencial → `variants/residencial/SPEC.md`
Por definir (futuro).

## 6. Quality Gates Obligatorios (Pre-Merge)

| Gate | Herramienta | Umbral | Bloqueante |
|------|-------------|--------|------------|
| Lint | ESLint + Prettier | 0 errors, 0 warnings | ✅ Sí |
| TypeCheck | TypeScript strict | 0 errors | ✅ Sí |
| Unit Tests | Vitest | >80% coverage | ✅ Sí |
| Integration Tests | Vitest + Testcontainers | Critical paths | ✅ Sí |
| Security SAST | CodeQL + Semgrep | 0 high/critical | ✅ Sí |
| Security SCA | npm audit + Trivy | 0 high/critical | ✅ Sí |
| Secrets | Gitleaks | 0 findings | ✅ Sí |
| Dependencies | Dependabot + Renovate | Auto-PR para updates | ⚠️ Warn |

## 7. Versionado y Releases

- **SemVer** + **Conventional Commits**: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- **Formato commit**: `<tipo>(<scope>): <descripción>`
  - `feat(comercial): add lot tracking for food inventory`
  - `fix(empresarial): correct SLA calculation on holidays`
- **Changelog**: Automático (conventional-changelog)
- **Tags**: `v<major>.<minor>.<patch>[-<prerelease>]`
- **Ramas**: `main` (protected), `develop` (integration), `feature/*`, `fix/*`, `release/*`

## 8. Definición de "Done" (DoD)

- [ ] Spec aprobada por PO (Dueño de Producto)
- [ ] Tests unitarios (>80% coverage) + integración (paths críticos)
- [ ] TypeScript strict sin errores (`tsc --noEmit`)
- [ ] Lint/Prettier clean (`npm run lint`)
- [ ] Security scan clean (CodeQL, Semgrep, Trivy, Gitleaks)
- [ ] Documentación actualizada (JSDoc APIs públicas + README + CHANGELOG)
- [ ] Code review aprobado (1 reviewer mínimo)
- [ ] Deploy a staging verificado
- [ ] Smoke tests en staging pasan
- [ ] Métricas de performance dentro de SLOs

## 9. Métricas de Salud del Desarrollo (DORA + SPACE)

| Métrica | Objetivo | Fuente |
|---------|----------|--------|
| Lead Time for Changes | < 1 día | GitHub Actions |
| Deployment Frequency | ≥ 1/día (develop) | GitHub Actions |
| Change Failure Rate | < 5% | GitHub Actions + Monitoring |
| MTTR | < 1 hora | Incident logs |
| Code Coverage | > 80% (unit) / > 60% (integration) | Vitest coverage |
| Technical Debt Ratio | < 5% | SonarQube (futuro) |

## 10. Gobernanza de Specs

| Acción | Quién | Cuándo |
|--------|-------|--------|
| Crear spec | Spec Analyst / PO | Antes de cualquier implementación |
| Revisar spec | Architect + PO | Antes de desarrollo |
| Aprobar spec | PO (Dueño) | Inicio de sprint |
| Actualizar spec | Developer + Spec Analyst | Cuando cambian requisitos |
| Archivar spec | Spec Analyst | Cuando feature se deprecía |

---

*Última actualización: 2026-09-21 | Versión 1.0.0*