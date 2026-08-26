# Runbook: Correo que no envía mensajes

**Título**: Correo electrónico no envía mensajes desde hoy  
**Prioridad**: P2 (afecta a varios usuarios, puede tener alternativa)  
**Categoría**: correo  
**Tipo**: L1 (resoluble con guía/KB)  

## Descripción del problema
El cliente reporta que sus correos electrónicos no se envían desde la mañana del día actual. Los usuarios no reciben notificaciones automáticas.

## Pasos de diagnóstico

### 1. Verificar conectividad de red
- [ ] Confirmar que el servidor tiene acceso a internet
- [ ] Probar conexión SMTP: `telnet smtp.gmail.com 587`
- [ ] Verificar que el puerto 587 esté abierto en el firewall

### 2. Revisar configuración del servicio de correo
- [ ] Validar credenciales de inicio de sesión (usuario/contraseña)
- [ ] Verificar configuración del servidor SMTP (host, puerto, SSL/TLS)
- [ ] Confirmar que la autenticación esté habilitada en el proveedor de correo

### 3. Revisar logs del servicio
- [ ] Revisar logs del servidor de correo para errores de envío
- [ ] Buscar mensajes de error "auth failed", "connection timeout", "rate limited"
- [ ] Verificar si hubo cambios recientes en la configuración

## Runbook aplicado
Si el problema persiste después de estos pasos, escalar a P3 y verificar con el proveedor de servicio de correo si hay outages reportados.

**Fecha**: 2026-08  
**Versión**: 1.0