/**
 * CSRF Protection Plugin
 */
import { FastifyPluginAsync } from 'fastify';
import { createClient, RedisClientType } from 'redis';
import { getConfig } from '../../shared/config';
import { Result, Ok, Err } from '../../../shared/kernel/result';

declare module 'fastify' {
  interface FastifyInstance {
    csrf: {
      generate: (ip: string) => Promise<string>;
      validate: (ip: string, token: string) => Promise<Result<boolean, Error>>;
    };
  }
}

let redisClient: RedisClientType | null = null;

async function getRedis(): Promise<RedisClientType> {
  if (!redisClient) {
    const config = getConfig();
    redisClient = createClient({
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

function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const csrfPlugin: FastifyPluginAsync = async (fastify) => {
  const config = getConfig();

  fastify.decorate('csrf', {
    async generate(ip: string): Promise<string> {
      const redis = await getRedisClient();
      const token = generateCsrfToken();
      const key = `csrf:${token}`;
      await redis.setEx(key, 24 * 60 * 60, ip); // 24 hours TTL
      return token;
    },

    async validate(ip: string, token: string): Promise<{ ok: true } | { ok: false; error: Error }> {
      if (!token) return Err(new Error('CSRF token missing'));
      
      const redis = await getRedisClient();
      const key = `csrf:${token}`;
      const storedIp = await redis.get(key);
      
      if (!storedIp || storedIp !== ip) {
        return Err(new Error('Invalid or expired CSRF token'));
      }
      
      // Consume the token (one-time use for mutating operations)
      await redis.del(key);
      return Ok(true);
    },
  });

  // CSRF token endpoint
  fastify.get('/api/csrf-token', async (request, reply) => {
    const ip = request.ip || 'unknown';
    const token = await fastify.csrf.generate(ip);
    
    // Set cookie
    reply.setCookie('csrf_token', token, {
      httpOnly: true,
      secure: getConfig().environment === 'production',
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

    const result = await fastify.csrf.validate(ip, token as string);
    
    if (!result.ok) {
      throw fastify.httpErrors.forbidden(result.error.message);
    }
  });
};

async function getRedisClient(): Promise<any> {
  if (!redisClient) {
    const config = getConfig();
    redisClient = createClient({
      socket: { host: config.redis.host, port: config.redis.port },
      password: config.redis.password,
      database: config.redis.db,
    });
    redisClient.on('error', (err) => console.error('CSRF Redis Error', err));
    await redisClient.connect();
  }
  return redisClient;
}

export const csrfPlugin = csrfPlugin;