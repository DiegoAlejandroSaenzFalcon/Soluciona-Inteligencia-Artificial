const { config, LLM_API_KEY } = require('../config.js');
const { cfgRol, limiteAlcanzado, registrar } = require('./consumo.js');
const { menuSeccionado, esFueraDeTema, mensajeFueraDeTema } = require('./ai.js');

function construirSystemPrompt(estado, carrito, resumenCarrito) {
  const menu = menuSeccionado();
  const carritoInfo = carrito.length > 0
    ? `\nCARRITO ACTUAL:\n${resumenCarrito.lineas.join('\n')}\nTOTAL: ${config.moneda}${resumenCarrito.total.toLocaleString('es-CO')}`
    : '\nCARRITO VACÍO';

  const estadosDesc = {
    exploracion: 'El cliente está explorando, preguntando por el menú o tiene dudas.',
    configurando_pedido: 'El cliente está armando su pedido, agregando productos.',
    confirmacion_requerida: 'El carrito está listo. El cliente debe elegir DOMICILIO (envía GPS) o RECOGER antes de confirmar.',
    esperando_ubicacion: 'El cliente eligió DOMICILIO. Esperando SOLO la ubicación GPS (botón 📎). No se acepta texto.',
    cancelacion: 'El cliente quiere cancelar el pedido.'
  };

  return `Eres el Agente Comercial de IA de "${config.nombreNegocio()}" por WhatsApp.
Hablas como una persona cálida, natural y eficiente del equipo. NUNCA digas que eres bot/IA.

MENÚ COMPLETO (${config.moneda}):
${menu}

ESTADO ACTUAL: ${estado.toUpperCase()} — ${estadosDesc[estado] || ''}
${carritoInfo}

REGLAS ESTRICTAS:
1. SOLO temas del negocio (pedidos, menú, precios, horarios, alergias, promos). Si el cliente saca cualquier otro tema (trading, inversiones, criptomonedas, política, religión, salud, tecnología, código, apuestas, empleo, etc.): responde ÚNICAMENTE con UNA línea amable diciendo que solo puedes ayudar con los pedidos y el negocio, y pregunta si quiere ordenar algo. JAMÁS des consejos, estrategias, análisis ni información sobre esos temas ajenos.
2. NUNCA inventes precios, productos, ingredientes ni tiempos. Si no sabes: "Pregúntale al local".
3. MÁXIMO 2 mensajes cortos por respuesta (tono WhatsApp). Emojis con moderación.
4. NUNCA digas "reinició", "se cayó", "error técnico". Si falla: pide el pedido de nuevo con naturalidad.
5. Si preguntan QUÉ LLEVA un producto: usa SOLO la lista de ingredientes del menú de arriba. Si no tiene: confirma nombre+precio y deriva al local.

FLUJO POR ESTADO:
- EXPLORACION: Responde dudas, muestra categorías/ejemplos, invita a pedir.
- CONFIGURANDO_PEDIDO: Confirma items agregados, muestra total parcial, pregunta si quiere más.
- CONFIRMACION_REQUERIDA: CARRITO LISTO. El cliente debe decir DOMICILIO o RECOGER para terminar. Si solo dice "confirmar", recuérdale que elija DOMICILIO o RECOGER.
- ESPERANDO_UBICACION: Solo aceptas ubicación por GPS (📎). NUNCA texto, ni direcciones escritas, ni "recoger".
- CANCELACION: Cuando el cliente pida cancelar, responde SOLO con un bloque JSON (ver abajo).

FORMATO DE RESPUESTA:
Para conversar normalmente: responde en TEXTO NATURAL.
Para ACCIONES DE SISTEMA (confirmar, cancelar, modificar, mostrar menú, consultar producto): responde ÚNICAMENTE con un bloque JSON válido, sin texto extra:

EJEMPLOS DE BLOQUES JSON:

Confirmar pedido:
{
  "action": "confirm_order",
  "delivery_method": "domicilio",
  "resumen": "2x Hamburguesa Clásica = $36.000 | TOTAL: $36.000"
}

Cancelar pedido:
{
  "action": "cancel_order",
  "motivo": "El cliente cambió de opinión"
}

Modificar pedido (quitar):
{
  "action": "modify_order",
  "accion": "quitar",
  "producto": "Hamburguesa Clásica"
}

Modificar pedido (cambiar cantidad):
{
  "action": "modify_order",
  "accion": "cambiar_cantidad",
  "producto": "Hamburguesa Clásica",
  "cantidad": 3
}

Mostrar menú:
{
  "action": "show_menu",
  "categoria": "todas"
}

Consultar producto:
{
  "action": "query_product",
  "producto": "Hamburguesa Clásica"
}

IMPORTANTE: Cuando emitas JSON, NO agregues ningún texto antes ni después. Solo el JSON.`;
}

async function llamarLLM(messages) {
  const c = cfgRol('chatbot');
  const proveedor = c.proveedor.toLowerCase();
  const apiKey = proveedor === 'gemini' ? (LLM_API_KEY || config.gemini_api_key) : c.api_key;

  const corte = limiteAlcanzado('chatbot');
  if (corte) {
    return { type: 'error', message: `⚠️ Límite de IA alcanzado (${corte === 'diario' ? 'hoy' : 'este mes'}).` };
  }

  const baseUrl = c.base_url || 'https://integrate.api.nvidia.com/v1';
  const model = c.modelo || 'meta/llama-3.1-8b-instruct';

  try {
    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 800,
        messages
      })
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg = (data.error && (data.error.message || JSON.stringify(data.error))) || '';
      if (resp.status === 429) return { type: 'error', message: `⚠️ Límite en ${proveedor} (${model}).` };
      return { type: 'error', message: `⚠️ ${proveedor} error (${resp.status}): ${msg}` };
    }

    const choice = data.choices?.[0]?.message;
    if (!choice) return { type: 'error', message: 'Sin respuesta del modelo.' };

    registrar('chatbot', model, proveedor, (data.usage?.prompt_tokens) || 0, (data.usage?.completion_tokens) || 0);

    if (choice.content) {
      const content = choice.content.trim();
      // Intentar parsear JSON si parece un bloque estructurado
      if (content.startsWith('{') && content.endsWith('}')) {
        try {
          const parsed = JSON.parse(content);
          if (parsed.action) {
            return { type: 'function_call', name: parsed.action, arguments: parsed };
          }
        } catch {}
      }
      return { type: 'text', content };
    }

    return { type: 'error', message: 'Respuesta vacía del modelo.' };
  } catch (err) {
    console.error('[AI-STRUCTURED] Error:', err);
    return { type: 'error', message: `Error de conexión: ${err.message}` };
  }
}

async function procesarMensajeCliente(jid, cuerpo, estado, carrito, resumenCarrito, historial) {
  // Filtro determinístico: temas ajenos al servicio al cliente NO llegan al LLM.
  if (esFueraDeTema(cuerpo)) {
    return { type: 'text', content: mensajeFueraDeTema() };
  }
  const systemPrompt = construirSystemPrompt(estado, carrito, resumenCarrito);

  const conversation = [
    { role: 'system', content: systemPrompt },
    ...historial.map(h => ({ role: h.rol === 'bot' ? 'assistant' : 'user', content: h.texto })),
    { role: 'user', content: cuerpo }
  ];

  return await llamarLLM(conversation);
}

function formatearRespuestaNatural(text) {
  return text.trim();
}

function formatearTriggerConfirmacion(args) {
  return {
    action: 'confirm_order',
    details: args.resumen,
    delivery_method: args.delivery_method
  };
}

function formatearTriggerCancelacion(args) {
  return {
    action: 'cancel_order',
    reason: args.motivo
  };
}

function formatearTriggerModificacion(args) {
  return {
    action: 'modify_order',
    ...args
  };
}

module.exports = {
  procesarMensajeCliente,
  formatearRespuestaNatural,
  formatearTriggerConfirmacion,
  formatearTriggerCancelacion,
  formatearTriggerModificacion
};
