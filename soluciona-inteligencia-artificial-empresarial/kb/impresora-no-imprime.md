# Runbook: Impresora de tickets que no imprime

**Título**: Impresora térmica de tickets no imprime  
**Prioridad**: P3 (afecta a 1-2, sin bloqueo general)  
**Categoría**: equipo  
**Tipo**: L1 (resoluble con guía/KB)  

## Descripción del problema
La impresora térmica conectada al sistema no imprime los tickets generados por la plataforma solucina. Los pedidos se registran pero no se generan recibos físicos.

## Pasos de diagnóstico

### 1. Verificar conexión física
- [ ] Confirmar que el cable USB/Ethernet esté conectado correctamente
- [ ] Verificar que la impresora tenga papel y tinta/ribbón suficientes
- [ ] Probar la impresora con otra aplicación para confirmar que funciona

### 2. Revisar configuración en el panel
- [ ] Validar que el adaptador POS esté configurado como "pos-propio"
- [ ] Verificar que el puerto de la impresora esté correctamente asignado
- [ ] Reiniciar el servicio de impresión desde el panel web

### 3. Revisar estado del sistema
- [ ] Ejecutar `systemctl status spooler-impresora` o servicio equivalente
- [ ] Verificar que el puerto serie o USB no esté ocupado por otro proceso
- [ ] Comprobar niveles de tinta y configuración de densidad de impresión

## Runbook aplicado
Si la impresora aún no imprime después de verificar la configuración y conexión física, escalar a P4 y revisar con el proveedor del hardware los controladores específicos.

**Fecha**: 2026-08  
**Versión**: 1.0