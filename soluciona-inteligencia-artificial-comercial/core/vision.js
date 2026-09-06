const { config, LLM_API_KEY } = require('../config.cjs');
const { cfgRol, limiteAlcanzado, registrar } = require('./consumo.cjs');

// Visión por imagen vía NVIDIA NIM (OpenAI-compatible, base64 image_url).
async function llamarVision(base64, mime, prompt) {
  const c = cfgRol('vision');
  const apiKey = c.api_key || LLM_API_KEY || config.gemini_api_key;
  if (!apiKey) throw new Error('No hay api_key configurada para visión (config.vision.api_key o config.llm.api_key).');

  const corte = limiteAlcanzado('vision');
  if (corte) throw new Error(`Límite de consultas de visión alcanzado (${corte === 'diario' ? 'hoy' : 'este mes'}).`);

  const model = c.modelo || 'meta/llama-3.2-11b-vision-instruct';
  const url = `${c.base_url || 'https://integrate.api.nvidia.com/v1'}/chat/completions`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      max_tokens: 1400,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:${mime || 'image/jpeg'};base64,${base64}` } }
        ]
      }]
    })
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = (data.error && (data.error.message || JSON.stringify(data.error))) || '';
    throw new Error(`${c.proveedor || 'nvidia'} visión ${resp.status}: ${msg}`);
  }
  const txt = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  registrar('vision', model, c.proveedor || 'nvidia', (data.usage && data.usage.prompt_tokens) || 0, (data.usage && data.usage.completion_tokens) || 0);
  return txt || '';
}

// Fallback: si el modelo NVIDIA no es multimodal, usa Gemini si hay key.
async function llamarGeminiVision(base64, mime, prompt) {
  const apiKey = config.gemini_api_key || LLM_API_KEY;
  if (!apiKey) throw new Error('No hay gemini_api_key configurada para visión.');
  const model = config.gemini_model || 'gemini-3.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ parts: [
      { text: prompt },
      { inline_data: { mime_type: mime || 'image/jpeg', data: base64 } }
    ] }]
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`Gemini visión ${resp.status}: ${JSON.stringify(err.error || err)}`);
  }
  const data = await resp.json();
  const txt = data.candidates && data.candidates[0]?.content?.parts?.[0]?.text;
  registrar('vision', model, 'gemini', 0, 0);
  return txt || '';
}

function extraerJsonArray(texto) {
  const m = texto.match(/\[[\s\S]*\]/);
  if (!m) return [];
  try { return JSON.parse(m[0]); } catch { return []; }
}

async function extraerMenu(base64, mime) {
  const prompt = `Eres un extractor de datos de un menú de restaurante. De la imagen, extrae cada plato con su precio y, si aparece, sus ingredientes. Devuelve SOLO un arreglo JSON con objetos { "nombre": string, "precio": number (pesos colombianos, sin puntos ni símbolo), "ingredientes": string (texto libre o vacío) }. No incluyas explicaciones ni texto fuera del JSON.`;
  let txt = '';
  try {
    txt = await llamarVision(base64, mime, prompt);
  } catch (e) {
    if (/401|403|multimodal|content|400/.test(e.message || '')) {
      console.log('[VISION] NVIDIA no disponible para visión, intentando Gemini:', e.message);
      txt = await llamarGeminiVision(base64, mime, prompt);
    } else {
      throw e;
    }
  }
  const arr = extraerJsonArray(txt);
  return arr
    .filter(x => x && x.nombre && Number(x.precio) > 0)
    .map(x => ({ nombre: String(x.nombre).trim(), precio: Number(x.precio), ingredientes: x.ingredientes ? String(x.ingredientes).trim() : '' }));
}

module.exports = { extraerMenu, llamarVision, llamarGeminiVision };