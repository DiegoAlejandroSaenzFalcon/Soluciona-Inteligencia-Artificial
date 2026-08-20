# Runbook: El correo no envía o no recibe (Office 365 / Gmail)

> Regla: ejecuta SOLO con el ticket aprobado y bajo el procedimiento de acceso (docs/03).
> Haz backup/registro previo de lo que toques. Si algo pide credenciales del usuario, que las ponga el propio usuario.

## 1. Síntomas
- Al enviar: mensaje queda en la Bandeja de salida / error "no se pudo enviar".
- No llegan mensajes externos.
- Error de autenticación de la cuenta.

## 2. Causas comunes (por probabilidad)
1. **Contraseña caducada o bloqueo de seguridad** (M365/Gmail pide verificar dispositivo).
2. **Cuota llena** (correo rebota con "buzón lleno").
3. **Cliente de correo con configuración desactualizada** (SMTP/IMAP o contraseña de aplicación).
4. **Virus/corrupción de perfil** de Outlook (caso frecuente en Windows).
5. **Servidor de correo propio**: DNS/MX roto o IP bloqueada (SPF/DKIM fallando).
6. **Corte del ISP** (verificar otros servicios).

## 3. Diagnóstico (en orden)
1. `ping smtp.office365.com` (o el servidor que use el cliente) → ¿resuelve?
2. En web (outlook.com/Gmail): ¿funciona el correo desde el navegador? → separa "problema de cuenta" vs "problema de app".
3. Revisar cuota: Configuración → Cuenta → Almacenamiento (buzón >90%: avisa y limpia).
4. Outlook en modo seguro: `outlook.exe /safe` → si funciona: complementos o perfil corrupto.
5. Verificar contraseña de aplicación (Gmail con 2FA) o inicio de sesión de la cuenta.
6. Si es servidor propio: `nslookup -type=MX dominio.com` y revisar SPF/DKIM con mxtoolbox (web).

## 4. Solución (cada paso requiere aprobación del titular y, si aplica, del cliente)
1. Restablecer contraseña de la cuenta (o pedir al cliente que lo haga) y volver a configurar el cliente.
2. Vaciar buzón: borrar elementos eliminados y correo grande; activar archivo automático.
3. Perfil de Outlook: crear perfil nuevo (Panel de control → Correo → Perfiles).
4. Actualizar configuración SMTP: saliente 587/TLS con autenticación (Office 365) o app password (Gmail).
5. Si SPF/DKIM mal: corregir DNS del dominio (mismo día; propagación 24-48h).
6. Prueba final: enviar correo a una cuenta de prueba y responder.

## 5. Prevención
- MFA + contraseña fuerte; política de rotación.
- Monitorear cuota con alerta al 85%.
- Regla de retención/archivo automático activada.

## 6. Notas
- Web oficial Microsoft: https://support.microsoft.com/outlook
- MXToolbox: https://mxtoolbox.com/diagnostic.aspx
- Evitar eliminar correos antes de respaldar el buzón (si es cuenta empresarial, consultar con el titular).