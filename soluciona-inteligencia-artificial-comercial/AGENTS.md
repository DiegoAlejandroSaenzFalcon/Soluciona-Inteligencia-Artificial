# AGENTS.md – Coordinación de IA

## Zonas del proyecto
- **panel-global** – UI del panel global (visual)
- **panel-empresarial** – UI del panel empresarial (visual)
- **panel-central** – UI del panel central (visual)
- **dashboard** – UI del dashboard por negocio (visual)
- **backend** – lógica de servidor, rutas API, base de datos (no UI)
- **ai‑integration** – manejo de modelos IA, prompts, configuración
- **testing‑ci** – pruebas unitarias, integración, CI/CD

## Convenciones de código
- **Estilo** – CSS mediante sistema de tokens (`tokens.css`) y componentes (`components.css`)
- **HTML** – Cada archivo tiene la clase correspondiente en `<html>` (`panel-global`, `panel-empresarial`, `panel‑central`, `dashboard`).
- **JS** – Scripts permanecen sin cambios, usan clases existentes (`.btn`, `.tab-btn`, `.badge`, etc.).
- **Git** – Cada agente trabaja en su propia rama (`feature/visual‑panel‑global`, `feature/backend‑api`, …) y *solo* modifica los archivos bajo su zona.

## Gestión de cambios concurrentes
- **CLAIMS.md** – Registro de qué archivo está siendo editado por cada agente.
- **Bloqueos de pre‑commit** – `pre‑commit` verifica que un agente no modifique archivos fuera de su zona.
- **Integración** – Un agente orquestador (p.ej. **crew‑ai**) revisa PRs y los mergea una vez aprobados.

## Proceso recomendado
1. **Crear rama** para la zona de trabajo.
2. **Actualizar CLAIMS.md** con la lista de archivos a tocar.
3. **Realizar cambios** (p.ej., mejora visual, refactor backend).
4. **Ejecutar pruebas** (unitarias, lint).
5. **Abrir PR**; el orquestador verifica que los cambios cumplan con los contratos.
6. **Merge** a `main` y despliegue.

## Contratos de interfaz (API_CONTRACT.md)
- Documenta los endpoints (`/api/tenants`, `/api/pedidos`, …) y los tipos de datos.
- Las UI (visual agents) solo consumen lo descrito aquí; cualquier cambio requiere actualizar la versión del contrato.

---

*Este archivo es lectura‑only para los agentes que no están asignados a la zona correspondiente.*