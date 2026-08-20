# Ciclo de Vida del Ticket y SLA — soluciona v1.0

Definición operativa de cómo se procesa cada solicitud desde que llega hasta que se cierra, con qué registro queda y qué SLA prometemos (y cumplimos).

## 1. Ciclo del ticket

```
 ENTRADA ──► TRIAGE ──► DIAGNÓSTICO ──► PROPUESTA ──► APROBACIÓN ──► EJECUCIÓN ──► VERIFICACIÓN ──► CIERRE
 (email/    (IA:       (con          (se envía    (cliente o    (según el     (prueba de    (bitácora +
  API/       categoría,  catálogo de    al cliente   titular       alcance JIT   resultado y   reporte,
  Telegram)  urgencia,   causas        con pasos    aprueba       aprobado      confirmación  cierre)
             confianza)  + KB)          precisos)
```
Cada transición cambia el estado del ticket y se registra con timestamp. Nada se oculta: el cliente ve su flujo.

## 2. Estados del ticket

| Estado | Descripción | Quién lo cambia |
|---|---|---|
| `nuevo` | Recibido, sin análisis | Sistema |
| `en_triage` | Clasificando (L1, L2, urgencia) | Agente |
| `necesita_info` | Falta información; se pregunta al cliente | Agente |
| `propuesta_enviada` | Agente propone solución y pide aprobación | Agente |
| `aprobado` | Listo para ejecutar | Cliente/titular |
| `en_ejecución` | Trabajo dentro de la ventana (log activo) | Sistema |
| `verificando` | Prueba de resultado | Agente/titular |
| `resuelto` | Cerrado con reporte | Sistema |
| `escalado` | A humano/tercero con contexto completo | Agente |
| `cancelado` | Sin interés o fuera de alcance (registrado) | Sistema |

## 3. Prioridades y SLA estándar

| Prioridad | Definición | Primera respuesta | Resolución | Ejemplos |
|---|---|---|---|---|
| P1 · Crítica | Servicio central caído / brecha de seguridad | 30 min (alert 24/7) | ≤ 4 h | Servidor copado, virus, pago que no refresca |
| P2 · Alta | Varios usuarios afectados, hay alternativa | 60 min | ≤ 24 h | Correo caído de 3 usuarios, impresoras de red |
| P3 · Normal | Afecta a 1-2, sin bloqueo | 4 h | ≤ 48 h | Activación de licencias, configuraciones |
| P4 · Baja | Mejora o trámite | 1 día | ≤ 5 días | Orden de equipo, mantenimiento preventivo |

Los SLA se multiplican por contrato (empresa 24/7 no igual que pyme con horario). **El SLA prometido es el que se puede registrar y reportar.** Con el agente los tiempos de primera respuesta son automáticos (minutos), lo que hace los SLA más fuerte de venta.

## 4. Escalamiento

- **Criterios**: (a) agente no logra diagnóstico según umbral de confianza <7/10, (b) ticket fuera de alcance, (c) riesgo de cambio con impacto alto, (d) el cliente lo pide.
- **Todo escalado hereda contexto**: transcripción completa del agente, diagnóstico, intentos y propuestas → el escalado es "editar, no empezar de cero".
- Escalado a tercero (fábrica/vendedor/ISP): nosotros gestionamos la respuesta del tercero y no finalizamos hasta el cierre (los problemas de múltiples proveedores se atienden como uno solo).

## 5. Registro por ticket (lo que queda)

| Campo | Descripción |
|---|---|
| ID, fechas | Apertura, triage, propuesta, cierre |
| Cliente | organización, contacto, canal de entrada |
| Origen | sistema, catálogo, prioridad |
| Resumen | 1-3 líneas del problema |
| Causa raíz | diagnóstico técnico |
| Plan ejecución | pasos **aprobados** (no ejecutados) |
| Aprobación | quién, cuándo, en qué medio (log/delta) |
| Ejecución | log de tool-calls del agente / comandos, con hashes |
| Verificación | prueba y captura |
| Reporte | resumen legible para el cliente |
| Conocimiento | ¿agrego a la KB? (runbook nuevo/sí) |
| Tiempos | duración total, en humana |

Estructura del archivo: `tickets/<id>.json` (máquina) + `tickets/<id>.md` (humano), en carpeta por cliente: `clientes/<cliente>/`.

## 6. Informes automáticos

- **Tras cada ticket**: reporte de cierre (qué pasó, qué se cambió, prueba).
- **Mensual al cliente**: N tickets, tipos, tiempos de respuesta, % resueltos, escalados, recomendaciones, estado de riesgos. Lo genera el agente (plantilla en `templates`).
- **Trimestral interno**: matriz de KPIs (docs/01) y lecciones a la base de conocimientos (Kaizen).

## 7. Regla de integridad

- No se editan ni eliminan tickets o bitácoras: append-only.
- Los informes al cliente salen solo del registro automático (con la solución) — nunca de memoria.
- Si el agente no está seguro: el ticket queda en `necesita_info` o `escalado`, nunca inventa.

---

*v1.0 — 2026-08*
