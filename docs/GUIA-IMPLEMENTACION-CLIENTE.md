# GUIA-IMPLEMENTACION-CLIENTE.md — Cómo implementar Soluciona IA para un cliente nuevo
## Proceso estándar: ~35 minutos de reloj (sin contar esperas de Meta/DIAN)

> **Qué es esto:** el manual interno de cómo llevar un cliente (comercio, restaurante, taller,
> servicio...) desde cero hasta un entorno operativo — sin riesgo de meterlo mal.

---

## Fase -1 — Preconfiguración (antes de sentarte con el cliente)

| # | Acción | Qué necesitas | Tiempo |
|---|--------|---------------|--------|
| 1 | Crear `clients/<slug>/config.json` | Datos básicos del negocio (nombre, ciudad, moneda) | 5 min |
| 2 | Crear/copiar un `.env` nuevo con contraseñas nuevas y aleatorias | Nada del viejo — siempre rotar | 2 min |
| 3 | Ejecutar **npm run setup** (le pasamos `./scripts/verify-environment.js`) | — | 1 min |
| 4 | Verificar `/login` funciona | — | 2 min |

---

## Fase 0 — Credenciales del panel (el cliente tiene que tener control)

Ejecuta:

```powershell
node reset-admin.js "ContrasenaFuerte-ElegidaPorElCliente#Año"
```

✅ **El cliente elije la contraseña** (no la generamos nosotros). El cliente debe escribirla
de inmediato en su gestor de contraseñas o documento de trabajo protegido.

Después — protocolo de dueños (es la misma regla de la seguridad industrial):
- Panel legado (`/`): contraseña maestra controlada por el cliente, no por nosotros.
- Panel empresarial: usuario `admin@localhost` con la clave que elija LIENTE.
- Los dos **nunca** deben compartirse entre clientes ni empleados.

---

## Fase 1 — WhatsApp del cliente (siguiendo GUIA-WHATSAPP-CLOUD.md)

- Usamos SIEMPRE número de prueba de Meta primero. Solo cuando todo funcione se migra al real.
- El cliente dará la cuenta de Meta y Business Manager; nosotros guiamos; él ejecuta con sus datos.

---

## Fase 2 — IA del cliente (opcional pero recomendadísima)

En el `.env` del cliente, pone las claves de NVIDIA/Gemini que le corresponden.
El bot funciona sin ellas, pero la magia (entender y responder) las necesita.

---

## Fase 3 — Validación final antes de dejar al cliente con su sistema

Ejecutar **siempre** esta lista:

```
npm run setup                  → todos los chequeos en OK/INFO
npm test                        → 45/45 (o la suite vigente) verde
node --check index.js           → sin errores de sintaxis
```

Entonces la demo.

---

## 4. Checklist de recepción (para documentar cada entrega)

```
- [ ] config.json del cliente en repo privado del cliente (nunca en git público)
- [ ] .env del cliente en su entorno, no en un gestor externo a él
- [ ] Contraseña del panel entregada en mano / documento oficioso
- [ ] 2FA activada al final del onboarding (control humano final)
- [ ] Documentos de registro: cliente_fecha.doc actualizado
```

---

## Deuda conocida (honesta y visible)

- La primera vez que pongas FK para delivery/facturación en producción hay aduanaDIAN.
  Eso es T5 del proyecto base (credenciales propias del negocio).
- Las llaves de IA/Visión las debe proveer el cliente: el medio nunca las debe tener.

---

*Guía viva. Actualízala cada vez que un proceso cambie.*
