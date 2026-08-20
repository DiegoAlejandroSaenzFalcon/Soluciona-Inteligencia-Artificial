# Notas de desarrollo — SOLUCIONA INTELIGENCIA ARTIFICIAL (multi-cliente + KDS + POS)

> Documento vivo para pruebas y mejoras. NO se commitea ningún dato privado (ver `.gitignore`).
> Objetivo: publicar en GitHub cuando el sistema esté 100% terminado.

## Propósito
Producto genérico de pedidos por WhatsApp **independiente de cualquier negocio** (los datos de ejemplo son solo una demo). El sistema debe poder implementarse en muchos negocios con su propio menú, WhatsApp, POS y facturación.
- Toma de pedidos y cobro automático desde el menú.
- Gestor de pedidos / KDS (estados: recibido → en_cocina → listo → entregado/cancelado).
- **Integración con POS de terceros** (webhook, archivo, telegram, Siigo, Alegra) y base para construir el nuestro.
- Facturación electrónica DIAN por proveedor tecnológico (Alegra/Siigo/Factus/Alanube...).
- Modelo de negocio: mensualidad por cliente.

## Cliente piloto (solo referencia)
- Negocio familiar de comida rápida (ex vecino del dueño), ya interesado. Sirve para probar en producción, pero el desarrollo NO depende de él.
- Menú cargado: 78 productos en `config.json` / `clientes/*.json` (archivos privados, no se commitean).

## Cómo se incorpora un negocio nuevo
1. `crear-cliente.bat` → pide nombre, genera `clientes/<id>.json` con puerto libre automático.
2. Editar el config: menú, llave IA, `integracion` (POS), `facturacion` (DIAN), `panel_password`.
3. `iniciar-cliente.bat <id>` → QR de WhatsApp → listo.
4. El Panel Central (4000) lo muestra automáticamente.

## Arquitectura implementada (fase actual)
- **Multi-cliente por instancia**: `node index.js --cliente clientes/<id>.json` (o env `CLIENTE_CONFIG`).
  - Sin parámetro usa `config.json` (modo histórico, compatible).
  - Cada cliente tiene datos y sesión de WhatsApp aislados: `data/<id>/` y `auth_info_<id>/`, y su propio `puerto`.
- **Integración POS pluggable** (`core/integracion.js`): contrato JSON estándar + REGISTRO de adaptadores. Hoy: `webhook | archivo | telegram | kds | siigo | alegra`. Agregar un POS nuevo = un adaptador + registro + doc (ver `docs/INTEGRACION.md`).
- **Facturación DIAN** (`core/facturacion.js`): genérica por proveedor; emisión automática al pasar `estado_pago = pagado`; marca el pedido (`factura_emitida`/`factura_proveedor` en SQLite).
- **KDS** en el panel web: botones de estado por pedido + al marcar "Listo" se avisa al cliente por WhatsApp.
- **Conversaciones** (`core/conversacion.js`): se guarda cada mensaje (cliente/bot) por número; el panel tiene pestaña "Conversaciones" para auditar cómo responde el bot.
- **Panel Central híbrido** (`panel-central.js` + `core/central.js`): un solo panel para todos los negocios (lee DBs SQLite de cada instancia, estado HTTP de cada bot).

## Lanzadores
- `crear-cliente.bat` → asistente para incorporar un negocio nuevo.
- `iniciar-cliente.bat <nombre>` → un cliente.
- `lanzar-todos.bat` → abre una ventana por cada `clientes/*.json` (excluye la plantilla EJEMPLO).
- `iniciar-panel.bat` → Panel Central multi-cliente.

## Privacidad / Legal / GitHub (IMPORTANTE)
- `.gitignore` excluye: `config.json`, `panel-central.json`, `clientes/`, `data/`, `auth_info*/`, `backup*/`, `*.jsonl`, `.llm_key`, `.env`.
- **Nunca commitear**: claves API, número del dueño, menús de clientes reales, ni PII de pedidos (nombres, teléfonos, GPS, conversaciones).
- Plantillas seguras para el repo: `config.example.json` y `clientes/EJEMPLO.json` (negocio genérico "Cafetería El Ejemplo", sin claves ni datos reales).
- Publicar solo cuando esté 100% terminado.

## Pendientes / mejoras sugeridas
1. ~~**Parser de plurales**~~ ✅ HECHO (2026-08-14): "2 perros especiales", "tres hamburguesas especiales", "media/docena de X", "una sprite 1.5", números con letras hasta 20, "porciones de huevo de codorniz", resolución de solapamientos ("choriperro mexicano" no cuenta doble como "choriperro"). Verificado con los 78 productos en singular y plural.
2. ~~**Vista Cocina a pantalla completa**~~ ✅ HECHO (2026-08-14): página `/cocina` (kds.html) para monitor de cocina: tarjetas grandes con #pedido, ítems, tiempos vivos (⏱), botones de estado táctiles, sonido + auto-refresh 15s. Acceso desde el botón "🍳 Cocina" del dashboard.
3. ~~**Notificación cuando el bot NO está conectado**~~ ✅ HECHO (2026-08-14): estado global de conexión (`/api/estado`), banner rojo en dashboard y KDS, y alerta al dueño por Telegram (`alertas.telegram` en config) cuando se cae la sesión o se desconecta.
4. ~~**Plantillas genéricas**~~ ✅ HECHO (2026-08-14): plantillas genéricas "Cafetería El Ejemplo" (`config.example.json`, `clientes/EJEMPLO.json` con id `cliente-ejemplo`), footer de dashboard genérico, lanzadores excluyen la plantilla. El desarrollo es independiente de cualquier cliente.
5. ~~**Script crear-cliente**~~ ✅ HECHO (2026-08-14): `crear-cliente.bat` → asiste la incorporación de un negocio nuevo: genera `clientes/<id>.json` (nombre, id, puerto libre automático, auth_dir) con pasos siguientes. Probado (puerto 3002 asignado correctamente).
6. ~~**Framework de integración POS pluggable**~~ ✅ HECHO (2026-08-14): `core/integracion.js` reescrito con REGISTRO de adaptadores + contrato `pedidoEstandar` + `docs/INTEGRACION.md` (cómo agregar un POS nuevo en 4 pasos).
7. ~~**Adaptadores Siigo y Alegra**~~ ✅ HECHO (2026-08-14): `enviarSiigo` (auth POST /auth con Partner-Id, factura POST /v1/invoices con document.id, customer.identification, items[].code, payments[].id, stamp.send) y `enviarAlegra` (Basic email:token, busca/crea contacto por identificación, busca/crea ítems, paymentForm CASH/CREDIT obligatorio con DIAN 2.1, stamp.generateStamp).
8. ~~**Módulo facturación DIAN genérico**~~ ✅ HECHO (2026-08-14): `core/facturacion.js` proveedor-agnóstico: `estadoFactura`, `emitirFactura` (reusa el adaptador de integración con stamp_dian:true), `intentarEmitirAlCobrar` (automático al `estado_pago = pagado`), `pendientesDeFacturar`; marca pedido con `factura_emitida`/`factura_proveedor` (migración ALTER en `core/db.js`).
9. ~~**Documentación de integración**~~ ✅ HECHO (2026-08-14): `docs/INTEGRACION.md` (contrato de pedido, tabla de adaptadores, guía Siigo y Alegra con credenciales, resumen DIAN, requisitos del negocio).
10. **Confirmar con el ex vecino: ¿qué POS usa?** → PENDIENTE de conversación (integración genérica ya lista; sin depender de su respuesta para seguir).
11. ~~**Eliminar Groq → NVIDIA con 1 key por función**~~ ✅ HECHO (2026-08-14): ver sección "IA NVIDIA + consumo" abajo. Pendiente SOLO: crear las 3 API keys en build.nvidia.com/settings y pegarlas en `config.json` (`llm.api_key`, `asistentes_ia.api_key`, `vision.api_key`).
12. ~~**Botón "Volver" en la vista Cocina**~~ ✅ HECHO (2026-08-14): botón "← Volver" en el header de `/cocina` que regresa al panel sin tocar la URL.
13. ~~**Número real del cliente SI O SI (no "Privado")**~~ ✅ HECHO (2026-08-14): el número se extrae del PAQUETE del mensaje (`senderPn` de baileys 6.7.24, que ya se captura en `capturarMapeoLid`) y se migra en cascada (pedidos/clientes/conversaciones) con `aplicarMapeoLid`. El panel ya NO muestra "Privado": muestra el número real; si el LID aún no se resuelve muestra el número temporal con ⏳ (se reemplaza solo al llegar el sender_pn).
14. ~~**Multiplataforma Android**~~ ✅ HECHO (2026-08-14): panel/KDS instalables como app en el celular (PWA: manifest + service worker + íconos). Ver `docs/MULTIPLATAFORMA.md` (Termux para correr el bot en Android, PWA para los paneles, VPS para 24/7).
15. **Control de consumo IA (cuotas al cliente)**: definido y funcionando (`core/consumo.js` + tabla `uso_ia` + pestaña "📊 Consumo IA" en el panel + límites `limite_diario`/`limite_mensual` por rol). Pendiente: definir valores de las cuotas por plan (esto se hará con los clientes).

## IA NVIDIA + consumo (2026-08-14)
- **NVIDIA Build eliminó los créditos** (sept 2025): ahora los modelos populares son gratuitos por "trial" con rate limits (~40 req/min por key). **Nada de Groq**.
- **1 API key por función** (cada key tiene su propio límite, el chat no satura a los asistentes):
  - KEY 1 → `llm.api_key`: chatbot de WhatsApp (el que más se usa). Modelo `meta/llama-3.1-8b-instruct` (rápido).
  - KEY 2 → `asistentes_ia.api_key`: Asistentes IA del panel. Modelo `meta/llama-3.3-70b-instruct` (calidad).
  - KEY 3 → `vision.api_key`: foto de menú. Modelo `meta/llama-3.2-11b-vision-instruct`.
- Crear las keys en https://build.nvidia.com/settings → "Get API Key" (formato `nvapi-...`).
- Endpoint único OpenAI-compatible: `https://integrate.api.nvidia.com/v1` (Bearer).
- **Control de consumo**: `core/consumo.js` + tabla SQLite `uso_ia` registra cada llamada (rol, modelo, tokens). Límites `limite_diario`/`limite_mensual` por rol = cuota del negocio; al alcanzarla la IA avisa y corta. Pestaña "📊 Consumo IA" en el panel muestra uso vs límite. Sirve para cobrar cuotas por plan.
- Fallback: si no hay key NVIDIA configurada cae a Gemini (cuota gratis 20/día) o mensaje de tip.

## Multiplataforma (2026-08-14)
- El BOT (backend Node) corre donde el cliente quiera: Windows (hoy), Android vía Termux, o VPS barato (~$4/mes) para 24/7.
- Los PANELES (dashboard, cocina, panel central, asistentes) son web responsive e **instalables como app** en el celular sin Play Store: abrir `http://<ip>:<puerto>` → menú del navegador → "Instalar aplicación" (PWA: manifest + service worker + íconos ya listos).
- Ver `docs/MULTIPLATAFORMA.md` para pasos detallados de Termux y PWA.

## Facturación electrónica DIAN (investigación 2026-08-14)
- **Obligación**: responsables de IVA (restaurantes: IVA 19% en comida preparada) y régimen SIMPLE están obligados. No responsables con ingresos < 3.500 UVT ($183M) y solo bienes excluidos no lo están. En la práctica un restaurante formal casi seguro debe facturar electrónico.
- **Proceso**: RUT al día (resp. 52) → certificado de firma digital (.p12) → ambiente de habilitación con set de pruebas → rangos en MUISCA. Días, no meses.
- **Costos**: portal DIAN gratuito ($0, manual, sin API) | certificado pago ~$120-230k/año (gratis con software DIAN) | proveedores con API desde ~$10-40k/mes (Siigo/Alegra/Factus/Alanube).
- **Técnico**: no hay API pública DIAN; la emisión automática va por proveedor tecnológico (XML UBL 2.1 firmado, CUFE, PDF+QR).
- **Recomendación**: habilitarse gratis hoy en portal DIAN (cumplimiento $0) y migrar a proveedor con API (Siigo o Alegra) cuando integremos emisión automática desde el POS.
- **Implementado (2026-08-14)**: módulo genérico `core/facturacion.js` (proveedor-agnóstico) + reuso de adaptadores con `stamp_dian: true`. Falta decisión del negocio: portal DIAN gratuito manual vs proveedor con API.

## Incidente 2026-08-13 — prueba con "cliente difícil"
Síntoma reportado: "antes era demasiado inteligente, ahora es idiota".
Causas encontradas y corregidas:
1. **Cuota de Gemini (RAÍZ):** el LLM usa Gemini gratis (20 consultas/día). Al agotarse la cuota, cada llamada da error y el bot caía en bucle del mensaje de bienvenida. Solución recomendada: usar **Groq gratis** (llave en `config.json` → `llm.api_key`, provider `groq`, modelo `llama-3.1-8b-instant`) en vez del límite de 20/día. Mientras haya cuota, el bot es "inteligente"; sin ella, el fallback evita el bucle.
2. **Parser interpretaba preguntas como pedidos:** "¿Qué trae la hamburguesa especial?" generaba un pedido #8 falso. Corregido: si el texto es pregunta (¿? o palabras qué/cuánto/trae/me dices…), no se convierte en orden.
3. **Plurales no detectados:** "2 perros especiales" no se tomaba. Corregido: alias tolerantes a plural (`s?` por palabra).
4. **La IA se inventaba "se reinició" y datos falsos de ingredientes.** Corregido en el system prompt (reglas 7 y 8): nunca afirmar reinicios/errores técnicos ni inventar ingredientes; solo confirmar nombre+precio y derivar al local.
5. **Fallback de IA:** al fallar la IA ahora responde `mensaje_fallback` (no el de bienvenida, ni afirma reinicios).

Pendiente: agregar llave de Groq (o OpenRouter) para que la demo no se quede "tonta" tras 20 mensajes.

## Nota del dueño ("quiero que notes algo")
> [Pendiente de la próxima interacción — completar aquí lo que el usuario indique.]
