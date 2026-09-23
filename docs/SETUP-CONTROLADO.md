# SETUP-CONTROLADO.md — Puesta en marcha con credenciales controladas
## Soluciona IA Comercial · instancia cliente · primera vez

> **Cuándo usarlo:** cuando configuras el sistema para un cliente por primera vez.
> **Qué resuelve:** el problema de "arranqué y nadie sabe la contraseña del panel" que detectamos en auditoría.
>
> **Regla de seguridad permanentemente:**
> - 🚫 Las contraseñas **nunca** se commitean.
> - 🚫 Las contraseñas **nunca** se piden ni por chat ni por correo al propietario.
> - 🚫 El `.env` **jamás** entra a git (está en `.gitignore`).
> - ✅ Las contraseñas del sistema se generan con entropía real y se entregan en un documento fechado y firmado.

---

## 1. Qué credenciales se controlan

| Nivel | Qué es | Cargo |
|---|---|---|
| **Panel Empresarial** | Usuario `admin@localhost` + contraseña propia (+2FA si se activa) | Dueño del cliente |
| **Panel legado** (`/`) | Contraseña maestra del panel (`PANEL_PASSWORD`) | Emergencia/técnico |
| **JWT_SECRET** | Secreto de sesiones/jwt | Rotación cuando haga falta |
| **WhatsApp/ Meta** | `WHATSAPP_CLOUD_PHONE_ID`, `WHATSAPP_CLOUD_TOKEN`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_APP_SECRET` | Cuenta Business del cliente |
| **IA providers** | NVIDIA / Gemini keys | Vienen del proveedor |
| **DB** | credenciales (cuando pase a Postgres) | BD del cliente |

## 2. Qué NUNCA debe pasar

- Commitear `.env`.
- Escribir la contraseña del panel pegada en `README`.
- Pedir las contraseñas del cliente por WhatsApp, enviadas "para probar".
- Crear credenciales genéricas que se compartan entre clientes.
- Que la contraseña del panel se genere aleatoriamente en cada arranque (ese era el bug).

## 3. Procedimiento de primera vez (lo que se ha ejecutado y DOCUMENTADO)

### Paso 3.1 — Crear el entorno controlado
```powershell
cd soluciona-inteligencia-artificial-comercial
npm ci
# Crear .env desde .env.example
Copy-Item .env.example .env
```
Después se actualiza el `.env` con: `PANEL_PASSWORD=<clave maestra>`, `JWT_SECRET=<generado>`, y cuando proceda las keys de IA y WhatsApp.

### Paso 3.2 — Fijar la contraseña del Panel Empresarial (admin)
```powershell
node reset-admin.js "TuContrasenaFuerte#2026"
```
Salida: `Contraseña del Panel Empresarial (admin@localhost) actualizada correctamente.`

Verificación obligatoria: he hecho exactamente esto el 2026-09-23 con una contraseña fuerte
generada para el cliente. Comprobado que el login en `/panel-empresarial` devuelve `200` con token.
(La contraseña se comunicó fuera de banda; no está en este documento.)

### Paso 3.3 — Prueba de acceso
```powershell
node index.js
# luego: dirigirse a http://localhost:3000/panel-empresarial y entrar con @admin
```

### Paso 3.4 — Activar 2FA (recomendado, no opcional en producción)
1. En el panel: Seguridad → Activar 2FA (TOTP).
2. Escanear el QR con la app de autenticador del dueño.
3. Guardar los códigos de recuperación en un gestor de contraseñas del dueño.

---

## 4. Matriz mínima de activos por cliente (lo que hay que pedir, sin contraseñas)

Es el modelo "Cliente=OWNER, Soluciona=ADMIN" que también sigue la arquitectura de seguridad.
Nunca pedir: la contraseña del email del cliente. Sí pedir: invitar a tu correo de trabajo como editor/partner en cada plataforma.

Ver `docs/CHECKLIST-IMPLEMENTACION-CLIENTE.md` para el checklist completo.

---

## 5. Historial de ejecución este proyecto (compliance)

- 2026-09-23: Primera puesta en marcha controlada. Admin fijado, logins verificados (legacy + empresarial). Doc creado. — Auditor IA Kimi K3.

---

*Documento creado tras la sesión #012 · Está en git; la contraseña no.*
