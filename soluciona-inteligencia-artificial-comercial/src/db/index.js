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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.getQueryClient = getQueryClient;
exports.closeDb = closeDb;
exports.testConnection = testConnection;
exports.runMigrations = runMigrations;
const postgres_js_1 = require("drizzle-orm/postgres-js");
const postgres_1 = __importDefault(require("postgres"));
const schema = __importStar(require("./schema"));
const drizzle_orm_1 = require("drizzle-orm");
const config_1 = require("../../config");
let queryClient = null;
let dbInstance = null;
function getDb() {
    if (!dbInstance) {
        if (!queryClient) {
            const dbUrl = process.env.DATABASE_URL || `postgresql://${config_1.config.dbUser || 'postgres'}:${config_1.config.dbPass || 'postgres'}@${config_1.config.dbHost || 'localhost'}:${config_1.config.dbPort || 5432}/${config_1.config.dbName || 'soluciona_inteligencia_artificial_comercial'}`;
            queryClient = (0, postgres_1.default)(dbUrl, {
                max: config_1.config.dbPoolSize || 10,
                idle_timeout: 20,
                connect_timeout: 10,
                prepare: false,
                onnotice: () => { },
            });
        }
        dbInstance = (0, postgres_js_1.drizzle)(queryClient, { schema, logger: config_1.config.dbDebug === 'true' });
    }
    return dbInstance;
}
function getQueryClient() {
    if (!queryClient)
        getDb();
    return queryClient;
}
async function closeDb() {
    if (queryClient) {
        await queryClient.end();
        queryClient = null;
        dbInstance = null;
    }
}
async function testConnection() {
    try {
        const db = getDb();
        await db.execute((0, drizzle_orm_1.sql) `SELECT 1`);
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
}
async function runMigrations() {
    const db = getDb();
    // Drizzle migrations would run here if using drizzle-kit migrate
    // For now, we'll use the schema directly
    console.log('[DB] Using Drizzle schema directly (run drizzle-kit migrate for migrations)');
}
//# sourceMappingURL=index.js.map