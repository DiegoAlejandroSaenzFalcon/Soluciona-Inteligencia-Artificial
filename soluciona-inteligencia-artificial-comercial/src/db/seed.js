"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const init_1 = require("./init");
async function main() {
    console.log('[SEED] Iniciando seed de base de datos...');
    try {
        await (0, init_1.initializeDatabase)();
        console.log('[SEED] Seed completado exitosamente');
    }
    catch (e) {
        console.error('[SEED] Error:', e);
        process.exit(1);
    }
    finally {
        await (0, init_1.closeDatabase)();
    }
}
main();
//# sourceMappingURL=seed.js.map