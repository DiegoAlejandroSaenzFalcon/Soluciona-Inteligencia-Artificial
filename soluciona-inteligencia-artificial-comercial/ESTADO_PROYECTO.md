# Estado del Proyecto - soluciona-inteligencia-artificial-comercial + DIAN Middleware

> Última actualización: 2026-08-16

## Objetivo
- Sistema de pedidos por WhatsApp con IA + middleware DIAN de facturación electrónica (Software Propio, Colombia) según Resolución 000042.
- Flujo completo probado localmente: validación → CUFE/CUDE → UBL 2.1 → firma RSA-SHA384 → PDF → set de habilitación 60F/20NC/20ND.

## Proyecto principal: `C:\Users\H2R\Documents\Default Project\soluciona-inteligencia-artificial\soluciona-inteligencia-artificial-comercial`
- Sistema genérico multi-cliente (config.json: "Nombre Comercial del Cliente - Soluciona Agencia IA", 88 productos, sin claves en texto plano).
- Arquitectura: State Machine (`core/state-machine.js`) + AI Structured Outputs (`core/ai-structured.js`) + `transports/whatsapp.js` reescrito.
- 10 adaptadores POS en `core/integracion.js` (pos-propio, webhook, archivo, telegram, siigo, alegra, factus, alanube, opendata, dian-gratuito).
- `.env` con claves NVIDIA×3 + Gemini + POS + Telegram. `config.js` carga dotenv.
- Dashboard/KDS/API en `http://localhost:3000` (verificados).

## Middleware DIAN: `dian-middleware/` (repositorio `"type": "module"`, Node v24)
### ÚLTIMA SESIÓN - TODO EL FLUJO CORREGIDO Y PROBADO LOCALMENTE ✅
1. **`src/validation/dian-rules.js`**: reescrito completo. Eliminada `calcTax` duplicada en validateVLR y balance de llaves corregido. `node --check` pasa. Exporta: `CADE_CODES`, `VLR_RULES`, `CAE_CODES`, `validateComplete`, `validateCADE`, `validateVLR`, `validateCAE` + `export default`. `validateComplete` probado: factura válida → 0 errores. NOTA: el archivo está en ASCII (sin ó/é/ñ en strings de error) para evitar SyntaxError en ESM.
2. **`.env` creado** con placeholders de prueba: DIAN_NIT=900123456, DIAN_DV=7, certPath=./certs/firma.p12, DIAN_CERT_PASS=test1234, DIAN_CODIGO_SOFTWARE/PIN_SOFTWARE=placeholder UUIDs, resolución SETP 1-5000000. REEMPLAZAR con credenciales reales antes de producción.
3. **`certs/firma.p12`**: certificado self-signed de prueba generado (forge, RSA 2048, vigente 2024-2034, pass `test1234`).
4. **`src/index.js`**: `initialize()` ahora es lazy (solo carga cert, NO descarga WSDL). Nuevo `ensureSoapClient()` que crea cliente SOAP solo cuando `submit: true` o consulta. `calculateTotals()` ahora también llena campos directos (`lineExtensionAmount`, `taxExclusiveAmount`, `taxInclusiveAmount`, `payableAmount`, `totalTax`) que usan los builders UBL.
5. **`src/security/signature.js`**: 
   - Import corregido: `import { DOMParser, XMLSerializer } from 'xmldom'` (faltaba).
   - `signXml` corregido: `forge.pki.createSigner()` NO existe en node-forge → usar `privateKey.sign(md)` con `forge.md.sha384.create()` (RSA-SHA384 según anexo).
   - `verifyXmlSignature` corregido: NodeList no es iterable con `for...of` → usar `for (let i=0; i<signatures.length; i++)` con `.item(i)`.
   - `extractCufeParams` ahora tolerante: si no hay `taxTotals` (formato UBL), deriva impuestos de `lines[].taxId/taxRate/taxAmount` (formato simplificado).
6. **`src/ubl/builders/invoice.builder.js`**: `buildDebitNote` tenía 2 tags sin cerrar (`</cbc:DocumentCurrencyCode` y `</cbc:PayableAmount` faltaba `>`). Corregido.
7. **`src/habilitacion/manager.js`**: 
   - `initialize()` lazy (SOAP solo en submit).
   - CUFE generado con `extractCufeParams` + `generateCufe` (antes pasaba params incorrectos `nit/dv/documentType` que no existen en generateCufe).
   - `calculateTotals` llena campos directos (igual que index.js).
   - Eliminado `tipoIdentificacion` duplicado en `getTestCustomer`.

### RESULTADOS DE PRUEBA (local, submit: false)
- **Factura**: `processInvoice` OK → CUFE 96 hex, XML 12KB firmado, PDF 2.7KB Buffer. `verifySignature` → valid:true. `extractCertificateInfo` OK.
- **NC**: `processCreditNote` OK → CUDE 96 hex, XML firmado.
- **ND**: `processDebitNote` OK → CUDE 96 hex, XML firmado (sin warnings xmldom tras fix).
- **Habilitación**: `runHabilitacion({submit:false})` OK → 60 facturas + 20 NC + 20 ND (100 docs), `validateHabilitacionSet` valid:true, CUFEs únicos, IDs únicos. Duración ~3.6s.
- **`validateComplete`** sobre factura del set → valid:true, 0 errores, 0 warnings.

## PENDIENTE (siguiente sesión)
1. **Probar `runHabilitacion({ submit: true })`** contra sandbox DIAN real — requiere credenciales reales: reemplazar en `dian-middleware/.env`: DIAN_CODIGO_SOFTWARE (UUID del software), DIAN_PIN_SOFTWARE (PIN), DIAN_CERT_PATH/PASS con certificado .p12 real del facturador, NIT/DV reales. ⚠️ La URL WSDL de habilitación (`https://facturaelectronica.dian.gov.co/habilitacion/ws/ReciboFactura?wsdl`) devuelve página de error Azure cuando se intenta descargar — verificar conectividad desde la red del cliente o usar proxy.
2. **Validación de firma completa**: `verifyXmlSignature` solo valida estructura + vigencia del cert. Falta: verificar digest del Reference, verificar firma RSA-SHA384 con la clave pública del cert, validar cadena de confianza CA DIAN.
3. **Canonicalización**: `canonicalizeForSignature` usa serialización simple (sin C14N completo) — para producción usar `xml-c14n` o librería XAdES (xml-crypto) para que la firma sea aceptada por DIAN.
4. **CUFE vs CUDE**: `generateCude` es alias de `generateCufe` — verificar si DIAN requiere diferencia en ClTec para NC/ND (el anexo usa CUDE = CUFE con mismo formato).
5. **PDF de contingencia** (Tipo 03/04) y QR: verificar visualmente `pdf/generator.js`.
6. **example.js** (`dian-middleware/example.js`) puede estar desactualizado vs API nueva — revisar/actualizar.
7. **Integración final**: conectar `core/facturacion.js` del proyecto principal con `dian-middleware` para envío automático de pedidos completados.

## ESTA SESIÓN - DASHBOARD "CONFIGURACIÓN" ✅ (2026-08-16)
### Backend (`transports/web.js`)
- Endpoint **GET `/api/configuracion`** → resumen completo **saneado** (nunca expone claves API/contraseñas, solo `tiene_key`/estado). Incluye: negocio, menú, IA, integración POS, facturación y bot.
- Endpoint **POST `/api/configuracion`** → guarda en `config.json` + aplica en caliente (muta objeto `config` en memoria): `menu.color` (validado hex), `menu.url`, `numero_dueno`, `negocio`, `moneda`, `hora_reporte`, y `facturacion.*` (proveedor, emisión automática, estado dispara, enviar mail, correos remitente/cliente).
- `resumenConfiguracion()` ampliado: `categorias_limpias` (sin emojis, ordenadas alfabéticamente), `productos_por_categoria` (agrupados, 88 productos en 15 categorías), `numero_dueno_formateado`, y datos reales del bot (`numero`, `numero_formateado`, `nombre`).
- **POS propio**: nuevo adaptador `pos-propio` en `core/integracion.js` (REGISTRO) y default en `config.js` (`INTEGRACION_TIPO` → `pos-propio`). En `transports/web.js` `tipo_activo` mapea kds/none → `pos-propio`.

### Frontend (`dashboard.html`)
- **Nav reordenado**: 📦 Pedidos y Ventas · 🍳 Cocina · 👥 Clientes · 💬 Conversaciones · 🤖 Asistentes IA (incluye consumo) · ⚙️ Configuración.
- **Asistentes + Consumo unificados** en un solo tab.
- **Categorías limpias**: sin emojis, chips ordenados alfabéticamente.
- **Selector de color moderno**: `<input type="color">` + paleta de 10 colores de marca (swatches) + guardado en caliente.
- **Visor de productos**: buscador por nombre/ingrediente/alias, agrupado por categoría, con precios e ingredientes, scroll interno.
- **POS propio destacado**: card "🛒 POS Soluciona — Integrado" con botones Abrir Cocina / Ver Pedidos + badge Activo.
- **Adaptadores externos opcionales**: tabla con los 9 adaptadores externos (pos-propio excluido).
- **Facturación editable**: selects para proveedor, emisión automática, estado dispara, envío de correo + inputs de correos remitente/cliente, con botón Guardar.
- **Bot WhatsApp**: conexión, número real del QR (del socket, ej `[REDACTED-PHONE]`), nombre del WhatsApp (ej "Saenz Diego") y último cambio.
- Escape HTML (`escH`) en valores dinámicos para evitar inyección/ruptura del DOM.

### Pruebas realizadas (localhost:3000)
- GET `/api/configuracion` → 200 con categorías limpias, 88 productos, `tipo_activo: pos-propio`, bot número/nombre reales.
- POST `/api/configuracion` (color + facturación) → 200 `{ok:true, actualizados:[...]}` y persistencia en `config.json`.
- `node --check` en `transports/web.js`, `core/integracion.js`, `core/notify.js`, `config.js` → OK. JS del dashboard extraído → `node --check` OK.
- Dashboard servido sin placeholders pendientes; `/api/estado` → conectado:true.

### Archivos modificados
- `transports/web.js` (endpoints GET/POST configuracion, resumenConfiguracion, guardarConfiguracion, formatearTel, limpiarCategoria)
- `dashboard.html` (nav, tab asistentes+consumo, sección Configuración interactiva, CSS chips/color/productos/POS)
- `core/integracion.js` (adaptador pos-propio)
- `core/notify.js` (captura número y nombre del bot desde socket Baileys)
- `config.js` (default integracion.tipo → pos-propio)

## Archivos clave
- `dian-middleware/src/index.js` (entry: createDianMiddleware, processInvoice/CreditNote/DebitNote, runHabilitacion, ensureSoapClient)
- `dian-middleware/src/security/signature.js` (CUFE SHA-384 fórmula anexo, signXml RSA-SHA384, loadPkcs12)
- `dian-middleware/src/soap/dian-client.js` (SOAP 1.2 + WS-Security: Timestamp + BinarySecurityToken; SendBillAsync/GetStatus/GetNumberingRange/GetExchangeEmails/SendTestSetAsync)
- `dian-middleware/src/ubl/builders/*` (Invoice/CreditNote/DebitNote UBL 2.1)
- `dian-middleware/src/validation/dian-rules.js` (CADE/VLR/CAE + validateComplete) ⚠️ archivo recién reescrito
- `dian-middleware/src/validation/dian-validator.js` (validateInvoice/validateXmlSchema/validateHabilitacionSet)
- `dian-middleware/src/habilitacion/manager.js` (HabilitacionManager: 60F/20NC/20ND)
- `dian-middleware/src/pdf/generator.js` (PDF + QR + contingencia)
- `dian-middleware/src/config/dian.config.js` (lee `dian-middleware/.env`)
- `dian-middleware/.env` (placeholders TEST — reemplazar)
- `dian-middleware/certs/firma.p12` (certificado TEST self-signed, pass test1234)
- `C:\Users\H2R\Downloads\resolucion_000042.pdf` (anexo técnico DIAN, referencia)

## Entorno
- Windows PowerShell 5.1: `&&` falla en la tool bash → usar `;` o `if ($?)`.
- Archivos ESM con caracteres no-ASCII (ó/é/ñ) causan SyntaxError en algunos contextos → mantener ASCII en strings de código (dian-rules.js reescrito en ASCII).
- Node v24.16.0. Scripts package.json: start, habilitacion, generate-pdf, sign-xml.
- Comando de prueba rápida: `node --experimental-vm-modules -e "import { createDianMiddleware } from './src/index.js'; const mw = createDianMiddleware({}); console.log('OK')"`

## ESTA SESIÓN - PLAN MULTI-FEATURE ✅ (2026-08-16)
### Objetivo: Implementar plan aprobado por usuario (domicilio por distancia OSRM + faixas, GPS estricto, multi-chatbot DIAN, panel global)

### 1. Distancia y costo de domicilio (`core/geo.js`)
- `validarUbicacion(lat,lng)` — validación estricta rango Colombia
- `distanciaHaversine` — fallback offline
- `distanciaRutaOSRM(origen, destino)` — ruta real por calles vía router.project-osrm.org (timeout 4s, caché LRU 300)
- `distanciaRuta` — OSRM → fallback haversine
- `costoDomicilio(config.domicilios, distancia, subtotal)` — faixas por km: gratis / fijo / por_km, con `minimo`, `pedido_minimo`, `radio_max_entrega_km`, `gratis_si_total_sobre`
- Tests unitarios: todas faixas OK, OSRM real 5.21km OK

### 2. Configuración por segmento DIAN
- `config.js`: defaults `segmento='comidas'`, `ciiu`, `ubicacion_negocio`, `domicilios`, `servicios[]`, `profesionales[]`, `horarios[]`, `stock{}`, `mensaje_agotado`
- `config.example.json` + `config.json` actualizados con nuevos campos
- `pregunta_direccion` reescrita: solo GPS, sin mención RECOGER

### 3. Base de datos (`core/db.js`)
- `pedidos`: columnas `distancia_km REAL` + `costo_domicilio INTEGER` (CREATE + ALTER via PRAGMA table_info)
- Tabla `citas` (id, tenant_id, fecha, hora, servicio, profesional, paciente, telefono, estado, confirmada, creado) + índices
- Funciones: `siguienteCitaId`, `guardarCita`, `leerCitas`, `patchCita`, `cambiarEstadoCita` exportadas
- `guardarPedido`/`leerPedidos`/`patchPedido` manejan nuevas columnas

### 4. Flujo invertido comidas (`transports/whatsapp.js`)
- **Antes**: items → CONFIRMAR → GPS → costo → guardar
- **Ahora**: items → "DOMICILIO o RECOGER" → si DOMICILIO: GPS estricto → cotización (dist+costo) → CONFIRMAR/CANCELAR → guardar con `distancia_km`/`costo_domicilio`/`total+domicilio`
- `pendientesConfirmar` Map (scope módulo) guarda `{modo, lat, lng, etiqueta, distancia, costo}`
- `esperandoDireccion` Map conservado para path legacy `pendId`
- `detectarModoEntrega()` regex domicilio/recoger
- `cotizarDomicilio()` async helper
- CONFIRMAR determinístico (sin LLM `confirmar_pedido`)
- CANCELAR determinístico
- `node --check` OK

### 5. GPS estricto (`ESPERANDO_UBICACION`)
- Rechaza TODO texto: "⚠️ Solo acepto tu UBICACIÓN por GPS (botón 📎 → Ubicación). No se guardan otros textos."
- Valida coordenadas, cotiza domicilio, avisa si fuera de radio
- `patchPedido` con `direccion/lat/lng/distancia_km/costo_domicilio` si `pendId`
- Sino almacena en `pendientesConfirmar` y pide CONFIRMAR/CANCELAR con total

### 6. Confirmación con costo (`core/orders.js`)
- `formatearConfirmacion` muestra 🚚 Domicilio (costo + km) cuando `tipo==='domicilio'`

### 7. Prompt IA alineado (`core/ai-structured.js`)
- `estadosDesc`: `confirmacion_requerida` = "debe elegir DOMICILIO o RECOGER antes de confirmar"; `esperando_ubicacion` = "Esperando SOLO la ubicación GPS... No se acepta texto"
- `FLUJO POR ESTADO` actualizado

### 8. UI Configuración: Sección Domicilios (`dashboard.html` + `transports/web.js`)
- Nueva sección "🛵 Domicilios (tarifas por distancia)" entre Negocio y Menú
- GPS del local (lat/lng) con botón guardar
- Radio máximo de entrega (km)
- Envío gratis si total supera ($)
- Tabla de faixas editable (hasta_km, tipo, valor, mín, mín pedido) con botón "➕ Añadir faixa" y "🗑️" por fila
- `web.js GET /api/configuracion` incluye `segmento`, `ciiu`, `ubicacion_negocio`, `domicilios`
- `web.js POST /api/configuracion` acepta `ubicacion_negocio`, `domicilios.faixas`, `domicilios.radio_max_entrega_km`, `domicilios.gratis_si_total_sobre`, `segmento`, `ciiu`

### 9. Motor de flujos por segmento (`core/flows/`)
- `core/flows/index.js`: `obtenerFlujo()` despacha por `config.segmento` ('comidas'=flujo integrado, 'salud'/`salud.js`, 'retail'/`retail.js`)
- `core/flows/salud.js`: flujo agendamiento citas (ELEGIR_SERVICIO→PROFESIONAL→FECHA→HORA→CONFIRMAR) con estado propio `PENDIENTES` Map, usa `config.servicios[]`, `config.profesionales[]`, `config.horarios[]`, guarda en tabla `citas`
- `core/flows/retail.js`: carrito + stock/disponibilidad (`config.stock[producto].stock`) con alerta agotado
- Integración en `whatsapp.js`: despacho temprano tras comandos dueño, pasa `ctx` con `responder` bound

### 10. API Citas + Tab Dashboard (`web.js` + `dashboard.html`)
- `GET /api/citas?estado=` → lista citas del tenant
- `POST /api/citas` `{id, estado}` → `cambiarEstadoCita`
- Tab "📅 Citas" visible en dashboard (solo segmento salud)
- Render con badges por estado (reservada/confirmada/cancelada/completada) + botón Cancelar

### 11. Panel Global (`panel-global.js` + `panel-global.html` + `panel-global.json`, puerto 5000)
- Reusa `core/central.js` (read-only multi-tenant)
- Delegación de escritura vía POST a cada dashboard de negocio (`/api/delegar` → `/api/configuracion` del tenant)
- Tabs:
  - 📊 **Resumen Multi-negocio**: cards por negocio (pedidos hoy, ventas, estado online, link a dashboard)
  - 🏷️ **Filtro por Segmento**: agrupa comidas/salud/retail
  - 📈 **Comparativa**: tabla pedidos, domicilio vs recoger, distancia prom, costo dom prom
  - 🗺️ **Mapa Distancias**: histograma buckets ≤3/3-8/8-15/15-25/>25 km por negocio
  - 🛵 **Config Domicilios Central**: visualiza/edita faixas, GPS, radio de cada negocio (delegado)
  - 🔗 **Enlaces**: acceso directo a cada dashboard individual
- Auth opcional por password en `panel-global.json`
- `GET /api/tenants`, `/api/pedidos`, `/api/citas`, `/api/comparativa`, `/api/domicilios`, `/api/delegar`

### Pruebas realizadas
- `node --check` todos los archivos modificados: OK
- Tests geo: validarUbicacion, haversine, costoDomicilio todas faixas, OSRM real OK
- Off-topic filter (`core/ai.js`): 10/10 casos determinísticos OK (finanzas, política, código, salud, hacking, apuestas, empleo)
- Sintaxis web.js, flows, panel-global: OK
- Dashboard tabs render: Configuración (con Domicilios), Citas

### Archivos nuevos/modificados
- NUEVOS: `core/geo.js`, `core/flows/index.js`, `core/flows/salud.js`, `core/flows/retail.js`, `panel-global.js`, `panel-global.html`, `panel-global.json`
- MODIFICADOS: `config.js`, `config.example.json`, `config.json`, `core/db.js`, `core/orders.js`, `core/ai-structured.js`, `transports/whatsapp.js`, `transports/web.js`, `dashboard.html`

### Pendiente futuro
- Probar `runHabilitacion({submit:true})` con credenciales DIAN reales
- Validación completa firma XAdES (C14N, digest, cadena CA DIAN)
- Conectar `core/facturacion.js` → `dian-middleware` para emisión automática
- Tests E2E con bot WhatsApp real (QR scan)

---

## Sprint 1 — Base de Datos PostgreSQL + Auth/RBAC (en curso)

### 11. PostgreSQL 16 + Drizzle (Base)
- **Instalado y corriendo PostgreSQL 16.4** en `C:\Program Files\PostgreSQL\16` (servicio `postgresql-x64-16`, auto-start). Base: `soluciona_inteligencia_artificial_comercial`.
- Schema Drizzle completo en `src/db/schema.ts` (30 tablas): tenants, users, sessions, permissions, role_permissions, user_permissions, config_versions, config_secrets, categories, products, product_variants, stock, stock_movements, suppliers, purchase_orders(+items), purchase_receipts(+items), customers, invoices(+items), payments, credit_notes, payroll_employees/periods/details, accounts (PUC), journal_entries(+lines), audit_logs.
- Conexión `src/db/index.ts` (drizzle+postgres-js) y `src/db/connection.js` (cliente raw CJS para runtime).
- Seed `src/db/seed.ts` (idempotente): 39 permisos, 4 roles (admin='*'/operador/cocina/solo_lectura), tenant `default`, admin `admin@localhost` / `admin123`, plan PUC Colombia (132 cuentas, jerarquía 1-6).
- Comandos: `npm run db:init` (crea tablas + seed), `npm run db:migrate` (aplica migraciones), `npm run db:studio` (GUI).
- Migración aplicada manualmente: `drizzle/0000_abnormal_cerebro.sql`.

### 12. Auth/RBAC (completado)
- `src/auth/index.js`: login/refresh/logout con **JWT** (`jsonwebtoken`), access 15m + refresh 30d rotado, refresh almacenado hasheado (SHA-256) en tabla `sessions`, bcryptjs para passwords, **2FA TOTP** (RFC 6238, HMAC-SHA1, 6 dígitos, ventana 30s, secret base32) implementado con node:crypto.
- `src/auth/routes.js`: rutas HTTP montadas en `web.js` antes del gate de `panel_password`:
  - `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`
  - `POST /api/auth/verify-2fa`, `POST /api/auth/setup-2fa`, `POST /api/auth/enable-2fa`, `POST /api/auth/disable-2fa`
  - `GET /api/auth/me`, `GET /api/auth/permissions`
  - `GET/POST/PUT /api/users` (RBAC: users:read/create/update)
- RBAC: permisos por rol (`role_permissions`) + overrides por usuario (`user_permissions`); admin = wildcard `*`. Helper `getPermissionsForUser` + `hasPermission`.
- Secret JWT: `JWT_SECRET` env → archivo persistente `data/jwt_secret` → auto-generado.
- **Pruebas**: unit (login, refresh rotación, revocación, TOTP, hash) + HTTP (login 401/200, /me, /api/users CRUD, 2FA enable) + RBAC negativo (cocina → 403 en users:*). Todo OK.

### 13. Config v2 (completado)
- `src/config/schemas.js`: **Zod** por sección (negocio, menu, ia, domicilios, pagos, nomina, bi, integraciones, notificaciones) + mapa sección→claves top-level de config.json.
- `src/config/v2.js`: núcleo
  - `getSection`/`getSections`/`updateSection` (merge profundo + validación Zod + escritura atómica config.json + sync en memoria)
  - **Versionado**: cada cambio guarda snapshot en `config_versions` (payload, usuario, ip, ua)
  - **Rollback**: `rollback(section, versionId)` → restaura payload de una versión, crea nueva versión + auditoría
  - **Secrets vault**: AES-256-GCM (clave `CONFIG_VAULT_KEY` env → `data/vault_key`), `setSecret`/`listSecrets`(enmascarado/valores)/`deleteSecret`, nunca en claro
  - **Auditoría**: `audit_logs` (CONFIG_CHANGE, CONFIG_ROLLBACK, SECRET_CREATE/UPDATE/DELETE) + `listAudit`
- `src/config/routes.js` montado en web.js (requiere JWT + permisos config:read/write/secrets):
  - `GET /api/configv2/sections`, `GET/PUT /api/configv2/:section`
  - `GET /api/configv2/:section/versions`, `POST /api/configv2/:section/rollback`
  - `GET/POST /api/configv2/secrets`, `DELETE /api/configv2/secrets/:key`
  - `GET /api/audit`
- **Pruebas (13 casos)**: listar/leer/actualizar, validación (hasta_km negativo y segmento inválido → 400), versionado, rollback, secrets cifrados (enmascarados por defecto, valores solo con header), auditoría, RBAC negativo (cocina → 403 en config:write). Todo OK.

### 14. Migración SQLite → PostgreSQL (completado)
- `core/db.js` ahora es un **selector de motor** según `config.db_engine` (`sqlite`|`postgres`, env `DB_ENGINE`).
  - `core/db-sqlite.js`: implementación SQLite original intacta (node:sqlite) — por defecto.
  - `core/db-pg.js`: backend **PostgreSQL con API 100% síncrona** vía worker thread + SharedArrayBuffer/Atomics (`core/db-pg-worker.js`). Misma firma de funciones → no se tocó whatsapp.js, orders.js, flows ni facturacion.
- **Tablas espejo operativas** en PG (`src/db/operationalSchema.js`, `CREATE TABLE IF NOT EXISTS`): pedidos, clientes, conversaciones, lid_map, uso_ia, citas (mismas columnas que SQLite, PK iguales).
- **Migración** `src/db/migrate-sqlite-to-pg.js` (script `npm run db:migrate-data`): lee `data/neurallgo.db` y copia las 6 tablas + completa tenant, idempotente (`ON CONFLICT DO NOTHING`).
- **Verificación** `src/db/verify-pg.js` (script `npm run db:verify-pg`): 24 tests (lecturas vs SQLite + escrituras con limpieza). **24/24 OK**.
- Detalles resueltos: `COUNT(*)`/`SUM()` de PG son bigint → postgres-js los devuelve como string (se coaccionan a Number); `worker.unref()` para no bloquear la salida del proceso; NOTICEs silenciados con `onnotice`.
- `web.js` `/api/health` ahora usa `db.ping()` (async, funciona en ambos motores).
- Datos migrados: 1 pedido, 2 clientes, 118 conversaciones, 679 lid_map, 60 uso_ia, 0 citas.

### 15. Inventario y Compras (completado)
- **`src/inventory/index.js`**: núcleo sobre PostgreSQL (`getClient()`, transacciones con `sql.begin` vía helper `tx()`):
  - Categorías (CRUD, soft delete, validación de referencias).
  - Productos (CRUD con aliases/impuestos JSON, variantes, stock inicial por bodega, búsqueda por `q`/código/aliases).
  - Stock (ajuste ±, kardex `stock_movements`, traslados entre bodegas, alertas de stock bajo).
  - Proveedores (CRUD) y **órdenes de compra**: CRUD borrador, cambio de estado (enviada/cancelada), **recepción parcial/total** con actualización de stock + costo promedio y generación de kardex.
- **`src/inventory/routes.js`**: rutas `/api/inventory/*` con `autenticarYPermitir` (permisos `inventory:read/write/adjust/transfers`, `purchases:read/create/approve/receive`). Integradas en `web.js`.
- Errores resueltos: postgres-js lanza `UNSAFE_TRANSACTION` si no se usa `sql.begin` → `tx()` usa `c.begin(async t => fn(t))`; lecturas post-commit se ejecutan **fuera** de la transacción (no veían datos sin commitear); variables capturadas fuera del callback (evita shadowing).
- **`test_inventory.js`**: test HTTP idempotente (limpieza previa vía `getClient`), login admin/cocina, RBAC negativo (cocina→403), flujo completo OC→enviar→recibir con verificación de kardex y costo. **27 pasos, 0 fallos** (eliminado tras la corrida).
- BD de desarrollo limpia tras la prueba (sin residuos de test).

### 16. CxC / CxP y Contabilidad (completado)
- **`src/accounting/index.js`**: núcleo sobre PostgreSQL (tablas ya existentes: customers, invoices, invoice_items, payments, credit_notes, accounts, journal_entries, journal_entry_lines):
  - **Clientes (CxC)**: CRUD con cupo crédito, días de crédito, régimen, responsable IVA.
  - **Facturas**: creación con ítems (subtotal/IVA/total), `fecha_vencimiento` según días de crédito del cliente, anulación, **notas crédito** con control de saldo.
  - **Pagos**: `cobro` (sobre facturas) y `pago` (sobre órdenes de compra recibidas), validación de saldo, anulación con reversa. Actualiza `saldo_pendiente`.
  - **Asientos automáticos balanceados** en cada operación (factura: 1305 CLIENTES / 4105 VENTAS / 2320 IVA; cobro: 1105/1110 vs 1305; pago a proveedor: 2205 vs 1105/1110; anulaciones y NC: reversa). Asientos manuales con validación de balance y anulación.
  - **Aging CxC y CxP**: buckets al día / 0-30 / 31-60 / 61-90 / 90+, con detalle por cliente/proveedor.
  - **Conciliación**: resumen facturado/cobrado/saldo y desglose por método de pago.
- **`src/accounting/routes.js`**: rutas `/api/accounting/*` con `autenticarYPermitir` (permisos `accounting:read`/`accounting:write`; admin `*`, operador y solo_lectura tienen `accounting:read`). Integradas en `web.js`.
- Cuentas PUC usadas tomadas del plan de cuentas sembrado (`cuentaCodigo` por código): 1105/1110, 1305, 2205, 2320, 4105.
- **`test_accounting.js`**: test HTTP idempotente (limpia tablas contables + inventario de test en el preámbulo), login admin/cocina, RBAC negativo (cocina→403), flujo completo factura→cobro→NC→anular pago→anular factura, CxP proveedor→OC→recepción→pago→aging, asientos manuales (balanceado, detalle, desbalanceado→400, anular). **33 pasos, 0 fallos** (eliminado tras la corrida).
- BD de desarrollo limpia tras la prueba.

### 17. WebSockets Socket.io (completado)
- **`src/websockets/index.js`**: `initWebSockets(server)` adjunta Socket.io al HTTP server existente (`path: /socket.io`, transports websocket+polling).
  - **Auth JWT** en la handshake (`socket.handshake.auth.token` o `query.token`, `auth.verifyToken`); sin token → conexión rechazada.
  - **Rooms**: `tenant:<id>`, `user:<id>` y `rol:<rol>` → push aislado por tenant.
  - Eventos definidos (`EVENTOS`): `pedido:nuevo`, `pedido:estado`, `cita:nueva`, `cita:estado`, `stock:cambio`, `stock:alertas`, `venta:nueva`, `pago:nuevo`, `config:cambio`, `compras:cambio`. Handlers de `ping`/`presencia`.
  - Emisores exportados: `emitir(tenant,evento,dato)`, `emitirUsuario`, `emitirRol`, `emitirGlobal`, `contarClientes`.
- **Integración en `web.js`**:
  - `initWebSockets(server)` antes de `listen`.
  - Emisiones en puntos de mutación: `pedido:estado` (POST /api/pedido/:id/estado), `cita:estado` (POST /api/citas), `stock:cambio` (ajustar stock, traslado, recibir OC), `compras:cambio` (crear OC), `venta:nueva` (POST invoices), `pago:nuevo` (POST payments).
  - `core/orders.guardarPedido()` emite `pedido:nuevo` (no-op si el servidor ws no está iniciado).
  - Se sirve el bundle del cliente en `/socket.io-client.js` (para el dashboard).
- Dependencia dev añadida: `socket.io-client@^4.8.3` (solo para pruebas).
- **`test_ws.js`**: test con cliente real — rechazo sin token, conexión autenticada, ping/pong, recepción de `venta:nueva` al crear factura por HTTP, presencia. **8 pasos, 0 fallos** (eliminado tras la corrida).
- BD de desarrollo limpia tras la prueba.

### 18. Panel Empresarial — UI (completado)
- **Decisión**: página propia `/panel-empresarial` (HTML + JS separados) en lugar de tocar el SPA legacy `dashboard.html` (que solo ganó un link en el header + CSS `.panel-link`).
- **Archivos**:
  - `panel-empresarial.html`: esqueleto + CSS; carga `/socket.io-client.js` y los 4 módulos JS.
  - `panel-empresarial.js`: sesión en `localStorage 'panel.sesion'`, helper `api()` con refresh automático en 401, flujo login + 2FA (`requiresTwoFactor` → `verify-2fa`), navegación (Inicio/Config/Inventario/Contabilidad/Seguridad), conexión Socket.io con toasts por evento, `cargarInicio` (stats conciliación + aging + stock bajo + facturas emitidas), `renderSeguridad` (setup/enable/disable 2FA).
  - `panel-config.js`: secciones Config v2, editor JSON + guardar (validación), versiones (`v.id`, `changed_by_email`, `ip`), rollback, auditoría, secrets (POST/DELETE `/api/configv2/secrets/:key`).
  - `panel-inventario.js`: tabs productos/categorías/proveedores/OC/stock bajo; CRUD producto con ajuste de stock y kardex, categorías, proveedores, OC (crear con ítems, enviar, cancelar, recibir con `poItemId`+`cantidad`), stock bajo.
  - `panel-contabilidad.js`: clientes, facturas (crear con ítems, ver con asientos, cobrar, nota crédito, anular), pagos (cobro/pago por factura u OC), aging CxC/CxP, asientos manuales (con líneas PUC, validación de balance), conciliación.
- **`web.js`**: rutas estáticas `/panel-empresarial` (HTML) y `/panel-empresarial.js`, `/panel-config.js`, `/panel-inventario.js`, `/panel-contabilidad.js` (junto al bloque PWA).
- **Verificación**: rutas sirven 200; smoke test HTTP end-to-end (login admin → crear cliente → factura con asiento → cobro que actualiza `saldo_pendiente` → anular) con formas de respuesta confirmadas contra la API real (`asientos`, `pagos`, ítems camelCase, `facturaNumero`/`poNumero`/`clienteNombre`, aging `buckets`, conciliación). BD de desarrollo limpiada tras la prueba.

### Pendiente Sprint 1
- Ninguno pendiente en el panel actual. Backlog: facturación electrónica DIAN (credenciales y certificado .p12), verificación de cuenta Meta para Cloud API (48h), pruebas de integración del dashboard legacy con WebSockets.