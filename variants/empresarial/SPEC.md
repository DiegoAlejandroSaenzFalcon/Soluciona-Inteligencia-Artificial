# SPEC.md — Spec Driven Development: Variante Empresarial
# Soluciona Inteligencia Artificial - Motor de Soporte TI Automatizado

## 1. Visión de la Variante

**Soluciona IA Empresarial** es un motor de soporte técnico automatizado con IA (opencode + DeepSeek V4 Flash) que entrega **confianza demostrable** a clientes regulados (bancos, fintechs, clínicas, contadores):

- **Tickets con SLA**: Ciclo de vida completo, escalación automática, reportes
- **Base de Conocimiento**: Runbooks Markdown, búsqueda semántica, versionado
- **Triage IA**: Clasificación automática, priorización, routing
- **Agentes opencode**: `triager` (clasifica), `solver` (diagnostica), `revisor` (audita)
- **Paquete de Confianza**: Evidencia documentada para due diligence (ISO 27001, SOC 2)
- **Procedimiento Acceso Cliente**: JIT, mínimo privilegio, registro total, auditoría
- **Gobernanza**: Plan Maestro, Política Seguridad, Legal Checklist, Contratos

## 2. Arquitectura Específica

```
soluciona-inteligencia-artificial-empresarial/
├── .opencode/
│   ├── agents/           # triager, solver, revisor
│   ├── skills/           # SDD, SSD, DDD, CA skills
│   └── config.json       # Config opencode
├── docs/
│   ├── 01-plan-maestro.md      # Hoja ruta fases 0-5
│   ├── 02-politica-seguridad.md # ISO 27001 alignment
│   ├── 03-procedimiento-acceso-cliente.md # JIT access
│   ├── 04-ciclo-ticket-sla.md  # Ticket lifecycle
│   ├── 05-paquete-confianza.md # Due diligence package
│   └── 06-legal-checklist.md   # Colombia legal/fiscal
├── kb/                   # Base conocimiento (runbooks .md)
├── templates/            # Onboarding, perfiles, cuestionarios
├── scripts/              # Automatización (PowerShell/Bash)
├── tickets/              # Sistema tickets (git-tracked)
├── clientes/             # Datos cliente (gitignored en prod)
├── AGENTS.md             # Reglas para agentes IA
└── opencode.json         # Configuración opencode
```

## 3. Componentes Principales

### 3.1 Agentes opencode

| Agente | Rol | Permisos | Descripción |
|--------|-----|----------|-------------|
| **triager** | Clasificador | read-only | Recibe alerta/email → extrae entidades → clasifica (categoría, prioridad, L1/L2) → crea ticket JSON |
| **solver** | Diagnóstico | read-only + edit (solo docs) | Lee ticket + KB → escribe `diagnostico.md` + `propuesta.md` → **nunca ejecuta en prod** |
| **revisor** | Auditoría | read-only | Revisa `diagnostico.md` + `propuesta.md` → valida riesgos, completitud → aprueba/rechaza |

### 3.2 Flujo de Trabajo (Ticket Lifecycle)

```
ENTRADA (API/Email/Telegram/Manual)
    │
    ▼
TRIAGE (triager agent)
    ├── Extrae: cliente, sistema, síntomas, urgencia
    ├── Clasifica: categoría (red/servidor/app/seguridad), prioridad (P1-P4), SLA
    ├── Crea ticket: tickets/<cliente>/<YYYY-MM-DD>-<slug>.json
    └── Estado: "triaged"
    │
    ▼
DIAGNÓSTICO (solver agent)
    ├── Lee: ticket + triage.md + KB relevante
    ├── Escribe: diagnostico.md (causa probable, comandos verificación, plan, riesgos)
    ├── Actualiza ticket: estado="propuesta_enviada"
    └── Espera aprobación humana
    │
    ▼
APROBACIÓN HUMANA (Dueño/Cliente)
    ├── Revisa: diagnostico.md + propuesta.md
    ├── Aprueba: cambia ticket estado="aprobado"
    └── Ejecuta: humano o agente (sandbox) con registro
    │
    ▼
VERIFICACIÓN + CIERRE
    ├── Prueba resultado
    ├── Genera reporte cliente (plantilla docs/04)
    ├── Actualiza KB si nuevo runbook
    └── Ticket estado="cerrado" + reporte adjunto
```

### 3.3 Base de Conocimiento (KB)

```
kb/
├── correo-no-envia.md           # Runbook: diagnóstico SMTP/DNS/cola
├── impresora-no-imprime.md      # Runbook: cola, driver, red, permisos
├── runbook-malware-bat-ransomware.md # Runbook: aislamiento, análisis, recuperación
└── README.md                    # Índice + convenciones
```

**Formato Runbook Estándar:**
```markdown
# Runbook: <Título>

## Síntomas
- <Síntoma 1>
- <Síntoma 2>

## Causas Conocidas
| Causa | Probabilidad | Verificación |
|-------|--------------|--------------|
| <Causa 1> | Alta | `comando verificación` |

## Pasos de Diagnóstico
1. `comando 1` → Esperado: <resultado>
2. `comando 2` → Esperado: <resultado>

## Solución
### Opción A (Recomendada)
```bash
comando solución
```

### Opción B (Alternativa)
```bash
comando alternativa
```

## Verificación Post-Solución
- `comando test` → Debe retornar <éxito>

## Riesgos
- <Riesgo 1>: Mitigación <acción>

## Referencias
- KB relacionada: <link>
- Documentación oficial: <url>
```

## 4. Especificaciones Prioritarias

### P0 - Fundación (Semanas 1-2)
| SPEC-ID | Título | Descripción |
|---------|--------|-------------|
| SPEC-E01 | Configuración opencode + Agentes base | `triager`, `solver`, `revisor` con prompts optimizados |
| SPEC-E02 | Estructura tickets git-tracked | `tickets/<cliente>/<date>-<slug>.json` + `triage.md` + `diagnostico.md` |
| SPEC-E03 | KB inicial (20 runbooks) | Top 20 problemas: correo, impresora, VPN, lentitud, malware, backup, DNS, BD |
| SPEC-E04 | Eval set 50 tickets | Casos reales con solución esperada para medir ≥70% resolución automática |
| SPEC-E04 | Documentos gobernanza (docs/01-06) | Ya existen - validar y versionar v1.0 |

### P1 - Producto Mínimo Viable (Semanas 3-6)
| SPEC-ID | Título | Descripción |
|---------|--------|-------------|
| SPEC-E10 | Entrada multi-canal | Webhook API + Email (IMAP) + Telegram Bot + Manual CLI |
| SPEC-E11 | Dashboard remoto (móvil) | Ver tickets abiertos, métricas, aprobar propuestas desde teléfono |
| SPEC-E12 | Ciclo ticket SLA automatizado | Cálculo SLA, escalación automática, notificaciones |
| SPEC-E13 | Paquete confianza generador | Auto-genera evidencias para due diligence (checklist docs/05) |
| SPEC-E14 | Onboarding cliente automatizado | Cuestionario → Contrato → Accesos JIT → Primer ticket |

### P2 - Profesionalización (Meses 2-4)
| SPEC-ID | Título | Descripción |
|---------|--------|-------------|
| SPEC-E20 | Seguros: Ciberseguro + E&O | Cotizar, contratar, integrar en paquete confianza |
| SPEC-E21 | Autoevaluación ISO 27001 | Mapa controles A.5-A.18 → evidencias en repo |
| SPEC-E22 | Simulación incidente | Prueba escrita + prueba real controlada + postmortem |
| SPEC-E23 | Cliente sensible (clínica/contador) | Onboarding completo + auditoría acceso + reporte mensual |

### P3 - Escala y Mercado Regulado (Meses 6-18)
| SPEC-ID | Título | Descripción |
|---------|--------|-------------|
| SPEC-E30 | Subcontrato MSP | Soporte L1-L2 para MSP que vende a bancos |
| SPEC-E31 | Cuestionario seguridad real | Responder cuestionario entidad regulada con evidencias |
| SPEC-E32 | Multi-cliente aislamiento estricto | Worktrees/directorios por cliente, cero data leakage |
| SPEC-E33 | Certificación ISO 27001 (Año 2+) | Si mercado exige; mientras: alineación continua |

## 5. Quality Gates Específicos Empresarial

| Gate | Herramienta | Umbral | Específico |
|------|-------------|--------|------------|
| Agent Tests | Custom eval harness | ≥70% resolución | Eval set 50 tickets con expected output |
| KB Coverage | Custom script | 100% runbooks tienen: síntomas, causas, pasos, verificación | Lint markdown |
| Security Docs | Manual review | 100% docs/02,03,05 actualizados | Versionados vX.Y con PO approval |
| Ticket Traceability | Git history | 100% tickets tienen: triage, diagnostico, propuesta, reporte | Append-only |
| Client Isolation | Automated test | 0 data leakage entre `clientes/<A>/` y `clientes/<B>/` | Path validation |
| Legal Compliance | Checklist docs/06 | 100% items verificados | DIAN, Ley 1581, SAS, contratos |

## 6. Métricas de Negocio (KPIs del Plan Maestro)

| KPI | Definición | Objetivo | Fuente |
|-----|------------|----------|--------|
| Resolución L1 | % tickets resueltos en automático | ≥70% → 85% | Log de tickets |
| Primera respuesta | Tiempo ticket → primera propuesta | <15 min | Log |
| MTTR | Min a resolución | <4h (normal) / <24h (P1) | Log |
| Escalación | % a humano | <30% → <15% | Log |
| Costo/ticket | USD reales en tokens | <$0.10 | Monitor agentes |
| Errores en producción | Cambios que causaron fallos | 0 | Revisión post-mes |
| Confianza | % preguntas cliente respondidas con docs | 100% | Carpetas evidencia |

## 7. Reglas de Seguridad Empresarial (Inmutables)

| Regla | Descripción | Enforcement |
|-------|-------------|-------------|
| **Proponer primero, ejecutar después** | Agentes proponen, humanos aprueban y ejecutan | `solver` agent: `bash: deny`, `edit: allow (solo docs)` |
| **Mínimo privilegio JIT** | Acceso temporal, registro total, sin acceso permanente | Procedimiento docs/03 + scripts |
| **Todo se registra** | Cada llamada, ejecución, ticket en git | Append-only, git history |
| **Aislamiento por cliente** | Directorios separados, sin data sharing | `clientes/<cliente>/` + gitignore |
| **Evidencia sobre afirmaciones** | Si no está documentado, no existe | KB + tickets + reportes versionados |

## 8. Stack Tecnológico Empresarial

| Capa | Tecnología | Justificación |
|------|------------|---------------|
| **IA/Orquestación** | opencode + DeepSeek V4 Flash (free tier) | Gratis, local, privacidad, tool-calling |
| **Automatización** | PowerShell 7 (Windows) + Bash (Linux) | Nativo en entornos cliente |
| **Versionado** | Git (Markdown + JSON) | Audit trail nativo, branching, offline |
| **KB** | Markdown + búsqueda semántica (futuro: embeddings) | Simple, versionable, legible |
| **Tickets** | JSON + Markdown en git | Trazabilidad completa, sin BD externa |
| **Dashboard** | Web simple (HTML/JS) o CLI | Acceso móvil, bajo mantenimiento |

## 9. Especificaciones Técnicas Detalladas

### 9.1 Triager Agent (SPEC-E01)
```gherkin
Feature: Triaje automático de incidencias
  Scenario: Clasificar email de cliente
    Given email entrante en buzón IMAP configurado
    When triager procesa email
    Then extrae: cliente (desde remitente/dominio), sistema (keywords), síntomas (body)
    And clasifica: categoria ∈ {red,servidor,app,seguridad,backup,bd}, prioridad ∈ {P1,P2,P3,P4}
    And calcula SLA según prioridad + categoria
    And crea ticket: tickets/<cliente>/<YYYY-MM-DD>-<slug>.json con estado "triaged"
    And genera triage.md con resumen ejecutivo
```

### 9.2 Solver Agent (SPEC-E01)
```gherkin
Feature: Diagnóstico automático con propuesta
  Scenario: Diagnosticar "correo no envía"
    Given ticket en estado "triaged" con categoria="correo"
    And KB tiene runbook "correo-no-envia.md"
    When solver ejecuta diagnóstico
    Then lee ticket + triage.md + runbook
    And escribe diagnostico.md con:
      | Causa probable | Verificación | Plan | Riesgos |
    And actualiza ticket estado="propuesta_enviada"
    And NO ejecuta comandos en entorno cliente
```

### 9.3 Paquete Confianza Generator (SPEC-E13)
```gherkin
Feature: Generar paquete confianza para due diligence
  Given cliente solicita auditoría (banco/fintech)
  When ejecutar script generate-trust-package.sh
  Then genera carpeta evidencia con:
    - Política seguridad (docs/02) firmada v1.0
    - Procedimiento acceso (docs/03) + logs últimos 6 meses
    - Ciclo ticket SLA (docs/04) + métricas reales
    - Checklist legal (docs/06) completado
    - Certificados seguros + pólizas
    - Autoevaluación ISO 27001 (controles A.5-A.18 mapeados)
  And empaqueta en ZIP + checksum SHA256
  And entrega via enlace temporal (expires 7d)
```

---

*Versión: 1.0.0 | Actualizado: 2026-09-21 | Variante: Empresarial*