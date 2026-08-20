const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

// Replace the specific line that has the bug
html = html.replace(
  "return String(v == null ? '' : v).replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/\"/g,'\"').replace(/'/g,'''');",
  "return String(v == null ? '' : v).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/\"/g, '\"').replace(/'/g, \"'\");"
);

fs.writeFileSync('dashboard.html', html);
console.log('Fixed escH line');