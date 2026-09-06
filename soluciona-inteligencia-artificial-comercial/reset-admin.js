const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'neurallgo.db');
const db = new DatabaseSync(dbPath);
const pass = process.argv[2];
if (!pass || pass.length < 12) {
  console.error('ERROR: Debe proporcionar una contraseña de al menos 12 caracteres como argumento.');
  console.error('Uso: node reset-admin.js "ContraseñaFuerte123"');
  process.exit(1);
}
const hash = bcrypt.hashSync(pass, 12);
const info = db.prepare("UPDATE users SET password_hash=? WHERE email='admin@localhost'").run(hash);
console.log('Filas afectadas:', info.changes);
console.log('Contraseña del Panel Empresarial (admin@localhost) actualizada correctamente.');
