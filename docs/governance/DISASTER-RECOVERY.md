# Plan de Continuidad y Recuperación ante Desastres (DR)
## Soluciona Inteligencia Artificial — Versión 1.0 — 2026-09-10

---

## 1. Objetivo

Garantizar que **cualquier IA (actual o futura) pueda restaurar el estado completo del proyecto** en < 4 horas (RTO) con pérdida de datos < 1 hora (RPO), **independientemente de la IA que continúe el desarrollo**, ante:
- Pérdida total del entorno local (portátil, disco, OS)
- Pérdida del entorno Oracle Cloud (VM, discos, red)
- Corrupción de repositorio Git (local o remoto)
- Fallo de proveedor IA (OpenCode, DeepSeek, ChatGPT, etc.)
- Error humano catastrófico (force-push, borrado, secretos expuestos)

---

## 2. Fuentes de Verdad (Inmutables)

| Activo | Ubicación Primaria | Réplicas | Frecuencia Sync |
|--------|-------------------|----------|-----------------|
| **Código + Historia Git** | GitHub `DiegoAlejandroSaenzFalcon/Soluciona-Inteligencia-Artificial` (rama `main`) | Local clones (portátil, Oracle `/opt/soluciona/repo/`) | Push en cada merge a `main` |
| **Documentación Gobernanza** | `docs/governance/` en repo GitHub | MkDocs deploy (GitHub Pages) | Cada commit a `main` |
| **Secrets / Credenciales** | **NO en Git**. 1Password / Bitwarden (Owner) + Oracle `env/` montado (runtime) | Backup offline Owner (USB cifrado) | Rotación programada |
| **Infra as Code** | `infra/` en repo GitHub | Oracle `/opt/soluciona/scripts/` | Cada deploy |
| **DB Schema + Migraciones** | `src/db/schema.ts` + `drizzle/` migrations en repo | PostgreSQL `pg_dump` (diario) | Diario (cron Oracle) |
| **Datos Producción (PG)** | PostgreSQL en Oracle (`/opt/soluciona/data/postgres`) | `pg_dump` comprimido → `/opt/soluciona/backups/` + S3-compat (opcional) | Diario 02:00 UTC + antes de cada deploy |
| **Datos Redis** | Redis en Oracle (`/opt/soluciona/data/redis`) | `redis-cli BGSAVE` → `/opt/soluciona/backups/` | Cada 6h + antes de deploy |
| **Estado Agentic (LangGraph)** | PostgreSQL (tablas `agentic_*`) + Redis (checkpoints) | Mismo backup PG/Redis | Mismo schedule |
| **Model Registry / Weights** | `solucionatia/config/models.yaml` en repo | Oracle `/opt/soluciona/env/models/` | Cada release agentic |

---

## 3. Escenarios de Recuperación

### 3.1 Escenario A — Pérdida Total Local (Portátil)
**Impacto**: Pérdida de clones locales, config SSH, `~/.config/opencode`, sesión OpenCode.
**RTO Objetivo**: < 30 min
**Pasos**:
1. Nuevo equipo Windows 11 → `winget install Git.Git GitHub.cli OpenCode.OpenCode`
2. `gh auth login --web` (device flow) → autenticar en GitHub
3. `git clone https://github.com/DiegoAlejandroSaenzFalcon/Soluciona-Inteligencia-Artificial.git`
4. `gh auth setup-git`
5. `cd Soluciona-Inteligencia-Artificial && cat docs/governance/CURRENT-STATE-v1.0.md` → leer estado actual
6. `cd soluciona-inteligencia-artificial-comercial && npm ci`
7. Continuar desde última tarea documentada en `CURRENT-STATE` y `ai-coordination/CURRENT_STATUS.md`

**Nota**: Sesión OpenCode anterior se pierde (estado conversacional no persistido en Git). **Mitigación**: Commits frecuentes + `ai-coordination/HANDOFF.md` actualizado por cada agente.

---

### 3.2 Escenario B — Pérdida / Corrupción Oracle Cloud VM
**Impacto**: Pérdida de Docker, PostgreSQL, Redis, SaaS, LangGraph, logs, `/opt/soluciona/`.
**RTO Objetivo**: < 4 horas
**RPO Objetivo**: < 1 hora (último backup PG/Redis)

**Pasos**:
1. **Provisionar VM nueva** (Terraform/script `infra/oracle/bootstrap-vm.sh`):
   ```bash
   # Shape: VM.Standard.A1.Flex, 2 OCPU, 12 GB, Ubuntu 24.04 ARM64
   # Security List: 22/80/443 only
   # SSH key: Owner's public key
   ```
2. **Bootstrap automatizado** (`infra/oracle/bootstrap.sh`):
   - Usuario `soluciona` + sudo NOPASSWD para docker
   - Docker Engine + Compose plugin
   - `/opt/soluciona/{repo,env,data,backups,logs,scripts}` (permisos 750 soluciona:soluciona)
   - UFW: allow 22, 80, 443; deny all else
   - Fail2ban + unattended-upgrades
3. **Restaurar código**:
   ```bash
   cd /opt/soluciona/repo
   git clone https://github.com/DiegoAlejandroSaenzFalcon/Soluciona-Inteligencia-Artificial.git .
   ```
4. **Restaurar secrets** (`env/`):
   - Montar desde backup Owner (1Password/USB) → `/opt/soluciona/env/.env.production`
   - Verificar: `source /opt/soluciona/env/.env.production && echo $DB_PASS`
4. **Restaurar PostgreSQL**:
   ```bash
   # Identificar último backup válido en /opt/soluciona/backups/pg_YYYYMMDD_HHMM.sql.gz
   gunzip -c pg_latest.sql.gz | docker exec -i soluciona-postgres psql -U postgres -d soluciona
   # Verificar: docker exec soluciona-postgres psql -c "SELECT count(*) FROM tenants;"
   ```
5. **Restaurar Redis**:
   ```bash
   # Copiar dump.rdb a /opt/soluciona/data/redis/
   docker cp /opt/soluciona/backups/redis_latest.rdb soluciona-redis:/data/dump.rdb
   docker restart soluciona-redis
   ```
6. **Levantar stack** (orden obligatorio en `PROCESO-DESARROLLO-PRODUCCION.md` §7.2):
   ```bash
   cd /opt/soluciona/repo/soluciona-inteligencia-artificial-comercial
   docker compose -f docker-compose.prod.yml up -d
   # Verificar healthchecks secuenciales
   ```
7. **Verificación E2E**:
   - `curl -f https://dominio/health` → 200
   - `curl -f https://dominio/ready` → 200
   - Test flujo WhatsApp → SaaS → Agentic READ ONLY
   - `ai-coordination/PING_ORCHESTRATOR` end-to-end

---

### 3.3 Escenario C — Corrupción Repositorio Git (Remoto o Local)
**Sub-escenarios**:
- **C1**: `main` corrompido por force-push / merge malo → `git push --force-with-lease` desde clone limpio (Owner tiene clone verificado)
- **C2**: Secrets expuestos en historia → **BFG Repo-Cleaner** + `git filter-repo` + rotación **inmediata** de TODOS los secrets expuestos + `gh api` para purgar caches GitHub
- **C3**: Repo GitHub eliminado → Recrear repo + `git push --mirror` desde clone local verificado + restaurar Issues/PRs manualmente (export JSON via API)

**Regla de Oro**: **NUNCA** reescribir historia en `main` sin approval explícito Owner + backup previo verificado.

---

### 3.4 Escenario D — Fallo Proveedor IA (OpenCode / DeepSeek / ChatGPT)
**Impacto**: Imposibilidad de usar el modelo/ herramienta habitual.
**Mitigación**:
- **Multi-provider por diseño**: `ModelRegistry` soporta NVIDIA NIM (DeepSeek, Nemotron, Kimi, Mistral, etc.), Ollama local, OpenAI-compatible
- **Fallback automático**: `ModelRouter` con `FallbackPolicy` + circuit breaker
- **Continuidad**: El **estado del proyecto vive en Git + Docs**, no en la sesión de la IA. Cualquier IA nueva lee `PLAN-DIRECTOR`, `CURRENT-STATE`, `CURRENT_STATUS.md` y continúa.
- **Handoff estándar**: `ai-coordination/HANDOFF.md` + `CURRENT_STATUS.md` actualizados en cada checkpoint.

---

### 3.5 Escenario E — Error Humano Catastrófico (Borrado masivo, secretos, etc.)
**Respuesta**:
1. **Detener** cualquier proceso automatizado (CI/CD, cron backups)
2. **Evaluar** alcance: `git status`, `git log --oneline -20`, revisar secrets expuestos
3. **Restaurar** desde fuente de verdad más cercana:
   - Código: `git reset --hard origin/main` (o commit bueno conocido)
   - DB: Último `pg_dump` válido
   - Secrets: Rotar **todos** los comprometidos inmediatamente
4. **Post-mortem** obligatorio: ADR documentando causa, impacto, acción correctiva, prevención
5. **Actualizar** `CURRENT-STATE` y `DISASTER-RECOVERY` con lecciones aprendidas

---

## 4. Checklists de Verificación (Runbooks)

### 4.1 Daily (Automatizado via Cron Oracle)
- [ ] `pg_dump` completado sin errores → `/opt/soluciona/backups/pg_$(date +%Y%m%d_%H%M).sql.gz`
- [ ] `redis-cli BGSAVE` completado → `/opt/soluciona/backups/redis_$(date +%Y%m%d_%H%M).rdb`
- [ ] Verificar integridad: `gunzip -t pg_latest.sql.gz` && `redis-check-rdb /data/dump.rdb`
- [ ] Healthchecks SaaS + Agentic → logs en `/opt/soluciona/logs/healthcheck_$(date +%Y%m%d).log`
- [ ] Espacio disco: `df -h /opt/soluciona` > 20% libre
- [ ] Alertar (email/Telegram) si cualquier check falla

### 4.2 Semanal (Manual Owner)
- [ ] Test restore PG en staging (isolated): `docker run postgres:16-alpine` + restore dump → `SELECT count(*) FROM tenants;`
- [ ] Test restore Redis en staging
- [ ] Verificar `gh api /repos/DiegoAlejandroSaenzFalcon/Soluciona-Inteligencia-Artificial` accesible
- [ ] Rotar secrets programados (JWT, DB passwords, API keys) → actualizar `env/` y GitHub Secrets
- [ ] Revisar `CURRENT-STATE` vs realidad: commits recientes, issues abiertos, deuda técnica

### 4.3 Mensual (Simulacro Completo)
- [ ] **Simulacro Escenario B** en cuenta Oracle separada (Free Tier) o local Docker:
  - Provisionar VM limpia via script `infra/oracle/bootstrap-vm.sh`
  - Ejecutar restore completo desde backups reales
  - Verificar E2E: SaaS + Agentic + WhatsApp Cloud API
  - Medir RTO real vs objetivo < 4h
  - Documentar hallazgos en `docs/governance/DR-DRILL-YYYY-MM-DD.md`

---

## 5. Arquitectura de Resiliencia (Diseño)

| Capa | Estrategia |
|------|------------|
| **Código** | Git distribuido: GitHub (remoto) + clones locales + Oracle. `main` protegido (rulesets pendientes). |
| **Config** | `.env.example` en repo. `.env` real **solo** en `env/` Oracle + vault Owner. Nunca en imagen Docker. |
| **DB** | PostgreSQL con WAL archiving (opcional), `pg_dump` diario + PITR si se habilita `wal-g`/`pgBackRest`. |
| **Redis** | AOF everysec + RDB cada 6h. Réplica read-only opcional para HA futuro. |
| **SaaS** | Stateless containers (Docker). Estado en PG/Redis. Blue/Green deploy via Docker Compose. |
| **Agentic** | LangGraph checkpoints en PostgreSQL (`checkpoints` tabla). Model Registry en PG + config YAML en repo. |
| **Red** | Oracle Security Lists + NSGs + UFW host. Solo 22/80/443 expuestos. Interno: Docker network aislado. |
| **Observabilidad** | Healthchecks HTTP (`/health`, `/ready`), logs JSON → Loki (futuro), métricas Prometheus (futuro). |

---

## 6. Contactos y Escalación

| Rol | Contacto | Responsabilidad DR |
|-----|----------|-------------------|
| **Owner / PO** | Diego Alejandro Saenz Falcon | Decisión final, autorización rotación secrets, validación post-restore |
| **Architect / Auditor** | ChatGPT (GPT-5.6 Luna) | Validación arquitectura restore, revisión ADR post-mortem |
| **Executor / DevOps** | OpenCode (backend en Oracle) | Ejecución runbooks, scripts bootstrap, verificación healthchecks |
| **Agentic Lead** | SolucionaTIA / LangGraph | Restore estado agentic, checkpoints, model registry |

---

## 7. Métricas y SLA Internos

| Métrica | Objetivo | Medición |
|---------|----------|----------|
| **RTO** (Recovery Time Objective) | < 4 horas | Timestamp inicio incidente → SaaS + Agentic healthy |
| **RPO** (Recovery Point Objective) | < 1 hora | Timestamp último backup PG/Redis válido → incidente |
| **MTTR** (Mean Time To Restore) | < 2 horas (promedio drills) | Promedio últimos 3 simulacros |
| **Backup Success Rate** | 100% | Cron logs diarios |
| **Secret Rotation Compliance** | 100% programado | Auditoría mensual Owner |
| **DR Drill Frequency** | Mensual | Calendar invite Owner + Architect |

---

## 8. Actualización de Este Plan

- **Trigger**: Cada incidente real, cada simulacro, cada cambio arquitectónico mayor (nuevo servicio, migración DB, nuevo proveedor IA)
- **Proceso**: Editar → PR → Review `architect` + `devops` + `security` → Merge → Owner aprueba versión
- **Versionado**: Semántico en filename (`DISASTER-RECOVERY-v1.1.md`) + tag Git `dr-v1.1`

---

## 9. Referencias Cruzadas

- `docs/governance/PLAN-DIRECTOR-SOLUCIONA-IA-v1.0.md` (§15.1 Oracle, §15.2 Coste, §15.6 Misiones)
- `docs/governance/CURRENT-STATE-v1.0.md` (estado verificado para restore)
- `docs/governance/PROCESO-DESARROLLO-PRODUCCION.md` (gates de deploy)
- `infra/oracle/bootstrap.sh` (script automatizado VM)
- `infra/oracle/bootstrap-vm.sh` (provisioning VM via OCI CLI/Terraform)
- `ai-coordination/HANDOFF.md` + `CURRENT_STATUS.md` (estado agentic para restore)
- `soluciona-inteligencia-artificial-comercial/docker-compose.prod.yml` (stack producción)

---

## 10. Anexos

### A. Scripts Críticos (Ubicación en `infra/oracle/`)
- `bootstrap-vm.sh` — Provisiona VM Oracle (OCI CLI), adjunta VCN, Security Lists, SSH key
- `bootstrap.sh` — Configura usuario, Docker, dirs `/opt/soluciona/`, UFW, fail2ban
- `restore-pg.sh <backup-file>` — Restaura PostgreSQL desde dump
- `restore-redis.sh <dump-file>` — Restaura Redis desde RDB
- `healthcheck-all.sh` — Verifica SaaS, PG, Redis, Agentic, WhatsApp, Nginx
- `rotate-secrets.sh` — Rota JWT, DB passwords, API keys; actualiza `env/` y GitHub Secrets

### B. Comandos de Emergencia (Cheat Sheet)
```bash
# Estado rápido
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
free -h && df -h /opt/soluciona
docker logs soluciona-saas --tail 50
docker logs soluciona-agentic --tail 50

# Backup manual inmediato
docker exec soluciona-postgres pg_dump -U postgres soluciona | gzip > /opt/soluciona/backups/pg_manual_$(date +%Y%m%d_%H%M).sql.gz
docker exec soluciona-redis redis-cli BGSAVE && sleep 2 && docker cp soluciona-redis:/data/dump.rdb /opt/soluciona/backups/redis_manual_$(date +%Y%m%d_%H%M).rdb

# Restore rápido PG (último backup)
LATEST=$(ls -t /opt/soluciona/backups/pg_*.sql.gz | head -1)
gunzip -c "$LATEST" | docker exec -i soluciona-postgres psql -U postgres -d soluciona
```

---

**FIN DEL DOCUMENTO** — Este plan es **vivo**. Debe ejercitarse (drill) mensualmente. La próxima revisión programada: **2026-10-10**.