# Procedimiento de Acceso Seguro al Entorno del Cliente v1.0

Este es el documento **más importante que vendemos**. Responde la pregunta que nos hacen todos los clientes: *"¿cómo voy a dejarte entrar a mis sistemas sin desconfiar?"*

La respuesta de la industria (bancos incluidos) es clara: **no se pide acceso a la red; se pide acceso por alcance, temporal, registrado y reversible**. Este procedimiento lo convierte en un documento de trabajo.

---

## Principios (leyes de acceso, tomadas de la industria financiera)

1. **Mínimo privilegio**: solo los sistemas y acciones necesarios para el ticket aprobado.
2. **Just-in-time (JIT)**: el acceso existe solo mientras hay ventana de trabajo aprobada; deshabilitado de forma predeterminada. (Regla del estándar PCI DSS 4.0.1, requisito 8.2.7 — el mismo principio lo usa todo banco).
3. **Cero acceso permanente**: por contrato no se tienen claves "standing".
4. **Nada sin registro**: cada sesión genera bitácora (quién, qué, cuándo, alcance, resultado).
5. **Doble control para alto riesgo**: para cambios críticos: 2 personas, o persona + cliente aprobando; el agente IA nunca ejecuta solo cambios productivos sin confirmación.
6. **Credenciales invisibles**: nunca conocemos ni guardamos las claves del cliente; las crea y rota el cliente en su propio entorno; nosotros solo las usamos temporalmente y se rotan al cerrar.

---

## Fases del procedimiento

### A. Onboarding (primera vez)

1. **Cuestionario de acceso** (`templates/cuestionario-onboarding.md`): conocer el entorno, roles de contacto, reglas de la empresa sobre soporte externo.
2. **Contrato** firmado: MSA + Anexo de seguridad + DPA (docs/06). Definir: alcance general, personas autorizadas, horarios, SLA, exclusiones.
3. **Inventario mínimo** autorizado: qué sistemas, qué IPs de origen pueden ir al acceso, qué herramientas de acceso permite el cliente (ver sección 4).
4. **Acuerdo de medio de acceso**: cómo nos conectamos (lo elige y aprueba el cliente).

### B. Apertura del ticket (por cada intervención)

- En el ticket se declara: **objetivo, sistemas afectados, acciones a realizar, resultados esperados, y duración estimada**.
- El ticket es la única orden de trabajo válida. No se ejecuta nada fuera de un ticket.

### C. Habilitación del acceso (JIT)

1. El cliente (o su delegado) aprueba el ticket de acceso.
2. Se habilita el acceso durante la ventana aprobada (horario típico estándar; se extiende solo con nueva aprobación).
3. Se registra la habilitación (timestamp inicio/fin en la bitácora).
4. Al terminar: **revocación inmediata** de la sesión

### D. Ejecución del trabajo

- El agente IA opera bajo la regla de oro: **primero propone, nunca modifica sin confirmación**; en los meses de entrada (piloto) TODA acción de cambio la confirma un humano.
- Cada comando/escritura se registra (log del agente: llamadas a herramientas, stdout, resultado).
- Si el entorno del cliente lo exige: **grabación de pantalla controlada por el cliente** o túnel con registro y monitorización en tiempo real.
- Trabajamos **desde fuera del segmento productivo** cuando es posible: VM/sandbox dentro del cliente, o el cliente ejecuta comandos por sí mismo mientras nosotros guiamos.

### E. Cierre de sesión y factura

1. Verificación del cambio (prueba de resultado).
2. Cierre de la ventana de acceso (revocar privilegios concedidos).
3. **Cierre con bitácora entregada al cliente**: resumen + tiempo empleado + cambios exactos (diff) + recomendaciones.
4. Guardado estándar: bitácora con evidencia (captura de resultados) en registro protegido 3 años.

### F. Offboarding (fin de contrato)

- Revocación total de accesos, rotación de credenciales que usamos, disposición de datos en repos y eliminación documentada.
- Acta de cierre firmada por ambas partes (devolución/borrado real de datos).
- Se informa al cliente de los plazos de conservación de evidencias y seguros.

---

## 4. Opciones de medio de acceso (el cliente elige, nosotros sugerimos por seguridad)

| Medio | Adecuado para | Por qué lo elige soluciona |
|---|---|---|
| **Cliente ejecuta, nosotros guiamos** | Primer contacto / pymes | Máxima confianza — que lo hagan ellos si pueden |
| **Herramienta remota del propio cliente** (su TeamViewer/VNC corporativo, no el mío) | Puesto de trabajo individual | No instalamos software no autorizado |
| **VPN del cliente + escritorio virtual (jump host)** | Varios usuarios | Práctica regulada clásica: bastión (jump) sin exponer servidores |
| **Consola de gestión SaaS del cliente (delegada)** | Nube/SaaS (M365, Google) | La administración delegada es controlable y se rota |
| **Sesión remota grabada que el cliente monitorea** | Clientes con exigencias estrictas (banco/fintech) | Cumple las reglas de "never alone" y registro de pantalla |
| **API con token de solo lectura / escritura mínima** | Automatización de nuestro agente | Mínimo privilegio natural, auditado en el proveedor |

Reglas férreas:
- **Nunca** instalamos software en equipos del cliente sin su firma explícita.
- **Nunca** pedimos las credenciales del administrador de su dominio — si se requieren para un trabajo concreto, se emiten códigos temporales "break-glass" de una sola sesión, rotados al terminar y registrados.
- **Sin cuenta permanente** a nombre de soluciona al final del proyecto.

---

## 5. Aplicación práctica con el agente IA (el valor único de soluciona)

Nuestro agente (opencode) está diseñado para que **la seguridad sea técnica, no promesa**:

| Práctica del cliente bancario | Cómo lo hace nuestro sistema |
|---|---|
| "Nunca entres en mi red" | El agente trabaja con los permisos que declara un ticket; el resto se deniega automáticamente. Una llave maestra nunca existe. |
| "Que todo se registre" | El registro de tool-calls del agente se exporta como bitácora por sesión: exactamente qué se pidió, a qué, cuándo y qué resultado. |
| "Doble control antes de cambiar algo" | Mecánica de **propuesta → aprobación** en dos estados; por defecto el agente opera en "modo sugerir" en producción. |
| "No tengan claves mías" | Los accesos (o credenciales temporales) los crea y rota el cliente; nosotros solo los usamos dentro de la ventana aprobada. |
| "Sin tráfico entrante" | Canal de salida **outbound-only** (no requiere puertos abiertos en el cliente) con lista blanca de destinos. |
| "Monitoriza acciones anómalas" | Alertas: actividad fuera del alcance del ticket, acceso fuera de horario, comandos más allá de lo aprobado → pausa y aviso. |

**Regla de oro operativa**: el agente propone, el humano confirma, el registro demuestra. La venta es esa tríada.

---

## 6. Cómo vender esto (guion breve al cliente)

> "Entendemos completamente que un tercero no debe tener acceso libre a su red. Nuestro procedimiento es el que le exigen los bancos a sus proveedores: acceso por ticket, mínimo y temporal, bitácoras completas de cada sesión, doble aprobación para cambios, y revocación automática. Usted conserva sus llaves y decide cada ventana. Nada se ejecuta en producción sin su sí, y la evidencia del trabajo se la entregamos en el mismo reporte que le facturamos."

---

*v1.0 — 2026-08. Este procedimiento es obligatorio (regla 1 del README). Cualquier excepción requiere aprobación firmada del cliente y queda en su contrato.*
