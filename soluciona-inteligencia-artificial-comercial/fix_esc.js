const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

const newFunc = `  // Escape HTML global para evitar inyección/ruptura DOM
  function escH(v) {
    return String(v == null ? '' : v).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, "'");
  }`;

html = html.replace(
  /  \/\/ Escape HTML global para evitar inyección\/ruptura DOM[\s\S]*?function escH\(v\) \{[\s\S]*?return String\(v == null \? '' : v\)\.replace\([^}]+\};/,
  newFunc
);

fs.writeFileSync('dashboard.html', html);
console.log('Fixed escH');