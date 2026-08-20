# Runbook: La impresora no imprime / trabajos en cola (Windows)

> Ejecuta SOLO con el ticket aprobado y bajo el procedimiento de acceso (docs/03). Respaldar/registrar lo que toques.

## 1. Síntomas
- Trabajos quedan en cola o el documento se "pierde".
- Error: "No se puede imprimir", "impresora en modo de error", "no se puede establecer comunicación".
- Afecta a 1 equipo o a varios (problema de red/servidor).

## 2. Causas comunes (más → menos probable)
1. **Spooler de impresión detenido** (servicio en Windows) o cola bloqueada con trabajos dañados.
2. **Impresora en pausa / fuera de línea** (desconexión física, USB/Wi-Fi perdida).
3. **Driver corrupto o incorrecto** tras actualización de Windows (causa típica el martes).
4. **Problema de red**: IP de la impresora cambiada (DHCP), VLAN/puerto switch caído.
5. **Atascos/consumibles** (papel, tinta/tóner) — revisión física.
6. **Servidor de impresión** sobrecargado (si compartecolas a muchos equipos).

## 2. Diagnóstico (en orden)
1. **Físico**: ¿encendida? ¿luces de error? ¿papel atascado? ¿tinta/tóner?
2. Estados de cola en tu equipo: Panel de control → Dispositivos e impresoras → clic derecho → **"Ver qué hay en la cola"** → ¿"Pausa"/"Sin conexión"?
3. Reiniciar el espooler: en PowerShell o CMD admin:
   ```
   net stop spooler
   net start spooler
   ```
   (¡Prioridad! el 80% de los casos lo resuelve)
4. Limpiar cola: dentro de la carpeta `C:\Windows\System32\spool\PRINTERS` (con propio spooler detenido) borrar `.spl`/`.shd` — SOLO con aprobación y registro.
5. Probar impresión de página de prueba en el equipo afectado (Propiedades → Imprimir página de prueba).
6. ¿Todos los equipos afectados? → entonces: ping a la IP de la impresora (`ping 192.168.x.x` si se conoce) y revisar conexión switch/DHCP.
7. Puertos: Propiedades del puerto (IP correcta, RAW 9100 o LPR).

## 4. Solución (pasos con aprobación previa del titular)
1. **Spooler**: reiniciar servicio (paso 3 del diagnóstico). Si persiste, limpiar cola manual (paso 4).
2. **Driver**: Propiedades → Avanzado/Controlador → actualizar o cambiar a tipo "Básico para Windows" para probar.
3. **Reinicio integral**: apagar impresora 30 s, apagar y encender switch/router (juegos de APAGADO, no solo reinicio).
4. **Si IP cambiada** (DHCP): fijar IP estática de la impresora por panel o asignación de reserva en el router (evita el caso de "una vez al mes se desconecta").
5. **Impresora compartida**: re-crear el puerto compartido en el servidor y volver a instalarla en equipos con la dirección UNC (\\servidor\impresora).
6. Prueba final con página de prueba en 2 equipos distintos.

## 5. Prevención
- Reserva DHCP o IP estática de la impresora.
- Script de monitor: revisar cola cada 4h (ticket automático si cola > 5 trabajos) — propuesta para futura automatización.
- Documentar servidor/configuración de red de impresoras en `clientes/<cliente>/inventario.md`.

## 6. Notas
- No borrar la cola sin confirmar: puede eliminar trabajos pendientes de otros.
- Si la impresora es de red: antes de cambiar drivers, revisar la página oficial del fabricante (modelo + "driver").