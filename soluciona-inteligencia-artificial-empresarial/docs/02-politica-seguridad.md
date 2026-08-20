# Política de Seguridad de la Información — soluciona v1.0

Documento que formaliza el programa de seguridad de soluciona, alineado como marco de referencia a **ISO/IEC 27001:2022** y **NIST CSF 2.0** (sin certificación por ahora; alineación documentada). Es la base para responder cuestionarios de clientes: si no está documentado, no existe.

---

## 1. Objetivo y alcance

Garantizar la confidencialidad, integridad y disponibilidad (CIA) de la información de soluciona y de sus clientes. Aplica a toda persona, equipo, servicio y dato usado durante la prestación del servicio.

## 2. Roles y responsabilidades

| Rol | Responsable | Funciones |
|---|---|---|
| Director de seguridad | Titular (fundador) | Aprobar accesos, revisar auditoría, mantener políticas |
| Operaciones | Agente IA + titular | Ejecutar dentro del alcance aprobado y registrar todo |
| Propietario de cuentas/SaaS | Titular | MFA, rotación de claves, revisión trimestral |

Principio de **segregación de funciones**: quien ejecuta no aprueba. Las acciones de alto riesgo requieren aprobación del cliente (o del titular como control de doble llave).

## 3. Clasificación de la información

| Clase | Ejemplos | Controles mínimos |
|---|---|---|
| Pública | Material de marketing | Publicación libre |
| Interna | Runbooks, precios, procesos | Acceso del equipo |
| Confidencial | Datos de acceso de clientes, configuraciones | Cifrado + mínimo privilegio + registro |
| Restringida | Datos de tarjetas de pago, credenciales bancarias | **No se almacenan nunca**; si el alcance del cliente lo exige, lo ejecuta el cliente bajo nuestra supervisión y el dato no sale de su entorno |

## 4. Control de acceso

- **Mínimo privilegio**: solo los sistemas y datos necesarios, por ticket aprobado (procedimiento docs/03).
- **Just-in-time (JIT)**: el acceso se habilita solo para la ventana de trabajo y se revoca automáticamente al cerrar la sesión. Sin accesos permanentes.
- **MFA** en: cuentas de administración, herramientas de gestión, portales de clientes.
- **Credenciales**: nunca compartidas ni transportadas; se guardan en gestor de secretos con rotación obligatoria al cierre de contrato.
- **Registro**: cada sesión deja bitácora (quién, qué, cuándo, resultado).

## 5. Terminal de trabajo (estación)

- Cifrado de disco completo activo (BitLocker).
- MFA en la cuenta del sistema, contraseña fuerte, bloqueo automático a los 5 min.
- Firewall + antivirus + actualizaciones automáticas.
- Gestor de contraseñas dedicado (tipo Bitwarden).

## 6. Cifrado y minimización

- En tránsito: TLS 1.2+ en todas las conexiones; VPN propia para sesiones de cliente.
- En reposo: disco cifrado; backups cifrados.
- **Minimización**: se transfieren solo los datos necesarios para el ticket; lo demás no se descarga ni se copia.

## 7. Gestión de cambios

Flujo obligatorio: **proponer** (en ticket, con detalle) → **aprobar** (humano/cliente) → **probar** en entorno aislado cuando exista producción → **ejecutar** → **registrar** (diff/hash) → **verificar y reportar**. Sin aprobación, no hay acción.

## 8. Respuesta a incidentes

- **Detección**: revisión diaria de alertas/logs del agente; revisión semanal de accesos.
- **Clasificación**: P1 (posible fuga o impacto de datos), P2 (servicio interrumpido), P3 (resto).
- **Notificación**: al cliente en ≤24 h para P1 (ajustable a plazos del contrato: algunos exigirán 4-12 h); a la autoridad si corresponde por ley (según país — ignorar no hacerlo).
- **Ciclo**: contener → preservar evidencia → causa raíz (5 porqués) → comunicar → corregir → actualizar documentación.
- **Log de incidentes**: append-only, nunca borrado.

## 9. Continuidad del negocio

- Backups 3-2-1 (3 copias, 2 medios, 1 fuera del sitio), cifrados.
- Prueba de restauración mensual con evidencia del test.
- RTO objetivo ≤ 24 h; RPO objetivo ≤ 24 h.
- Plan si el equipo principal falla: laptop de respaldo con el mismo perfil de seguridad..

## 10. Proveedores y terceros (los nuestros)

- Inventario documentado de cada proveedor (modelo DeepSeek, repositorios, SaaS): qué dato procesa, su certificación (SOC 2/ISO).
- Si un proveedor sufre un incidente, se notifica al cliente según nuestra política de notificación.
- Al cliente se le entrega la lista de subprocesadores si lo solicita (transparencia).

## 11. Legal y privacidad

- Cumplimiento de la ley de protección de datos aplicable al cliente (según país: Ley 1581/2012 Colombia, LFPDPPP México, Ley 25.326 Argentina, RGPD UE, etc.); validar con asesoría local.
- Contratos con cláusulas de seguridad, notificación y derecho de auditoría del cliente (docs/06).

## 12. Mejora continua

- Revisión de esta política: anual o tras incidente/cambio mayor.
- Auditoría interna trimestral: muestra aleatoria de sesiones contra su bitácora.
- Simulacro de incidente P1 semestral, documentado.
- Conservación de evidencias: 3 años mínimo.

## Anexo A — Mapa de controles → evidencia (qué enseñamos a un cliente)

| Área | Documento | Evidencia que produce | Frecuencia |
|---|---|---|---|
| Políticas | Esta política | Copia firmada y con versiones | Anual |
| Acceso | Procedimiento 03 | Bitácoras y tickets con aprobaciones | Por sesión |
| Cambios | docs/04 | Logs de operaciones | Por ticket |
| Incidentes | Sección 8 | Log append-only + comunicaciones | Cada evento |
| Backups | Sección 9 | Prueba de restauración mensual | Mensual |
| Auditoría | Sección 12 | Reportes trimestrales al cliente | Trimestral |

---

*v1.0 — 2026-08. Este documento se revisa y versiona. Prohibida su modificación sin aprobación del titular.*
