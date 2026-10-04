# clients/ — Paquetes de tenant (Cliente = Config + Contenido)

Cada subcarpeta es un **cliente completo**: su `config.json` es lo único que lo diferencia del core.

## Regla de oro

> Crear un cliente nuevo = copiar `clients/demo/` → renombrar a `clients/<slug>` → editar su `config.json`.

Sin tocar ni una línea del core. Datos del cliente, marca, menú y reglas de negocio viven aquí.

## Convenciones

- `clients/<slug>/config.json` — identidad, branding, menú, reglas de negocio, horarios.
- `clients/<slug>/assets/` — logos e imágenes del cliente.
- `clients/<slug>/content/` — contenido del cliente (opcional).

## Circuito de arranque

```bash
# Desarrollo con el pack del cliente
node index.js --cliente san-angel

# Modo standalone (sin clientes/): usa config.json en la raíz
node index.js

# Con variable de entorno
$env:CLIENTE_CONFIG = 'clients\demo\config.json'
node index.js
```

## Validación

Al arrancar, el sistema valida el pack y falla rápido con mensaje accionable si está mal.
Los errores se reportan como `[CONFIG] Client pack inválido`.

## Lo que NO va aquí

- Credenciales reales del cliente (van en `.env` de cada despliegue, nunca en git).
- Datos operativos del cliente (ventas, clientes, recetas) — esos viven en el servidor.
