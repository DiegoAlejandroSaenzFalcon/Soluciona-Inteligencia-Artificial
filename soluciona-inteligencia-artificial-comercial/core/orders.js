const { config, fechaDia, hoyInicio, normalizar, escaparRegex } = require('../config.js');
const { enviarPedido } = require('./integracion.js');
const db = require('./db.js');

function leerPedidos() {
  return db.leerPedidos();
}

function guardarPedido(datos) {
  db.guardarPedido(datos);
  try { require('../src/websockets.js').emitir('default', 'pedido:nuevo', { id: datos && datos.id, telefono: datos && datos.telefono }); } catch {}
  enviarPedido(datos).catch(e => console.error('[!] Error en integración POS:', e && e.message ? e.message : e));
}

function patchPedido(id, campos) {
  return db.patchPedido(id, campos);
}

function cambiarEstado(id, estado) {
  return db.cambiarEstado(id, estado);
}

function siguienteId() {
  return db.siguienteId();
}

const NUMEROS_LETRA = { una: 1, uno: 1, un: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20 };
const NUM_PAT = '\\d+|una|uno|un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieciseis|diecisiete|dieciocho|diecinueve|veinte';

function valorNumero(tok) {
  return NUMEROS_LETRA[tok] != null ? NUMEROS_LETRA[tok] : parseInt(tok, 10);
}

function aliasPlural(a) {
  return escaparRegex(a).split(' ').map(w => {
    if (w.endsWith('z')) return w.slice(0, -1) + '(?:z|ces)';
    if (w.endsWith('s')) return w;
    if (/[aeiou]$/.test(w)) return w + 's?';
    if (/[lnr]$/.test(w)) return w + '(?:es)?';
    return w + 's?';
  }).join('(?:\\s+de\\s+|\\s+)');
}

function parsearPedido(mensaje) {
  const texto = normalizar(mensaje);
  if (!/\d/.test(texto) && /[?¿]|\b(que|qué|cual|cuál|como|cómo|cuanto|cuánto|cuesta|trae|lleva|tiene|sabes|informacion|info|dime|me dices|me dice|por que|por qué|porque)\b/i.test(texto)) return [];
  const hallazgos = [];
  const agregar = (producto, precio, qty, m) => {
    if (qty > 0 && qty <= 1000) hallazgos.push({ producto, precio, qty, start: m.index, end: m.index + m[0].length });
  };
  for (const p of config.productos) {
    const aliasUnico = [...new Set(p.alias)].sort((a, b) => b.length - a.length);
    const altP = aliasUnico.map(aliasPlural).join('|');
    let m;
    const re = new RegExp(`(${NUM_PAT})\\s*(?:${altP})\\b`, 'g');
    while ((m = re.exec(texto)) !== null) agregar(p.nombre, p.precio, valorNumero(m[1]), m);
    const reSuf = new RegExp(`(?:${altP})\\b\\s*(?:[x×*]\\s*)?\\s*(${NUM_PAT})(?!\\.\\d)\\b`, 'g');
    while ((m = reSuf.exec(texto)) !== null) agregar(p.nombre, p.precio, valorNumero(m[1]), m);
    const reDoc = new RegExp(`\\b(?:(media)\\s+)?(?:docena|docenas)\\s+(?:de\\s+)?(?:${altP})\\b`, 'g');
    while ((m = reDoc.exec(texto)) !== null) agregar(p.nombre, p.precio, m[1] ? 6 : 12, m);
    if (!/\d/.test(texto) && !new RegExp(`\\b(?:${NUM_PAT})\\b`).test(texto)) {
      const reSing = new RegExp(`\\b(?:${altP})\\b`);
      const s = reSing.exec(texto);
      if (s) agregar(p.nombre, p.precio, 1, s);
    }
  }
  hallazgos.sort((a, b) => (b.end - b.start) - (a.end - a.start));
  const aceptados = [];
  for (const h of hallazgos) {
    const choca = aceptados.some(a => a.producto !== h.producto && h.start < a.end && h.end > a.start);
    if (!choca) aceptados.push(h);
  }
  const porProducto = {};
  for (const h of aceptados) {
    if (!porProducto[h.producto]) porProducto[h.producto] = { cantidad: 0, precio: h.precio };
    porProducto[h.producto].cantidad += h.qty;
  }
  return Object.entries(porProducto).map(([producto, v]) => ({
    producto, cantidad: v.cantidad, precioUnitario: v.precio, subtotal: v.cantidad * v.precio
  }));
}

function resumenDe(orders, desde) {
  const hoy = desde ? orders.filter(o => o.dia === desde.slice(0, 10)) : orders;
  let total = 0;
  const porProducto = {};
  for (const o of hoy) {
    total += o.total;
    for (const i of o.items) {
      if (!porProducto[i.producto]) porProducto[i.producto] = { cantidad: 0, valor: 0 };
      porProducto[i.producto].cantidad += i.cantidad;
      porProducto[i.producto].valor += i.subtotal;
    }
  }
  const articulos = Object.entries(porProducto)
    .sort((a, b) => b[1].cantidad - a[1].cantidad)
    .map(([k, v]) => `${k}: ${v.cantidad} und (${config.moneda}${v.valor.toLocaleString('es-CO')})`)
    .join('\n');
  return {
    texto:
      `📊 REPORTE PEDIDOS\n${hoy.length} pedidos | ${config.moneda}${total.toLocaleString('es-CO')}\n\nDetalle vendido:\n${articulos || 'Ninguno'}`,
    total, pedidos: hoy.length
  };
}

function formatearConfirmacion(pedido, remitente) {
  const lineas = pedido.items.map(i => `• ${i.cantidad} x ${i.producto} = ${config.moneda}${i.subtotal.toLocaleString('es-CO')}`);
  let texto = `✅ Pedido #${pedido.id} recibido de ${remitente}\n\n${lineas.join('\n')}`;
  if (pedido.tipo === 'domicilio') {
    if (pedido.costo_domicilio != null && pedido.costo_domicilio > 0) {
      const dist = pedido.distancia_km != null ? ` (${Number(pedido.distancia_km).toFixed(1)} km)` : '';
      texto += `\n🚚 Domicilio: ${config.moneda}${pedido.costo_domicilio.toLocaleString('es-CO')}${dist}`;
    } else if (pedido.distancia_km != null) {
      texto += `\n🚚 Domicilio: sin costo (${Number(pedido.distancia_km).toFixed(1)} km)`;
    }
  }
  texto += `\n💰 TOTAL: ${config.moneda}${pedido.total.toLocaleString('es-CO')}`;
  return texto;
}

function reporteHoyTexto() {
  return resumenDe(leerPedidos(), hoyInicio()).texto;
}

module.exports = {
  leerPedidos, guardarPedido, patchPedido, cambiarEstado, siguienteId,
  parsearPedido, resumenDe, formatearConfirmacion, reporteHoyTexto
};

