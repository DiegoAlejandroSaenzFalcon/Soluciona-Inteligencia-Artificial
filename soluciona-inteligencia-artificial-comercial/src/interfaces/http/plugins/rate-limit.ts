/**
 * Rate Limiting Plugin - Distributed rate limiting with Redis
 */
import { FastifyPluginAsync } from 'fastify';
import { createClient, RedisClientType } from 'redis';
import { getConfig } from '../../shared/config';

declare module 'fastify' {
  interface FastifyInstance {
    rateLimiter: {
      check: (key: string, max?: number, windowMs?: number) => Promise<{ allowed: boolean; remaining: number; reset: number }>;
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

    redisClient.on('error', (err) => console.error('Redis Client Error', err));
    await redisClient.connect();
  }
  return redisClient;
}

const rateLimitPlugin: FastifyPluginAsync = async (fastify) => {
  const config = getConfig();

  fastify.decorate('rateLimiter', {
    async check(key: string, max = config.security.rateLimitMaxRequests, windowMs = config.security.rateLimitWindowMs) {
      const redis = await getRedis();
      const now = Date.now();
      const windowStart = now - windowMs;
      const keyPrefix = `ratelimit:${key}`;

      const multi = redis.multi();
      multi.zRemRangeByScore(keyPrefix, 0, windowStart);
      multi.zCard(keyPrefix);
      multi.zAdd(keyPrefix, { score: now, value: `${now}:${Math.random()}` });
      multi.expire(keyPrefix, Math.ceil(windowMs / 1000) + 1);
      const results = await multi.exec();

      const currentCount = (results?.[1] as number) || 0;
      const allowed = currentCount < max;
      const remaining = Math.max(0, max - currentCount);
      const reset = Math.ceil((now + windowMs) / 1000);

      return { allowed, remaining, reset };
    },
  });

  // Global rate limit hook
  fastify.addHook('onRequest', async (request, reply) => {
    // Skip rate limiting for health checks and static assets
    if (request.url.startsWith('/api/health') || request.url.startsWith('/static/') || request.url === '/') {
      return;
    }

    const ip = request.ip || 'unknown';
    const key = `ip:${ip}`;
    const result = await fastify.rateLimiter.check(key);

    reply.header('X-RateLimit-Limit', String(getConfig().security.rateLimitMaxRequests));
    reply.header('X-RateLimit-Remaining', String(result.remaining));
    reply.header('X-RateLimit-Reset', String(result.reset));

    if (!result.allowed) {
      reply.header('Retry-After', String(Math.ceil((result.reset * 1000 - Date.now()) / 1000)));
      throw fastify.httpErrors.tooManyRequests('Too many requests, please try again later');
    }
  });
};

export const rateLimitPlugin = rateLimitPlugin;