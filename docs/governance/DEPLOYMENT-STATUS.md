# Deployment Status — Soluciona Inteligencia Artificial
## 2026-09-10

> Registro único del estado de despliegue (objetivo: saber qué commit corre en qué entorno).

| Entorno | Estado | Commit | SaaS | DB | Redis | Notas |
|---------|--------|--------|------|-----|-------|--------|
| **Local** (Windows) | arranque verificado | `68ee6ce` (main) | ✅ `node index.js` en `:3000` (trial, SQLite, WhatsApp OFF) | SQLite (local) | no usado | runtime real = `index.js`; `src/index.ts` no compila |
| **Staging (Oracle)** | NO provisionado | — | ❌ | ❌ | ❌ | pendiente FASE 5-7 |
| **Producción** | NO existe | — | ❌ | ❌ | ❌ | — |

## Identificación de release actual (local)
- `commit_sha`: `68ee6ce` (main)
- `version`: `1.0.0` (package.json)
- `environment`: local/development
- `deployment_timestamp`: 2026-09-10 (smoke)

---

*Actualizar tras cada despliegue (Oracle staging/prod).*