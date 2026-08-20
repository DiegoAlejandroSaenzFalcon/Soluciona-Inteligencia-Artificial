'use strict';
const { Server } = require('socket.io');
const auth = require('../auth/index');

let io = null;

const EVENTOS = {
  PEDIDO_NUEVO: 'pedido:nuevo',
  PEDIDO_ESTADO: 'pedido:estado',
  CITA_NUEVA: 'cita:nueva',
  CITA_ESTADO: 'cita:estado',
  STOCK_CAMBIO: 'stock:cambio',
  STOCK_ALERTAS: 'stock:alertas',
  VENTA_NUEVA: 'venta:nueva',
  PAGO_NUEVO: 'pago:nuevo',
  CONFIG_CAMBIO: 'config:cambio',
  COMPRAS_CAMBIO: 'compras:cambio',
};

function autenticar(socket, next) {
  try {
    const token = (socket.handshake.auth && socket.handshake.auth.token) ||
      (socket.handshake.query && socket.handshake.query.token);
    if (!token) return next(Object.assign(new Error('no_autenticado'), { data: { status: 401 } }));
    const payload = auth.verifyToken(token);
    if (!payload) return next(Object.assign(new Error('token_invalido'), { data: { status: 401 } }));
    socket.user = {
      id: Number(payload.sub),
      tenantId: payload.tenantId || 'default',
      role: payload.role || 'solo_lectura',
      nombre: payload.nombre || '',
      email: payload.email || '',
    };
    return next();
  } catch (e) {
    return next(Object.assign(new Error('no_autenticado'), { data: { status: 401 } }));
  }
}

function initWebSockets(server) {
  if (io) return io;
  io = new Server(server, {
    path: '/socket.io',
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
  });

  io.use(autenticar);

  io.on('connection', (socket) => {
    const { tenantId, role, id } = socket.user;
    socket.join(`tenant:${tenantId}`);
    socket.join(`user:${id}`);
    socket.join(`rol:${role}`);

    socket.on('ping', (cb) => {
      if (typeof cb === 'function') cb({ pong: Date.now() });
      else socket.emit('pong', { ts: Date.now() });
    });

    socket.on('presencia', () => {
      socket.emit('presencia', { clientes: contarClientes(tenantId) });
    });

    socket.on('disconnect', () => {
      socket.leave(`tenant:${tenantId}`);
      socket.leave(`user:${id}`);
      socket.leave(`rol:${role}`);
    });
  });

  console.log('[OK] WebSockets Socket.io listos en /socket.io');
  return io;
}

function contarClientes(tenantId) {
  if (!io) return 0;
  if (tenantId) {
    const room = io.sockets.adapter.rooms.get(`tenant:${tenantId}`);
    return room ? room.size : 0;
  }
  return io.engine.clientsCount || 0;
}

function emitir(tenantId, evento, datos) {
  if (!io) return;
  io.to(`tenant:${tenantId}`).emit(evento, datos);
}

function emitirUsuario(userId, evento, datos) {
  if (!io) return;
  io.to(`user:${userId}`).emit(evento, datos);
}

function emitirRol(role, evento, datos) {
  if (!io) return;
  io.to(`rol:${role}`).emit(evento, datos);
}

function emitirGlobal(evento, datos) {
  if (!io) return;
  io.emit(evento, datos);
}

module.exports = {
  initWebSockets, emitir, emitirUsuario, emitirRol, emitirGlobal, contarClientes, EVENTOS,
};