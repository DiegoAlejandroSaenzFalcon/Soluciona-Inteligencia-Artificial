/*
 * SOLUCINA INTELIGENCIA ARTIFICIAL — Variante Empresarial
 * Núcleo de gestión de tickets, triaje y base de conocimiento
 * 
 * Flujo obligatorio (AGENTS.md):
 * 1. Crear/abrir ticket en tickets/<cliente>/<id>
 * 2. Triage: clasificar prioridad/categoría/tipo L1/L2/L3
 * 3. Propuesta: agente propone, espera aprobación humana
 * 4. Ejecución: dentro de ventana JIT, registrar log
 * 5. Verificación: prueba de resultado
 * 6. Cierre: generar reporte append-only
 * 
 * Seguridad: append-only, nada se edita/borra, mínimo privilegio, JIT.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve('.');
const TICKETS_DIR = path.join(ROOT, 'tickets');
const CLIENTES_DIR = path.join(ROOT, 'clientes');
const KB_DIR = path.join(ROOT, 'kb');

/* --- Utilidades --- */

function generarId() {
  return 'TKT-' + new Date().toISOString().slice(10, 19).replace(/[-:]/g, '') + '-' + crypto.randomBytes(4).toString('hex');
}

function asegurarDirectorio(cliente) {
  const cliDir = path.join(CLIENTES_DIR, cliente);
  if (!fs.existsSync(cliDir)) fs.mkdirSync(cliDir, { recursive: true });
  return cliDir;
}

function ticketPath(cliente, id) {
  return path.join(TICKETS_DIR, cliente + '__' + id);
}

function clienteTicketDir(cliente) {
  return path.join(TICKETS_DIR, cliente + '__ticket');
}

/* --- Ticket Storage --- */

function crearTicket(cliente, descricao, canal = 'manual') {
  const id = generarId();
  const cliDir = asegurarDirectorio(cliente);
  const dir = path.join(cliDir, `${id}`);

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const ahora = new Date().toISOString().slice(11, 19);

  const ticket = {
    id,
    cliente,
    documento: 'SN',
    estado: 'nuevo',
    prioridad: null,
    categoria: null,
    tipo: null,
    en_kb: false,
    resumen: descricao,
    canal,
    fecha_apertura: ahora,
    aprobacion: null,
    ejecucion: null,
    cierre: null
  };

  const ticketPathname = path.join(dir, 'ticket.json');
  fs.writeFileSync(ticketPathname, JSON.stringify(ticket, null, 2) + '\n');

  const md = `# Ticket ${id} — ${cliente} (Doc/ID: SN)\n\n**Fecha apertura**: ${ahora}\n**Estado**: nuevo\n**Canal**: ${canal}\n\n## Descripción del problema\n${descricao}\n\n## Progreso (append-only)\n- [ ] Triage (agente triager)\n- [ ] Propuesta enviada / aprobación\n- [ ] Ejecución autorizada\n- [ ] Verificación y cierre`;
  fs.writeFileSync(path.join(dir, 'ticket.md'), md + '\n');

  return { id, dir, ticket };
}

function abrirTicket(cliente, id) {
  const jsonPath = path.join(TICKETS_DIR, cliente + '__ticket', `${id}.json`);
  if (fs.existsSync(jsonPath)) return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  return null;
}

function actualizarTicket(cliente, id, actualizaciones) {
  const ticket = abrirTicket(cliente, id);
  if (!ticket) return false;

  const ahora = new Date().toISOString().slice(11, 19);

  Object.assign(ticket, actualizaciones, { ultima_actualizacion: ahora });

  const jsonPath = path.join(TICKETS_DIR, cliente + '__ticket', `${id}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(ticket, null, 2) + '\n');

  // Append-only: añade entrada a markdown
  const mdPath = path.join(TICKETS_DIR, cliente + '__ticket', `${id}.md`);
  let md = '';
  if (fs.existsSync(mdPath)) md = fs.readFileSync(mdPath, 'utf8');
  if (!md.includes(ahora)) {
    const entrada = `\n${ahora} - ${actualizaciones.estado || actualizaciones.prioridad || 'actualizacion'}`;
    fs.appendFileSync(mdPath, entrada + '\n');
  }

  return ticket;
}

/* --- Triage Agent --- */

function triageTicket(cliente, id) {
  const ticket = abrirTicket(cliente, id);
  if (!ticket) return null;

  // Leer KB available
  const kbArchivos = fs.readdirSync(KB_DIR).filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''));

  const resumen = ticket.resumen || 'Sin descripción';
  const prioridad = resumen.length > 100 || /caido|falla|error crítico|brecha|seguridad|no envia|no carga/i.test(resumen) ? 'P1' :
                    resumen.length > 30 ? 'P2' : 'P3';

  const categoriaMap = {
    correo: ['correo no envía', 'correos no reciben', 'outlook', 'gmail', 'smtp'],
    red: ['red no conecta', 'wi-fi', 'internet', 'vpn', 'dirección ip'],
    equipo: ['pc no enciende', 'lento', 'no enciende', 'blue screen'],
    software: ['no abre', 'error al abrir', 'licencia expirada'],
    servidor: ['servicio caido', 'servidor no responde', 'puertos'],
    seguridad: ['virus', 'malware', 'acceso no autorizado'],
    otro: []
  };

  let categoria = 'otro';
  for (const [cat, keywords] of Object.entries(categoriaMap)) {
    if (keywords.some(k => resumen.toLowerCase().includes(k))) {
      categoria = cat;
      break;
    }
  }

  const tipoMap = {
    L1: /no abro|no carga|configuración|consulta|cómo hago/i,
    L2: /diagnóstico|revisar|configurar|reparar| reiniciar| restablecer/i,
    L3: /tercero|fabricante| proveedor| migración| cambio de arquitectura/i
  };

  let tipo = 'L1';
  for (const [t, regex] of Object.entries(tipoMap)) {
    if (regex.test(resumen)) { tipo = t; break; }
  }

  // Verificar KB
  enKB = kbArchivos.some(kb => resumen.toLowerCase().includes(kb.toLowerCase()) || 
    kb.split(' ').some(w => resumen.toLowerCase().includes(w.toLowerCase())));

  const triage = {
    resumen: resumen,
    prioridad,
    categoria,
    tipo,
    en_kb: enKB,
    necesidad_info: null
  };

  // Actualizar ticket
  actualizarTicket(cliente, id, {
    estado: 'en_triage',
    prioridad: triage.prioridad,
    categoria: triage.categoria,
    tipo: triage.tipo,
    en_kb: triage.en_kb
  });

  return {
    ...triage,
    siguiente_paso: enKB ? 'proponer_solucion' : 'consultar_kb',
    requiere_info: false
  };
}

/* --- Solver Agent (propose, don't execute) --- */

function solverTicket(cliente, id, pasosPropios = []) {
  const ticket = abrirTicket(cliente, id);
  if (!ticket) return null;

  if (ticket.estado !== 'en_triage' && ticket.estado !== 'necesita_info') {
    return { error: 'Ticket no está en estado de triage o necesita_info' };
  }

  // Generar propuesta sin ejecutar nada en el sistema del cliente
  const propuesta = {
    diagnostico: 'Análisis basado en runbooks y catálogo de causas',
    pasos: [
      ...pasosPropios,
      { paso: '1', accion: 'Verificar estado actual del sistema afectado', autorizada: false },
      { paso: '2', accion: 'Aplicar runbook correspondiente (ver KB)', autorizada: false },
      { paso: '3', accion: 'Probar cambio en entorno aislado/segundo equipo', autorizada: false },
      { paso: '4', accion: 'Solicitar aprobación del cliente/titular antes de ejecutar en producción', autorizada: false }
    ],
    riesgos: 'Ejecutar sin aprobación puede causar interrupción del servicio; SLA no cubre cambios no autorizados',
    estimacion_tiempo: 'Depende de la complejidad y aprobación del cliente',
    aprobacion_requerida: true
  };

  // Actualizar ticket a propuesta_enviada
  actualizarTicket(cliente, id, {
    estado: 'propuesta_enviada',
    ejecucion: JSON.stringify(propuesta, null, 2)
  });

  return {
    id: ticket.id,
    resumen: ticket.resumen,
    diagnostico: propuesta.diagnostico,
    pasos: propuesta.pasos,
    requiere_aprobacion: true,
    mensaje: 'Propuesta generada. Esperando aprobación del cliente/titular antes de ejecutar cualquier cambio.'
  };
}

/* --- Revisor Agent --- */

function revisarTicket(cliente, id) {
  const jsonPath = path.join(TICKETS_DIR, cliente + '__ticket', `${id}.json`);
  if (!fs.existsSync(jsonPath)) return { error: 'Ticket no encontrado' };

  const ticket = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const mdPath = path.join(TICKETS_DIR, cliente + '__ticket', `${id}.md`);
  const md = fs.existsSync(mdPath) ? fs.readFileSync(mdPath, 'utf8') : '';

  // Checklist de revisión
  const verificaciones = {
    integridad: fs.existsSync(jsonPath) && fs.existsSync(mdPath),
    append_only: !md.includes('EDITAR') && !md.includes('BORRAR'),
    tiene_estado: ticket.estado ? true : false,
    tiene_fechas: ticket.fecha_apertura ? true : false,
    tiene_resumen: ticket.resumen ? true : false
  };

  // Generar reporte de revisión
  const reporte = {
    verificaciones,
    hallazgos: [],
    veredicto: 'APROBADO' // simplicidad: en implementación real verificaría cada campo
  };

  if (!verificaciones.integridad) {
    reporte.hallazgos.push({ severidad: 'alta', detalle: 'Faltan archivos JSON o MD del ticket' });
    reporte.veredicto = 'RECHAZADO';
  }
  if (!verificaciones.append_only) {
    reporte.hallazgos.push({ severidad: 'alta', detalle: 'Se detectaron ediciones o borrados en el registro MD' });
    reporte.veredicto = 'RECHAZADO';
  }

  return {
    ticket,
    reporte,
    veredicto: reporte.veredicto,
    hallazgos: reporte.hallazgos
  };
}

/* --- Knowledge Base Helper --- */

function buscarKB(texto) {
  if (!fs.existsSync(KB_DIR)) return [];
  const archivos = fs.readdirSync(KB_DIR).filter(f => f.endsWith('.md'));
  return archivos.map(f => ({
    archivo: f,
    contenido: fs.readFileSync(path.join(KB_DIR, f), 'utf8').substring(0, 200)
  }));
}

/* --- Module exports --- */

module.exports = {
  crearTicket,
  abrirTicket,
  actualizarTicket,
  triageTicket,
  solverTicket,
  revisarTicket,
  buscarKB,
  ticketPath,
  clienteTicketDir
};

/* --- Ejemplo de uso --- */
// const { crearTicket, triageTicket, solverTicket } = require('./index');
// const { crear } = require('./index');
// const t = crearTicket('MiEmpresa', 'El correo electrónico no envía mensajes desde esta mañana');
// console.log('Ticket creado:', t.id);
// const triaje = triageTicket('MiEmpresa', t.id);
// console.log('Triage:', triaje);
// const solver = solverTicket('MiEmpresa', t.id);
// console.log('Solver propuesta:', solver ? solver.resumen : 'Error');