# CHECKLIST-IMPLEMENTACION-CLIENTE.md — Dashboard de verificación de entrega

> Uso: imprime o rellena digitalmente en cada entrega parcial.
> Cada firma = "lo hemos hecho, hola evidencia". Cada ✕ = "bloquea el siguiente hito".

---

## Datos del proyecto

- **Cliente:** San Angel Perros Transmilenio (Girardot)
- **Entorno:** [x] Local / [ ] Staging / [ ] Producción
- **Fecha:** __________________
- **Responsable del proceso:** __________________

## FASE 0 — Credenciales y acceso (establecidas)

- [ ] **Panel Empresarial**: existe, `admin@localhost` login OK (200+token) — Evidencia: sesión #012
- [ ] **Panel legado**: login con `PANEL_PASSWORD` OK (302 + cookie) — Evidencia: sesión #012
- [ ] **`.env` validado** y sin secretos en git (gitleaks en verde) — Evidencia: `npm run setup --fail-on-missing` = 0 fallos
- [ ] **Contraseña entregada** al dueño del cliente (en mano/documento seguro, no queda aquí)

## FASE 1 — WhatsApp (test)

- [ ] Meta App creada (nombre: **San Angel - demo**) — Evidencia: URL de la app en BM
- [ ] System User creado + token permanente generado en el gestor del cliente
- [ ] .env del cliente tiene las 5 variables (ver `docs/GUIA-WHATSAPP-CLOUD.md`)
- [ ] `cloudflared tunnel` abierto en esta máquina (URL: _________________)
- [ ] Webhook verificado en Meta (se ve "Subscribed" en campo messages) — **captura en disco: evidence/**
- [ ] Mensaje de prueba de Meta llegó al sistema (logs de nuestro servidor) — **evidencia: server log**
- [ ] Bot respondió al mensaje de prueba con plantilla auto (no humana)

## FASE 2 — WhatsApp (producción)

- [ ] Número real del cliente verificado en la app de Meta (SMS de verificación confirmado)
- [ ] `WHATSAPP_CLOUD_PHONE_ID` cambiado al ID del número real
- [ ] Envío y recepción real en número real OK — **evidencia: captura de pantalla del chat**
- [ ] El número antiguo sigue funcionando en la app (migración no rota nada — ya validado = ok)

## FASE 3 — IA activada

- [ ] LLM_API_KEY (NVIDIA) presente y funcional — evidencia: pregunta de prueba respondida desde el panel
- [ ] Gemini presente o declarado como no-requerido
- [ ] **Regla respetada:** las claves las pegó el propietario en su `.env`, nunca en nuestros archivos ni en chat

## FASE 4 — Reglas del juego (para el cliente)

- [ ] Manuel de usuario entregado (`docs/MANUAL-USUARIO.md` cuando exista, o similar)
- [ ] Capacitación básica realizada (2 sesiones x 1h recomendado por CLIENT_ADAPTATION.md)
- [ ] Manifiesto de seguridad entregado: contraseñas no compartidas, accesos solo con autorización, check de 2FA activo

---

**Firma cliente (propietario):** __________________  
**Firma Soluciona (quien configura):** __________________  

*Este documento se queda en el expediente del cliente. Cada tic es una decisión.*
