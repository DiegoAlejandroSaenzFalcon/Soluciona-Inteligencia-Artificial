# WhatsApp Lite - Sistema de Pedidos para Microempresas

## Arquitectura y Características

### 1. Sistema de Licencias y Trial
- **10 días de trial automático** con todas las funcionalidades
- **Validación online** cada 24 horas
- **Modo reducido** automático después del trial (solo WhatsApp + pedidos/ventas)
- **Almacenamiento local** con fingerprint de dispositivo

### 2. Clasificador de Mensajes
- **Detección de pedidos**: Keywords como "pedido", "comprar", "quiero", "precio", "mesa"
- **Detección de conversaciones personales**: Keywords como "hola", "gracias", "familiar", "amigo"
- **Modo respuesta configurable**:
  - `personalMode: 'respond'` - Responde mensajes personales con mensaje predefinido
  - `personalMode: 'ignore'` - Ignora mensajes personales sin responder

### 3. Panel de Usuarios
- **Usuario/root**: Usuarios principales con acceso completo
- **Usuario/proveedor**: Restringido a funcionalidades específicas
- **Usuario/cliente**: Acceso limitado a pedidos propios

### 4. Integración con WhatsApp
- Procesa mensajes entrantes
- Detecta intención automáticamente
- Genera respuestas según configuración

## Uso

### Configuración de mensajes
```javascript
// Activar respuesta a mensajes personales
localStorage.setItem('personal_mode', 'respond');

// Configurar respuesta para mensajes fuera de alcance
localStorage.setItem('out_of_scope_response', 'Soy un asistente especializado en pedidos.');
```

### Verificar si es trial
```javascript
const trialActive = window.featureFlags.isTrialActive();
console.log('Modo trial:', trialActive);
```

### Clasificar mensaje
```javascript
const type = window.featureFlags.getClassifier().classify('Me gustaría hacer un pedido');
console.log(type); // { type: 'pedido', confidence: 0.9 }
```

## Archivos Principales

- `core/modules/index.js` - Sistema principal de características y licencias
- `core/modules/license/index.js` - Validación de licencias
- `core/modules/message-system.js` - Sistema de mensajes
- `core/modules/message-config.js` - Configuración de mensajes
- `core/classifier/index.js` - Clasificador de intenciones
- `core/orders.js` - Gestión de pedidos
- `transports/whatsapp.js` - Transporte WhatsApp

## Roadmap

- [ ] Integración con WhatsApp Meta Business API
- [ ] Sistema de usuarios RBAC
- [ ] Panel de administración web
- [ ] Reportes y estadísticas
- [ ] Integración con API de humitos