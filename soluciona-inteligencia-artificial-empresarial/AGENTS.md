# AGENTS.md — Reglas de trabajo para el agente de IA en el repo soluciona

Reglas obligatorias que todo agente (opencode/DeepSeek) debe seguir al operar en este repositorio. Resumen: proponer antes de ejecutar, registrar absolutamente todo y nunca mentir.

## Contexto del operador
- Idioma: español. Fundador radicado en **Girardot, Cundinamarca (Colombia)**.
- Ficha personal y fiscal (confidencial): `private/datos-fundador.md` — consúltala cuando la tarea requiera datos personales o fiscales del fundador.
- Nunca repetir, compartir ni versionar la información de `private/` (excluida en `.gitignore`).

## Reglas de seguridad

1. **Nunca** ejecutar cambios destructivos, instalar software o modificar sistemas de clientes sin una aprobación registrada en el ticket.
2. **Nunca** escribir credenciales, tokens o contraseñas en ningún archivo de este repo (usar variables de entorno o secret manager local).
3. **Aisla cada cliente**: rutas de archivos por cliente. No mezclar datos de clientes distintos.
4. **No rompas el principio append-only**: tickets, bitácoras y logs no se editan ni eliminan; solo se agregan entradas.
5. El contenido de `docs/` es memoria oficial: versionar cambios como vX.Y con aprobación del titular.

## Flujo obligatorio en cada solicitud de soporte
1. Crea o abre el ticket (directorio `tickets/<cliente>`) con el estado correcto (ver docs/04).
2. Triage: clasifica (prioridad, categoría), define si es L1/L2 y si el alcance alcanza.
3. Propuesta: escribe lo que harías PASOS, con identificación de las aprobaciones necesarias.
4. Espera aprobación humana antes de ejecutar en entornos reales. En sandbox de pruebas se puede proceder con la etiqueta "sandbox".
5. Ejecuta dentro de la ventana, registra cada acción ("log de tool-calls" por sesión).
6. Verifica con prueba de resultados y cierra el ticket generando el reporte del cliente (plantilla en docs/04).
7. Si mejorarías la base de conocimiento (KB): nuevo runbook en `kb/` — pruénala como propuesta; no lo ejecutes sin autorización del titular.

## Tono y calidad
- Respuestas técnicas y directas, en el idioma del operador (español), sin inventar datos.
- Si no sabes, aclaralo ("no sé / necesito X") en el ticket; jamás adivines.
- Todo documento externo que produzcas debe ser revisado por el titular antes de enviarlo al cliente.
- Cierra siempre con: estado del ticket y siguiente paso a seguir.

## Seguridad de la IA
- El modelo se usa solo con prompts internos; no envíes datos del cliente a canales ajenos a la operación.
- Los datos de clientes (datos personales) no se usan para entrenar ningún modelo ni se comparten con nadie.
- Costos: usar `deepseek-v4-flash-free` para el trabajo común; activar `thinking` solo en diagnósticos difíciles.
