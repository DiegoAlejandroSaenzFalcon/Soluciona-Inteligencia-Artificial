# GUIA-WHATSAPP-CLOUD.md — Activar WhatsApp Cloud API para un cliente
## Procedimiento amigable y controlado (sin trauma, sin cegar el número real)

> **Modo de uso:** guía paso a paso para configurar WhatsApp Cloud de forma profesional y granulada.
> Válida tanto para esta máquina como para agregar cualquier cliente nuevo.
>
> **Regla de oro de este documento:** *primero el numero de PRUEBA de Meta, luego el número del cliente.
> La migración a producción se hace UNA VEZ, cuando todo ya está verde.*

---

## 0. Conceptos mínimos que debes controlar

| Término | Es | Quién lo guarda |
|---|---|---|
| Meta Business Account | El "paraguas" de tu negocio en Meta | El cliente, contigo invitado |
| App de desarrollador | El contenedor lógico de la integración | El cliente (tú como desarrollador registrado) |
| Test number | Número de teléfono de prueba que Meta te regala | Se usa gratis mientras validas |
| Phone Number ID | ID del número dentro de un WABA | Se genera al agregar el número |
| Token permanente | La llave de producción (System User) | Meta BM → Seguro en .env, no en git |
| App Secret | Secreto para verificar webhooks (HMAC) | Meta App → nunca fuera de vault |
| Verify token | Un texto largo que TÚ elijas y que Meta usa para saber que el endpoint es tuyo | Tu .env |

---

## 1. Configurar WhatsApp en Meta (solo UNA VEZ):

1. Ve a **developers.facebook.com** con la cuenta de Meta del cliente.
2. **My Apps → Create App → Business** .
3. Dentro de la app: **Add product > WhatsApp > Empezar**.
4. En WhatsApp > **API Setup** (o "Quickstart"): anota el **App Secret** (en Settings > Basic) y el **Phone Number ID del número de prueba**.
5. En Business Manager > **Settings > System Users**: crea un System User (nombre sugerido: "soluciona-bot"), asignale la app y genera token permanente con permisos `whatsapp_business_messaging` y `whatsapp_business_management`. **Guardalo en un gestor de contraseñas, no aquí.**

## 2. El número: PRIMERO la prueba, NUNCA lo real antes

- Meta regala un **número de prueba** en cada app. Lo usas al principio: puedes enviar y recibir sin riesgo de bloqueos ni perder tu número real.
- **No migres el número de producción del cliente hasta que el flujo completo este verde**. Esto es por política de seguridad y de operación (el número deja de funcionar en la app móvil cuando se migra).

## 3. Llenar el .env del cliente

En el proyecto del cliente (nunca en git), configura:

```env
WHATSAPP_TRANSPORT=cloud
WHATSAPP_CLOUD_PHONE_ID=<phone_number_id_de_meta>
WHATSAPP_CLOUD_TOKEN=<token_permanente_del_system_user>
WHATSAPP_BUSINESS_ACCOUNT_ID=<waba_id>
WHATSAPP_APP_SECRET=<app_secret_de_meta>
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<cadena-inventada-por-nosotros-larga>
```

Todos estos valores deben quedar en `.env` del entorno, NUNCA en código ni por chat.

## 4. Levantar local y comprobar el recepcion (E2E)

En la maquina local (o servidor de pruebas):

```bash
# 1. Aseguramos que el sistema arranca
node index.js

# 2. En OTRA terminal, abrir el tunel publico:
cloudflared tunnel --url http://localhost:3000
# Salida: una URL tipo https://xxxx.trycloudflare.com
```

En Meta App > WhatsApp > **Webhook** configura:
- Callback URL: `https://xxxx.trycloudflare.com/webhook/whatsapp`
- Verify Token: el mismo que pusiste en `.env` (WHATSAPP_WEBHOOK_VERIFY_TOKEN)
- Suscripción: campo `messages` activado.

Guardar. Meta verifica automaticamente el endpoint con un GET. Si tu webhook responde la challenge, queda **Registrado**.

**Se�al de exito:** desde cualquier otro número, envia un mensaje al número de prueba de Meta, y debería llegar al pipeline del sistema.

## 5. Prueba e2e sobre número de prueba

En la app de Meta (WhatsApp > API Setup) hay un botón **Send test message**. Úsalo hacia TU teléfono (el de la persona que configura). Esto comprueba que el outgoing funciona; el incoming se ve en los logs del servidor (raw request JSON).

## 6. Producción — solo cuando esté todo verde

Cuando el número de prueba ya envía/recibe y el dashboard muestra las conversaciones:

1. En Meta App > WhatsApp > **Phone Numbers** agrega el número real del cliente (verificación por SMS al telefono del cliente).
2. Una vez verificado el número, sustituye `WHATSAPP_CLOUD_PHONE_ID` por el Phone ID del número real.
3. Vuelve a probar hand-shake y un mensaje real.
4. **Conmuta**: WHATSAPP_TRANSPORT=cloud ya será el activo en producción; y baileys queda como back-up (lo mantenemos pero desactivado).

---

## Seguridad y gobierno que NO se negocian

- El token permanente se almacena SOLO en el `.env` del servidor y opcionalmente en un gestor (1Password).
- Nunca lo envíes al cliente por WhatsApp/email; nunca lo subas a git (gitleaks lo bloquearía de todos modos).
- Si algo falla en Meta, la suscripción no tolera URLs sin verificar. Es fail-closed: si falla, Meta no llama.
- Para eliminar riesgo de cuenta: el número de prueba desaparece tras 24h sin uso del panel; recreamos sin dramas.

---

*Documento redactado para que "solucionarWhatsApp.txt" sea derivable como estándar. Probado y auditado en el proceso de Soluciona IA (sesión de implementación 2026-09-23).*
