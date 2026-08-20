# Guía de Usuario - WhatsApp Lite 1.0

## Para Microempresarios Colombios

### Qué es WhatsApp Lite

WhatsApp Lite es un asistente que atiende tus clientes por WhatsApp y toma sus pedidos. No necesitas instalar nada complicado - solo ejecutar un programa en tu computadora.

---

## 🚀 Preparación (5 minutos)

1. **Asegúrate que tienes Node.js instalado**
   - Descárgalo gratis desde: https://nodejs.org
   - Instálalo y reinicia tu computadora

2. **Ejecuta el sistema**
   - Haz doble clic en `iniciar.bat`
   - O abre terminal y ejecuta: `node index.js`

3. **Verifica que inició correctamente**
   - Debería aparecer un mensaje verde en la terminal
   - Ejemplo: `[OK] Tablero web: http://localhost:8080`

---

## 📱 Cómo Usar con Tus Clientes

### Tu WhatsApp se divide en 2 usos

Cuando un cliente empieza a escribir, el sistema detecta automáticamente:

| Tipo de mensaje | Sistema hace |
|-----------------|--------------|
| "Hola, cómo estás?" | Responde: "Soy un asistente especializado en pedidos y ventas." |
| "Quiero 3 empanadas" | Procesa el pedido automáticamente |
| "Gracias" | Responde: "De nada. Estoy aquí para ayudarte." |

### Si el cliente escribe algo fuera de tema

**Modo configurado actualmente: RESPONDER**
- El sistema responde con un mensaje amable
- Ejemplo: "Lo siento, solo puedo ayudarte con pedidos..."

**Puedes cambiar a MODO SILENCIO** (si el cliente es muy exigente)
- El sistema no responde nada
- Solo toma notas para ti

---

## 📋 Gestión de Pedidos

### Desde el Panel Web

1. Abre tu navegador
2. Ve a: `http://localhost:8080`
3. Ingresa con tu cuenta
4. Verás los pedidos nuevos en verde

### Equipo de Cocina (KDS - Kitchen Display System)

- Abre otra pestaña: `http://localhost:8080/kds.html`
- Los pedidos aparecen ahí en tiempo real
- Puedes marcar como "listo"

---

## 📊 Informes Diarios

En el panel principal verás:

- 📈 **Total facturado** - Dinero cobrado hoy
- 💵 **Cobrado** - Efectivo recibido
- 📦 **Stock bajo** - Productos que necesitas comprar
- 🧾 **Facturas pendientes** - Clientes debiendo dinero

---

## ⏰ Trial de 10 Días

Al iniciar por primera vez, automáticamente tienes:

✅ WhatsApp + pedidos
✅ Lista completa de pedidos  
✅ Cocina (KDS)
✅ Ventas y contabilidad
✅ Inventario

**Después de 10 días:** El sistema te pregunta si deseas continuar con una versión simplificada que incluye solo:

- WhatsApp + toma de pedidos
- Lista de pedidos y ventas

---

## 💰 Precios

| Plan | Instalación | Mensual |
|------|-------------|---------|
| **Trial** | GRATIS | GRATIS |
| **Básico (1 pedido/día)** | $15.000 COP | $12.000 COP |
| **Estándar (hasta 50 pedidos)** | $25.000 COP | $25.000 COP |
| **Pro (pedidos ilimitados)** | $50.000 COP | $40.000 COP |

---

## ❓ Preguntas Frecuentes

### ¿De qué necesito mi WhatsApp?

Solo necesitas tener WhatsApp instalado en tu celular. El sistema conecta a través de código QR.

### ¿Puedo usarlo desde más de un celular?

Sí, pero compartes el mismo estado. Para evitar conflictos, usa siempre el mismo dispositivo.

### ¿Mis pedidos se pierden si apago la computadora?

No. Los pedidos se guardan en base de datos.

### ¿Cómo cambio el menú de productos?

En la configuración del panel web puedes editar los productos y precios.

---

## 🆘 Soporte

- **Documentación técnica**: `docs/lite_system.md`
- **Contacto soporte**: soporte@antejar.com.co
- **Grupo de usuarios**: WhatsApp Business

---

## 🎯 Tips para Empresarios

1. **Configura tu menú completo ANTES de la apertura**
2. **Practica unos días con el trial para familiarizarte**
3. **Usa el modo "silencioso" si el cliente es muy hablador**
4. **Revisa el resumen diario para saber qué vender**

---

*"WhatsApp Lite" - Solución para microempresas de Colombia<br>
Desarrollado con ❤️ para negocios pequeños