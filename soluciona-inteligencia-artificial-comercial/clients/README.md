# clients/ — Paquetes de tenant (Cliente = Config + Contenido)

Cada subcarpeta es un **cliente completo**: su `config.json` es lo único que lo diferencia del core.

## Regla de oro

> Crear un cliente nuevo = copiar `clients/demo/` → renombrar a `clients/<slug>` → editar su `config.json`.

Sin tocar ni una línea del core. Datos del cliente, marca, menú y reglas de negocio viven aquí.

## Contrato Core / Segmento / Tenant

Este documento define qué es responsabilidad del **core** (código compartido), qué define el **segmento** (vertical: comidas, salud, retail, belleza), y qué es específico del **tenant** (cliente individual).

### Core (Compartido — nunca se toca por cliente)

| Área | Qué incluye | Dónde vive |
|------|-------------|------------|
| **Arranque & Config** | Carga de config, validación de pack, resolución `--cliente`, selección DB (sqlite/postgres) | `index.js`, `config.js` |
| **Auth & RBAC** | JWT, 2FA TOTP, roles, permisos, sesiones, rate-limiting, CSRF | `src/auth/`, `transports/web.js` |
| **Panel Empresarial** | UI React-like (vanilla JS), navegación, WebSockets, branding dinámico | `panel-empresarial.html/js`, `panel-branding.js` |
| **WhatsApp** | Transporte Baileys (legacy) + Cloud API oficial, webhook HMAC, normalización de mensajes | `transports/whatsapp.js`, `src/whatsapp/cloud/` |
| **Inventario Base** | Productos, variantes, stock, kardex, lotes, FEFO, mermas, conteo físico | `src/inventory/index.js`, `src/inventory/recetas.js` |
| **Inventario Alimentario (H1-H5)** | Lotes/vencimientos, FEFO real, unidades/conversiones, mermas, recetas/BOM, costeo | `src/inventory/index.js`, `src/inventory/lotes.js`, `src/inventory/unidades.js`, `src/inventory/mermas.js`, `src/inventory/recetas.js` |
| **Contabilidad** | CxC/CxP, facturas, pagos, aging, asientos PUC, conciliación | `src/accounting/` |
| **Pedidos & Ventas** | Flujo conversacional, carrito, confirmación, estados, KDS | `core/flows/`, `transports/web.js` |
| **Domicilios** | Costo por distancia (OSRM + haversine), faixas, radio máximo | `core/geo.js` |
| **DIAN Middleware** | Facturación electrónica Colombia (habilitación 60F/20NC/20ND, UBL 2.1, XAdES-BES) | `dian-middleware/` |
| **Observabilidad** | Health checks (`/api/health`, `/api/salud`), métricas, logs estructurados | `src/health/`, `transports/web.js` |
| **Multi-tenant (Datos)** | Aislamiento por `tenantId` en SQLite (carpeta `data/<tenantId>/`) y PostgreSQL (RLS) | `config.js` (dataDir), `core/db-sqlite.js`, `src/db/` |

### Segmento (Vertical — define capacidades y reglas de negocio)

El segmento se define en `config.json` → `segmento: "comidas" | "salud" | "retail" | "belleza"`.

| Segmento | Capacidades habilitadas | Config específica en `config.json` |
|----------|------------------------|-----------------------------------|
| **comidas** | Pedidos por WhatsApp, menú con alias/precios, domicilios por distancia, KDS, recetas/BOM, inventario con lotes/FEFO | `productos[]`, `domicilios.faixas[]`, `menu.color/logo`, `ubicacion_negocio` |
| **salud** | Citas/agenda, catálogo de servicios, profesionales, horarios, historias clínicas básicas | `servicios[]`, `profesionales[]`, `horarios[]` |
| **retail** | Inventario con stock por producto, ventas directas, agotado automático, códigos de barras | `stock{}`, `mensaje_agotado`, `productos[]` con `codigo_barras` |
| **belleza** | Recursos (sillas/camillas), profesionales con agenda, paquetes/sesiones, fidelización | `recursos[]`, `profesionales[]`, `paquetes[]` |

**Regla**: el core provee las primitivas; el segmento selecciona qué primitivas activa y qué validaciones extra aplica. Un cliente de segmento "comidas" NO ve la UI de agenda médica.

### Tenant (Cliente individual — `clients/<slug>/config.json`)

El tenant es la instancia concreta. Su `config.json` contiene:

```json
{
  "id": "slug-unico",              // Obligatorio: identificador único (kebab-case)
  "negocio": "Nombre Visible",     // Nombre del negocio para UI
  "segmento": "comidas",           // Vertical: comidas | salud | retail | belleza
  "ciiu": "5611",                  // Código CIIU para DIAN
  "menu": {                        // Branding del panel y menú público
    "color": "#1f9d55",            // Color principal (CSS var --ac)
    "logo": "https://...",         // URL del logo (se muestra en sidebar)
    "url": ""                      // URL del menú público (opcional)
  },
  "productos": [                   // Catálogo (segmento comidas/retail)
    { "nombre": "Producto", "alias": ["alias1"], "precio": 10000, "ingredientes": "..." }
  ],
  "servicios": [],                 // Catálogo (segmento salud/belleza)
  "profesionales": [],             // Staff (segmento salud/belleza)
  "horarios": [],                  // Agenda (segmento salud/belleza)
  "recursos": [],                  // Sillas/camillas (segmento belleza)
  "paquetes": [],                  // Paquetes de sesiones (segmento belleza)
  "stock": {},                     // Stock inicial (segmento retail)
  "domicilios": {                  // Config de entrega (segmento comidas)
    "faixas": [{"desde_km":0,"hasta_km":5,"costo":3000}],
    "radio_max_entrega_km": 10,
    "gratis_si_total_sobre": 50000
  },
  "ubicacion_negocio": {"lat": 4.6, "lng": -74.0},  // GPS para domicilios
  "puerto": 3000,                  // Puerto HTTP (asignado automáticamente si no se pone)
  "numero_dueno": "57300...",      // WhatsApp del dueño (para alertas)
  "hora_reporte": "21:00",         // Hora del reporte diario
  "moneda": "$",                   // Símbolo de moneda
  "nota": "Comentario interno"
}
```

### Aislamiento de datos por tenant

- **SQLite (dev)**: Cada tenant tiene su carpeta `data/<tenantId>/` con su `neurallgo.db` y `auth_info_<tenantId>/`.
- **PostgreSQL (prod)**: Row-Level Security (RLS) en todas las tablas con `tenant_id`. El contexto de tenant se inyecta en cada query vía `SET LOCAL app.tenant_id = '...'`.
- **WhatsApp**: Sesiones separadas por `auth_info_<tenantId>/`.
- **Archivos**: Subidas y exports en `data/<tenantId>/uploads/`.

### Validación del client pack

Al arrancar con `--cliente <slug>`, el sistema:
1. Resuelve `clients/<slug>/config.json` (o ruta absoluta si termina en `.json`).
2. Valida estructura obligatoria (`id`, `negocio`, `segmento`, `productos[]` o `servicios[]` según segmento).
3. Valida cada producto: `nombre` no vacío, `precio >= 0`, `alias` array.
4. Falla rápido con mensaje accionable si hay errores (`[CONFIG] Client pack inválido`).
5. Establece `config.packValidado` y `config.clienteId` para uso del runtime.

### Branding dinámico (Theme Pack)

El panel empresarial consume `/api/branding` (público, sin auth) y aplica:
- `--ac` (color principal) → botones, enlaces, badges, sidebar activo
- `--ac-light` / `--ac-hover` → derivados automáticos
- Logo en sidebar (`.brand-logo`)
- Nombre del negocio en sidebar (`#brandNombre`)

Esto permite que **cada tenant tenga su identidad visual** sin cambios de código.

### Flujo de onboarding de un cliente nuevo

```bash
# 1. Copiar plantilla
cp -r clients/demo/ clients/nuevo-cliente/

# 2. Editar config.json con datos reales
#    - id: "nuevo-cliente"
#    - negocio: "Nombre Real"
#    - segmento: "comidas" (o salud/retail/belleza)
#    - menu.color: "#hex-del-cliente"
#    - menu.logo: "https://..."
#    - productos[] / servicios[]: catálogo real
#    - domicilios.faixas: tarifas reales
#    - ubicacion_negocio: GPS real

# 3. Probar arranque
node index.js --cliente nuevo-cliente

# 4. Verificar panel
#    http://localhost:<puerto>/panel-empresarial
#    → Debe mostrar color, logo y nombre del cliente

# 5. Configurar credenciales reales en .env (NUNCA en config.json)
#    LLM_API_KEY, WHATSAPP_CLOUD_*, PANEL_PASSWORD, JWT_SECRET, etc.

# 6. Desplegar (Docker/K8s) con su propia .env y volúmenes persistentes
```

### Ejemplos en este repo

| Cliente | Segmento | Branding | Descripción |
|---------|----------|----------|-------------|
| `demo` | comidas | Verde `#1f9d55` | Cafetería genérica (3 productos) |
| `demo2` | comidas | Naranja `#e67e22` | Pizzería (5 productos, domicilios con faixas) |

### Lo que NO va en `clients/<slug>/`

- Credenciales reales (`.env` por despliegue, gitignored)
- Datos operativos (ventas, pedidos, clientes, recetas ejecutadas) → viven en BD del servidor
- Logs, backups, sesiones WhatsApp → `data/<tenantId>/` (gitignored)
- Certificados DIAN, claves privadas → secret manager / vault por despliegue

### Migración de tenant (dev → prod)

1. En dev: `node index.js --cliente slug` (SQLite local)
2. En prod: 
   - Crear BD PostgreSQL con migraciones (`npm run db:migrate`)
   - Configurar `.env` con `DB_ENGINE=postgres` + credenciales PG
   - Montar volúmenes persistentes para `data/<slug>/` y `auth_info_<slug>/`
   - Desplegar contenedor con `--cliente slug` o `CLIENTE_CONFIG=clients/slug/config.json`

El core es **idéntico**; solo cambian el `config.json` del tenant y las variables de entorno del despliegue.