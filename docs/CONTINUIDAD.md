# CONTINUIDAD.md — Soluciona Inteligencia Artificial
> **Propósito:** que CUALQUIER agente (Codex, DeepSeek, Kimi, o el mismo Kimi en otra sesión)
> pueda continuar el trabajo sin contexto previo, sin repetir auditorías y sin depender
> de la máquina local. **Si no está en GitHub, no existe.**

**Última actualización:** 2026-09-21 · **Responsable de la doctrina:** PO (Diego Alejandro Saenz Falcon)

---

## 1. REGLA SUPREMA (nunca la rompas)

```
LA MÁQUINA LOCAL ES CACHÉ. GitHub ES LA VERDAD.
   - Commit + push = existe.
   - Sin commit = no existe. Sin push = no existe.
   - Ninguna IA "termina" algo sin commit y push verificados.
```

Historia que la motiva: la máquina del PO se formateó por fuerza mayor el 2026-09-21 y
todo lo local se puso en riesgo. Este documento existe para que el trabajo NUNCA vuelva
a depender del disco.

## 2. QUÉ LEE UNA IA NUEVA, EN ESTE ORDEN

1. **Este archivo** (estás aquí).
2. `AGENTS.md` (raíz) — reglas de trabajo (no negociables).
3. `docs/PLAN-DE-TERMINACION-SOFTWARE.md` — dónde estamos y qué falta (roadmap T1–T6).
4. `docs/INFORME-DE-ESTADO-DESARROLLO.md` — historial completo y decisiones.
5. `GOVERNANCE.md` + `QUALITY_GATES.md` — proceso y calidad.
6. El código en `soluciona-inteligencia-artificial-comercial/` (la fuente de verdad del producto).

## 3. ESTADO ACTUAL DEL PRODUCTO (snapshot 2026-09-21)

| Área | Estado | Nota |
|---|---|---|
| Arranque y panel web | ✅ Funciona | `/login` y `/panel-empresarial` verificados con HTTP |
| WhatsApp Cloud API | ⚠️ A MITAD | envío implementado; recepción por webhook NO cableada (tarea T2) |
| Inventario alimentario (lotes/FEFO) | ✅ H1 terminado | **PR #9 abierto** — fusionar |
| Documentación de estado y plan | ✅ lista | **PR #10 abierto** — fusionar |
| Tests | ⚠️ runner roto (Vitest en Windows+Node) | plan: pasar a `node:test` — ver PLAN T1.2 |
| DIAN middleware | ✅ construido offline | no conectado al flujo de ventas (T5) |
| PostgreSQL | ⚠️ runtime sigue en SQLite | migración documentada, falta cerrarla |

**Próxima acción correcta (máxima prioridad):** fusionar PR #9 y PR #10 → ejecutar T1.

## 4. CÓMO TRABAJA UNA IA AQUÍ (lo esencial, sin repetir AGENTS.md)

- Trabajar SIEMPRE sobre una rama `feature/…`, `fix/…` o `docs/…` y abrir PR a `main`.
- Commits convencionales (`feat:`, `fix:`, `docs:`, `chore:`…).
- **No commitear directo a `main`** sin permiso del PO.
- Antes de escribir una línea de código, leer la SPEC relevante (`docs/SPEC.md`, `variants/*/SPEC.md`).
- Marcar el trabajo terminado SOLO con evidencia reproducible (comando + salida).
- Si encuentras algo roto que NO es tu tarea: NO lo arregles en silencio → documéntalo
  en `docs/` o abre issue; si es un bloqueador crítico, documenta el arreglo en tu PR.

## 5. RELACIÓN CON CLIENTES (regla arquitectónica, aprobada 2026-09-21)

```
REPO PÚBLICO: Soluciona-Inteligencia-Artificial   ← producto limpio y genérico
REPO PRIVADO POR CLIENTE: p. ej. San-Angel        ← datos, configs y especificaciones del cliente
```

- El repo público **nunca** contiene datos/marcas/credenciales de clientes.
- El trabajo hecho para un cliente regresa al core SOLO como capacidad genérica,
  detrás de feature flag/config, y solo cuando se demuestre que sirve para otros
  clientes del mismo segmento (ver regla "Rule of Three" en el historial de decisiones).

## 6. BUENAS PRÁCTICAS DE PRESERVACIÓN (háztelas siempre)

- Al terminar CUALQUIER sesión: `git add`, commit, push. Sin excepciones.
- Si algo existe localmente y no está en GitHub: **no existe**. Trátalo como tal.
- Al encontrar trabajo a medio hacer sin commitear: documentarlo, commitearlo, pushearlo
  y registrarlo en este archivo (sección de abajo) con fecha.

### Registro de preservaciones (append-only)

| Fecha | Qué se preservó | Por | Dónde queda |
|---|---|---|---|
| 2026-09-21 | Hito H1 inventario alimentario | audit IA Kimi K3 | PR #9 |
| 2026-09-21 | INFORME de estado + PLAN de terminación + AGENTS/SPEC/INIT/GOVERNANCE/QUALITY_GATES/CLIENT_ADAPTATION + variants/ + .opencode/ | audit IA Kimi K3 | PR #10 (rama docs/estado-y-plan-2026-09) |

---

*Actualiza este archivo cada vez que cambie el estado real del proyecto o se preserve algo nuevo.*


## 7. PROTOCOLO SDD/SSD Y CONTINUIDAD HUMANA (2026-09-23)

La continuidad del proyecto queda formalizada además en:
- `docs/governance/SDD-SSD-MASTER-PLAN-v1.0.md` — método rector SDD/SSD integrado al Plan Director.
- `docs/governance/CONTINUITY-PROTOCOL-v1.0.md` — START/END checkpoint, handoff y recuperación de sesiones.
- `docs/templates/SESSION-HANDOFF.md` — plantilla reutilizable.

### Regla operacional nueva
Toda sesión debe poder cerrarse dejando WHAT → WHY → WHERE → PROOF → NEXT persistido en GitHub. La interrupción humana normal no debe producir pérdida de contexto ni obligar a reconstruir una conversación.

### Próximo ciclo
SDD-00 → Recovery LangGraph → Architecture Reconciliation → CI/CD Reconciliation.
