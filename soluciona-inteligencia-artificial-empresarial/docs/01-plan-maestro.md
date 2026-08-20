# Plan Maestro — soluciona (v1.0)

Hoja de ruta para construir y vender un servicio de soporte TI automatizado con IA (opencode + DeepSeek V4 Flash) desde una laptop, con estándares profesionales de seguridad y documentación, camino a clientes regulados (bancos, fintechs) como objetivo final.

## 1. Método: ciclo científico + Kaizen

Cada fase se ejecuta como experimento:

1. **Hipótesis**: qué esperamos que ocurra y por qué.
2. **Experimento**: acción mínima, concreta, medible.
3. **Métrica**: el número que decide (nunca opiniones).
4. **Decisión**: continuar, ajustar o descartar (ciclo PDCA).

Tabla de hipótesis fundacionales:

| # | Hipótesis | Experimento | Métrica de éxito |
|---|---|---|---|
| H1 | DeepSeek V4 Flash + opencode resuelve ≥70% de tickets L1 | Eval set propio de 50 tickets con respuesta esperada | Tasa de resolución ≥70% |
| H2 | El agente no duplica tickets ni inventa errores | 20 fallos simulados por el mismo | 0 duplicados, 0 falsos |
| H3 | El costo por ticket es marginal (< $0,10) | Contar tokens reales por ticket (cache hits vs miss) | < $0,10 por ticket |
| H4 | Un solo administrador supervisa 5+ clientes | 1 semana con el dashboard remoto | < 5 min de intervención por ticket |
| H5 | Un cliente pyme firma y renueva | Piloto real firmado | Renovación o referencia al mes 2-3 |

## 2. Estrategia de mercado: cómo se llega a un banco

La industria resuelve la barrera de confianza con **acceso por alcance + evidencia**, no con "dale acceso a toda la red". La ruta de entrada es gradual:

| Estapa | Cliente | Por qué es viable | Llave de entrada |
|---|---|---|---|
| Meses 1–3 | Pymes, oficinas, despachos (abogados, contadores) | Necesidad clara, competencia fragmentada | Velocidad + documentos profesionales |
| Meses 4–9 | Pymes con datos sensibles (clínicas, contadores de nóminas, fintechs pequeñas) | Regulados pero sin equipo TI | Nuestro paquete de evidencia ES su requisito |
| Meses 9–18 | Subcontrato de MSP/empresa mayores | Ellos venden a bancos y necesitan "tier 2" documentado | A nosotros nos acredita quien ya está adentro |
| Meses 18+ | Financieras / fintechs / subsidios | Nuestro paquete de evidencias lleva años sin manchas | Cuestionario de seguridad resuelto con documentos (docs/05) |

**Regla ética**: la honestidad es activo comercial. Si no tenemos SOC 2 o ISO certificada, lo decimos y entregamos el programa alineado (docs/02) + seguro + histórico de auditorías internas. Nadie empieza certificado; todo el mundo empieza documentado y honesto.

## 3. Fases de ejecución

### FASE 0 — Fundación (Semanas 1–2)
- [ ] Definir forma legal y fiscal del país (docs/06-legal-checklist.md)
- [ ] Escribir todos los documentos de este repo (seguridad, procedimientos, plantillas)
- [ ] Proteger mi estación: disco cifrado, MFA en todo, backups 3-2-1, red segmentada
- [ ] Plantilla de contrato + DPA + NDA lista para firmar
- **Objetivo**: puedo responder a cualquier pregunta de un cliente con un documento.

### FASE 1 — Producto técnico mínimo (semanas 3–6)
- [ ] Proyecto opencode: agentes `triager`, `solver`, `revisor`
- [ ] Flujo: entrada (API/email/Telegram) → triage JSON → diagnóstico → propuesta o ticket → reporte
- [ ] Dashboard remoto para supervisión desde el teléfono
- [ ] Base de conocimiento (runbooks) con los 20 problemas más comunes
- [ ] Eval set de 50 tickets con soluciones esperadas (tu experiencia de 17 años aquí vale oro)
- **Criterio**: un ticket de prueba genera ticket + reporte sin intervención y lo ves en el móvil.

### FASE 2 — Primer cliente real (semanas 7–12)
- [ ] Onboarding por el procedimiento 03: cuestionario, contrato, alcance por ticket
- [ ] Acceso JIT con registro y cierre de cada sesión
- [ ] En los 2 primeros meses: humano aprueba y ejecuta lo productivo (el agente propone)
- [ ] Reporte mensual al cliente con métricas (docs/04)
- [ ] Primera encuesta y referencia
- **Criterio**: primer cliente de pago y renovación al mes 2-3.

### FASE 3 — Profesionalización (meses 4–6)
- [ ] Seguros: ciberseguro + errores y omisiones (Tech E&O) — consultar brokers locales
- [ ] Paquete de confianza completo (docs/05)
- [ ] Autoevaluación de desvío ISO 27001 con checklist de controles (mapa de evidencia)
- [ ] Simulación de respuesta a incidentes (prueba escrita + prueba real controlada)
- **Criterio**: un cliente "sensible" (clínica/contador) acepta los documentos sin pelear.

### FASE 4 — Clientes con datos sensibles / subcontrato (meses 6–12)
- [ ] Gestionar un cuestionario de seguridad real de una entidad regulada y aprobarlo
- [ ] Oferta B2B: soporte nivel 1-2 para un MSP o empresa de software
- [ ] Reportes mensuales generados automáticamente por el agente (evidencia continua)
- **Criterio**: 1-2 clientes activos, 12 meses de pistas de auditoría continuas.

### FASE 5 — Escala y mercado regulado (meses 12–24)
- [ ] ISO 27001 certificación si el mercado la exige (año 2+); mientras: alineación continua
- [ ] Multi-cliente con aislamiento estricto (worktrees/directorios por cliente)
- [ ] Marca completa soluciona (logo, web, caso de éxito)
- [ ] Infraestructura de operación para clientes regulados: VMs del camino del cliente bajo sus reglas (nube con región aprobada, DLP)
- **Criterio**: 85% de resolución L1 automática y cliente tipo banco aceptó conversaciones formales.

## 4. Tablero de KPIs (revisión mensual)

| KPI | Definición | Objetivo | Fuente |
|---|---|---|---|
| Resolución L1 | % tickets resueltos en automático | ≥70% → 85% | Log de tickets |
| Primera respuesta | Tiempo del ticket a primera propuesta | <15 min | Log |
| MTTR | Min a resolución | <4h (normal) / <24h (P1) | Log |
| Escalación | % a humano | <30% → <15% | Log |
| Costo/ticket | dólares reales en tokens | <$0,10 | Monitor agentes |
| Errores que tocan producción | Cambios aplicados que causaron fallos | 0 | Revisión post-mes |
| Confianza | % preguntas de cliente respondidas con “con documentación” | 100% | Carpetas de evidencia |

## 5. Riesgos y mitigación (análisis con 5 porqués)

| Riesgo | Causa raíz | Mitigación |
|---|---|---|
| Cambio dañino en producción | Agente actuó sin aprobación | Regla “propone/confirma”; sandbox; permisos de escritura en baje |
| Fuga de credenciales | Secretos en texto plano | Gestor de secretos; rotación post-sesión; nunca enviar por chat |
| Confusión entre clientes | Entorno compartido | Directorios y worktrees aislados por cliente |
| Promesa igual SLAs | Alcance ambiguo | Alcance escrito en contrato y en cada ticket |
| Cuestionario que no puedo responder | Falla de evidencia | Paquete de confianza crece antes de la pregunta |
| Costo de IA descontrolado | Thinking mode siempre encendido | Thinking solo cuando importa (trianguos cortos); cache; presupuestos |
| Responsabilidad legal | Sin contrato ni seguro | MSA + DPA + seguro desde el primer contrato pagado |

## 6. Acciones de los próximos 30 días

1. **Hoy**: leer estos 6 documentos. Elegir país y régimen legal.
2. **Semanas 1-2**: registro, seguridad del equipo, plantillas de contrato.
3. **Semana 3**: montar el prototipo técnico (Fase 1).
4. **Semana 4**: escribir 20 runbooks y el eval set de 50 casos.
5. **Semanas 5-6**: piloto control en sandbox con 1 persona; cerrar la primera referencia.

---

*v1.0 — 2026-08. Revisión mensual (Kaizen/PDCA): si una métrica falla, se itera la sección 3 y 4.*
