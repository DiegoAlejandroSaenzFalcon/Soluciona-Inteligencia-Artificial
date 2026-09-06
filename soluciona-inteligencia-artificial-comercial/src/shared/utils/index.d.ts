/**
 * Shared Utilities - Common helper functions
 */
import { Result } from '../kernel/result';
/**
 * Normalizes text for comparison/search
 */
export declare function normalize(text: string): string;
/**
 * Formats phone number to E.164 format
 */
export declare function formatPhone(phone: string): string;
/**
 * Normalizes phone to digits only
 */
export declare function normalizePhone(phone: string): string;
/**
 * Formats currency for Colombian pesos
 */
export declare function formatCurrency(amount: number, currency?: string): string;
/**
 * Formats date for Colombian locale
 */
export declare function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string;
/**
 * Generates a random UUID v4
 */
export declare function generateId(): string;
/**
 * Generates a secure random string
 */
export declare function generateSecureToken(length?: number): string;
/**
 * Hashes a password using Argon2id (via bcryptjs fallback)
 */
export declare function hashPassword(password: string): Promise<string>;
/**
 * Verifies a password against hash
 */
export declare function verifyPassword(password: string, hash: string): Promise<boolean>;
/**
 * Deep clones an object
 */
export declare function deepClone<T>(obj: T): T;
/**
 * Safely parses JSON
 */
export declare function safeJsonParse<T>(json: string, fallback: T): T;
/**
 * Sleep utility
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * Retry with exponential backoff
 */
export declare function retryWithBackoff<T>(fn: () => Promise<T>, options?: {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    onRetry?: (attempt: number, error: Error) => void;
}): Promise<Result<T, Error>>;
/**
 * Debounce function
 */
export declare function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): (...args: Parameters<T>) => void;
/**
 * Throttle function
 */
export declare function throttle<T extends (...args: unknown[]) => unknown>(fn: T, limit: number): (...args: Parameters<T>) => void;
/**
 * Format bytes to human readable
 */
export declare function formatBytes(bytes: number, decimals?: number): string;
/**
 * Format duration in human readable format
 */
export declare function formatDuration(ms: number): string;
//# sourceMappingURL=index.d.ts.map