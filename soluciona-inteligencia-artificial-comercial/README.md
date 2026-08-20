# Soluciona Inteligencia Artificial Comercial — registro y contabilidad de pedidos

Sistema que escucha los pedidos que llegan por WhatsApp de tu negocio, los registra automáticamente y genera reportes de ventas.

## Instalación (solo la primera vez)

1. Instala Node.js LTS desde https://nodejs.org (marca la opción "Add to PATH").
2. Abre una terminal en esta carpeta y ejecuta:

```
npm install
```

(Esto descarga todo; incluye Chrome para el bot. La primera vez demora varios minutos.)

## Uso diario

```
npm start
```

1. Aparecerá un código QR en la terminal.
2. Abre WhatsApp en el celular del **negocio**: Ajustes (⚙) > Dispositivos vinculados > Vincular dispositivo.
3. Escanea el QR. La terminal dirá "conectado".
4. El bot queda escuchando pedidos. La laptop debe quedarse encendida.

## Cómo funciona

El cliente escribe en WhatsApp del negocio, por ejemplo:

```
3 empanadas, 2 jugos
```

El bot responde con la confirmación y el total, y guarda el pedido en `data/pedidos.jsonl`.

## Tablero y reportes

- Tablero web con conteos y últimos pedidos: http://localhost:3000
- Vista COCINA a pantalla completa (monitor de cocina): http://localhost:3000/cocina (botón "← Volver" incluido)
- Pestaña "📊 Consumo IA": uso y límites de cada clave de IA vs tu plan
- Panel Central multi-cliente (todos los negocios): `iniciar-panel.bat` → http://localhost:4000
- Exportar todo a CSV: http://localhost:3000/export.csv
- Reporte de consola: `npm run reporte`

## IA (NVIDIA, gratis)

Se usan APIs de **NVIDIA Build** (build.nvidia.com) — eliminamos Groq. Cada función tiene SU PROPIA API key (así el chat de WhatsApp nunca satura a los asistentes):

1. Crea una cuenta en https://build.nvidia.com/settings y genera **3 API keys** (botón "Get API Key", formato `nvapi-...`).
2. En `config.json`:
   - `llm.api_key` → chatbot de WhatsApp (`meta/llama-3.1-8b-instruct`)
   - `asistentes_ia.api_key` → Asistentes IA del panel (`meta/llama-3.3-70b-instruct`)
   - `vision.api_key` → leer foto de menú (`meta/llama-3.2-11b-vision-instruct`)
3. `limite_diario` / `limite_mensual` por rol = cuota de consultas incluida en el plan del cliente (0 = sin límite). El panel muestra el consumo y avisa al agotarse.

Sin keys configuradas el sistema cae a Gemini (cuota gratis 20/día) para no quedarse mudo.

## En el celular (Android)

- **Paneles como app**: abre `http://<ip>:<puerto>` en Chrome → menú ⋮ → "Instalar aplicación". Funcionan sin Play Store (PWA).
- **Bot en el celular**: ver `docs/MULTIPLATAFORMA.md` (Termux) — para negocios sin PC.
- **Bot 24/7**: VPS barato (~$4/mes) con `pm2`/`systemd`.

## Multi-cliente (varios negocios)

- Un bot por negocio: `iniciar-cliente.bat <id>` (config en `clientes/<id>.json`, datos aislados en `data/<id>/`, WhatsApp propio en `auth_info_<id>/`).
- Negocio nuevo: `crear-cliente.bat` → genera `clientes/<id>.json` con puerto libre automático.
- `lanzar-todos.bat` abre todos los clientes de una vez (excluye la plantilla EJEMPLO).
- Plantillas genéricas: `config.example.json` y `clientes/EJEMPLO.json` (cópialas para un negocio nuevo).
- Integración con POS (Siigo, Alegra, webhook, archivo, Telegram): ver `docs/INTEGRACION.md`.
- Facturación electrónica DIAN: módulo `core/facturacion.js` (proveedor-agnóstico).

### Comandos que escribe SOLO el dueño (desde su número configurado):

| Comando | Qué hace |
| --- | --- |
| `!reporte` | Resumen de ventas del día (en WhatsApp) |
| `!vendidos` | Lista todos los pedidos del día |
| `!ayuda` | Muestra los comandos |

A la hora de `hora_reporte` (config.json, por defecto 21:00) el sistema le envía al dueño el reporte del día automáticamente.

## Configuración (config.json)

- `numero_dueno`: tu número en formato internacional, ej. `573001234567` (solo él recibe comandos y reportes).
- `productos`: lista de productos, sus apodos (alias) y precios. El precio del alias más largo gana, así que pon "bandeja paisa" antes que "bandeja".
- `hora_reporte`: hora del reporte diario automático.
- `mensaje_bienvenida`: texto que recibe el cliente cuando su mensaje no se reconoce como pedido.

Cambia precio o agrega productos: guarda `config.json` y reinicia con `npm start`.

## Advertencias importantes

- Este bot usa WhatsApp no oficial (whatsapp-web.js). Tu número de NEGOCIO podría ser bloqueado si se usa de forma abusiva. Usa una SIM dedicada al negocio y no lo uses para spam.
- El bot solo registra pedidos mientras la laptop esté encendida y conectada. Para operar 24/7 se sube el sistema a un servidor (VPS) barato de ~$4/mes o la capa gratuita de Oracle Cloud.
- En la terminal se ven los QR y mensajes de estado; NO la cierres mientras esté vendiendo.

## Negocio alrededor de esto

Este mismo sistema se cobra a otros negocios: instalación + mensualidad (por ejemplo $80.000–$200.000/mes) por mantener el servicio, configurar su menú y entregarles el reporte. Es un ingreso recurrente.