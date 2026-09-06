"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.csrfPlugin = void 0;
const redis_1 = require("redis");
const config_1 = require("../../shared/config");
const result_1 = require("../../../shared/kernel/result");
let redisClient = null;
async function getRedis() {
    if (!redisClient) {
        const config = (0, config_1.getConfig)();
        redisClient = (0, redis_1.createClient)({
            socket: {
                host: config.redis.host,
                port: config.redis.port,
            },
            password: config.redis.password,
            database: config.redis.db,
        });
        redisClient.on('error', (err) => console.error('CSRF Redis Client Error', err));
        await redisClient.connect();
    }
    return redisClient;
}
const CSRF_TOKEN_TTL = 24 * 60 * 60; // 24 hours
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
function generateCsrfToken() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
const csrfPlugin = async (fastify) => {
    const config = (0, config_1.getConfig)();
    fastify.decorate('csrf', {
        async generate(ip) {
            const redis = await getRedisClient();
            const token = generateCsrfToken();
            const key = `csrf:${token}`;
            await redis.setEx(key, 24 * 60 * 60, ip); // 24 hours TTL
            return token;
        },
        async validate(ip, token) {
            if (!token)
                return (0, result_1.Err)(new Error('CSRF token missing'));
            const redis = await getRedisClient();
            const key = `csrf:${token}`;
            const storedIp = await redis.get(key);
            if (!storedIp || storedIp !== ip) {
                return (0, result_1.Err)(new Error('Invalid or expired CSRF token'));
            }
            // Consume the token (one-time use for mutating operations)
            await redis.del(key);
            return (0, result_1.Ok)(true);
        },
    });
    // CSRF token endpoint
    fastify.get('/api/csrf-token', async (request, reply) => {
        const ip = request.ip || 'unknown';
        const token = await fastify.csrf.generate(ip);
        // Set cookie
        reply.setCookie('csrf_token', token, {
            httpOnly: true,
            secure: (0, config_1.getConfig)().environment === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60,
            path: '/',
        });
        return { csrfToken: token };
    });
    // CSRF validation hook for mutating requests
    fastify.addHook('preHandler', async (request, reply) => {
        // Skip CSRF for safe methods and excluded paths
        const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
        const excludedPaths = [
            '/api/auth/login',
            '/api/auth/refresh',
            '/api/auth/verify-2fa',
            '/api/auth/me',
            '/api/auth/permissions',
            '/api/csrf-token',
            '/api/health',
        ];
        if (safeMethods.includes(request.method) || excludedPaths.includes(request.url)) {
            return;
        }
        const token = request.headers['x-csrf-token'] || request.headers['x-xsrf-token'];
        const ip = request.ip || 'unknown';
        const result = await fastify.csrf.validate(ip, token);
        if (!result.ok) {
            throw fastify.httpErrors.forbidden(result.error.message);
        }
    });
};
async function getRedisClient() {
    if (!redisClient) {
        const config = (0, config_1.getConfig)();
        redisClient = (0, redis_1.createClient)({
            socket: { host: config.redis.host, port: config.redis.port },
            password: config.redis.password,
            database: config.redis.db,
        });
        redisClient.on('error', (err) => console.error('CSRF Redis Error', err));
        await redisClient.connect();
    }
    return redisClient;
}
exports.csrfPlugin = csrfPlugin;
//# sourceMappingURL=csrf.js.map