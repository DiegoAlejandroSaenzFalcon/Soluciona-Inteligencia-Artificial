'use strict';
/**
 * src/health/ai-narrator.js — Narrativa IA del informe de salud (opcional).
 *
 * Si hay key de IA en el entorno, convierte los datos deterministas en español claro
 * y añade la etiqueta "NARRADO POR IA". Si no hay, devuelve una explicación honesta.
 * Sin key jamás finje un análisis de IA — eso es la regla rectora.
 */

const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..', '..');

function leerEnv() {
  const p = path.join(raiz, '.env');
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const l of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

// Regla ÚNICA para decir "hay IA o no": debe empatar con system-report.js.
// Antes uno decía "longitud > 8" y otro "longitud + sin placeholder", lo que
// les hacía discrepar y fingir una llamada de IA inválida. Se corrige aquí.
function clavePresente(v) {
  return !!(v && v.length > 8 && !/^(your-|CHANGE_ME|TODO|REEMPLAZAR)/i.test(v));
}

async function narrarReporte(reporte) {
  const env = leerEnv();
  const tieneLLM = clavePresente(env.LLM_API_KEY);

  if (!tieneLLM) {
    return {
      modo: 'SIN IA (reglas deterministas)',
      texto: 'Tu sistema fue evaluado por reglas. Para la explicación narrativa por IA, coloca la clave LLM_API_KEY en tu .env y vuelve a recargar el panel.',
    };
  }

  const base = (env.LLM_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '');
  const modelo = env.LLM_MODEL || 'meta/llama-3.1-8b-instruct';

  const prompt = `Eres un asistente técnico de Soluciona IA. Convierte este informe determinista del sistema en un mensaje corto y claro para el dueño del negocio (no técnico).
Destaca: qué está bien, qué falta y qué debe priorizar. Sé preciso; no hables de código; usa viñetas.

INFORME SISTEMA (datos duros, ningún secreto):
${JSON.stringify(reporte, null, 2).slice(0, 3500)}

Formatea la respuesta en máximo 10 líneas, español, con emojis profesionales y una acción recomendada primero.`;

  try {
    const resp = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.LLM_API_KEY}` },
      body: JSON.stringify({ model: modelo, temperature: 0.3, max_tokens: 400, messages: [
        { role: 'system', content: 'Eres un asistente técnico que convierte datos en consejos simples.' },
        { role: 'user', content: prompt },
      ] }),
    });
    const data = await resp.json().catch(() => ({}));
    const texto = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!texto) return { modo: 'IA con error', texto: `El endpoint respondió ${resp.status}: sin contenido.` };
    return { modo: 'NARRADO POR IA', texto: texto.trim() };
  } catch (e) {
    return { modo: 'IA error', texto: `No se pudo llamar a la IA (${e.message}).` };
  }
}

module.exports = { narrarReporte };
