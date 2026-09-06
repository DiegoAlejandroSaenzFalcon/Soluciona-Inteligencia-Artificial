const { config, LLM_API_KEY } = require('../config.cjs');
const { loadAgentesUtiles } = require('../agents-loader.cjs');
const { askLLM, agenteMasRelevante } = require('./ai.cjs');

const CATEGORIAS_ES = {
  marketing: 'Marketing',
  'paid-media': 'Publicidad de pago',
  product: 'Producto',
  sales: 'Ventas',
  strategy: 'Estrategia',
  support: 'Soporte y servicio',
  'project-management': 'Gestión de proyectos',
  design: 'Diseño',
  testing: 'Pruebas y calidad',
  specialized: 'Especializado',
  recetas: 'Cocina y recetas'
};

const ASISTENTES = [
  {
    id: 'marketing',
    nombre: 'Asistente de Marketing y Publicidad',
    emoji: '📣',
    descripcion: 'Crea campañas, contenido y publicidad para todas tus redes (Instagram, TikTok, Facebook, Google). Combina varios expertos en una sola ventana.',
    categorias: ['marketing', 'paid-media', 'design', 'strategy', 'product', 'sales', 'project-management'],
    modelo: 'groq',
    tipo: 'texto'
  },
  {
    id: 'recetas',
    nombre: 'Asistente de Recetas y Mejoras del Local',
    emoji: '👨‍🍳',
    descripcion: 'Recetas de cocina, ideas de platos nuevos y mejoras en la atención y el servicio al cliente.',
    categorias: ['recetas', 'support'],
    modelo: 'groq',
    tipo: 'texto'
  },
  {
    id: 'config',
    nombre: 'Asistente de Configuración (por imagen)',
    emoji: '🛠️',
    descripcion: 'Sube una foto de tu menú y el sistema extrae los productos, precios e ingredientes. También resuelve la instalación y el setup.',
    categorias: [],
    modelo: 'gemini',
    tipo: 'vision'
  }
];

function elegirAgente(asistente, consulta) {
  const todos = loadAgentesUtiles();
  const pool = asistente.categorias && asistente.categorias.length
    ? todos.filter(a => asistente.categorias.includes(String(a.category).toLowerCase()))
    : todos;
  if (!pool.length) return todos[0];
  const antes = agenteMasRelevante;
  let mejor = null, mejorPuntaje = -1;
  for (const a of pool) {
    const hay = (a.name + ' ' + a.category + ' ' + a.description + ' ' + (a.vibe || '')).toLowerCase();
    let puntaje = 0;
    for (const pal of consulta.toLowerCase().split(/\s+/).filter(p => p.length > 2)) if (hay.includes(pal)) puntaje += 2;
    if (puntaje > mejorPuntaje) { mejorPuntaje = puntaje; mejor = a; }
  }
  return (mejor && mejorPuntaje > 0) ? mejor : pool[0];
}

async function preguntarAsistente(asistente, mensaje) {
  const agente = elegirAgente(asistente, mensaje);
  if (asistente.modelo === 'gemini' || asistente.tipo === 'vision') {
    return await askLLM(agente, mensaje, null, { provider: 'gemini', rol: 'vision' });
  }
  return await askLLM(agente, mensaje, null, { rol: 'asistentes' });
}

function catalogoExpertos() {
  const todos = loadAgentesUtiles();
  const grupos = {};
  for (const a of todos) {
    const cat = String(a.category).toLowerCase();
    (grupos[cat] = grupos[cat] || []).push(a);
  }
  return Object.entries(grupos)
    .sort((x, y) => x[0].localeCompare(y[0]))
    .map(([cat, agentes]) => ({
      categoria: cat,
      categoriaEs: CATEGORIAS_ES[cat] || cat,
      agentes: agentes.map(a => ({ id: a.id, nombre: a.name, descripcion: a.description, emoji: a.emoji }))
    }));
}

module.exports = { ASISTENTES, CATEGORIAS_ES, preguntarAsistente, catalogoExpertos, elegirAgente };
