const { config, numDeCelular, fechaDia, normalizar, esc } = require('../../config');
const { guardarCita, leerCitas, siguienteCitaId, cambiarEstadoCita } = require('../../core/db');

const PENDIENTES = new Map();

const SERVICIOS = config.servicios.length
  ? config.servicios
  : ['Corte caballero', 'Corte dama', 'Barba', 'Color', 'Mechas', 'Manicure', 'Pedicure', 'Facial', 'Masaje', 'Depilación'];

const PROFESIONALES = config.profesionales.length
  ? config.profesionales
  : ['Carlos (Barbero)', 'María (Estilista)', 'Ana (Manicurista)', 'Laura (Terapista)'];

const RECURSOS = config.recursos.length
  ? config.recursos
  : ['Silla 1', 'Silla 2', 'Silla 3', 'Camilla 1', 'Cabina Facial'];

const HORARIOS = config.horarios.length
  ? config.horarios
  : ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00',
     '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
     '17:30', '18:00', '18:30', '19:00', '19:30'];

const PAQUETES = config.paquetes || [];

const PASOS = ['servicio', 'profesional', 'recurso', 'fecha', 'hora', 'confirmar'];

function getPend(jid) {
  return PENDIENTES.get(jid);
}

function setPend(jid, data) {
  PENDIENTES.set(jid, { ...getPend(jid), ...data });
}

function clearPend(jid) {
  PENDIENTES.delete(jid);
}

function listarServicios() {
  return SERVICIOS.map((s, i) => `${i + 1}. ${s}`).join('\n');
}

function listarProfesionales() {
  return PROFESIONALES.map((p, i) => `${i + 1}. ${p}`).join('\n');
}

function listarRecursos() {
  return RECURSOS.map((r, i) => `${i + 1}. ${r}`).join('\n');
}

function listarHorarios() {
  return HORARIOS.join(' · ');
}

function listarPaquetes() {
  if (!PAQUETES.length) return '';
  return '\n📦 *Paquetes disponibles:*\n' + PAQUETES.map((p, i) => `${i + 1}. ${p.nombre} - ${p.servicios.join(', ')} - $${p.precio.toLocaleString('es-CO')}`).join('\n');
}

function parseSeleccion(text, lista) {
  const t = normalizar(text);
  const num = parseInt(text.trim(), 10);
  if (!isNaN(num) && num >= 1 && num <= lista.length) return lista[num - 1];
  for (const item of lista) {
    if (t.includes(normalizar(item))) return item;
  }
  return null;
}

function parseFecha(text) {
  const t = text.trim().toLowerCase();
  const hoy = new Date();
  if (t === 'hoy') return fechaDia();
  if (t === 'mañana') {
    const d = new Date(hoy);
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  const m1 = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}`;
  const m2 = t.match(/^(\d{1,2})[/-](\d{1,2})$/);
  if (m2) {
    const d = new Date(hoy.getFullYear(), parseInt(m2[2], 10) - 1, parseInt(m2[1], 10));
    if (d < hoy) d.setFullYear(d.getFullYear() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return null;
}

function parseHora(text) {
  const t = text.trim();
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (m) {
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
      const hh = String(h).padStart(2, '0');
      const mm = String(min).padStart(2, '0');
      const valida = HORARIOS.includes(`${hh}:${mm}`);
      return { hh: `${hh}:${mm}`, valida };
    }
  }
  return null;
}

async function responder(s, jid, texto, m) {
  const res = await s.sendMessage(jid, { text: texto }, m ? { quoted: m } : undefined);
  return res;
}

async function enviarBienvenida(s, jid, m, remitente) {
  const txt = `✨ ¡Hola ${remitente || ''}! Bienvenido a *${config.nombreNegocio()}*.\n\n` +
    `Para agendar tu cita, elige un *servicio*:\n\n${listarServicios()}${listarPaquetes()}\n\n` +
    `Escribe el número o el nombre del servicio.`;
  await responder(s, jid, txt, m);
}

async function pasoServicio(ctx) {
  const { s, jid, cuerpo, m, remitente } = ctx;
  const sel = parseSeleccion(cuerpo, SERVICIOS);
  if (!sel) {
    await responder(s, jid, `⚠️ No reconocí ese servicio. Elige uno:\n\n${listarServicios()}${listarPaquetes()}`, m);
    return true;
  }
  setPend(jid, { paso: 'profesional', servicio: sel });
  await responder(s, jid,
    `✅ Servicio: *${sel}*\n\n` +
    `Ahora elige tu *profesional* preferido:\n\n${listarProfesionales()}\n\n` +
    `O escribe "cualquiera" para asignar disponible.`,
    m
  );
  return true;
}

async function pasoProfesional(ctx) {
  const { s, jid, cuerpo, m, remitente } = ctx;
  const t = normalizar(cuerpo);
  if (t.includes('cualquiera') || t.includes('da igual') || t.includes('el que sea') || t.includes('disponible')) {
    setPend(jid, { paso: 'recurso', profesional: 'Cualquier disponible' });
  } else {
    const sel = parseSeleccion(cuerpo, PROFESIONALES);
    if (!sel) {
      await responder(s, jid, `⚠️ No reconocí ese profesional:\n\n${listarProfesionales()}\n\nO escribe "cualquiera".`, m);
      return true;
    }
    setPend(jid, { paso: 'recurso', profesional: sel });
  }
  await responder(s, jid,
    `✅ Profesional: *${getPend(jid).profesional}*\n\n` +
    `Elige tu *silla/camilla* (recurso):\n\n${listarRecursos()}\n\n` +
    `O escribe "cualquiera".`,
    m
  );
  return true;
}

async function pasoRecurso(ctx) {
  const { s, jid, cuerpo, m, remitente } = ctx;
  const t = normalizar(cuerpo);
  if (t.includes('cualquiera') || t.includes('da igual') || t.includes('el que sea') || t.includes('disponible')) {
    setPend(jid, { paso: 'fecha', recurso: 'Cualquier disponible' });
  } else {
    const sel = parseSeleccion(cuerpo, RECURSOS);
    if (!sel) {
      await responder(s, jid, `⚠️ No reconocí ese recurso:\n\n${listarRecursos()}\n\nO escribe "cualquiera".`, m);
      return true;
    }
    setPend(jid, { paso: 'fecha', recurso: sel });
  }
  const hoy = new Date();
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);
  const mananaStr = `${manana.getFullYear()}-${String(manana.getMonth() + 1).padStart(2, '0')}-${String(manana.getDate()).padStart(2, '0')}`;
  await responder(s, jid,
    `✅ Recurso: *${getPend(jid).recurso}*\n\n` +
    `Indica la *fecha* (ej: "hoy", "mañana", "2025-12-25" o "25/12"):\n` +
    `Días sugeridos: *hoy* (${fechaDia()}) o *mañana* (${mananaStr})`,
    m
  );
  return true;
}

async function pasoFecha(ctx) {
  const { s, jid, cuerpo, m, remitente } = ctx;
  const fecha = parseFecha(cuerpo);
  if (!fecha) {
    await responder(s, jid, `⚠️ Fecha no válida. Usa "hoy", "mañana", "YYYY-MM-DD" o "DD/MM".`, m);
    return true;
  }
  const f = new Date(fecha + 'T00:00');
  const hoy = new Date(fechaDia() + 'T00:00');
  if (f < hoy) {
    await responder(s, jid, `⚠️ No se puede agendar para fechas pasadas.`, m);
    return true;
  }
  setPend(jid, { paso: 'hora', fecha });
  await responder(s, jid,
    `✅ Fecha: *${fecha}*\n\n` +
    `Elige una *hora* disponible:\n\n${listarHorarios()}\n\n` +
    `Escribe la hora (ej: "14:30").`,
    m
  );
  return true;
}

async function pasoHora(ctx) {
  const { s, jid, cuerpo, m, remitente } = ctx;
  const r = parseHora(cuerpo);
  if (!r || !r.valida) {
    await responder(s, jid, `⚠️ Hora no disponible. Usa una de:\n${listarHorarios()}`, m);
    return true;
  }
  setPend(jid, { paso: 'confirmar', hora: r.hh });
  const p = getPend(jid);
  await responder(s, jid,
    `✅ Hora: *${r.hh}*\n\n` +
    `📋 *Resumen de tu cita:*\n` +
    `• Servicio: ${p.servicio}\n` +
    `• Profesional: ${p.profesional}\n` +
    `• Recurso: ${p.recurso}\n` +
    `• Fecha: ${p.fecha}\n` +
    `• Hora: ${r.hh}\n\n` +
    `Escribe *CONFIRMAR* para reservar o *CANCELAR* para anular.`,
    m
  );
  return true;
}

async function pasoConfirmar(ctx) {
  const { s, jid, cuerpo, m, remitente, tel } = ctx;
  const t = normalizar(cuerpo);
  if (t === 'cancelar' || t.includes('cancelar')) {
    clearPend(jid);
    await responder(s, jid, '✅ Cita cancelada. Cuando quieras agenda una nueva.', m);
    return true;
  }
  if (t !== 'confirmar' && !t.includes('confirmar') && t !== 'si' && t !== 'sí' && t !== 'ok') {
    await responder(s, jid, 'Escribe *CONFIRMAR* para reservar o *CANCELAR* para anular.', m);
    return true;
  }
  const p = getPend(jid);
  const id = siguienteCitaId();
  guardarCita({
    id,
    fecha: p.fecha,
    hora: p.hora,
    servicio: p.servicio,
    profesional: p.profesional,
    paciente: p.remitente || remitente || 'Cliente',
    telefono: tel,
    estado: 'reservada',
    confirmada: true
  });
  clearPend(jid);
  await responder(s, jid,
    `✨ *¡Cita confirmada en ${config.nombreNegocio()}!*\n\n` +
    `📋 Detalles:\n` +
    `• Servicio: ${p.servicio}\n` +
    `• Profesional: ${p.profesional}\n` +
    `• Recurso: ${p.recurso}\n` +
    `• Fecha: ${p.fecha}\n` +
    `• Hora: ${p.hora}\n` +
    `• Nº cita: #${id}\n\n` +
    `¡Te esperamos! Si necesitas cambiar o cancelar, avísanos.`,
    m
  );
  return true;
}

async function manejarMisCitas(ctx) {
  const { s, jid, m, tel, remitente } = ctx;
  const citas = leerCitas().filter(c => c.telefono === tel);
  if (!citas.length) {
    await responder(s, jid, `No tienes citas agendadas. Escribe cualquier cosa para empezar una nueva.`, m);
    return true;
  }
  const lineas = citas.map(c =>
    `• #${c.id} | ${c.fecha} ${c.hora} | ${c.servicio} | ${c.profesional} | ${c.recurso || ''} | ${c.estado}`
  ).join('\n');
  await responder(s, jid, `📅 *Tus citas:*\n\n${lineas}\n\nEscribe CANCELAR #${citas[0].id} para anular una.`, m);
  return true;
}

async function manejarCancelarCita(ctx) {
  const { s, jid, cuerpo, m: msg, tel } = ctx;
  const match = cuerpo.match(/cancelar\s*#?(\d+)/i);
  if (!match) return false;
  const id = parseInt(match[1], 10);
  const cita = leerCitas().find(c => c.id === id && c.telefono === tel);
  if (!cita) {
    await responder(s, jid, `⚠️ No encontré esa cita.`, msg);
    return true;
  }
  cambiarEstadoCita(id, 'cancelada');
  await responder(s, jid, `✅ Cita #${id} cancelada.`, msg);
  return true;
}

async function manejarMensaje(ctx) {
  const { s, jid, cuerpo, m, ubicacion, remitente, tel, esDueno } = ctx;

  if (esDueno) return false;

  const t = normalizar(cuerpo);

  if (t === 'mis citas' || t === 'mis citaciones' || t === 'ver mis citas' || t === 'citas' || t === 'agenda') {
    return await manejarMisCitas(ctx);
  }

  if (t.startsWith('cancelar') && t.includes('#')) {
    return await manejarCancelarCita(ctx);
  }

  const pend = getPend(jid);
  if (!pend) {
    await enviarBienvenida(s, jid, m, remitente);
    return true;
  }

  if (pend.paso === 'servicio') return await pasoServicio(ctx);
  if (pend.paso === 'profesional') return await pasoProfesional(ctx);
  if (pend.paso === 'recurso') return await pasoRecurso(ctx);
  if (pend.paso === 'fecha') return await pasoFecha(ctx);
  if (pend.paso === 'hora') return await pasoHora(ctx);
  if (pend.paso === 'confirmar') return await pasoConfirmar(ctx);

  await enviarBienvenida(s, jid, m, remitente);
  return true;
}

module.exports = {
  segmento: 'belleza',
  manejarMensaje,
  enviarBienvenida
};