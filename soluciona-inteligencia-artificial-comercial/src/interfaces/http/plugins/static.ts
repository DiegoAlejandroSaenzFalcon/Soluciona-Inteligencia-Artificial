/**
 * Static Files Plugin - Serves frontend assets
 */
import { FastifyPluginAsync } from 'fastify';
import { join } from 'path';
import { getConfig } from '../../shared/config';

const staticPlugin: FastifyPluginAsync = async (fastify) => {
  const config = getConfig();

  // Serve static files from public directory
  await fastify.register(require('@fastify/static'), {
    root: join(__dirname, '..', '..', '..', 'public'),
    prefix: '/static/',
    decorateReply: false,
  });

  // Serve panel HTML files
  await fastify.register(require('@fastify/static'), {
    root: join(__dirname, '..', '..', '..'),
    prefix: '/panel/',
    decorateReply: false,
    setHeaders: (res, path) => {
      if (path.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
      }
    },
  });

  // Favicon
  await fastify.register(require('@fastify/static'), {
    root: join(__dirname, '..', '..', '..'),
    prefix: '/favicon.ico',
    decorateReply: false,
  });

  // Manifest
  await fastify.register(require('@fastify/static'), {
    root: join(__dirname, '..', '..', '..'),
    prefix: '/manifest.webmanifest',
    decorateReply: false,
  });

  // Service worker
  await fastify.register(require('@fastify/static'), {
    root: join(__dirname, '..', '..', '..'),
    prefix: '/sw.js',
    decorateReply: false,
  });
};

export const staticPlugin = staticPlugin;