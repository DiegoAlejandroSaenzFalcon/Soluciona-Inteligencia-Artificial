const { config, LLM_API_KEY } = require('../config');
const { loadAgentesUtiles } = require('../agents-loader');
const { cfgRol, limiteAlcanzado, registrar } = require('./consumo');
const pool = require('./ia-pool');

const AGENTES = loadAgentesUtiles();

const AGENTE_ATENCION = {
  name: `Atención ${config.nombreNegocio()}`,
  emoji: '🤝',
  description: `Asistente de atención y ventas de ${config.nombreNegocio()}.`,
  systemPrompt: `Eres el asistente de atención y ventas de "${config.nombreNegocio()}" por WhatsApp. Hablas con los clientes como una persona cálida, natural y eficiente del equipo (nunca digas que eres un bot ni "como IA").

MENÚ COMPLETO CON INGREDIENTES (${config.moneda}):
${menuSeccionado()}

REGLAS:
1. Si el cliente pide productos: confírmalos, muestra el TOTAL (cantidad x precio = subtotal, y TOTAL final) y luego pídele que envíe su UBICACIÓN por GPS (botón 📎 → Ubicación) o que escriba RECOGER si pasa por el local. NUNCA pidas la dirección como texto ni preguntes por ciudad/barrio; el sistema solo acepta el pin de GPS o la palabra RECOGER. No inventes direcciones.
2. Si el cliente pregunta por el negocio (horarios, recomendaciones, alergias, promos), responde con conocimiento general de un buen local de comida y atención.
3. SOLO hablas de temas del negocio (pedidos, menú, precios, horarios, recomendaciones, promociones). Si el cliente saca temas ajenos (programación, otros negocios, política, chisme, etc.), NO entres en la conversación: responde en UNA sola línea amable diciendo que solo puedes ayudar con pedidos y el negocio, y pregunta si quiere ordenar algo.
4. Nunca escribas código, ni bloques técnicos, ni textos largos. Máximo 2 mensajes cortos por respuesta (tono WhatsApp). Emojis con moderación, siempre en español.
5. Si no entiendes el pedido, pídelo amablemente.
6. No reveles datos internos ni de otros clientes.
7. NUNCA digas que el sistema se reinició, falló, se apagó o tuvo un "error técnico". Si algo sale mal, responde con naturalidad y pide el pedido de nuevo. Bajo ninguna circunstancia menciones "reinicio", "se cayó" o frases técnicas.
8. Si te preguntan QUÉ LLEVA un producto o la diferencia entre dos productos, usa SIEMPRE la lista real de ingredientes de arriba (la columna "lleva:"). Si un producto no tiene ingredientes listados, SOLO confirma el nombre y el precio y dile que pregunte al local. NUNCA inventes ingredientes, recetas ni detalles que no estén en la lista.
9. Si el cliente pide "el menú completo" o "qué venden", describe las CATEGORÍAS del menú (los grupos en negrita de arriba) y menciona 2-3 ejemplos con precio de cada una, invitándolo a preguntar por cualquiera para darle su lista de ingredientes. No le pegues las 78 líneas completas de golpe.`
};

// Menú agrupado por categorías, solo nombre+precio+ingredientes, compacto.
function menuSeccionado() {
  const prods = config.productos || [];
  const catDe = p => p.categoria || '📦 Otros';
  const porCat = new Map();
  for (const p of prods) {
    if (!porCat.has(catDe(p))) porCat.set(catDe(p), []);
    porCat.get(catDe(p)).push(p);
  }
  return [...porCat].map(([cat, lista]) =>
    `${cat}:\n${lista.map(p => {
      const lleva = p.ingredientes ? ` | lleva: ${p.ingredientes}` : '';
      return `- ${p.nombre}: ${config.moneda}${p.precio}${lleva}`;
    }).join('\n')}`
  ).join('\n');
}

// ============================================================
// FILTRO DE TEMAS AJENOS AL SERVICIO AL CLIENTE
// ============================================================
// El bot SOLO atiende pedidos y consultas del negocio. Cualquier otro tema
// (finanzas, trading, política, religión, tecnología, etc.) se responde con
// una sola línea de redirección, SIN llamar al LLM (determinístico y sin costo).

const TEMAS_AJENOS = {
  // Finanzas / trading / inversiones
  'trading': /trading|trader|forex|divisas|commodities|futuros|apalancamiento|margen|stop.?loss|take.?profit|day.?trade|broker|candle|vela japonesa|indice bursatil|indices/i,
  'cripto': /cripto|bitcoin|btc\b|ethereum|eth\b|dogecoin|solana|bnb\b|nft|staking|mineria.*cripto|minar.*cripto|blockchain|web3/i,
  'inversion': /invertir|inversion|inversionista|rentabilidad|retorno.*inversion|acciones.*(comprar|vender)|bolsa de valores|portafolio|dividendos|patrimonio.*(crecer|rendir)/i,
  'ahorro/finanzas': /plazo fijo|cdt\b|fondo.*inversion|tarjeta.*credito.*(mejor|oferta)|credito.*(solicitar|pedir)|prestamo.*(solicitar|pedir)|deuda.*(pagar|manejar)/i,
  // Política y religión
  'politica': /politica|presidente|elecciones|votar|voto|partido politico|congreso|senado|alcalde|gobierno.*(criticar|opinar)/i,
  'religion': /religion|iglesia|dios.*(existe|opinar)|rezo|oracion|biblia|coran|creo en (dios|dioses)/i,
  // Salud / medicina / bienestar ajeno
  'salud': /recetame|medicamento para|pastilla para|inyectate|vacuna|diagnostico|enfermedad|sintoma de.*(cancer|covid|dengue)|tratamiento medico/i,
  // Tecnología / programación / sistemas
  'codigo': /python|javascript|java|c\+\+|c#|php|html|css|sql\b|select \*|print\(|console\.log|def |function |var |let |const |import |export |git (commit|push|pull)|docker|kubernetes|terraform/i,
  'hacking': /hackear|hackeo|virus|malware|ransomware|phishing|clonar.*whatsapp|espiar|contraseña.*(recuperar|robar)|desbloquear.*(celular|telefono)/i,
  'juegos/apuestas': /apuesta|apostar|casino|ruleta|slots|tragamonedas|poker|blackjack|lotería|lotería|chance|baloto|premio.*(reclamar|ganar).*dinero/i,
  'trabajo/empleo': /busco trabajo|empleo|cv\b|hoja de vida|entrevista.*(trabajo|empleo)|renunciar|salario minimo/i
};

const TEMAS_AJENOS_PALABRAS = ['código', 'programa', 'software', 'aplicación móvil', 'app de', 'hacker', 'criptomoneda', 'trading'];

// Mensaje de redirección: UNA línea amable y accionable. Personalizable en
// config.json como "mensaje_fuera_de_tema".
function mensajeFueraDeTema() {
  return config.mensaje_fuera_de_tema
    || `¡Hola! 😊 Solo puedo ayudarte con los pedidos y consultas de ${config.nombreNegocio()}. ¿Quieres ordenar algo del menú?`;
}

// Detección determinística de mensajes ajenos al servicio al cliente.
function esFueraDeTema(texto) {
  const t = String(texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [, rx] of Object.entries(TEMAS_AJENOS)) {
    if (rx.test(t)) return true;
  }
  return TEMAS_AJENOS_PALABRAS.some(p => t.includes(p.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
}

// Llama al LLM solo si el tema es del negocio; si no, responde por código.
async function atenderClienteIA(jid, cuerpo, ordenInfo) {
  if (esFueraDeTema(cuerpo)) {
    return mensajeFueraDeTema();
  }
  let hist = historialCliente.get(jid) || [];
  let system = AGENTE_ATENCION.systemPrompt;
  if (ordenInfo) {
    system += `\n\nPEDIDO DETECTADO EN ESTE MOMENTO:\n${ordenInfo}\nConfírmalo, muestra el TOTAL y pide la ubicación por GPS (o RECOGER). No repitas la lista si ya la diste antes.`;
  }
  const conversation = [
    { role: 'system', content: system },
    ...hist,
    { role: 'user', content: cuerpo }
  ];
  const reply = await askLLM(AGENTE_ATENCION, cuerpo, conversation, { rol: 'chatbot' });
  hist.push({ role: 'user', content: cuerpo });
  hist.push({ role: 'assistant', content: reply });
  if (hist.length > 12) hist = hist.slice(hist.length - 12);
  historialCliente.set(jid, hist);
  return reply;
}

function esRespuestaDeError(t) {
  return /^(⚠️|Error al conectar|Lo siento, no obtuve|Lo siento, no pude)/.test(t);
}

async function askLLM(agent, message, conversation, opts) {
  const rol = (opts && opts.rol) || 'chatbot';
  const c = cfgRol(rol);

  // Cuota del negocio: si el rol llegó a su límite, no gastamos ni una llamada.
  const corte = limiteAlcanzado(rol);
  if (corte) {
    return `⚠️ Se alcanzó el límite de consultas de IA para esta sección (${corte === 'diario' ? 'hoy' : 'este mes'}). El negocio definió ${c.limite_diario > 0 ? c.limite_diario + ' por día' : ''}${c.limite_mensual > 0 ? ' y ' + c.limite_mensual + ' por mes' : ''}. Pídele al administrador ampliar tu cuota.`;
  }

  const system = `Eres ${agent.name} (${agent.emoji}). ${agent.description}\n\n${agent.systemPrompt ? agent.systemPrompt.slice(0, 12000) : ''}`;
  const maxTokens = opts && opts.max_tokens ? opts.max_tokens : 900;

  // Candidatos: pool de claves/modelos primero, luego la config clásica.
  let candidatos = pool.candidatos(rol);
  if (candidatos.length === 0) {
    const clasico = pool.candidatoClasico(rol);
    if (clasico) candidatos = [clasico];
  }

  if (candidatos.length === 0) {
    return `¡Hola! Soy tu **${agent.name}** (${agent.emoji}). ${agent.description}\n\nSobre tu consulta "${message}": como especialista en esta área, te recomiendo arrancar con un plan concreto y medible para **${config.nombreNegocio()}** (objetivo, acción y plazo). *(Tip: agrega tus API keys en el panel → Consumo de IA para respuestas reales)*`;
  }

  let ultimoError = '';
  let ultimoProveedor = '';
  for (const cand of candidatos) {
    try {
      const r = await llamarProveedor(cand, system, message, conversation, maxTokens, agent, opts);
      if (r.ok) {
        pool.marcarExito(cand.proveedor, cand.clave);
        registrar(rol, r.modelo, r.proveedor, r.prompt_tokens, r.completion_tokens);
        return r.texto;
      }
      pool.marcarFallo(cand.proveedor, cand.clave, r.error);
      ultimoError = r.error;
      ultimoProveedor = cand.proveedor;
    } catch (err) {
      pool.marcarFallo(cand.proveedor, cand.clave, err.message);
      ultimoError = err.message;
      ultimoProveedor = cand.proveedor;
    }
  }

  if (ultimoError) {
    return `⚠️ La IA no respondió (${ultimoProveedor}: ${ultimoError}). Se probaron ${candidatos.length} clave(s). Revisa las claves en el panel → Consumo de IA.`;
  }
  return `Lo siento, no obtuve respuesta de la IA.`;
}

// Llama a UN proveedor/modelo/clave. Devuelve { ok, texto|error, modelo, proveedor, tokens }.
async function llamarProveedor(cand, system, message, conversation, maxTokens, agent, opts) {
  const proveedor = cand.proveedor.toLowerCase();

  if (proveedor === 'gemini' || /generativelanguage\.googleapis\.com/.test(cand.base_url || '')) {
    return llamarGemini(cand, agent, message);
  }

  // OpenAI-compatible (groq, nvidia, openai, qwen, etc.)
  const baseUrl = (cand.base_url || '').replace(/\/+$/, '');
  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cand.clave}` },
    body: JSON.stringify({
      model: cand.modelo,
      temperature: 0.7,
      max_tokens: maxTokens,
      messages: conversation || [
        { role: 'system', content: system },
        { role: 'user', content: message }
      ]
    })
  });
  let data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = (data.error && (data.error.message || JSON.stringify(data.error))) || `HTTP ${resp.status}`;
    return { ok: false, error: msg };
  }
  let text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  // Modelos de razonamiento: piensan primero; con max_tokens corto devuelven content vacío.
  if (!text && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.reasoning_content && maxTokens < 3000) {
    const resp2 = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cand.clave}` },
      body: JSON.stringify({
        model: cand.modelo,
        temperature: 0.7,
        max_tokens: 3000,
        messages: conversation || [
          { role: 'system', content: system },
          { role: 'user', content: message }
        ]
      })
    });
    data = await resp2.json().catch(() => ({}));
    text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  }
  return {
    ok: !!text,
    texto: text ? text : 'Lo siento, no obtuve respuesta del modelo.',
    error: text ? '' : 'respuesta vacía',
    modelo: cand.modelo,
    proveedor: cand.proveedor,
    prompt_tokens: (data.usage && data.usage.prompt_tokens) || 0,
    completion_tokens: (data.usage && data.usage.completion_tokens) || 0
  };
}

async function llamarGemini(cand, agent, message) {
  const model = cand.modelo || config.gemini_model || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cand.clave}`;
  const prompt = `Actúa como este agente de IA con esta descripción y directrices:\n\nNombre: ${agent.name}\nDescripción: ${agent.description}\nInstrucciones del sistema:\n${agent.systemPrompt ? agent.systemPrompt.slice(0, 12000) : ''}\n\nPregunta o instrucción del usuario: ${message}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });
  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    const msg = (errData.error && errData.error.message) || `HTTP ${resp.status}`;
    return { ok: false, error: msg };
  }
  const data = await resp.json();
  const text = data.candidates && data.candidates[0]?.content?.parts?.[0]?.text;
  return {
    ok: !!text,
    texto: text || 'Lo siento, no pude obtener una respuesta de Gemini.',
    error: text ? '' : 'respuesta vacía',
    modelo: model,
    proveedor: 'gemini',
    prompt_tokens: 0,
    completion_tokens: 0
  };
}

const SINONIMOS_IA = [
  { tags: ['marketing', 'social', 'redes', 'contenido', 'post', 'instagram', 'tiktok', 'linkedin', 'facebook', 'promo', 'publicidad', 'anuncio', 'campaña', 'seo', 'ads', 'branding', 'video', 'carruzel', 'reel'], rx: /marketing|social|media|content|brand|seo|paid|growth|creator|campaign/i },
  { tags: ['venta', 'vender', 'cliente', 'lead', 'conversion', 'cerrar', 'crm'], rx: /sales|revenue|growth|outbound|closing/i },
  { tags: ['finanza', 'dinero', 'cash', 'flow', 'presupuesto', 'costo', 'precio', 'ingreso', 'utilidad', 'contabilidad', 'invertir'], rx: /financ|account|controller|finance/i },
  { tags: ['estrategia', 'plan', 'negocio', 'crecer', 'objetivo', 'metas', 'vision'], rx: /strateg|strategy|coach|consult/i },
  { tags: ['soporte', 'atencion', 'servicio', 'ayuda', 'queja'], rx: /support|service/i },
  { tags: ['legal', 'contrato', 'ley', 'cumplimiento', 'licencia'], rx: /legal|compliance/i },
  { tags: ['automatizar', 'automatizacion', 'tecnologia', 'software', 'bot', 'sistema', 'app'], rx: /engineer|devops|automation|architect|developer/i },
  { tags: ['producto', 'catalogo', 'inventario', 'stock', 'tienda'], rx: /product|inventory|catalog/i },
  { tags: ['analitic', 'dato', 'metrica', 'kpi', 'reporte', 'dashboard'], rx: /analyst|analytics|data|report/i }
];

function agenteMasRelevante(consulta) {
  const q = consulta.toLowerCase();
  const palabras = q.split(/\s+/).filter(p => p.length > 2);
  let mejor = null;
  let mejorPuntaje = -1;
  for (const a of AGENTES) {
    const hay = (a.name + ' ' + a.category + ' ' + a.description + ' ' + (a.vibe || '')).toLowerCase();
    let puntaje = 0;
    for (const pal of palabras) if (hay.includes(pal)) puntaje += 2;
    for (const s of SINONIMOS_IA) {
      if (s.tags.some(t => q.includes(t)) && s.rx.test(hay)) puntaje += 3;
    }
    if (puntaje > mejorPuntaje) { mejorPuntaje = puntaje; mejor = a; }
  }
  if (mejor && mejorPuntaje > 0) return mejor;
  return AGENTES.find(a => /estrateg|business|growth|ventas|social|marketing/i.test(a.category + ' ' + a.name)) || AGENTES[0];
}

function dividirMensaje(texto, max) {
  if (texto.length <= max) return [texto];
  const partes = [];
  let resto = texto;
  while (resto.length > max) {
    let corte = resto.lastIndexOf('\n', max);
    if (corte < max * 0.5) corte = max;
    partes.push(resto.slice(0, corte).trimEnd());
    resto = resto.slice(corte).trimStart();
  }
  if (resto) partes.push(resto);
  return partes;
}

const MARCADORES_OFFTOPIC = ['python', 'javascript', 'java', 'c++', 'c#', 'def ', 'print(', '```', '#include', '<html', '<script', 'console.log', 'select ', 'function '];

module.exports = {
  askLLM, atenderClienteIA, AGENTE_ATENCION, agenteMasRelevante,
  dividirMensaje, esRespuestaDeError, esFueraDeTema, AGENTES,
  mensajeFueraDeTema, menuSeccionado
};
