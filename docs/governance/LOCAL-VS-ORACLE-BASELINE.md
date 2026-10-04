# LOCAL vs ORACLE — Baseline de Entorno y Mapa de Migración
## FASE 0 — Snapshot verificado 2026-09-10

> Solo lectura. No se alteró el entorno. Los estados usan las clasificaciones canónicas.

---

## 1. Detección de Entorno Local (Windows nativo)

| Herramienta | Estado | Ruta / Versión | Nota |
|-------------|--------|----------------|------|
| OS | FOUND | Windows 11 Pro, build **26200** (25H2), 64-bit | `Get-CimInstance Win32_OperatingSystem` |
| PowerShell | FOUND | **5.1** (build 26100.9444) | `$PSVersionTable` |
| Git | FOUND | `C:\Program Files\Git\cmd\git.exe` **2.55.0.3** | instalado vía winget (esta sesión) |
| GitHub CLI | FOUND | `C:\Program Files\GitHub CLI\gh.exe` **2.100.0** | instalado vía winget (esta sesión), autenticado |
| SSH (OpenSSH) | FOUND | `C:\Windows\System32\OpenSSH\ssh.exe` | nativo Windows |
| winget | FOUND | **1.29.290** | nativo |
| **Node.js** | **NO ENCONTRADO** | — | **BLOQUEADO** — runtime del SaaS (requiere >=22) |
| **npm** | **NO ENCONTRADO** | — | depende de Node.js |
| pnpm | NO ENCONTRADO | — | — |
| **Docker** | **NO ENCONTRADO** | — | Docker Desktop no instalado |
| Docker Compose | NO ENCONTRADO | — | depende de Docker |
| OCI CLI | NO ENCONTRADO | — | necesario para FASE 5/6 (provisionamiento) |
| Terraform | NO ENCONTRADO | — | no requerido para el piloto (Compose basta) |
| Python | NO ENCONTRADO (alias Store) | `...\WindowsApps\python.exe` (stub) | Python real NO instalado |

---

## 2. Conclusión de Entorno (crítica)

> **El SaaS NO puede ejecutarse localmente hoy**. Node.js (>=22) y Docker NO están instalados. Solo Git + GitHub CLI están presentes (instalados este mismo 2026-09-10). El sistema operativo muestra `InstallDate` 2026-09-10 → **el equipo fue reinstalado hoy**, consistente con la pérdida de entorno de desarrollo previo (y con el forense de SolucionaTIA: trabajo local no versionado perdido por reinstalación).

**Prerrequisito inmediato (FASE 1/2)**: instalar Node.js LTS >= 22 vía `winget install OpenJS.NodeJS.LTS`. Docker Desktop es opcional en esta primera fase (la validación local puede hacerse con Node nativo; Docker se requiere para Oracle/staging). Clasificación: `BLOQUEADO — dependencia no disponible`.

---

## 3. Snapshot de Filesystem

| Ítem | Estado | Evidencia |
|------|--------|-----------|
| `node_modules/` (comercial) | **AUSENTE** | `Test-Path` = False |
| `.env` real | **AUSENTE** (solo `.env.example`) | búsqueda `*.env*` → solo `.env.example` |
| Secretos en repo | No detectados (solo plantillas) | `.env.example`, `config.example.json` |
| `package-lock.json` | Presente (comercial) | root comercial |
| `dian-middleware/package-lock.json` | Presente (paquete anidado DIAN) | `dian-middleware/` |
| `config.*` | `config.js`, `config.example.json`, `config.production.js`, `config.d.ts`, `drizzle.config.ts` | raíz comercial |
| Variantes | comercial (código), empresarial (scaffold helpdesk), residencial (solo README) | raíz |

---

## 4. Inventario Funcional — Módulo Comercial (verificado en código)

| Dominio | Evidencia (archivos) | Clasificación |
|---------|----------------------|---------------|
| **Plataforma** | `index.js` (legacy) + `src/index.ts` (Clean Arch) | dual runtime NO reconciliado |
| **Backend** | `core/*.js` (20 módulos), `src/interfaces/http/`, `transports/web.js` | IMPLEMENTADO (no probado E2E hoy) |
| **Órdenes** | `core/orders.js`, `core/state-machine.js` | IMPLEMENTADO |
| **Conversación/WhatsApp** | `core/conversacion.js`, Baileys (`@whiskeysockets/baileys`) + Cloud API (`src/whatsapp/cloud/transport.js`) | PARCIAL (migración Baileys→Cloud) |
| **Menú** | `core/menu-img.js` | IMPLEMENTADO |
| **IA** | `core/ai.js`, `core/ia-pool.js`, `core/ai-structured.js`, `core/vision.js`, `core/asistentes.js`, `core/consumo.js` | IMPLEMENTADO (pool legacy, no router) |
| **Billing/DIAN** | `core/facturacion.js`, `core/integracion.js`, `dian-middleware/` (firma, SOAP, UBL, BullMQ) | IMPLEMENTADO_Y_VERIFICADO (commit `07f10e1`) |
| **Datos** | `core/db.js`, `core/db-sqlite.js`, `core/db-pg.js`, `core/db-pg-worker.js`, `src/db/{schema,init,seed}.ts` + Drizzle + `migrate-sqlite-to-pg.js` | PARCIAL (4 capas DB sin reconciliar) |
| **Geo** | `core/geo.js` | IMPLEMENTADO |
| **Notificaciones** | `core/notify.js` | IMPLEMENTADO |
| **Colas** | `dian-middleware/src/queue/dian-queue.js` (BullMQ + ioredis) | IMPLEMENTADO (Redis requerido) |
| **Central/Host** | `core/central.js`, `panel-central.*` | IMPLEMENTADO |
| **Paneles** | `dashboard.html`, `panel-global.*`, `panel-empresarial.*`, `panel-inventario.js`, `panel-whatsapp-lite.js`, `panel-contabilidad.js`, `panel-config.js` | IMPLEMENTADO (UI) |
| **Auth/RBAC** | `src/auth/`, `reset-admin.js`, JWT, seed RBAC | IMPLEMENTADO |
| **Multi-tenant** | `tenant_id` en `src/db/schema.ts` | DOCUMENTADO_PERO_NO_VERIFICADO E2E |

---

## 5. Mapa Local → Cloud (matriz de migración)

| Componente | Local (hoy) | Oracle (objetivo) | Acción |
|------------|-------------|-------------------|--------|
| Node.js | ❌ no instalado (>=22 requerido) | pendiente (imagen `node:22` del Dockerfile) | **instalar winget** / build en CI |
| PostgreSQL | ❌ solo código (`src/db/schema.ts`) | pendiente (container `postgres:16`) | **decidir + desplegar** |
| Redis/BullMQ | ❌ solo código (`dian-queue.js`) | pendiente (container `redis:7`) | **desplegar** |
| Docker | ❌ no instalado | pendiente (Docker Engine en VM) | **instalar en VM** |
| SaaS | ✅ código presente, ❌ no ejecutable hoy | pendiente (deploy Fastify) | **desplegar** |
| WhatsApp | ✅ código (Baileys+Cloud), ❌ no probado E2E | pendiente (Cloud API) | **validar** |
| DIAN | ✅ código completo, ❌ no probado E2E | pendiente | **validar** |
| IA | ✅ código legacy pool, ❌ no probado | pendiente | **validar** |
| Panel | ✅ código UI | pendiente (servir tras HTTPS) | **publicar** |

---

## 6. Prerrequisitos ordenados (FASE 1-2)

1. Instalar **Node.js LTS >= 22** (`winget install OpenJS.NodeJS.LTS`).
2. `npm ci` en `soluciona-inteligencia-artificial-comercial/`.
3. Ejecutar `npm run test:unit` (verificar suite real) y `npm run typecheck` / `npm run build`.
4. Determinar si `node index.js` arranca con SQLite (sin PG/Redis) → mínimo smoke reproducido localmente.
5. Opcional: Docker Desktop para validar `Dockerfile.prod`/Compose antes de Oracle.

---

## 7. Estado de trazabilidad (LOCAL vs GIT vs ORACLE)

| Capa | Estado actual | Nota |
|------|---------------|------|
| LOCAL | entorno de desarrollo perdido (reinstalación 2026-09-10); solo Git+GH CLI | referencia por reconstruir |
| GIT | `main`=`68ee6ce`; PR #4 DRAFT contaminado; sin tags | fuente versionada (única fuente fiable) |
| ORACLE | no provisionado | pendiente |

---

## 8. FASE 1 — Resultados de ejecución local (2026-09-10)

| Paso | Comando | Resultado | Evidencia |
|------|---------|-----------|-----------|
| Node.js | `winget install OpenJS.NodeJS.LTS` | ✅ instalado **v24.19.0** (>=22) | `node --version` |
| npm | — | ✅ **11.17.0** | `npm.cmd --version` (usar `npm.cmd`; `npm.ps1` bloqueado por ExecutionPolicy Restricted) |
| Install | `npm ci` | ✅ 621 paquetes | 40 s |
| Auditoría deps | (npm ci output) | ⚠️ **15 vulns: 6 moderate, 5 high, 4 critical** | npm audit |
| Typecheck | `npm run typecheck` | ❌ **~180 errores TS** | `tsc --noEmit` falla |
| Build | `npm run build` | ❌ (mismo `tsc`) | no ejecutado — idéntico a typecheck |
| Unit tests | `npm run test:unit` | ❌ **4 suites fallan en parse** | Rollup/Vite `Expected ',', got 'ident'` |
| Smoke runtime | `node index.js` (DISABLE_WHATSAPP=1) | ✅ **arranca en :3000** (SQLite) | "Panel: http://localhost:3000" |

### 8.1 Conclusiones de ejecución

- **Runtime REAL y funcional**: `node index.js` (legacy CommonJS). Arranca con SQLite, genera admin demo, sirve panel/fuentes en `:3000`. Classificación: **IMPLEMENTADO_Y_VERIFICADO** (arranque local).
- **Runtime OBJETIVO roto**: `src/index.ts` (Clean Architecture TS). `tsc --noEmit` produce ~180 errores (módulos inexistentes `TS2307`, redeclaraciones `TS2451`, imports no usados `TS6133`, tipos Fastify sin declarar `TS2339`). Classificación: **PARCIALMENTE_IMPLEMENTADO** (no compila).
- **Tests rotos**: 4 suites (`auth`, `dian-cufe`, `accounting-validation`, `inventory-validation`) mezclan `import` ESM con `require` CJS → fallo de parseo de Rollup/Vite. Classificación: **PRESENTE_PERO_NO_PROBADO_E2E** (archivos existen pero no ejecutan).
- **tsconfig.json**: clave duplicada `forceConsistentCasingInFileNames` (líneas 16 y 25).
- **Scripts package.json reales**: `start, dev, build, typecheck, test, test:unit, reset-admin, db:generate, db:migrate, db:seed, db:studio, db:migrate-data, db:verify-pg`. **No existen** `lint` ni `test:integration` (aunque CI los invoca).

---

*Documento vivo — actualizar tras FASE 1 y cada despliegue.*