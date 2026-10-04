# INIT.md — System Software Development: Variante Empresarial
# Soluciona Inteligencia Artificial - Motor de Soporte TI Automatizado

## 1. Propósito

Inicialización canónica para operación y desarrollo en la variante **Empresarial**. Entorno ligero (sin BD pesada), basado en git + Markdown + opencode agents.

## 2. Prerrequisitos Específicos

```bash
# Versiones mínimas
Node.js    >= 22.0.0 (LTS) - para opencode CLI
npm        >= 10.0.0
Git        >= 2.40.0
PowerShell 7+ (Windows) / Bash (Linux/macOS)
opencode CLI (npm i -g @opencode/cli@latest)
```

## 3. Bootstrap Empresarial (Un Comando)

```bash
# Desde raíz del monorepo
cd soluciona-inteligencia-artificial-empresarial

# 1. Instalar dependencias (opencode config)
npm ci

# 2. Configurar opencode
opencode auth  # Autenticar con proveedor (gratis: deepseek-v4-flash-free)

# 3. Verificar agentes
opencode agent list
# Debe mostrar: triager, solver, revisor, sdd-engineer, spec-analyst, etc.

# 4. Leer documentación gobernanza
cat docs/01-plan-maestro.md
cat docs/02-politica-seguridad.md
cat docs/03-procedimiento-acceso-cliente.md
cat docs/04-ciclo-ticket-sla.md
cat docs/05-paquete-confianza.md
cat docs/06-legal-checklist.md
cat AGENTS.md

# 5. Verificar KB
ls kb/
# Debe mostrar: correo-no-envia.md, impresora-no-imprime.md, runbook-malware-*, README.md
```

## 4. Configuración opencode (opencode.json)

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "opencode/deepseek-v4-flash-free",
  "default_agent": "triager",
  "permission": {
    "edit": "ask",
    "bash": "ask",
    "webfetch": "allow",
    "websearch": "allow",
    "task": "ask"
  },
  "instructions": [
    "AGENTS.md",
    "SPEC.md",
    "INIT.md",
    "docs/01-plan-maestro.md",
    "docs/02-politica-seguridad.md",
    "docs/03-procedimiento-acceso-cliente.md",
    "docs/04-ciclo-ticket-sla.md"
  ],
  "autoupdate": "notify",
  "agents": {
    "triager": {
      "description": "Clasifica incidencias entrantes y crea tickets",
      "mode": "all",
      "temperature": 0.1,
      "permission": { "edit": "allow", "bash": "deny", "task": "deny" }
    },
    "solver": {
      "description": "Diagnostica y propone solución (NUNCA ejecuta en prod)",
      "mode": "all",
      "temperature": 0.1,
      "permission": { "edit": "allow", "bash": "deny", "task": "deny" }
    },
    "revisor": {
      "description": "Audita diagnósticos y propuestas antes de aprobación",
      "mode": "all",
      "temperature": 0.1,
      "permission": { "edit": "deny", "bash": "deny", "webfetch": "allow" }
    },
    "sdd-engineer": { "description": "Implementa specs aprobadas", "mode": "all", "temperature": 0.1 },
    "spec-analyst": { "description": "Escribe specs Given/When/Then", "mode": "all", "temperature": 0.2 },
    "client-onboarding": { "description": "Guía onboarding cliente", "mode": "all", "temperature": 0.2 }
  }
}
```

## 5. Estructura de Directorios Empresarial

```
soluciona-inteligencia-artificial-empresarial/
├── .opencode/
│   ├── agents/           # triager.md, solver.md, revisor.md, etc.
│   ├── skills/           # SDD, SSD, CA, DDD skills
│   └── config.json       # Configuración principal
├── docs/
│   ├── 01-plan-maestro.md          # Hoja ruta fases 0-5 + KPIs
│   ├── 02-politica-seguridad.md    # ISO 27001 alignment
│   ├── 03-procedimiento-acceso-cliente.md # JIT access procedure
│   ├── 04-ciclo-ticket-sla.md      # Ticket lifecycle + SLA
│   ├── 05-paquete-confianza.md     # Due diligence package
│   ├── 06-legal-checklist.md       # Colombia legal/fiscal
│   └── adr/                        # Architecture Decision Records
├── kb/                              # Base conocimiento (runbooks)
│   ├── correo-no-envia.md
│   ├── impresora-no-imprime.md
│   ├── runbook-malware-bat-ransomware.md
│   └── README.md
├── templates/
│   ├── cuestionario-onboarding.md  # Cuestionario + registro sesión
│   └── perfil-cliente.md           # Ficha técnica cliente
├── scripts/
│   ├── nuevo-ticket.ps1            # Crear ticket interactivo
│   ├── generate-trust-package.ps1  # Generar paquete confianza
│   └── eval-agents.ps1             # Evaluar agents contra eval set
├── tickets/                         # Sistema tickets (git-tracked)
│   ├── <cliente>/
│   │   ├── <YYYY-MM-DD>-<slug>.json
│   │   ├── triage.md
│   │   ├── diagnostico.md
│   │   ├── propuesta.md
│   │   └── reporte.md
│   └── .gitkeep
├── clientes/                        # Datos sensibles (GITIGNORED en prod)
│   ├── <cliente>/
│   │   ├── accesos.md              # Credenciales (vault en prod)
│   │   ├── inventario.md           # Inventario sistemas
│   │   └── contactos.md            # Contactos clave
│   └── .gitkeep
├── private/                         # NUNCA versionar (gitignored)
│   └── datos-fundador.md           # Ficha personal/fiscal fundador
├── AGENTS.md                        # Reglas obligatorias para IA
├── opencode.json                    # Config opencode (ver arriba)
├── SPEC.md                          # Especificaciones variante
├── INIT.md                          # Este archivo
├── README.md
├── package.json
├── .gitignore
└── .gitkeep
```

## 6. Variables de Entorno (.env.example)

```bash
# opencode
OPENCODE_MODEL=opencode/deepseek-v4-flash-free
OPENCODE_THINKING_MODE=on_demand

# Git
GIT_AUTHOR_NAME=Soluciona IA Bot
GIT_AUTHOR_EMAIL=bot@soluciona.ai

# Cliente actual (para scripts)
CURRENT_CLIENT=  # Se setea por script nuevo-ticket.ps1

# Paths
TICKETS_BASE_PATH=./tickets
KB_PATH=./kb
TEMPLATES_PATH=./templates
CLIENTES_PATH=./clientes

# Notificaciones (opcional)
SLACK_WEBHOOK_URL=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
EMAIL_SMTP_HOST=
EMAIL_SMTP_PORT=
EMAIL_FROM=
```

## 7. Comandos Principales

```bash
# Gestión Tickets
pwsh scripts/nuevo-ticket.ps1 -Cliente "ACME" -Titulo "Falla correo" -Prioridad P2
# Crea ticket interactivo + triage.md + abre en editor

# Agentes opencode
opencode run triager                    # Ejecuta triager en tickets pendientes
opencode run solver --ticket tickets/acme/2026-09-21-falla-correo.json
opencode run revisor --ticket tickets/acme/2026-09-21-falla-correo.json

# Evaluación agents
pwsh scripts/eval-agents.ps1 --set eval-set-50.json --agent solver

# Paquete Confianza
pwsh scripts/generate-trust-package.ps1 -Cliente "BancoXYZ" -Output ./evidencia-bancoxyz.zip

# Onboarding Cliente
# 1. Copiar template
cp templates/cuestionario-onboarding.md clientes/NUEVO-CLIENTE/cuestionario.md
# 2. Completar con cliente (reunión)
# 3. Ejecutar onboarding
opencode run client-onboarding --client NUEVO-CLIENTE

# Mantenimiento KB
# Agregar runbook
cp templates/runbook.template.md kb/nuevo-runbook.md
# Editar y validar
markdownlint kb/nuevo-runbook.md
```

## 8. Flujo de Trabajo Diario (Runbook Operativo)

### 8.1 Inicio de Jornada
```bash
# 1. Verificar tickets nuevos/abiertos
ls tickets/*/*.json | head -20

# 2. Ejecutar triager automático
opencode run triager

# 3. Revisar tickets en estado "triaged" → asignar a solver
opencode run solver --ticket tickets/<cliente>/<ticket>.json

# 4. Revisar propuestas (estado "propuesta_enviada")
#    Leer diagnostico.md + propuesta.md
#    Aprobar en ticket.json: "estado": "aprobado"
```

### 8.2 Ejecución Aprobada
```bash
# SOLO humano ejecuta en prod (regla de oro)
# 1. Leer propuesta.md - comandos paso a paso
# 2. Ejecutar en entorno cliente (ventana JIT)
# 3. Registrar cada comando en ticket.json -> log[]
# 4. Verificar resultado
# 5. Actualizar ticket: estado="verificado" + evidencia
```

### 8.3 Cierre y Reporte
```bash
# 1. Generar reporte cliente (plantilla docs/04)
# 2. Adjuntar a ticket: reporte.md
# 3. Actualizar ticket: estado="cerrado"
# 4. Si nuevo conocimiento → crear runbook en kb/
# 5. Commit + push (append-only)
git add tickets/<cliente>/<ticket>/*
git commit -m "feat(empresarial): close ticket <slug> - <resumen>"
git push
```

## 9. Convenciones de Tickets

### 9.1 Estructura ticket.json
```json
{
  "id": "TK-2026-09-21-001",
  "cliente": "acme",
  "titulo": "Correo no envía - Exchange Online",
  "categoria": "correo",
  "prioridad": "P2",
  "sla": "4h",
  "estado": "triaged",  // triaged, propuesta_enviada, aprobado, en_ejecucion, verificado, cerrado
  "creado": "2026-09-21T08:00:00Z",
  "actualizado": "2026-09-21T08:15:00Z",
  "triager": {
    "entidades": { "cliente": "acme", "sistema": "Exchange Online", "sintomas": ["550 5.7.1"] },
    "clasificacion": { "categoria": "correo", "prioridad": "P2", "sla": "4h" }
  },
  "solver": {
    "diagnostico": "diagnostico.md",
    "propuesta": "propuesta.md",
    "enviado": "2026-09-21T08:30:00Z"
  },
  "aprobacion": {
    "aprobado_por": "diego.saenz",
    "timestamp": "2026-09-21T09:00:00Z"
  },
  "ejecucion": {
    "ejecutado_por": "diego.saenz",
    "ventana_inicio": "2026-09-21T09:15:00Z",
    "ventana_fin": "2026-09-21T09:45:00Z",
    "log": [
      { "timestamp": "09:16", "comando": "Get-MessageTrackingLog -Sender user@acme.com", "resultado": "550 5.7.1 Relay denied" },
      { "timestamp": "09:20", "comando": "Set-TransportRule -Identity 'Allow Relay' -Enabled $true", "resultado": "Success" }
    ]
  },
  "verificacion": {
    "test": "Send test email to user@acme.com",
    "resultado": "Delivered successfully",
    "timestamp": "2026-09-21T09:50:00Z"
  },
  "cierre": {
    "reporte": "reporte.md",
    "cerrado_por": "diego.saenz",
    "timestamp": "2026-09-21T10:00:00Z",
    "kb_actualizada": false
  }
}
```

### 9.2 Convenciones de Nombrado
```
tickets/
  <cliente>/
    <YYYY-MM-DD>-<slug>.json          # slug = kebab-case del título
    triage.md                         # Generado por triager
    diagnostico.md                    # Generado por solver
    propuesta.md                      # Generado por solver
    reporte.md                        # Generado al cierre
```

## 10. Base de Conocimiento (KB) - Estándares

### 10.1 Runbook Template (kb/<nombre>.md)
```markdown
# Runbook: <Título Descriptivo>

## Síntomas
- <Síntoma observable 1>
- <Síntoma observable 2>

## Causas Conocidas (ordenadas por probabilidad)
| Causa | Probabilidad | Verificación Rápida |
|-------|--------------|---------------------|
| <Causa 1> | Alta | `comando verificación` |
| <Causa 2> | Media | `comando verificación` |

## Pasos de Diagnóstico (Ordenados)
1. `comando 1` → Esperado: <resultado normal> | Si falla: <acción>
2. `comando 2` → Esperado: <resultado normal> | Si falla: <acción>

## Solución
### Opción A (Recomendada - Menor riesgo)
```bash
comando solución
```

### Opción B (Alternativa - Si A falla)
```bash
comando alternativa
```

## Verificación Post-Solución
- `comando test` → Debe retornar: <resultado esperado>

## Riesgos y Mitigación
| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| <Riesgo 1> | Media | Alto | <Acción preventiva> |

## Referencias
- KB relacionada: [[kb/otro-runbook.md]]
- Documentación oficial: <URL>
- ADR relacionado: ADR-<NNN>
```

## 11. Evaluación de Agentes (Continuous Improvement)

```bash
# Eval set: 50 tickets históricos con solución esperada
# Métricas objetivo:
# - Resolución L1 automática: ≥70%
# - 0 falsos positivos (diagnóstico incorrecto)
# - 0 duplicados
# - Costo < $0.10/ticket

# Ejecutar evaluación semanal
pwsh scripts/eval-agents.ps1 --set eval-set-50.json --agent solver --output eval-report.md

# Revisar report y ajustar prompts en .opencode/agents/solver.md
```

## 12. Seguridad y Cumplimiento

### 12.1 Datos Sensibles (NUNCA en git)
```
clientes/
  <cliente>/
    accesos.md          # Credenciales, IPs, puertos → SOLO local + vault en prod
    inventario.md       # IPs internas, topología red
    contactos.md        # Nombres, teléfonos, emails personales
```

### 12.2 Procedimiento Acceso Cliente (docs/03)
1. Cuestionario onboarding firmado
2. Contrato + NDA + DPA firmados
3. Alcance por ticket (escrito)
4. Acceso JIT: VPN/bastion + credenciales temporales
5. Registro sesión: inicio/fin + comandos + evidencias
6. Revocación inmediata post-ventana

### 12.3 Paquete Confianza (docs/05)
- Generar antes de reunión comercial con regulados
- Incluye: políticas, procedimientos, evidencias, seguros, legal checklist
- Entregar como ZIP firmado + checksum

## 13. Métricas y KPIs (Revisión Mensual)

| Métrica | Target | Fuente |
|---------|--------|--------|
| Tickets resueltos L1 auto | ≥70% | Log tickets |
| Primera respuesta | <15 min | Timestamps ticket |
| MTTR normal | <4h | Timestamps ticket |
| MTTR P1 | <24h | Timestamps ticket |
| Escalación a humano | <30% | Estado ticket |
| Costo/ticket (tokens) | <$0.10 | opencode usage |
| Errores en prod | 0 | Post-mortem |
| Preguntas cliente con docs | 100% | Evidencia |

## 14. Troubleshooting Común

| Problema | Solución |
|----------|----------|
| `opencode` no encuentra agente | Verificar `.opencode/agents/<agent>.md` existe y config.json referencia correcta |
| `solver` propone comando destructivo | Revisar prompt en `.opencode/agents/solver.md` - debe tener `bash: deny` |
| Ticket sin triage.md | Ejecutar `opencode run triager` manualmente |
| KB desactualizada | Agregar tarea en ticket cierre: "actualizar KB" |
| Cliente sin carpeta en `clientes/` | Ejecutar onboarding completo antes de primer ticket |

---

*Versión: 1.0.0 | Actualizado: 2026-09-21 | Variante: Empresarial*