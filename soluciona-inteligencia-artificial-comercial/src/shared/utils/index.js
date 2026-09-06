"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalize = normalize;
exports.formatPhone = formatPhone;
exports.normalizePhone = normalizePhone;
exports.formatCurrency = formatCurrency;
exports.formatDate = formatDate;
exports.generateId = generateId;
exports.generateSecureToken = generateSecureToken;
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.deepClone = deepClone;
exports.safeJsonParse = safeJsonParse;
exports.sleep = sleep;
exports.retryWithBackoff = retryWithBackoff;
exports.debounce = debounce;
exports.throttle = throttle;
exports.formatBytes = formatBytes;
exports.formatDuration = formatDuration;
/**
 * Shared Utilities - Common helper functions
 */
const result_1 = require("../kernel/result");
/**
 * Normalizes text for comparison/search
 */
function normalize(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .trim();
}
/**
 * Formats phone number to E.164 format
 */
function formatPhone(phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('57') && digits.length === 12) {
        return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
    }
    if (digits.length === 10) {
        return `+57 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    return phone;
}
/**
 * Normalizes phone to digits only
 */
function normalizePhone(phone) {
    return phone.replace(/\D/g, '');
}
/**
 * Formats currency for Colombian pesos
 */
function formatCurrency(amount, currency = 'COP') {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}
/**
 * Formats date for Colombian locale
 */
function formatDate(date, options) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...options,
    });
}
/**
 * Generates a random UUID v4
 */
function generateId() {
    return crypto.randomUUID();
}
/**
 * Generates a secure random string
 */
function generateSecureToken(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
        result += chars[randomValues[i] % chars.length];
    }
    return result;
}
/**
 * Hashes a password using Argon2id (via bcryptjs fallback)
 */
async function hashPassword(password) {
    const bcrypt = await Promise.resolve().then(() => __importStar(require('bcryptjs')));
    return bcrypt.hash(password, 12);
}
/**
 * Verifies a password against hash
 */
async function verifyPassword(password, hash) {
    const bcrypt = await Promise.resolve().then(() => __importStar(require('bcryptjs')));
    return bcrypt.compare(password, hash);
}
/**
 * Deep clones an object
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
/**
 * Safely parses JSON
 */
function safeJsonParse(json, fallback) {
    try {
        return JSON.parse(json);
    }
    catch {
        return fallback;
    }
}
/**
 * Sleep utility
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Retry with exponential backoff
 */
async function retryWithBackoff(fn, options = {}) {
    const { maxAttempts = 3, baseDelayMs = 1000, maxDelayMs = 30000, onRetry, } = options;
    if (maxAttempts < 1) {
        return (0, result_1.Err)(new Error('maxAttempts must be at least 1'));
    }
    let lastError = new Error('Unknown error');
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return (0, result_1.Ok)(await fn());
        }
        catch (error) {
            lastError = error;
            if (attempt === maxAttempts)
                break;
            if (onRetry)
                onRetry(attempt, lastError);
            const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 1000, maxDelayMs);
            await sleep(delay);
        }
    }
    return (0, result_1.Err)(lastError);
}
/**
 * Debounce function
 */
function debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}
/**
 * Throttle function
 */
function throttle(fn, limit) {
    let inThrottle = false;
    return (...args) => {
        if (!inThrottle) {
            fn(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}
/**
 * Format bytes to human readable
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
/**
 * Format duration in human readable format
 */
function formatDuration(ms) {
    if (ms < 1000)
        return `${ms}ms`;
    if (ms < 60000)
        return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000)
        return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
}
//# sourceMappingURL=index.js.map