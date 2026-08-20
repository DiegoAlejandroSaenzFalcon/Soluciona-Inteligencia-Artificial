# Cuestionario de Onboarding y Registro de Sesión — soluciona v1.0

Documentos de trabajo para uso con el cliente. Primera parte: se completa en la reunión de onboarding. Segunda: se completa al cierre de cada sesión (es la evidencia que mostramos al cliente).

---

## PARTE A — Cuestionario de onboarding (acceso)

**Datos del cliente**
- Razón social / persona:
- Contacto técnico (nombre, email, tel):
- Contacto administrativo (aprobador):
- Horario de operación del negocio:
- Política interna de terceros/soporte externo: [ ] no existe [ ] existe (adjuntar)

**Entorno a soportar**
- Inventario de equipos (PCs, móviles, servidores): ______________
- Sistemas/aplicaciones críticas (caja, contabilidad, CRM, correo): ______________
- Proveedores de nube/SaaS con acceso admin (M365, Google, hosting): ______________
- ¿Servidor local? ¿Virtualizado? ¿Físico?: ______________
- ¿Backups actuales? ¿Se verifican?: ______________

**Reglas de acceso (se llenan con el cliente, él elige)**
- ¿Qué medio de acceso autoriza? (marcar todos los que apruebe)
  - [ ] Cliente ejecuta, nosotros guiamos (preferido)
  - [ ] Herramienta remota del cliente (su licencia)
  - [ ] VPN del cliente + escritorio virtual (jump)
  - [ ] Consola/SaaS del cliente (delegada/servicio)
  - [ ] Sesión grabada (never-alone) monitorizada por el cliente
  - [ ] API con token de mínimo privilegio (solo lectura; escritura solo aprobada)
- ¿Horarios permitidos de soporte? 9-18 h / 24x7 / otro: ______________
- ¿Permite instalar software en sus equipos? (solo con pedido previo por escrito): SÍ / NO
- ¿Exige bitácora y/o grabación de pantalla? SÍ / NO
- ¿Quién revoca el acceso en caso de urgencia? (nombre+tel+email): ______________

**Seguridad (para que el cliente vea que nos importa)**
- ¿MFA activo en su correo y cuentas admin? SÍ/NO — si NO: será prioridad 1 recomendada en el informe
- ¿Dónde están los respaldos? ¿Podemos verificarlos junto a usted?

**Aceptación**
- He recibido la Política de Seguridad y el Procedimiento de Acceso de soluciona v1.0 y acepto sus condiciones; los plazos y responsabilidades quedan definidos en el MSA/los SLA firmados.
- Firma y fecha del derecho de auditoría: ______________

*(Firma del responsable del cliente)          (Fecha)*

---

## PARTE B — Registro de sesión (se entrega al cierre; copia al dossier)

| Campo | Valor |
|---|---|
| Ticket # | |
| Cliente | |
| Fecha/hora inicio — fin (zona) | |
| Sistema(s) accedidos | |
| Medio de acceso usado | |
| Aprobación del ticket por | (nombre o ref. aprobada) |
| Lista de acciones realizadas | 1. 2. 3. |
| Comandos/cambios con hash/ref | |
| Resultado / prueba de verificación | (captura/resultado) |
| Archivos modificados | |
| Incidentes o alertas durante sesión | √(ninguno / detalle) |
| Recomendaciones post-sesión | |

Registrado por (agente/op. /firma) / Revisado por el cliente (firma/√):
____________ / ____________

*Retención: ≥3 años. Todos los archivos son append-only (no se editan ni borran).*
