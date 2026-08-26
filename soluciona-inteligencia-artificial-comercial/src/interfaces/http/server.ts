/**
 * Fastify HTTP Server - Clean Architecture Entry Point
 */
import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getConfig } from '../shared/config';
import { getLogger } from '../shared/utils/logger';
import { rateLimitPlugin } from './plugins/rate-limit';
import { csrfPlugin } from './plugins/csrf';
import { authPlugin } from './plugins/auth';
import { healthRoutes } from './routes/health';
import { authRoutes } from './routes/auth';
import { tenantRoutes } from './routes/tenants';
import { userRoutes } from './routes/users';
import { productRoutes } from './routes/products';
import { orderRoutes } from './routes/orders';
import { customerRoutes } from './routes/customers';
import { csrfRoutes } from './routes/csrf';
import { staticPlugin } from './plugins/static';
import { websocketPlugin } from './plugins/websocket';

const logger = getLogger('http-server');

export async function buildServer(): Promise<FastifyInstance> {
  const config = getConfig();

  const server: FastifyInstance = Fastify({
    logger: config.environment === 'development',
    trustProxy: true,
    bodyLimit: 10485760, // 10MB
    requestTimeout: 30000,
  });

  // Register plugins
  await server.register(rateLimitPlugin);
  await server.register(csrfPlugin);
  await server.register(authPlugin);
  await server.register(staticPlugin);
  await server.register(websocketPlugin);

  // Global error handler
  server.setErrorHandler(async (error, request, reply) => {
    logger.error('Unhandled error', {
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
    });

    const statusCode = error.statusCode || 500;
    return reply.status(statusCode).send({
      error: 'internal_error',
      message: config.environment === 'development' ? error.message : 'Internal server error',
      requestId: request.id,
    });
  });

  // Not found handler
  server.setNotFoundHandler(async (request, reply) => {
    return reply.status(404).send({
      error: 'not_found',
      message: `Route ${request.method} ${request.url} not found`,
    });
  });

  // Register routes
  await server.register(healthRoutes, { prefix: '/api' });
  await server.register(csrfRoutes, { prefix: '/api' });
  await server.register(authRoutes, { prefix: '/api/auth' });
  await server.register(tenantRoutes, { prefix: '/api/tenants' });
  await server.register(userRoutes, { prefix: '/api/users' });
  await server.register(productRoutes, { prefix: '/api/products' });
  await server.register(orderRoutes, { prefix: '/api/orders' });
  await server.register(customerRoutes, { prefix: '/api/customers' });

  // Root endpoint
  server.get('/', async (request, reply) => {
    return {
      name: getConfig().name,
      version: getConfig().version,
      environment: getConfig().environment,
      timestamp: new Date().toISOString(),
    };
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    await server.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  return server;
}

export async function startServer(): Promise<void> {
  const config = getConfig();
  const server = await buildServer();

  try {
    await server.listen({ port: config.port, host: config.host });
    console.log(`[OK] Server running at http://${config.host}:${config.port}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Run if this is the main module
if (require.main === module) {
  startServer();
}