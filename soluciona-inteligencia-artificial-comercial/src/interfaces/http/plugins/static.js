"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.staticPlugin = void 0;
const path_1 = require("path");
const config_1 = require("../../shared/config");
const staticPlugin = async (fastify) => {
    const config = (0, config_1.getConfig)();
    // Serve static files from public directory
    await fastify.register(require('@fastify/static'), {
        root: (0, path_1.join)(__dirname, '..', '..', '..', 'public'),
        prefix: '/static/',
        decorateReply: false,
    });
    // Serve panel HTML files
    await fastify.register(require('@fastify/static'), {
        root: (0, path_1.join)(__dirname, '..', '..', '..'),
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
        root: (0, path_1.join)(__dirname, '..', '..', '..'),
        prefix: '/favicon.ico',
        decorateReply: false,
    });
    // Manifest
    await fastify.register(require('@fastify/static'), {
        root: (0, path_1.join)(__dirname, '..', '..', '..'),
        prefix: '/manifest.webmanifest',
        decorateReply: false,
    });
    // Service worker
    await fastify.register(require('@fastify/static'), {
        root: (0, path_1.join)(__dirname, '..', '..', '..'),
        prefix: '/sw.js',
        decorateReply: false,
    });
};
exports.staticPlugin = staticPlugin;
//# sourceMappingURL=static.js.map