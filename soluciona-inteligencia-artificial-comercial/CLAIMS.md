# CLAIMS.md – Estado de edición concurrente

## Formato
- Cada línea: `AI_NAME: FILE_PATH (status)`
- `status` puede ser `IN_PROGRESS`, `DONE`, `PENDING_REVIEW`.

## Actualización
- Cada agente actualiza su propia línea al iniciar y completar cambios.
- El orquestador consolida los cambios antes del merge.

## Trabajo completado (DIAN Software Propio)
backend-api: core/adaptadores/dian-propio.js (DONE)
backend-api: core/integracion.js (DONE)
backend-api: config.js (DONE)
backend-api: transports/web.js (DONE)
backend-api: dian-middleware/src/security/signature.js (DONE)
backend-api: dian-middleware/src/soap/dian-client.js (DONE)
backend-api: dian-middleware/src/queue/dian-queue.js (DONE)
backend-api: dian-middleware/src/index.js (DONE)
backend-api: dian-middleware/src/config/dian.config.js (DONE)
backend-api: dian-middleware/scripts/gen-test-cert.js (DONE)
backend-api: dian-middleware/scripts/test-sign.js (DONE)
backend-api: dian-middleware/scripts/debug-tamper.js (DONE)
backend-api: dian-middleware/GUIA_DIAN_TU_PARTE.md (DONE)
backend-api: dian-middleware/package.json (DONE)
visual-dashboard: dashboard.html (DONE)

## Trabajo previo (Auth/RBAC/Login)
backend-api: src/auth/index.js (DONE)
backend-api: src/auth/routes.js (DONE)
backend-api: core/db-sqlite.js (DONE)
visual-empresarial: panel-empresarial.js (DONE)
visual-empresarial: panel-empresarial.html (DONE)
backend-api: transports/login-page.js (DONE)
backend-api: tests/unit/*.test.js (DONE)
