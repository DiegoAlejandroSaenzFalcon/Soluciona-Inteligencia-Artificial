const { config, numDeCelular, normalizar, esc } = require('../../config');
const {
  obtenerEstado, guardarEstado, limpiarEstado, resetearCarrito,
  agregarAlCarrito, obtenerResumenCarrito,
  transicionarAConfirmacion
} = require('../../core/state-machine');

const PENDIENTES = new Map();

const STOCK_CONFIG = config.stock || {};

function stockDisponible(producto, cantidad = 1) {
  const info = STOCK_CONFIG[producto];
  if (!info) return { hay: true, stock: null, mensaje: '' };
  const disponible = (info.stock != null ? info.stock : 999);
  return {
    hay: disponible >= cantidad,
    stock: info.stock,
    mensaje: info.mensaje || config.mensaje_agotado
  };
}

async function responder(s, jid, texto, m) {
  const res = await s.sendMessage(jid, { text: texto }, m ? { quoted: m } : undefined);
  return res;
}

async function enviarMenu(s, jid, m) {
  const prods = config.productos || [];
  if (!prods.length) {
    await responder(s, jid, 'Catálogo no configurado.', m);
    return;
  }
  const lineas = prods.map(p => {
    const stockInfo = stockDisponible(p.nombre, 1);
    const stockTxt = stockInfo.stock != null ? ` (stock: ${stockInfo.stock})` : '';
    const agotado = stockInfo.hay ? '' : ' ❌ AGOTADO';
    return `• ${p.nombre}: ${config.moneda}${p.precio.toLocaleString('es-CO')}${stockTxt}${agotado}`;
  }).join('\n');
  await responder(s, jid, `📦 *Catálogo ${config.nombreNegocio()}*\n\n${lineas}\n\nEscribe lo que quieres (ej: "2 camiseta roja, 1 pantalón").`, m);
}

async function manejarMensaje(ctx) {
  const { s, jid, cuerpo, m, ubicacion, remitente, tel, esDueno } = ctx;

  if (esDueno) return false;

  const t = normalizar(cuerpo);
  if (t === 'menu' || t === 'catalogo' || t === 'catalogo') {
    await enviarMenu(s, jid, m);
    return true;
  }

  const items = parsearPedidoRetail(cuerpo);
  if (items.length > 0) {
    const estadoObj = obtenerEstado(jid);
    const carrito = estadoObj.carrito || [];
    for (const item of items) {
      const disp = stockDisponible(item.producto, item.cantidad);
      if (!disp.hay) {
        await responder(s, jid, `⚠️ ${item.producto}: ${disp.mensaje}`, m);
        return true;
      }
    }
    agregarAlCarrito(jid, items);
    const resumen = obtenerResumenCarrito(jid);
    const lineas = items.map(i => `✅ ${i.cantidad} x ${i.producto} = ${config.moneda}${i.subtotal.toLocaleString('es-CO')}`).join('\n');
    await responder(s, jid, `${lineas}\n\n🛒 Subtotal: ${config.moneda}${resumen.total.toLocaleString('es-CO')}\n\n¿Agregas algo más? Escribe CONFIRMAR para finalizar.`, m);
    return true;
  }

  if (t === 'confirmar' || t === 'confirmo') {
    const resumen = obtenerResumenCarrito(jid);
    if (!resumen || !resumen.lineas.length) {
      await responder(s, jid, 'Tu carrito está vacío.', m);
      return true;
    }
    const pedido = {
      id: Date.now(),
      fecha: new Date().toISOString(),
      remitente,
      telefono: tel,
      items: resumen.lineas.map(l => ({ producto: l.producto, cantidad: l.cantidad, precio: l.precio })),
      total: resumen.total,
      crudo: JSON.stringify(resumen.lineas),
      estado: 'recibido'
    };
    // guardarPedido comes from orders, but retail doesn't use pedidos table currently
    limpiarEstado(jid);
    await responder(s, jid, `✅ Pedido confirmado:\n\n${resumen.lineas.join('\n')}\n\n💰 Total: ${config.moneda}${resumen.total.toLocaleString('es-CO')}`, m);
    return true;
  }

  if (t === 'cancelar') {
    limpiarEstado(jid);
    await responder(s, jid, '✅ Pedido cancelado.', m);
    return true;
  }

  return false;
}

function parsearPedidoRetail(texto) {
  const productos = config.productos || [];
  const mapa = new Map(productos.map(p => [normalizar(p.nombre), p.nombre]));
  for (const p of productos) {
    for (const a of (p.alias || [])) mapa.set(normalizar(a), p.nombre);
  }
  const regex = /(\d+)\s*x?\s*([a-záéíóúñü0-9\s]+)/gi;
  const items = [];
  let match;
  while ((match = regex.exec(texto)) !== null) {
    const cant = parseInt(match[1], 10);
    const nombreBuscado = normalizar(match[2].trim());
    if (mapa.has(nombreBuscado)) {
      const real = mapa.get(nombreBuscado);
      const prod = productos.find(p => p.nombre === real);
      items.push({ producto: real, cantidad: cant, precioUnitario: prod?.precio || 0, subtotal: cant * (prod?.precio || 0) });
    }
  }
  return items;
}

module.exports = {
  segmento: 'retail',
  manejarMensaje,
  enviarMenu
};