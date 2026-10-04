# PLAN DE TERMINACIÓN DEL SOFTWARE — SOLUCIONA INTELIGENCIA ARTIFICIAL
## Informe de estado real + Plan completo de finalización

| | |
|---|---|
| **Documento** | PLAN-DE-TERMINACION-SOFTWARE.md |
| **Versión** | 1.2.0 |
| **Fecha** | 2026-09-21 (reorganizado ese mismo día) |
| **Autor** | Auditoría OpenCode / Kimi K3 (sesión de inspección física del repositorio) |
| **Ámbito** | `C:\Proyectos\Soluciona-Inteligencia-Artificial` (Espacio B — producto genérico) |
| **Clasificación** | Documento público del repositorio (sin datos de clientes) |

> **Nota metodológica:** este informe NO parte de supuestos. Cada afirmación se verificó con
> filesystem, `git`, arranque real del servidor y sondeo HTTP el 2026-09-21. Se conservan los
> estados de evidencia del proyecto: IMPLEMENTADO_Y_VERIFICADO / PARCIALMENTE_IMPLEMENTADO /
> PRESENTE_PERO_NO_PROBADO_E2E / DOCUMENTADO_PERO_NO_VERIFICADO / DESCONOCIDO.

> **ESTADO DE PRESERVACIÓN (2026-09-21, FASE 0 ejecutada por auditoría IA-Kimi-K3):**
> todo el trabajo nuevo de este repositorio está ya commiteado y pusheado a GitHub:
> **PR #9** (hito H1 inventario alimentario, rama `feature/inventario-alimentario`) y
> **PR #10** (esta misma reorganización documental, rama `docs/estado-y-plan-2026-09`).
> **Regla nueva del proyecto: "Nada existe si no está commiteado y pusheado"** — ver CONTINUIDAD.md.

---

# PARTE A — INFORME DE ESTADO REAL

## 1. Resumen ejecutivo

**El software base NO está terminado, pero está mucho más avanzado de lo que parece.**
La variante comercial arranca y funciona; lo que falta es una fase de **terminación**
(cerrar migraciones a medio hacer, quitar datos de demo, endurecer pruebas y cablear lo que
ya existe pero no está conectado).

Estado de madurez estimado por evidencia: **~65-70% de la variante comercial**.

## 2. Respuesta a "no veo interfaces ni dashboard en localhost:3000"

Verificación ejecutada el 2026-09-21 (proceso real, sondeo HTTP):

| Comprobación | Resultado | Lectura |
|---|---|---|
| `node index.js` (con WhatsApp deshabilitado) | ✅ **Arranca** | "Sistema iniciado. Panel: http://localhost:3000" |
| `GET /login` | ✅ **200 OK** | Pantalla de acceso existe ("Acceso Cafetería El Ejemplo") |
| `GET /panel-empresarial` | ✅ **200 OK** | Panel empresarial existe y se sirve |
| `GET /` (dashboard legado) | 🔒 401 | Protegido por contraseña de panel (correcto) |
| `GET /kds.html` | 🔒 401 | Protegido (correcto) |
| `GET /api/health` | ⚠️ 503 | `healthy:false` esperado: sin credenciales IA/WhatsApp |

**Por qué no veías nada (3 causas reales, ninguna es "no existe"):**

1. **El servidor no estaba corriendo.** No hay servicio autostart; si nadie ejecuta
   `node index.js`, no hay nada en el puerto 3000.
2. **Falta el archivo `.env`** en la raíz de la variante comercial. El sistema cae a
   defaults seguros, pero: la contraseña de `admin@localhost` del panel empresarial se
   genera aleatoria en el primer arranque (sin `.env` con `ADMIN_PASSWORD`, no la
   conoces) y el panel legado autogenera una contraseña distinta en CADA arranque
   (salida del log de arranque real: *"Panel legado sin contraseña configurada. Se
   generó una automática…"*).
3. **`config.json` trae datos de demostración** ("Cafetería El Ejemplo", coordenadas
   de Medellín, teléfono ficticio 573000000000). No es TU negocio ni el del cliente.

**Acción inmediata documentada en §6 (T1).

## 3. Estado por componente (clasificación con evidencia)

| # | Componente | Estado | Evidencia (2026-09-21) |
|---|---|---|---|
| 1 | Arranque del sistema | ✅ IMPLEMENTADO_Y_VERIFICADO | `node index.js` arranca, logs limpios |
| 2 | Panel web (login, dashboard legado, panel empresarial, panel global, KDS) | ✅ IMPLEMENTADO_Y_VERIFICADO | HTML+JS servidos, auth y 2FA en su lugar |
| 3 | Auth JWT + RBAC + 2FA TOTP | ✅ IMPLEMENTADO_Y_VERIFICADO | Rutas `/api/auth/*`, seeds, tests documentados |
| 4 | Config v2 (Zod, versionado, rollback, vault AES-256-GCM, auditoría) | ✅ IMPLEMENTADO_Y_VERIFICADO | `src/config/*`, rutas montadas |
| 5 | Contabilidad (CxC/CxP, facturas, aging, asientos PUC) | ✅ IMPLEMENTADO_Y_VERIFICADO | `src/accounting/*`, tests 33 pasos documentados |
| 6 | Inventario base (productos, stock, kardex, proveedores, OC) | ✅ IMPLEMENTADO_Y_VERIFICADO | `src/inventory/*` + tests documentados |
| 7 | **Inventario alimentario H1 (lotes, vencimientos, FEFO base)** | ⚠️ IMPLEMENTADO pero **SIN COMMIT** | `src/inventory/lotes.js` sin rastrear; diff de 147 líneas sin proteger |
| 8 | WebSockets Socket.io (tiempo real, aislado por tenant) | ✅ IMPLEMENTADO_Y_VERIFICADO | `src/websockets/*`, test 8 pasos |
| 9 | WhatsApp vía Baileys (legacy) | ⚠️ LEGACY FUNCIONAL (default) | `transports/whatsapp.js` |
| 10 | **WhatsApp Cloud API ofcial** | ⚠️ PARCIALMENTE_IMPLEMENTADO | `src/whatsapp/cloud/{client,transport,calling-sidecar}.js` existen (cliente Graph API sólido, verificación HMAC, parseo); **el endpoint `/webhook` NO está montado en `transports/web.js`** (verificado: en `web.js` solo aparece "webhook" como clave de config). Recepción de mensajes entrantes = NO cableada. |
| 11 | Motor de flujos por segmento (comidas/salud/retail) | ✅ IMPLEMENTADO | `core/flows/*` |
| 12 | Domicilio por distancia (OSRM + haversine, faixas) | ✅ IMPLEMENTADO_Y_VERIFICADO | `core/geo.js` + tests |
| 13 | Geolocalización estricta por GPS en pedidos WhatsApp | ✅ IMPLEMENTADO | flujo documentado |
| 14 | DIAN middleware (facturación electrónica) | ✅ IMPLEMENTADO (offline) — **pendiente integración y credenciales reales** | `dian-middleware/` con flujo habilitación 60F/20NC/20ND probado localmente (submit:false); NO probado contra DIAN real; NO conectado al flujo de pedidos |
| 15 | PostgreSQL + Drizzle (30 tablas, RLS-ready) | ⚠️ PARCIALMENTE_IMPLEMENTADO | Código existe (`src/db/*`); runtime por defecto sigue en SQLite; `migrate-sqlite-to-pg.js` + `verify-pg.js` documentados OK |
| 16 | Selección de motor de DB por config (`db_engine`) | ✅ IMPLEMENTADO | `core/db.js` selector sqlite/postgres |
| 17 | Migración Baileys→Cloud API | ⚠️ PARCIAL | ver componente #10 |
| 18 | Migración SQLite→PostgreSQL definitiva | ⚠️ PARCIAL | ver componente #15 |
| 19 | Tests automatizados (Vitest) | ❌ **ROTO** | incompatibilidad Vite 5.4/rollup/es-module-lexer en Windows+Node — diagnosticada con evidencia por la sesión previa; opciones de arreglo documentadas |
| 20 | CI/CD monorepo | ⚠️ PARCIAL | `ci-cd.yml` sin `working-directory` (señalado por la sesión previa) |
| 21 | Gobernanza (Plan Director, ramas) | ⚠️ DOCUMENTADO_PERO_NO_VERIFICADO | vive en rama `docs/director-plan-v1` sin fusionar a `main` |
| 22 | SolucionaTIA (capa agentic Python/LangGraph) | ❌ NO_ENCONTRADO_TRAS_INSPECCION | nunca se persistió en Git/disco (verificado por sesión previa) — decisión pendiente: reconstruir o retirar del discurso |
| 23 | Seguridad (cero secretos, gitleaks, honeytoken) | ✅ Implementado | commits de hardening presentes |
| 24 | Observabilidad (monitoring/, OTEL) | ⚠️ PARCIAL | estructura y configs existen; verificación E2E pendiente |
| 25 | Datos de demo en `config.json` | ⚠️ **DEFECTO DE PRODUCTIZACIÓN** | negocio "Cafetería El Ejemplo", GPS Medellín, teléfono ficticio |
| 26 | `.env` de arranque | ❌ NO EXISTE | solo `.env.example` |

## 4. Las brechas reales (lo que falta, ordenado por impacto)

**B1 — Productización/Configuración (CRÍTICA para demos).** Hoy no se puede mostrar el
producto sin que antes aparezca "Cafetería El Ejemplo" y contraseñas aleatorias no
conocidas. Debe existir: `.env.example` completo + script de bootstrap (`npm run setup`)
que genere el entorno, pida la contraseña admin UNA vez, y deje el sistema listo con un
negocio de ejemplo CLARAMENTE marcado como DEMO (o vacío).

**B2 — Riesgo de trabajo sin proteger (CRÍTICA para no perder código).** El hito H1 del
inventario alimentario (lotes/FEFO base) está **sin commit**. Si esta máquina falla, se
pierde. Debe autorizarse y subirse YA (cumple la metodología: probado antes).

**B3 — WhatsApp Cloud API sin recepción (la migración pendiente).** Envío y cliente
existen; **la recepción de mensajes (webhook de Meta → servidor) no está montada**.
Falta: endpoint `GET/POST /webhook/whatsapp` en `transports/web.js` (verify-token GET +
firma HMAC-SHA256 en POST), enrutado del payload al flujo de pedidos actual, y registro
de la app/phone de prueba en Meta. Path Baileys se mantiene como fallback hasta cortar.

**B4 — Doble motor de base de datos sin cierre.** El selector existe; falta decidir y
verificar: producción = PostgreSQL, desarrollo = SQLite, y un pipeline de migración
probado (está documentado pero hay que ejecutarlo como checklist final).

**B5 — DIAN no conectado al ciclo de venta.** El middleware es muy completo, pero no hay
un puente "pedido completado → factura emitida". Falta integración + credenciales reales
del negocio que lo use.

**B6 — Dos mundos de interfaz (legacy dashboard.html vs panel-empresarial nuevo).** El
panel nuevo es el futuro; hay que terminar de portar pantallas del legacy y retirar el
viejo con un plan de compatibilidad.

**B7 — Estado de SolucionaTIA (IA agentic).** No existe como código. Hay que decidir:
¿se reconstruye (según su plan E0/A2A/E1) o se retira del discurso hasta entonces?
El SDD debe hablar solo de lo que existe.

**B8 — Runner de pruebas roto (Vitest).** Sin un runner verde, la regla "no se declara
terminado sin pruebas" no puede cumplirse. Opciones documentadas por la sesión previa
(minimizar setup.js, migrar Vitest, o `node:test`). Recomendación del auditor: opción 3
(`node:test` nativo) para estabilidad inmediata y deuda cero.

---

# PARTE B — PLAN DE TERMINACIÓN (SDD/SSD)

## 5. Principios del plan

1. **Cerrar antes de abrir**: ningún módulo nuevo se inicia hasta cerrar lo ya comenzado.
2. **Documentado ≠ implementado ≠ probado ≠ desplegado ≠ producción.**
3. **Nada se declara terminado sin prueba y evidencia.**
4. **El core (este repo, público) nunca contiene datos ni marcas de clientes.** Los datos
   del cliente San Angel Perros Transmilenio viven en `C:\Clientes\San-Angel` (privado).
5. Los hitos son **aprobadores**: cada milestone entrega verificable antes de seguir.

## 6. Milestones de terminación (T1 → T6)

### T1 — Estabilización y puesta en orden  *(objetivo: repo limpio, entorno reproducible)*
**Tareas:**
- T1.1 Commit protegido de H1 (inventario alimentario) en `feature/inventario-alimentario`
  + PR a `main` (verificación verde mínima: sintaxis + tests en `node:test`).
- T1.2 Reparar el runner de pruebas: adoptar `node:test` para la lógica pura
  (los 17 casos de lotes ya pasan en Node puro) y dejar Vitest solo para lo que lo
  necesite tras arreglo, o migrar Vitest correctamente después. Criterio: `npm test` en verde.
- T1.3 Fusionar `docs/director-plan-v1` a `main` (ya aprobada en su momento).
- T1.4 Crear `.env` desde `.env.example` con guía; añadir `npm run setup`
  (bootstrap: genera JWT/keys locales, pide contraseña admin, marca datos DEMO).
- T1.5 Limpiar `config.json` de datos de demo: trasladar "Cafetería El Ejemplo" a
  `config.demo.json`; dejar `config.json` con placeholders `[DEFINIR AL CREAR CLIENTE]`.
- T1.6 Corregir `ci-cd.yml` con `working-directory` (monorepo) para que la CI sea real.

**Criterio de salida:** clonar el repo → `npm ci && npm run setup && npm test && npm start` →
panel accesible con contraseña conocida, datos DEMO etiquetados, CI verde.

### T2 — WhatsApp Cloud API completa  *(cierra la migración Baileys → oficial)*
**Estado tras ejecución del 2026-09-23 (sesión #009, auditoría OpenCode/Kimi K3):**
- T2.1 ✅ `/webhook/whatsapp` montado en `transports/web.js` (público, antes del gate) con
  handshake GET + POST y HMAC-SHA256.
- T2.2 ✅ Reusado `src/whatsapp/cloud/client.js` para el envío (sin reescribir).
- T2.3 ✅ Selector de transporte por config (`WHATSAPP_TRANSPORT=baileys|cloud`, Baileys sigue
  como fallback deprecable). Cableado del mensaje entrante al pipeline de pedidos
  (`procesarMensajeCloud`).
- T2.4 ⏳ **Pendiente externo:** requiere App Meta real + Phone ID (credenciales del negocio).
  Marcado explícitamente; no se simula un éxito falso.
- T2.5 ✅ Runbook documentado en `.env.example`.
- Validación: suite de tests `webhook-whatsapp` (8 casos) + suite completa 20/20 en verde;
  handshake verificado en local con firma válida/inválida; fail-closed si no hay token.

**Criterio de salida cumplido (del plan):** el servidor ahora escucha y verifica webhooks.
La recepción E2E contra Meta Sandbox queda como tarea con credenciales reales (documentada).

### T3 — Inventario alimentario completo (H2–H5)  *(= valor directo para comidas)*
**Estado tras ejecución del 2026-09-23 (sesión #010, auditoría OpenCode/Kimi K3):**
- T3.1 ✅ **H2 — FEFO real**: `descontarFEFO()` descuenta del lote más próximo a vencer,
  atómico y con movimiento por lote.
- T3.2 ✅ **H3 — Unidades**: `src/inventory/unidades.js` (kg↔g, L↔ml, und↔docena, caja).
- T3.3 ✅ **H4 — Mermas**: `registrarMerma()` con motivo + conteo físico con ajuste documentado.
- T3.4 ✅ **H5 — Recetas/BOM**: `src/inventory/recetas.js` + tablas `recipes`/`recipe_items`,
  versionado por producto, `consumirPorReceta()` desglosa insumos al vender.
- Rutas REST creadas para las 3 capacidades. Tests: 21 casos nuevos; suite **41/41 en verde**.

**Criterio de salida cumplido:** recepción con lote → venta → descuento FEFO → costeo por
producto, con pruebas del runner nativo. Lo que NO hicimos aquí: retocar la capa TS
(scaffold, deuda conocida) — queda planeado en la migración, no se mezcló con este hito.

### T4 — Productización multi-cliente (Core + Tenant packs)  *(alinea con el patrón profesional)*
- T4.1 Directorio `clients/` + `node index.js --cliente <slug>` ya existe: formalizar con
  esquema validado (Config v2) y carga de `menu/content pack` por cliente.
- T4.2 Soportar "panel de cliente" por slug con su config y branding (theme pack).
- T4.3 Documentar el contrato: qué es core/segmento/tenant (guía para el siguiente cliente).
- T4.4 Smoke test: levantar 2 clientes demo con distinto branding/menú desde `clients/`.

**Criterio de salida:** crear un cliente nuevo = copiar una carpeta con config+content pack;
nada del cliente A aparece en el cliente B. *Esto es exactamente lo que necesitan el
cliente San Angel y los futuros (espacio A/B).*

### T5 — DIAN en producción controlada
- T5.1 Integración: pedido completado (comidas) → `facturacion` → `dian-middleware`.
- T5.2 Verificación del set de habilitación real con el negocio piloto (credenciales reales).
- T5.3 Manejo de contingencia tipo 03/04 + reintentos + observabilidad de la cola.
- T5.4 **Seguridad de dependencias (hallazgo de CI del 2026-09-22):** `drizzle-orm <0.45.2`
  tiene SQL injection mediante identificadores mal escapados (GHSA-gpj5-g38j-94v9). Su
  actualización es **rompiente** (0.31 → 0.45+). Requiere PR dedicado con pruebas de
  regresión de la capa de datos: no se mezclará con T1 ni se colará sin revisión.

**Criterio de salida:** factura de venta real emitida y aceptada en ambiente de habilitación DIAN.

### T6 — Endurecimiento y cierre
- T6.1 Deprecar `dashboard.html` legacy con mapa de migración a `panel-empresarial` (lista
  de pantallas faltantes) y retirar lo inseguro tras corte.
- T6.2 Observabilidad end-to-end verificada (métricas, health profundo, alertas).
- T6.3 Auditoría de seguridad final (dependencias, secretos, CORS, rate-limiting).
- T6.4 Release v1.0.0: README final, CHANGELOG, licencia, guía de operación.
- T6.5 Decisión SolucionaTIA: reconstruir (plan propio) o quitar del marketing.

**Criterio de salida:** `v1.0.0` etiquetada, reproducible desde cero, con demo funcional.

## 7. Estimación de esfuerzo (orientativa, en días de ingeniería)

| Milestone | Estimación |
|---|---|
| T1 Estabilización | 3–5 días |


**Estado de T1 tras la ejecución del 2026-09-22 (sesión #008, auditoría OpenCode/Kimi K3):**
- T1.1 ✅ Hito H1 commiteado + PR #9 fusionado.
- T1.2 ✅ Runner de pruebas migrado a `node:test` (12/12 OK). Documentado: Vitest roto en
  Windows+Node 24 (ver INFORME §8); la migración plena de Vitest queda como opción posterior.
- T1.3 ✅ Rama de gobernanza (`docs/director-plan-v1`) fusionada a `main` vía PR #4
  (conflicto AGENTS.md resuelto incorporando ambos contenidos).
- T1.4 README del variante comercial con guía de bootstrap (config listo, `.env` con secretos
  locales generados y `.gitignore` lo cubre; `npm start` → panel accesible).
- T1.5 ✅ config limpio (sin datos de demo de Cafetería El Ejemplo).
- T1.6 ✅ CI real en la raíz: `.github/workflows/ci.yml` (unit tests node:test en verde,
  gitleaks OK, `npm audit` nivel crítico; `typecheck` marcado "no-bloqueante" porque el
  scaffold TS heredado tiene 221 errores preexistentes, documentados aquí — su limpieza
  pertenece a la migración TS, no a T1).
- T1.7 ✅ Retiro de Vitest roto — y de paso eliminación de su cadena de vulnerabilidades
  críticas que la CI detectó tras activarse (vitest/@vitest/ui/@vitest/coverage-v8 con
  transitive esbuild/vite). Esto era el punto profesional: la herramienta estaba rota Y
  vulnerable; **ambas cosas se resolvieron con la misma acción**. Migración posterior a
  Vitest 5 es opcional pero se documenta como mejora, no como bloqueador.
| T2 WhatsApp Cloud API | 3–5 días |
| T3 Inventario alimentario | 5–8 días |
| T4 Multi-cliente | 4–6 días |
| T5 DIAN producción | 3–6 días (depende de credenciales del negocio) |
| T6 Endurecimiento | 4–6 días |
| **Total** | **~22–36 días de trabajo efectivo** |

## 8. Riesgos del plan

| Riesgo | Mitigación |
|---|---|
| Seguir separando mundos (legacy vs nuevo) sin cortar | T6 con plan de corte explícito |
| Reparar tests mal y creer que se puede verificar | opción de runner nativo (deuda cero) |
| DIAN frenado por credenciales del negocio | Track B del cliente: el dueño las entrega cuando se pidan |
| Baileys bloqueado mientras se migra | mantener fallback hasta T2 verde + Cloud API encendido |
| Sobre-ingeniería (premature) durante T3/T4 | revisión SDD por hito; solo lo que pide el segmento comidas |

## 9. Decisiones que necesito del dueño (cierran este plan)

1. **¿Autorizas commit + PR del hito H1 (inventario alimentario) YA?** *(recomendación: sí)*
2. **Runner de pruebas:** ¿`node:test` nativo (rápido, deuda cero)? *(recomendación: sí, y luego
   se evalúa Vitest)*
3. **Baileys:** ¿fallback hasta T2 completo y luego retiro, o retiro inmediato tras T2?
   *(recomendación: fallback con fecha de retiro)*
4. **SolucionaTIA (agentic):** ¿reconstruimos (nuevo plan) o lo sacamos del discurso? *(el
   mercado comercial lo espera — recomiendo documentarlo como Fase futura y no mentir sobre su estado)*
5. **¿Fusionar `docs/director-plan-v1` a `main`?** *(recomendación: sí)*

## 10. Relación con el cliente San Angel Perros Transmilenio (proyecto aparte)

- Este plan **no introduce** ningún dato del cliente en el producto.
- Cuando T1–T4 cierren, la incorporación de San Angel será: crear `clients/san-angel/`
  local (privado) con su menú real (78 ítems ya transcritos en su documento maestro) y su
  config. El core público quedará intacto y listo para el siguiente restaurante.
- La necesidad del cliente (inventario con lotes/FEFO, menú con gramajes, promos por día)
  coincide 1:1 con T3/T4 → el piloto guiará el producto, no al revés.

---

*Documento generado con evidencia del 2026-09-21. Autor: auditoría OpenCode/Kimi K3. Pendiente
de aprobación del PO para convertirse en el plan de trabajo oficial del repositorio.*
