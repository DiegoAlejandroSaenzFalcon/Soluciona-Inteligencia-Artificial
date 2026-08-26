# CLAIMS.md – Estado de edición concurrente

## Formato
- Cada línea: `AI_NAME: FILE_PATH (status)`
- `status` puede ser `IN_PROGRESS`, `DONE`, `PENDING_REVIEW`.

## Ejemplo inicial
```
visual‑global: panel-global.html (IN_PROGRESS)
visual‑empresarial: panel-empresarial.html (IN_PROGRESS)
visual‑central: panel-central.html (IN_PROGRESS)
visual‑dashboard: dashboard.html (IN_PROGRESS)
backend‑api: src/**/*.ts (PENDING_REVIEW)
ai‑integration: core/ai/**/*.ts (PENDING_REVIEW)
```

## Actualización
- Cada agente actualiza su propia línea al iniciar y completar cambios.
- El orquestador consolida los cambios antes del merge.
