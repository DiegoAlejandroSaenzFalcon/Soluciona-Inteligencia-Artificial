# Paquete de Confianza — qué pide un cliente regulado y qué entregamos (v1.0)

Los bancos, fintechs, aseguradoras y organismos no piden "confianza": piden **evidencia documentada** (ver investigación: cuestionarios tipo CISA, SOC 2, GLBA/FTC Safeguards, PCI DSS 8.2.7, NIST 800-171, RBI, DORA...). Este archivo traduce esas exigencias a nuestra situación de proveedor joven y define cómo crecemos hasta cumplirlas todas.

## 1. Qué se le pide a un proveedor de soporte TI (resumen de la industria)

| Bloque de preguntas | Ejemplos reales | Qué significa |
|---|---|---|
| Gobernanza | ¿Tiene política de seguridad escrita? ¿Quién responde? ¿Se revisa anual? | Documentación > todo |
| Certificaciones | ¿ISO 27001? ¿SOC 2? ¿NIST? | Son la "píldora de confianza" rápida |
| Seguro | Ciberseguro y E&O: límites ($1M–$20M según dato) | Existencia y solvencia |
| Acceso | ¿Mínimo privilegio? ¿JIT? ¿MFA? ¿Grabación? | Igual que nuestro procedimiento 03 |
| Datos | ¿Cómo protege/borra mi información? DPA | Contrato y práctica |
| Incidentes | ¿Plan IR? ¿Plazos de notificación? ¿Pruebas? | Debe ser medible y probado |
| Terceros | ¿Quiénes son tus subcontratistas? ¿Y su seguridad? | Cadena completa |
| Referencias/auditoría | ¿Me das derecho de auditoría? ¿Historial? | Transparencia |

## 2. Qué entregamos hoy (v1.0, sin certificaciones)

1. **Política de Seguridad** escrita y versionada (docs/02) — revisión anual firmada.
2. **Procedimiento de acceso** con JIT, mínimo privilegio, bitácoras (docs/03) — con evidencia real por sesión.
3. **Ciclo de ticket + SLA + informe mensual** (docs/04) — medible y auditado por el cliente.
4. **Registro de incidentes** append-only con plazos de notificación en contrato.
5. **Lista de subprocesadores** (modelos de IA, SaaS) con su certificación pública (p.ej. proveedor del modelo con SOC 2 / infra nube certificada).
6. **Derecho de auditoría del cliente** (cláusula en contrato) + información de nuestros propios chequeos internos.
7. **Seguro** (cuando exista: se contrata antes de clientes regulados; objetivo: cyber + E&O con límites acordes al tipo de dato, subiendo con el perfil del cliente).
8. **Historial**: carpetas de evidencia de cada sesión (bitácora + reporte) retenidas 3 años.

Todo esto **se presenta como una carpeta única por cliente** ("Dossier de Seguridad") con índice — es nuestro mejor argumento de venta.

## 3. Hoja de ruta de certificación (cuándo y por qué)

| Hito | Cuándo | Coste aprox. | Notas |
|---|---|---|---|
| Alineación ISO 27001 (autoevaluación + checklist controles) | Inmediato (Fase 0-3) | $0 (tiempo) | El 80% del valor está en la alineación, no en el papel |
| Auditoría interna trimestral (bitácoras, accesos, backups) | Desde el primer contrato | $0 | Evidencia real |
| Seguro cyber + E&O | Antes del primer cliente "sensible" | 500–3.000 $/año según país y límites | Buscar broker local; límites crecientes: 250k → 1M → 5M |
| SOC 2 Type I | Meses 12-18 (2-3 clientes serios) | 15–40k $ aprox + mantenimiento | Lo piden fintechs y MSP que venden a bancos |
| SOC 2 Type II | Meses 18-30 | igual + auditoría anual | Es la credencial universal B2B |
| ISO 27001 certificación | Cuando lo exija el mercado | 10–25k $ + anual | Muchos la piden; SOC 2 suele bastar primero |

**Estrategia honesta**: crecer "de adentro hacia afuera": primero los controles y la evidencia, después el papel. La respuesta estándar ante un cuestionario antes de tener certificación:

> "No poseemos aún certificación formal; seguimos el marco ISO 27001:2022 y NIST CSF con autoevaluación documentada y auditoría interna trimestral, con evidencia disponible bajo NDA. Nuestro plan de certificación está en el año 2, y mientras tanto entregamos [política, procedimiento, bitácoras, seguro, derecho de auditoría]."

Nunca mentir en el cuestionario; responder "no aplica/no aún + compensación" es práctica normal y aceptada de la industria (así lo tratan las matrices de riesgo de proveedores: con riesgo mitigado y plan).

## 4. Cómo responder un cuestionario de cliente (método)

1. Pedir el cuestionario por escrito (template o correo).
2. Marcar por columnas: `evidencia que ya tengo` / `evidencia que genero en 48h` / `no aplica + compensación` / `requiere cambio de contrato`.
3. Responder SOLO con evidencia adjunta (nunca "sí, claro").
4. Entregar dossier + ofrecer 30 min de video-llamada de revisión.
5. Guardar copia del cuestionario respondido en el repo del cliente (carpeta `diligencia/`).

## 5. El banco (objetivo final) — qué exigirá y cómo llegamos

- Cuestionarios muy largos, con plazos de notificación de incidentes en horas (el banco tiene obligación regulatoria propia, p. ej. 36h/72h: por eso al proveedor le exigen ≤ 4–12h).
- Evidencia por cada control: política, inventario, entrenamiento, pruebas, auditoría.
- Referencias de clientes regulados anteriores → la escalera (MSP subcontratista) es la vía natural.
- Proveer siempre: dossier + seguro con límites >1M + derecho de auditoría + subprocesadores + plan IR probado.
- Y sobre todo: **años de bitácoras impecables**: cada sesión registrada, cada ticket cerrado, cero excepciones. Eso no se compra con dinero; se construye desde el primer cliente.

## 6. Inventario de nuestro "dossier" (checklist por cliente)

- [ ] Presentación de soluciona (1 página)
- [ ] Política de seguridad v1.0 (docs/02)
- [ ] Procedimiento de acceso (docs/03) + ejemplo de bitácora
- [ ] Plantilla de contrato MSA + Anexo de seguridad + DPA (docs/06)
- [ ] Informe mensual de ejemplo (docs/04)
- [ ] Lista de subprocesadores y sus certificaciones
- [ ] Certificado de seguro (cuando exista)
- [ ] Evidencia de auditoría interna (trimestral)

---

*v1.0 — 2026-08. Regla: cada cláusula de este dossier debe poder abrirse y mostrarse en vivo.*
