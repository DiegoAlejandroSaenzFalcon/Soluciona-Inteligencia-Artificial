'use strict';
/**
 * Unified Rate Limiter - Token Bucket Algorithm
 * Single source of truth for all rate limiting in the application
 * 
 * Features:
 * - Token bucket algorithm (smooth rate limiting)
 * - Per-endpoint configuration with sensible defaults
 * - Per-IP and per-(IP+endpoint) limiting
 * - Automatic cleanup of expired buckets
 * - Standard headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After)
 * - Configurable via config.rateLimit
 */

const crypto = require('crypto');

class RateLimiter {
  constructor(config = {}) {
    this.buckets = new Map(); // key -> { tokens, lastRefill }
    this.config = {
      // Default limits per endpoint
      defaults: {
        windowMs: 60 * 1000,        // 1 minute default window
        max: 60,                    // 60 requests per window (was 5 - too restrictive)
        blockDurationMs: 60 * 1000  // 1 minute block when exceeded
      },
      // Endpoint-specific overrides
      endpoints: {
        '/login': { max: 10, windowMs: 15 * 60 * 1000, blockDurationMs: 15 * 60 * 1000 },
        '/api/auth/login': { max: 50, windowMs: 15 * 60 * 1000, blockDurationMs: 15 * 60 * 1000 },
        '/api/auth/verify-2fa': { max: 10, windowMs: 15 * 60 * 1000, blockDurationMs: 15 * 60 * 1000 },
        '/api/auth/refresh': { max: 20, windowMs: 60 * 60 * 1000, blockDurationMs: 60 * 60 * 1000 },
        '/api/auth/setup-2fa': { max: 50, windowMs: 60 * 60 * 1000, blockDurationMs: 60 * 60 * 1000 },
        '/api/auth/change-password': { max: 3, windowMs: 15 * 60 * 1000, blockDurationMs: 15 * 60 * 1000 },
        '/api/csrf-token': { max: 30, windowMs: 60 * 1000, blockDurationMs: 60 * 1000 },
        '/api/configuracion': { max: 30, windowMs: 60 * 1000, blockDurationMs: 60 * 1000 },
        '/api/ia-pool': { max: 10, windowMs: 60 * 1000, blockDurationMs: 60 * 1000 },
        '/api/health': { max: 120, windowMs: 60 * 1000, blockDurationMs: 60 * 1000 },
        // Default for all other endpoints
        '*': { max: 60, windowMs: 60 * 1000, blockDurationMs: 60 * 1000 }
      },
      // Merge with config
      ...config.rateLimit
    };

    // Cleanup interval (every 5 minutes)
    this.cleanupInterval = setInterval(() => this._cleanup(), 5 * 60 * 1000);
    this.cleanupInterval.unref(); // Don't prevent process exit
  }

  /**
   * Get configuration for an endpoint
   */
  _getConfig(endpoint) {
    // Exact match first
    if (this.config.endpoints[endpoint]) {
      return { ...this.config.defaults, ...this.config.endpoints[endpoint] };
    }
    // Pattern match for wildcard
    for (const [pattern, cfg] of Object.entries(this.config.endpoints)) {
      if (pattern !== '*' && endpoint.startsWith(pattern.replace('*', ''))) {
        return { ...this.config.defaults, ...cfg };
      }
    }
    // Default
    return { ...this.config.defaults, ...this.config.endpoints['*'] };
  }

  /**
   * Generate bucket key
   */
  _getKey(ip, endpoint) {
    const cfg = this._getConfig(endpoint);
    // For strict endpoints, limit per (IP + endpoint)
    // For general, limit per IP only
    if (this.config.endpoints[endpoint]) {
      return `${ip}:${endpoint}`;
    }
    return `${ip}:global`;
  }

  /**
   * Check and consume rate limit
   * @param {string} ip - Client IP
   * @param {string} endpoint - Request endpoint
   * @returns {Object} { allowed, remaining, reset, retryAfter, retryAfterMs }
   */
  check(ip, endpoint) {
    const cfg = this._getConfig(endpoint);
    const key = this._getKey(ip, endpoint);
    const now = Date.now();

    let bucket = this.buckets.get(key);
    
    // Initialize or refill bucket
    if (!bucket || now - bucket.lastRefill > cfg.windowMs) {
      bucket = { 
        tokens: cfg.max - 1, 
        lastRefill: now,
        blockedUntil: 0
      };
      this.buckets.set(key, bucket);
      return { 
        allowed: true, 
        remaining: cfg.max - 1, 
        reset: now + cfg.windowMs,
        retryAfter: 0,
        retryAfterMs: 0
      };
    }

    // Check if blocked
    if (bucket.blockedUntil && now < bucket.blockedUntil) {
      return { 
        allowed: false, 
        remaining: 0, 
        reset: bucket.blockedUntil, 
        retryAfter: Math.ceil((bucket.blockedUntil - now) / 1000),
        retryAfterMs: bucket.blockedUntil - now
      };
    }

    // Consume token
    if (bucket.tokens <= 0) {
      bucket.blockedUntil = now + cfg.blockDurationMs;
      return { 
        allowed: false, 
        remaining: 0, 
        reset: bucket.blockedUntil, 
        retryAfter: Math.ceil(cfg.blockDurationMs / 1000),
        retryAfterMs: cfg.blockDurationMs
      };
    }

    bucket.tokens--;
    return { 
      allowed: true, 
      remaining: bucket.tokens, 
      reset: now + cfg.windowMs,
      retryAfter: 0,
      retryAfterMs: 0
    };
  }

  /**
   * Get rate limit info without consuming (for headers)
   */
  getInfo(ip, endpoint) {
    const cfg = this._getConfig(endpoint);
    const key = this._getKey(ip, endpoint);
    const bucket = this.buckets.get(key);
    const now = Date.now();

    if (!bucket || now - bucket.lastRefill > cfg.windowMs) {
      return { remaining: cfg.max, reset: now + cfg.windowMs, limited: false };
    }

    if (bucket.blockedUntil && now < bucket.blockedUntil) {
      return { remaining: 0, reset: bucket.blockedUntil, limited: true };
    }

    return { 
      remaining: Math.max(0, bucket.tokens), 
      reset: bucket.lastRefill + cfg.windowMs, 
      limited: bucket.tokens <= 0 
    };
  }

  /**
   * Middleware for Express-like handlers
   */
  middleware() {
    return (req, res, next) => {
      const ip = this._getClientIp(req);
      const endpoint = req.url.split('?')[0];
      const result = this.check(ip, endpoint);

      // Set standard headers
      res.setHeader('X-RateLimit-Limit', this._getConfig(endpoint).max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, result.remaining));
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.reset / 1000));

      if (!result.allowed) {
        res.setHeader('Retry-After', result.retryAfter);
        return {
          status: 429,
          error: 'rate_limit',
          message: 'Demasiadas peticiones, intente más tarde',
          retryAfter: result.retryAfter,
          retryAfterMs: result.retryAfterMs
        };
      }

      next();
      return null;
    };
  }

  /**
   * Get client IP (handles proxies)
   */
  _getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
           req.headers['x-real-ip'] || 
           req.socket?.remoteAddress || 
           'unknown';
  }

  /**
   * Cleanup expired buckets
   */
  _cleanup() {
    const now = Date.now();
    for (const [key, bucket] of this.buckets.entries()) {
      // Remove if expired (no refill in 2x window) and not blocked
      const maxWindow = 60 * 60 * 1000; // 1 hour max
      if (now - bucket.lastRefill > maxWindow && (!bucket.blockedUntil || now > bucket.blockedUntil)) {
        this.buckets.delete(key);
      }
    }
  }

  /**
   * Reset all limits (for testing)
   */
  reset() {
    this.buckets.clear();
  }

  /**
   * Shutdown cleanup
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.buckets.clear();
  }
}

// Singleton instance
let _instance = null;

function getRateLimiter(config) {
  if (!_instance) {
    _instance = new RateLimiter(config);
  }
  return _instance;
}

function resetRateLimiter() {
  if (_instance) {
    _instance.shutdown();
    _instance = null;
  }
}

module.exports = { RateLimiter, getRateLimiter, resetRateLimiter };