# Base de Conocimiento (KB) — soluciona

Runbooks de los problemas más comunes. Cada archivo es un procedimiento de diagnóstico y corrección **que ejecuta un humano** (el agente solver lo usa como referencia; nunca ejecuta por sí solo).

## Estructura de un runbook

1. **Síntomas** (cómo reconoce el problema)
2. **Causas comunes** (orden de probabilidad)
3. **Diagnóstico** (comandos/acciones de verificación, una por paso)
4. **Solución** (pasos con aprobación previa; backup antes de tocar)
5. **Prevención**
6. **Notas** (datos de contacto del proveedor, enlaces oficiales)

## Reglas

- Se escribe con aprobación del titular (append-only: se agregan versiones, no se borra).
- Un runbook bien hecho ES el producto: cuida los detalles.
- Referencia cruzada desde los tickets (`en_kb: true`).

## Índice

- `correo-no-envia.md` — Correo no envía/recepciona (Office 365 / Gmail)
- `impresora-no-imprime.md` — Impresora en cola o no responde (Windows)
- `sistema-lento-arranque.md` — PC lenta al arrancar (diagnóstico básico)
- `wifi-inestable.md` — Conexión Wi-Fi cae o es lenta
- `pasarela-pago.md` — Fallas al cobrar con pasarela de pago (PILOTO)

_(vacío: se llena con los 20 primeros casos reales de tu experiencia — semana 4 del plan maestro)_
