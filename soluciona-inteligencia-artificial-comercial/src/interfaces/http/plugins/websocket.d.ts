/**
 * WebSocket Plugin - Real-time communication
 */
import { FastifyPluginAsync } from 'fastify';
import { Server as SocketIOServer } from 'socket.io';
declare module 'fastify' {
    interface FastifyInstance {
        io: ReturnType<typeof SocketIOServer>;
    }
}
export declare const websocketPlugin: FastifyPluginAsync;
//# sourceMappingURL=websocket.d.ts.map