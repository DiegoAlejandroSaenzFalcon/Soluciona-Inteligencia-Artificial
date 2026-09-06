'use strict';
const { config } = require('../config.js');

// Selector de motor de base de datos operacional.
//  - 'sqlite'   (por defecto): usa node:sqlite (core/db-sqlite.js)
//  - 'postgres' : usa PostgreSQL con API síncrona vía worker (core/db-pg.js)
module.exports = config.db_engine === 'postgres'
  ? require('./db-pg.js')
  : require('./db-sqlite.js');
