# PLAN MAESTRO: Migración Total a Fastify + TypeScript + PostgreSQL + Drizzle

**Proyecto:** Soluciona Inteligencia Artificial (variante comercial)  
**Repositorio:** `soluciona-inteligencia-artificial-comercial`  
**Branch:** `main`  
**Tag de línea base:** `v0-migration-baseline`  
**Fecha de inicio:** 2026-09-04  
**Estado actual:** FASE 0 completada — FASE 1 en progreso (infraestructura TS base)

---

## 🎯 DECISIONES ARQUITECTÓNICAS INNEGOCIABLES

| Capa | Tecnología definitiva | Eliminar |
|---|---|---|
| Runtime | **Fastify 5 + TypeScript strict** | Servidor HTTP nativo (`transports/web.js`) |
| Data | **PostgreSQL 16 + Drizzle ORM** | SQLite (`db-sqlite.js`), worker PG (`db-pg*.js`), `operationalSchema.js`, `connection.js` |
| WhatsApp | **Cloud API oficial (Meta)** | Baileys (`transports/whatsapp.js`) — **eliminado por completo** |
| Estructura | Clean Architecture completa | Esqueleto TS roto (`src/interfaces/`, `domain/`, etc. se reescribe limpio) |
| Rate limit / CSRF | **In-memory** (sin Redis inicial) | dependencia `redis` |
| Licencia/features | **1 único sistema TS** | Los 3 sistemas duplicados |

> **Nota crítica:** El esqueleto Fastify/TS existente (`src/interfaces/`, `src/domain/`, `src/application/` - que no existe) está **fundamentalmente roto** (imports rotos, dependencias faltantes, código duplicado, no compila). La decisión profesional es **rescribirlo limpio desde cero** usando el runtime funcional como referencia, no intentar "arreglar" el esqueleto roto.

---

## 📦 ESTADO DE PARTIDA (congelado en `v0-migration-baseline`)

### ✅ Lo que funciona y hay que PRESERVAR (migrar, no rehacer)
- `core/orders.js` — parser NLP pedidos, flujo completo
- `core/ai.js`, `core/ai-structured.js` — chatbot IA, pool de claves, fallbacks
- `core/facturacion.js` + `core/adaptadores/*` — DIAN (dian-propio, dian-gratuito, factus, etc.)
- `core/consumo.js`, `core/ia-pool.js` — límites IA por rol
- `core/flows/*` — flujos por segmento (salud, retail, belleza)
- `src/auth/*.js` — JWT, 2FA, refresh, login, register, reset
- `src/accounting/*` — CxC, CxP, facturas, asientos, aging
- `src/inventory/*` — stock, kardex, proveedores, OC
- `src/whatsapp/cloud/*` — Cloud API cliente/transporte
- `src/websockets/index.js` — Socket.IO realtime
- `src/utils/rateLimiter.js` — token bucket
- `transports/login-page.js` — login page (ya securizado)

### ❌ Lo que hay que ELIMINAR (rastros obsoletos)
| Archivo/Directorio | Motivo |
|---|---|
| `transports/web.js` (1300+ líneas) | HTTP nativo reemplazado por Fastify |
| `transports/whatsapp.js` | Baileys no escala en SaaS; riesgo ban |
| `core/db-sqlite.js` | SQLite no escala en producción |
| `core/db-pg.js`, `core/db-pg-worker.js` | Worker reemplazado por pool `pg` + Drizzle |
| `core/db.js` (selector) | Ya no hay selector: solo PostgreSQL |
| `core/db/connection.js` | Traductor `$1→?` obsoleto |
| `core/db/operationalSchema.js` | Desincronizado; Drizzle `schema.ts` es fuente única |
| `core/db/connection.js` | Traductor `$1→?` obsoleto |
| `core/modules/*.js` (3 sistemas) | Unificar en 1 solo sistema TS |
| `src/index.ts` + esqueleto TS roto | Se reescribe limpio |
| `packages/*` alias inexistentes | Limpiar tsconfig |
| `drizzle` schema desincronizado | Unificar en `schema.ts` (drizzle) como fuente única |
| `panel-central.js` con lógica servidor | Mover a rutas Fastify |
| `transports/orders.ts.bak`, `users.ts.bak` | Código roto, se reescribe en Fase 4 |

---

## 🏗️ STACK DEFINITIVO (versiones fijadas)

| Componente | Versión | Justificación |
|---|---|---|
| Node.js | 22 LTS | LTS actual, soporte hasta 2027 |
| TypeScript | 5.5+ | Strict mode, última estable |
| Fastify | 5.x | Última mayor, rendimiento top |
| PostgreSQL | 16 | Estándar de la industria, open source |
| Drizzle ORM | 0.33+ | TypeScript-first, migraciones, open source |
| Zod | 3.23+ | Validación schemas (ya instalado) |
| Socket.IO | 4.7+ | Realtime (ya instalado) |
| pino | 9+ | Logging estructurado (ya instalado) |
| zod-to-json-schema | 3.23+ | OpenAPI (ya instalado) |
| vitest | 2.x | Testing (ya instalado) |
| tsx | 4.x | Dev watch (ya instalado) |

---

## 📋 FASES DE EJECUCIÓN (orden estricto, criterio de aceptación medible)

> **Regla de hierro:** Cada fase se TERMINA y se VERIFICA (`build` + `typecheck` + `test` pasan) antes de la siguiente. Nada de "después/luego/más adelante".

### FASE 0 — Línea base congelada ✅ COMPLETADA
- [x] Commit de seguridad previo (chore: security fixes)
- [x] Tag `v0-migration-baseline` creado
- [x] Documento maestro escrito (`docs/PLAN_MIGRACION_FASTIFY_TS_POSTGRES.md`)

### FASE 1 — Infraestructura TypeScript base (hacer que compile limpio) 🔄 EN PROGRESO
**Objetivo:** Tener un `tsconfig.json` limpio que compile el código TS nuevo sin errores, coexistiendo con el runtime JS existente.

**Entregables:**
- `tsconfig.json` limpio para CommonJS (el proyecto sigue siendo CommonJS por ahora)
- Scripts npm: `dev` (tsx watch), `build` (tsc), `start` (node dist/index.js), `typecheck`, `test`
- Arreglar archivos TS rotos en `src/shared/`, `src/domain/`, `src/index.ts`
- Eliminar `tsconfig.build.json` y aliases `@soluciona/*` a paquetes inexistentes
- Instalar deps faltantes: `@fastify/cookie`, `@fastify/cors`, `@fastify/helmet`, `@fastify/sensible`, `@fastify/static`

**Criterio de aceptación:**
```bash
npm run typecheck  # 0 errores en archivos NUEVOS (excluyendo esqueleto roto)
npm run build      # genera dist/ sin errores
npm run test       # 23/23 pasan
```

**Estado actual:** 🔄 En progreso - arreglando imports en `src/shared/`, `src/domain/`, `src/index.ts`

### FASE 2 — Capa de datos: PostgreSQL + Drizzle (fuente única)
**Entregables:**
- Unificar `src/db/schema.ts` (drizzle) + `src/db/operationalSchema.js` → **un solo `schema.ts` completo** (con `pedidos`, `citas`, `conversaciones`, `lid_map`, `uso_ia`, `clientes`, `password_resets` + las tablas ya definidas).
- Generar migraciones drizzle reales (`drizzle-kit generate`).
- Reemplazar `connection.js`/`db-pg.js`/`db-sqlite.js` por el pool `pg` + `drizzle` (`infrastructure/database/pool.ts`).
- Migración de datos SQLite→PG (adaptar script existente).
- Eliminar `core/db-sqlite.js`, `core/db-pg*.js`, `connection.js`, `operationalSchema.js`, `migrate-sqlite-to-pg.js` (versión vieja).

**Criterio de aceptación:**
```bash
npm run db:generate  # genera migraciones en drizzle/
npm run db:migrate   # crea esquema real en PostgreSQL
npm run test         # tests siguen pasando (adaptados a PG)
```

### FASE 3 — Núcleo de dominio y Use Cases (Clean Architecture)
**Entregables:**
- Crear `src/application/` (no existe hoy) con use cases:
  - `orders/` (create, list, update state, export)
  - `customers/` (CRUD, perfil, historial)
  - `inventory/` (productos, variantes, stock, kardex, OC, recepción)
  - `accounting/` (CxC, CxP, facturas, asientos, aging, conciliación)
  - `invoicing/` (facturación DIAN, adaptadores)
  - `ai/` (chatbot, asistentes, visión, pool, consumo)
  - `appointments/` (citas, pacientes, profesionales, recursos, paquetes)
  - `licensing/` (feature flags, tenants)
- Migrar lógica de `core/` → `src/application/` **sin cambiar comportamiento**
- Completar placeholders: `domain/entities/user.ts` (los 2 métodos placeholder), `infrastructure/repositories/tenant.repository.ts` roto
- Repositorios concretos en `infrastructure/repositories/` implementando interfaces de `domain/repositories/`

**Criterio de aceptación:**
```bash
npm run test:unit     # tests de dominio/use-cases pasan
npm run typecheck     # 0 errores
```

### FASE 4 — Servidor Fastify completo (interfaces/http)
**Entregables:**
- `server.ts` limpio (buildServer, startServer, graceful shutdown)
- Plugins TS correctos:
  - `auth.ts` (JWT verify, refresh, 2FA, login, register, reset)
  - `csrf.ts` (in-memory, sin redis)
  - `rate-limit.ts` (in-memory token bucket, sin redis)
  - `static.ts` (`@fastify/static` para dashboard/paneles)
  - `websocket.ts` (Socket.IO + JWT auth)
- Reconstruir TODAS las rutas en TS, unificando lo duplicado:
  - `/api/auth/*` (login, register, refresh, me, 2FA, forgot, reset, change-password)
  - `/api/tenants/*` (CRUD tenants, solo admin)
  - `/api/users/*` (CRUD users, roles, permissions)
  - `/api/products/*` (catálogo, variantes, stock)
  - `/api/orders/*` (pedidos, estados, export)
  - `/api/customers/*` (clientes, deuda, historial)
  - `/api/inventory/*` (stock, kardex, proveedores, OC, recepción)
  - `/api/accounting/*` (CxC, CxP, facturas, asientos, aging, conciliación)
  - `/api/invoicing/*` (DIAN, adaptadores)
  - `/api/ai/*` (chatbot, asistentes, visión, pool, consumo)
  - `/api/appointments/*` (citas, pacientes, profesionales, recursos, paquetes)
  - `/api/configv2/*` (config versionada, auditoría, secrets)
  - `/api/auth/*` (login, register, refresh, me, 2FA, forgot, reset, change-password)
  - `/api/license/*` (status, activate, validate)
  - `/api/audit` (logs)
- **Criterio:** `npm run build` + servidor Fastify levanta y responde los mismos endpoints del runtime actual en `/api/*`.

### FASE 5 — Canal WhatsApp Cloud API (único)
**Entregables:**
- Migrar `src/whatsapp/cloud/{client,transport}.ts` a TS limpio.
- **Eliminar Baileys completamente** (`transports/whatsapp.js` → borrar).
- Integrar webhook Meta + verificación HMAC.
- **Criterio:** envío/recepción real de mensajes por Cloud API en entorno de prueba.

### FASE 6 — Interfaces Web (dashboard/paneles)
**Entregables:**
- Servir `dashboard.html`, `kds.html`, `panel-*.html` como estáticos vía `@fastify/static`.
- Mover lógica de servidor que está dentro de `panel-central.js` a rutas Fastify (hoy mezcla UI + servidor).
- `panel-empresarial.js`, `panel-config.js`, `panel-inventario.js`, `panel-contabilidad.js`, `panel-whatsapp-lite.js` servidos como estáticos.
- **Criterio:** paneles cargan y funcionan sobre Fastify (no HTTP nativo viejo).

### FASE 7 — Modularidad + multi-tenant + feature flags
**Entregables:**
- **Un SÓLO sistema de licencias** en `src/application/licensing/` + `src/domain/licensing/`
- `tenant_id` en **TODAS** las tablas y filtrado obligatorio.
- Feature flags por tenant: `whatsapp`, `orders`, `inventory`, `accounting`, `invoicing`, `ai`, `appointments`, `crm`
- `hasFeature(tenantId, feature)` conectado a:
  - Endpoints: 403 si feature desactivado
  - UI: tabs/botones ocultos
- Panel de administración para activar/desactivar módulos por tenant.

**Criterio:** activar/desactivar un módulo por tenant produce efecto inmediato en API y UI.

### FASE 8 — Seguridad (aplicar auditoría previa)
**Entregables:**
- Helmet + CORS + CSP nonce
- CSRF in-memory en endpoints mutantes (excepto login/refresh/verify-2fa)
- Rate limit in-memory por IP/endpoint
- Sanitización `api_key` en `configv2/ia` (ya en `v2.js`, migrar a TS)
- Endpoints legacy protegidos (`/api/configuracion`, `/api/ia-pool`) con auth
- No localStorage con credenciales (ya arreglado en login-page.js)
- Reset token no expuesto en respuesta HTTP

**Criterio:** checklist de seguridad validado (ver auditoría previa en `INFORME_AUDITORIA_SOLICUSAIA.md`)

### FASE 9 — Despliegue Oracle Free Tier + CI/CD
**Entregables:**
- `Dockerfile` multi-stage (build TS → dist → runtime Alpine)
- `docker-compose.prod.yml` (app + PostgreSQL 16 + Nginx)
- GitHub Actions workflow:
  - `typecheck` + `test` + `build` + `npm audit` + `drizzle-kit check`
  - Build imagen Docker + push a GHCR
- Despliegue Oracle Free Tier (Ampere A1) + Nginx reverse proxy + HTTPS (certificados gratuitos OCI)
- Cuenta **Pay As You Go** (evita reclamación por inactividad)
- Keep-alive cron (anti-reclamo 7 días)
- **Criterio:** app viva en la nube accesible por HTTPS.

### FASE 10 — Purga final y verificación
**Entregables:**
- Borrar archivos obsoletos (lista completa arriba)
- `grep -r` verificación: cero referencias a `node:sqlite`, `redis`, `Baileys/baileys`, `require('http').createServer`, `transports/web`, `transports/whatsapp`, `core/db-sqlite`, `core/db-pg`, `connection.js`, `operationalSchema.js`, `core/modules/`, `packages/` huérfanos
- `tsconfig.json` limpio (solo `@/*` alias reales)
- README actualizado con arquitectura real (no aspiracional)
- `package.json` scripts finales (`dev`, `build`, `start`, `typecheck`, `test`, `db:generate`, `db:migrate`, `db:seed`, `docker:build`, `docker:up`)

**Criterio final:**
```bash
npm run typecheck  # 0 errores
npm run build      # dist/ generado
npm run test       # todo verde
npm run start      # app arranca y sirve todo
```

---

## 🛡️ REGLAS DE EJECUCIÓN (no negociables)

1. **Una fase a la vez.** No iniciar Fase N+1 hasta que Fase N cumpla TODOS sus criterios.
2. **Commit atómico por tarea.** Cada cambio lógico = 1 commit con mensaje convencional.
3. **TypeScript strict siempre.** `noUnusedLocals`, `noUnusedParameters`, `exactOptionalPropertyTypes`.
4. **Tests en cada fase.** `npm run test` debe pasar antes de commit de fase.
5. **Documentación viva.** Cada fase actualiza `docs/PLAN_MIGRACION_*.md` con lo hecho, lo que queda, y decisiones tomadas.
6. **Ningún archivo `.js` nuevo en `src/`.** Todo nuevo código = `.ts`. Solo `.js` permitidos: configs, scripts de migración, `drizzle.config.ts` (ya es TS).
7. **Sin dependencias huérfanas.** Si se usa, está en `package.json`. Si no se usa, `npm uninstall`.

---

## 🔄 COMANDOS DE REFERENCIA RÁPIDA

```bash
# Desarrollo
npm run dev          # tsx watch src/index.ts
npm run build        # tsc
npm run start        # node dist/index.js
npm run typecheck    # tsc --noEmit
npm run test         # vitest run
npm run test:unit    # vitest run tests/unit

# Base de datos
npm run db:generate  # drizzle-kit generate
npm run db:migrate   # drizzle-kit migrate
npm run db:seed      # tsx src/db/seed.ts
npm run db:studio    # drizzle-kit studio

# Docker
docker compose -f docker-compose.yml up -d
docker compose -f docker-compose.prod.yml up -d
```

---

## 📝 REGISTRO DE CAMBIOS (Changelog del plan)

| Fecha | Fase | Cambio |
|---|---|---|
| 2026-09-04 | 0 | Baseline congelado (`v0-migration-baseline`), fixes de seguridad commitados |
| 2026-09-05 | 1 | Iniciada Fase 1: tsconfig.json limpio para CommonJS, archivos TS rotos en reparación |
| *próximo* | 1 | Completar Fase 1: compilar núcleo TS limpio |

---

## 🔄 CÓMO RETOMAR ESTE PLAN EN CUALQUIER MOMENTO

```bash
git checkout main
git pull origin main
# Ver estado actual
git log --oneline -5
# Ver en qué fase estamos
cat docs/PLAN_MIGRACION_FASTIFY_TS_POSTGRES.md | grep -A 3 "### FASE"
# Continuar donde quedó
```

---

## 🔄 ESTADO ACTUAL: FASE 1 EN PROGRESO

### ✅ Completado en Fase 1:
- [x] `tsconfig.json` limpio para CommonJS (module: CommonJS, moduleResolution: node, sin verbatimModuleSyntax)
- [x] Scripts npm agregados: `build`, `typecheck`, `db:generate`, `db:migrate`, `db:seed`, `db:studio`
- [x] Deps instaladas: `@fastify/cookie`, `@fastify/cors`, `@fastify/helmet`, `@fastify/sensible`, `@fastify/static`
- [x] Archivos TS rotos en `src/shared/utils/logger.ts` y `src/shared/utils/index.ts` arreglados
- [x] `src/index.ts` imports arreglados (rutas relativas, config properties)

### 🔄 En progreso (próximos pasos inmediatos):
1. Arreglar imports en `src/shared/config/index.ts` (ProcessEnv type, index signatures)
2. Arreglar `src/shared/utils/logger.ts` (imports type-only, Level unused)
3. Arreglar `src/shared/utils/index.ts` (imports type-only para Result/Ok/Err)
4. Arreglar `src/shared/kernel/result.ts` y `events.ts` (export modifiers)
5. Arreglar `src/domain/entities/*.ts` (imports con extensiones, props types)
6. Arreglar `src/domain/repositories/index.ts` (imports con extensiones)
7. Arreglar `src/index.ts` (imports con extensiones .js para módulos JS existentes)
8. Verificar `npm run typecheck` → 0 errores en archivos NUEVOS
8. `npm run build` + `npm run test` → todo verde

---

## 🔄 PRÓXIMO PASO INMEDIATO

Continuar arreglando los archivos TS rotos en orden de dependencia:
1. `src/shared/config/index.ts` → `src/shared/utils/logger.ts` → `src/shared/utils/index.ts` → `src/shared/kernel/*` → `src/domain/entities/*` → `src/domain/repositories/index.ts` → `src/index.ts` → `src/infrastructure/database/pool.ts` → `src/infrastructure/repositories/tenant.repository.ts`

Cada archivo se arregla, se hace `npm run typecheck`, se confirma que reduce errores, se hace commit.

**¿Continuar con la corrección sistemática de los archivos TS rotos?**