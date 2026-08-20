# Multiplataforma: correr el sistema en Android (y cualquier lugar)

El sistema tiene DOS partes separadas:

1. **El bot** (Node.js): escucha WhatsApp, toma pedidos, guarda en SQLite, emite reportes. Puede correr en Windows, Android o un servidor (VPS).
2. **Los paneles** (web): dashboard, cocina (KDS), asistentes IA y panel central. Son páginas web instalables como APP en el celular.

## Opción A — El celular como "app de Windows" (PWA) — RECOMENDADA

El cliente NO necesita que el bot corra en su celular: basta con que el bot corra en su PC o en un VPS, y en el celular **instala el panel como app**:

1. Abre en el navegador del celular (Chrome): `http://<ip-del-pc>:<puerto>` (misma red wifi) o la URL pública del VPS.
2. Menú del navegador (⋮) → **"Instalar aplicación"** (o "Agregar a pantalla de inicio").
3. Aparece un ícono como una app normal: pedidos, cocina, clientes, asistentes y consumo IA funcionan a pantalla completa.
4. Misma URL en otro celular = varios usuarios (cajero, cocina) con la misma app.

Requisito: el bot ya es PWA (manifest + service worker + íconos incluidos). El celular y el PC deben estar en la misma red, o el bot en un VPS con IP pública.

## Opción B — El bot corriendo en el propio Android (Termux)

Para un negocio que NO tiene PC: el bot corre dentro de un celular Android usando Termux (sin root).

1. Instala **Termux** desde F-Droid (no Play Store).
2. En Termux:
   ```
   pkg update -y
   pkg install nodejs-lts git -y
   ```
3. Copia la carpeta del proyecto al celular (USB o `git clone` de tu repo).
4. En la carpeta del proyecto:
   ```
   npm install
   node index.js --cliente clientes/<id>.json
   ```
5. Escanea el QR con el WhatsApp del negocio y deja Termux abierto (o usa `termux-wake-lock` para que no se suspenda).

Limitaciones: el celular debe quedar encendido y conectado (batería), y WhatsApp del negocio no debe abrirse en otro dispositivo (se desvincula la sesión del bot).

## Opción C — VPS para operación 24/7 (todos los clientes)

El bot corre en un servidor barato (~$4/mes, o la capa gratuita de Oracle Cloud):

- Node.js LTS + `npm install` en el VPS.
- `node index.js --cliente clientes/<id>.json` con `systemd`/`pm2` para que no muera.
- Paneles accesibles por URL pública: cada cliente entra con su navegador (o PWA instalada) a su puerto.
- El panel central (4000) muestra todos los negocios desde un solo lugar.

## Resumen de decisión

| Necesidad del cliente | Solución |
| --- | --- |
| Ya tiene PC (Windows) | Bot en el PC + panel PWA en el celular (A) |
| No tiene PC | Bot en Termux (B) o VPS (C) + panel PWA |
| Quiere 24/7 sin depender de un celular | VPS (C) |
| Varias sucursales/mesas | Panel central (4000) + PWA en cada dispositivo |
