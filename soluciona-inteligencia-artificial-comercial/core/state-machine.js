const { config } = require('../config.cjs');

const ESTADOS = {
  EXPLORACION: 'exploracion',
  CONFIGURANDO_PEDIDO: 'configurando_pedido',
  CONFIRMACION_REQUERIDA: 'confirmacion_requerida',
  ESPERANDO_UBICACION: 'esperando_ubicacion',
  CANCELACION: 'cancelacion',
  PEDIDO_COMPLETADO: 'pedido_completado'
};

const TRIGGERS = {
  CONFIRMAR_PEDIDO: 'confirmar_pedido',
  CANCELAR_PEDIDO: 'cancelar_pedido',
  MODIFICAR_PEDIDO: 'modificar_pedido',
  AGREGAR_ITEM: 'agregar_item',
  QUITAR_ITEM: 'quitar_item',
  SOLICITAR_MENU: 'solicitar_menu',
  CONSULTAR_PRODUCTO: 'consultar_producto',
  FUERA_TEMA: 'fuera_tema'
};

const estadosConversacion = new Map();

function obtenerEstado(jid) {
  return estadosConversacion.get(jid) || { estado: ESTADOS.EXPLORACION, carrito: [], historial: [] };
}

function guardarEstado(jid, estadoData) {
  estadosConversacion.set(jid, estadoData);
}

function limpiarEstado(jid) {
  estadosConversacion.delete(jid);
}

function resetearCarrito(jid) {
  const estado = obtenerEstado(jid);
  estado.carrito = [];
  estado.estado = ESTADOS.EXPLORACION;
  guardarEstado(jid, estado);
}

function agregarAlCarrito(jid, items) {
  const estado = obtenerEstado(jid);
  for (const item of items) {
    const existente = estado.carrito.find(i => i.producto === item.producto);
    if (existente) {
      existente.cantidad += item.cantidad;
      existente.subtotal = existente.cantidad * existente.precioUnitario;
    } else {
      estado.carrito.push({ ...item });
    }
  }
  estado.estado = ESTADOS.CONFIGURANDO_PEDIDO;
  guardarEstado(jid, estado);
  return estado.carrito;
}

function quitarDelCarrito(jid, nombreProducto) {
  const estado = obtenerEstado(jid);
  estado.carrito = estado.carrito.filter(i => i.producto !== nombreProducto);
  if (estado.carrito.length === 0) {
    estado.estado = ESTADOS.EXPLORACION;
  }
  guardarEstado(jid, estado);
  return estado.carrito;
}

function obtenerResumenCarrito(jid) {
  const estado = obtenerEstado(jid);
  if (estado.carrito.length === 0) return null;
  const total = estado.carrito.reduce((s, i) => s + i.subtotal, 0);
  const lineas = estado.carrito.map(i => `• ${i.cantidad} x ${i.producto} = ${config.moneda}${i.subtotal.toLocaleString('es-CO')}`);
  return { lineas, total, items: estado.carrito };
}

function transicionarAConfirmacion(jid) {
  const estado = obtenerEstado(jid);
  estado.estado = ESTADOS.CONFIRMACION_REQUERIDA;
  guardarEstado(jid, estado);
}

function transicionarAEsperandoUbicacion(jid) {
  const estado = obtenerEstado(jid);
  estado.estado = ESTADOS.ESPERANDO_UBICACION;
  guardarEstado(jid, estado);
}

function transicionarAExploracion(jid) {
  const estado = obtenerEstado(jid);
  estado.estado = ESTADOS.EXPLORACION;
  estado.carrito = [];
  guardarEstado(jid, estado);
}

function transicionarACancelacion(jid) {
  const estado = obtenerEstado(jid);
  estado.estado = ESTADOS.CANCELACION;
  guardarEstado(jid, estado);
}

function agregarHistorial(jid, rol, texto) {
  const estado = obtenerEstado(jid);
  estado.historial.push({ rol, texto, timestamp: Date.now() });
  if (estado.historial.length > 20) estado.historial = estado.historial.slice(-20);
  guardarEstado(jid, estado);
}

function obtenerHistorialReciente(jid, max = 10) {
  const estado = obtenerEstado(jid);
  return estado.historial.slice(-max);
}

function detectarTrigger(cuerpo, estadoActual, carrito) {
  const texto = cuerpo.toLowerCase().trim();

  if (carrito.length > 0 && /^(confirmar|confirmo|s[íi]|dale|ok|listo|perfecto)$/i.test(texto)) {
    return TRIGGERS.CONFIRMAR_PEDIDO;
  }
  if (carrito.length > 0 && /^(cancelar|cancela|no quiero|borrar|elimina)$/i.test(texto)) {
    return TRIGGERS.CANCELAR_PEDIDO;
  }
  if (carrito.length > 0 && /^(cambia|modifica|quita|saca|elimina|remueve)/i.test(texto)) {
    return TRIGGERS.MODIFICAR_PEDIDO;
  }
  if (/^(men[uú]|carta|qu[eé] venden|qu[eé] hay|ver platos|platos|precios|lista)/i.test(texto)) {
    return TRIGGERS.SOLICITAR_MENU;
  }
  if (/qu[eé] lleva|qu[eé] tiene|ingredientes|diferencia|distingue|comparar/i.test(texto)) {
    return TRIGGERS.CONSULTAR_PRODUCTO;
  }
  return null;
}

module.exports = {
  ESTADOS,
  TRIGGERS,
  obtenerEstado,
  guardarEstado,
  limpiarEstado,
  resetearCarrito,
  agregarAlCarrito,
  quitarDelCarrito,
  obtenerResumenCarrito,
  transicionarAConfirmacion,
  transicionarAEsperandoUbicacion,
  transicionarAExploracion,
  transicionarACancelacion,
  agregarHistorial,
  obtenerHistorialReciente,
  detectarTrigger
};