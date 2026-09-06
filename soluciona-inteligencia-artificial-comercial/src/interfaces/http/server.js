"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildServer = buildServer;
exports.startServer = startServer;
/**
 * Fastify HTTP Server - Clean Architecture Entry Point
 */
const fastify_1 = __importDefault(require("fastify"));
const config_1 = require("../shared/config");
const logger_1 = require("../shared/utils/logger");
const rate_limit_1 = require("./plugins/rate-limit");
const csrf_1 = require("./plugins/csrf");
const auth_1 = require("./plugins/auth");
const health_1 = require("./routes/health");
const auth_2 = require("./routes/auth");
const tenants_1 = require("./routes/tenants");
const users_1 = require("./routes/users");
const products_1 = require("./routes/products");
const orders_1 = require("./routes/orders");
const customers_1 = require("./routes/customers");
const csrf_2 = require("./routes/csrf");
const static_1 = require("./plugins/static");
const websocket_1 = require("./plugins/websocket");
const logger = (0, logger_1.getLogger)('http-server');
async function buildServer() {
    const config = (0, config_1.getConfig)();
    const server = (0, fastify_1.default)({
        logger: config.environment === 'development',
        trustProxy: true,
        bodyLimit: 10485760, // 10MB
        requestTimeout: 30000,
    });
    // Register plugins
    await server.register(rate_limit_1.rateLimitPlugin);
    await server.register(csrf_1.csrfPlugin);
    await server.register(auth_1.authPlugin);
    await server.register(static_1.staticPlugin);
    await server.register(websocket_1.websocketPlugin);
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
    await server.register(health_1.healthRoutes, { prefix: '/api' });
    await server.register(csrf_2.csrfRoutes, { prefix: '/api' });
    await server.register(auth_2.authRoutes, { prefix: '/api/auth' });
    await server.register(tenants_1.tenantRoutes, { prefix: '/api/tenants' });
    await server.register(users_1.userRoutes, { prefix: '/api/users' });
    await server.register(products_1.productRoutes, { prefix: '/api/products' });
    await server.register(orders_1.orderRoutes, { prefix: '/api/orders' });
    await server.register(customers_1.customerRoutes, { prefix: '/api/customers' });
    // Root endpoint
    server.get('/', async (request, reply) => {
        return {
            name: (0, config_1.getConfig)().name,
            version: (0, config_1.getConfig)().version,
            environment: (0, config_1.getConfig)().environment,
            timestamp: new Date().toISOString(),
        };
    });
    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
        logger.info(`Received ${signal}, shutting down gracefully...`);
        await server.close();
        process.exit(0);
    };
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    return server;
}
async function startServer() {
    const config = (0, config_1.getConfig)();
    const server = await buildServer();
    try {
        await server.listen({ port: config.port, host: config.host });
        console.log(`[OK] Server running at http://${config.host}:${config.port}`);
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
// Run if this is the main module
if (require.main === module) {
    startServer();
}
//# sourceMappingURL=server.js.map