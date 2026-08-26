/**
 * WebSocket Plugin - Real-time communication
 */
import { FastifyPluginAsync } from 'fastify';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from '../../../src/auth/index';
import { getClient } from '../../../src/db/connection';
import { getConfig } from '../../shared/config';

declare module 'fastify' {
  interface FastifyInstance {
    io: ReturnType<typeof SocketIOServer>;
  }
}

const websocketPlugin: FastifyPluginAsync = async (fastify) => {
  const config = getConfig();

  const io = new SocketIOServer(fastify.server, {
    path: '/socket.io',
    cors: {
      origin: config.security.corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const payload = verifyToken(token);
    if (!payload) {
      return next(new Error('Invalid token'));
    }

    const c = getClient();
    try {
      const rows = await c.unsafe(
        'SELECT id, tenant_id, role, nombre, email FROM users WHERE id = $1 AND activo = true LIMIT 1',
        [Number(payload.sub)]
      );

      if (!rows.length) {
        return next(new Error('User not found'));
      }

      socket.data.user = {
        id: rows[0].id,
        tenantId: rows[0].tenant_id,
        role: rows[0].role,
        nombre: rows[0].nombre,
        email: rows[0].email,
      };

      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const { tenantId, id: userId, role } = socket.data.user;

    socket.join(`tenant:${tenantId}`);
    socket.join(`user:${userId}`);
    socket.join(`role:${role}`);

    socket.on('ping', (cb) => {
      if (typeof cb === 'function') cb({ pong: Date.now() });
      else socket.emit('pong', { ts: Date.now() });
    });

    socket.on('presencia', () => {
      socket.emit('presencia', { clientes: io.sockets.adapter.rooms.get(`tenant:${tenantId}`)?.size || 0 });
    });

    socket.on('disconnect', () => {
      socket.leave(`tenant:${tenantId}`);
      socket.leave(`user:${userId}`);
      socket.leave(`rol:${role}`);
    });
  });

  fastify.decorate('io', io);
  fastify.decorate('emitir', (tenantId: string, event: string, data: unknown) => {
    fastify.io.to(`tenant:${tenantId}`).emit(event, data);
  });

  fastify.addHook('onClose', async () => {
    await io.close();
  });
};

export const websocketPlugin = websocketPlugin;