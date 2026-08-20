# Integración con POS y facturación electrónica

Este sistema está diseñado para conectarse con el POS o software contable de CUALQUIER negocio. No depende de un cliente específico.

## Contrato de pedido (formato estándar)

Todo pedido se convierte a un JSON estándar antes de enviarse a cualquier destino:

```json
{
  "cliente": "id-del-cliente",
  "negocio": "Nombre del negocio",
  "recibido": "2026-08-14T10:00:00.000Z",
  "pedido": {
    "id": 12,
    "fecha": "2026-08-14T10:00:00.000Z",
    "dia": "2026-08-14",
    "remitente": "Nombre del cliente",
    "telefono": "573001234567",
    "items": [
      { "producto": "Hamburguesa Clásica", "cantidad": 2, "precioUnitario": 18000, "subtotal": 36000 }
    ],
    "total": 36000,
    "direccion": "Calle 1 #2-3",
    "lat": "4.711000",
    "lng": "-74.072100",
    "estado": "recibido"
  }
}
```

## Configuración por negocio

En el `config.json` (o `clientes/<id>.json`) de cada cliente, o vía `.env`:

```json
"integracion": { "tipo": "alegra", "email": "...", "token": "...", "stamp_dian": true }
```

| tipo | Qué hace | Claves principales |
| --- | --- | --- |
| `kds` | Solo el panel/cocina propio (por defecto) | — |
| `webhook` | POST del JSON estándar a una URL | `url`, `token`, `header`+`valor`, `timeout` |
| `archivo` | Escribe el JSON en `data/integracion.jsonl` | `salida` (ruta opcional) |
| `telegram` | Manda el pedido a un chat de Telegram | `token`, `chat_id` |
| `siigo` | Crea factura en Siigo Nube | ver abajo |
| `alegra` | Crea factura en Alegra | ver abajo |
| `factus` | Crea factura en Factus | ver abajo |
| `alanube` | Crea factura en Alanube | ver abajo |
| `opendata` | Crea factura en OpenData | ver abajo |
| `dian-gratuito` | API oficial Portal DIAN Gratuito | ver abajo |

## Agregar un POS nuevo (adaptadores)

Cada POS es un adaptador con una sola función. Para agregar uno nuevo:

1. Crea `core/adaptadores/<pos>.js`:

```js
async function enviar(payload, cfg) {
  const p = payload.pedido;
  // ... llama la API del POS con cfg.* y p.* ...
  return true; // o false si falló
}
module.exports = { tipo: '<pos>', enviar };
```

2. Regístralo en `core/integracion.js` (import + `REGISTRO`).
3. Documenta sus claves en esta tabla.
4. En el cliente: `"integracion": { "tipo": "<pos>", ...claves }`.

---

## Proveedores de Facturación Electrónica (DIAN)

### Siigo Nube (API oficial)

Docs: https://developers.siigo.com

Credenciales: Siigo Nube → Alianzas → "Mi Credencial API" (`username` + `access_key`).

```json
"integracion": {
  "tipo": "siigo",
  "username": "usuario@negocio.com",
  "access_key": "clave-generada",
  "partner_id": "id-del-socio",
  "document_id": 22,
  "payment_id": 5636,
  "tax_id": 13156,
  "customer_identification": "1000000000",
  "codigos_productos": { "Hamburguesa Clásica": "HC-001" },
  "stamp_dian": true
}
```

- Token se renueva solo (24h). Ítems por `code`. `stamp: {send:true}` emite a DIAN.

---

### Alegra (Colombia)

Docs: https://developer.alegra.com

Token: Panel Alegra → Configuración → "API – Integraciones" (email + token).

```json
"integracion": {
  "tipo": "alegra",
  "email": "usuario@negocio.com",
  "token": "token-api",
  "id_type": "CC",
  "customer_identification": "1000000000",
  "codigos_productos": { "Hamburguesa Clásica": "1" },
  "tax_id": "6",
  "payment_form": "CASH",
  "stamp_dian": true
}
```

- Busca/crea cliente por identificación. Busca/crea ítems. `stamp.generateStamp: true` emite a DIAN.

---

### Factus (factus.com.co)

Docs: https://factus.com.co/api

```json
"integracion": {
  "tipo": "factus",
  "email": "usuario@negocio.com",
  "password": "password_factus",
  "prefijo": "SETP",
  "customer_email": "cliente@ejemplo.com",
  "city_code": "11001",
  "payment_form": "1",
  "payment_method": "10"
}
```

- Autenticación JWT. Soporta factura electrónica 2.1 con timbre DIAN.

---

### Alanube (alanube.com)

```json
"integracion": {
  "tipo": "alanube",
  "username": "usuario@negocio.com",
  "password": "password_alanube",
  "prefijo": "SETP",
  "customer_type_id": "31",
  "customer_email": "cliente@ejemplo.com",
  "customer_city": "11001",
  "payment_form": "1",
  "payment_method": "10"
}
```

---

### OpenData (opendata.com.co)

```json
"integracion": {
  "tipo": "opendata",
  "api_key": "tu_api_key",
  "secret_key": "tu_secret_key",
  "prefijo": "SETP",
  "cliente_tipo_id": "31",
  "cliente_email": "cliente@ejemplo.com",
  "cliente_ciudad": "11001",
  "forma_pago": "1",
  "metodo_pago": "10"
}
```

---

### Portal DIAN Gratuito (API Oficial) — **NUEVO**

Portal: https://facturaelectronica.dian.gov.co
- **Gratuito** para responsables de IVA, Régimen Simple, No responsables obligados
- Requiere: RUT resp. 52, Firma digital (.p12), Habilitación en ambiente de pruebas
- **API REST para desarrolladores** disponible tras registro en portal

```json
"integracion": {
  "tipo": "dian-gratuito",
  "nit": "900123456",
  "password": "tu_password_dian",
  "codigo_software": "tu_codigo_software",
  "pin_software": "tu_pin_software",
  "cert_path": "./certs/firma.p12",
  "cert_pass": "password_del_certificado",
  "ambiente": "habilitacion",  // habilitacion | produccion
  "prefijo": "SETP",
  "cliente_tipo_id": "31",
  "cliente_email": "cliente@ejemplo.com",
  "cliente_municipio": "11001",
  "cliente_departamento": "11",
  "empresa_ciudad": "Bogotá",
  "empresa_depto": "Cundinamarca"
}
```

**Configuración en `.env`** (recomendado para credenciales sensibles):
```env
INTEGRACION_TIPO=dian-gratuito
DIAN_NIT=900123456
DIAN_PASSWORD=xxx
DIAN_CODIGO_SOFTWARE=xxx
DIAN_PIN_SOFTWARE=xxx
DIAN_CERT_PATH=./certs/firma.p12
DIAN_CERT_PASS=xxx
DIAN_AMBIENTE=habilitacion
DIAN_PREFIJO=SETP
```

---

## Facturación electrónica DIAN (Módulo `core/facturacion.js`)

El módulo es **proveedor-agnóstico**: usa el mismo adaptador de integración para timbrar.

Configuración por cliente:

```json
"facturacion": {
  "proveedor": "dian-gratuito",     // alegra | siigo | factus | alanube | opendata | dian-gratuito
  "emision_automatica": true,       // false = manual; true = al marcar "Entregado" en KDS
  "estado_dispara": "pagado",       // estado_pago que dispara la factura
  "enviar_mail": true
}
```

- Emisión automática se dispara cuando `estado_pago = pagado` (botón "Entregado" en KDS).
- Pedidos facturados marcados en SQLite: `factura_emitida`, `factura_proveedor`.
- **Dos caminos soportados**:
  1. **Portal DIAN Gratuito** (gratis, API oficial, requiere certificado .p12)
  2. **Proveedor tecnológico** (Siigo, Alegra, Factus, Alanube, OpenData — ~$10-40k/mes, más fácil)

El negocio elige según volumen y presupuesto. Ambos usan el mismo contrato `pedidoEstandar`.

---

## Requisitos previos del negocio (configuración en panel del proveedor / DIAN)

- Habilitación DIAN (RUT responsabilidad 52, ambiente de pruebas, resolución de numeración).
- Firma electrónica vigente (.p12 para DIAN Gratuito; en proveedores se sube al panel).
- Numeración autorizada (prefijo + rangos) en MUISCA.

Eso se configura **fuera** del sistema (en portal DIAN o panel del proveedor), no por API.