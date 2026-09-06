"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPool = getPool;
exports.query = query;
exports.queryOne = queryOne;
exports.queryMany = queryMany;
exports.executeInTransaction = executeInTransaction;
exports.closePool = closePool;
exports.healthCheck = healthCheck;
/**
 * PostgreSQL Database Connection Pool
 * Uses pg library with connection pooling
 */
const pg_1 = require("pg");
const config_1 = require("../../shared/config");
const logger_1 = require("../../shared/utils/logger");
const logger = (0, logger_1.getLogger)('database');
let pool = null;
function getPool() {
    if (!pool) {
        const config = (0, config_1.getConfig)();
        const poolConfig = {
            host: config.database.host,
            port: config.database.port,
            database: config.database.name,
            user: config.database.user,
            password: config.database.password,
            max: config.database.poolSize,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
            ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
        };
        pool = new pg_1.Pool(poolConfig);
        pool.on('error', (err) => {
            logger.error('Unexpected database pool error', { error: err.message });
        });
        pool.on('connect', () => {
            logger.debug('New database connection established');
        });
    }
    return pool;
}
async function query(text, params) {
    const pool = getPool();
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        logger.debug('Query executed', { duration, rows: result.rowCount });
        return result;
    }
    catch (error) {
        logger.error('Query error', { error: error.message, query: text.substring(0, 200) });
        throw error;
    }
}
async function queryOne(text, params) {
    const result = await query(text, params);
    return result.rows[0] || null;
}
async function queryMany(text, params) {
    const result = await query(text, params);
    return result.rows;
}
async function executeInTransaction(callback) {
    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
        logger.info('Database pool closed');
    }
}
async function healthCheck() {
    try {
        const result = await query('SELECT 1');
        return result.rowCount === 1;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=pool.js.map