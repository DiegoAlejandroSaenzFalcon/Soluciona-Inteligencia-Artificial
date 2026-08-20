const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

// The exact line in the file (copy-paste from output)
const oldLine = "return String(v == null ? '' : v).replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/\"/g,'\"').replace(/'/g,'''');";
const newLine = "return String(v == null ? '' : v).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/\"/g, '\"').replace(/'/g, \"'\");";

console.log('Searching for:', oldLine);
console.log('Found:', html.includes(oldLine));

if (html.includes(oldLine)) {
  html = html.replace(oldLine, newLine);
  fs.writeFileSync('dashboard.html', html);
  console.log('Fixed!');
} else {
  console.log('Pattern not found, trying alternative...');
  // Try to find the function and replace the whole thing
  const idx = html.indexOf("function escH");
  if (idx >= 0) {
    const endIdx = html.indexOf("}", idx) + 1;
    console.log('Function block:', html.substring(idx, endIdx));
    const newFunc = `function escH(v) {
    return String(v == null ? '' : v).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, "'");
  }`;
    html = html.substring(0, idx) + newFunc + html.substring(endIdx);
    fs.writeFileSync('dashboard.html', html);
    console.log('Fixed via function replacement!');
  }
}