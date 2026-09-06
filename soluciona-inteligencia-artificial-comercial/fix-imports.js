const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();

function findCjsFiles(dir) {
  const files = [];
  function walk(d) {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (!['node_modules', 'dist', '.git'].includes(entry.name)) {
          walk(fullPath);
        }
      } else if (entry.name.endsWith('.js')) {
        files.push(path.join(d, entry.name));
      }
    }
  }
  walk(dir);
  return files;
}

function fixImports(content, filePath) {
  let changed = false;
  let newContent = content;

  // Fix require('./something.js') -> require('./something.js')
  newContent = newContent.replace(/require\((["'])([^"']+)\.js(["'])\)/g, (match, quote, path, quote2) => {
    if (!path.endsWith('.js') && !path.startsWith('.')) {
      // External module, don't change
      return match;
    }
    changed = true;
    return `require(${quote}${path}.js${quote})`;
  });

  // Fix require('./something.js') -> require('./something.js') for relative imports without extension
  newContent = newContent.replace(/require\((["'])(\.[^"']+)(["'])\)/g, (match, quote, path, quote2) => {
    if (!path.includes('.') || path.endsWith('.js')) {
      return match;
    }
    // Only add .js if it doesn't already have an extension
    if (!path.match(/\.[a-z]+$/)) {
      changed = true;
      return `require(${quote}${path}.js${quote})`;
    }
    return match;
  });

  // Fix import ... from './something.js'
  newContent = newContent.replace(/from (["'])([^"']+)\.js(["'])/g, (match, quote, path, quote2) => {
    if (!path.startsWith('.')) return match;
    return `from ${quote}${path}.js${quote}`;
  });

  // Fix import ... from './something.js' (relative without extension)
  newContent = newContent.replace(/from (["'])(\.[^"']+)(["'])/g, (match, quote, path, quote2) => {
    if (path.includes('.') && !path.endsWith('.js') && !path.match(/\.[a-z]+$/)) {
      return `from ${quote}${path}.js${quote}`;
    }
    return match;
  });

  // Fix dynamic import('./something.js')
  newContent = newContent.replace(/import\((["'])([^"']+)\.js(["'])\)/g, (match, quote, path, quote2) => {
    if (!path.startsWith('.')) return match;
    return `import(${quote}${path}.js${quote})`;
  });

  // Fix dynamic import('./something.js') - relative without extension
  newContent = newContent.replace(/import\((["'])(\.[^"']+)(["'])\)/g, (match, quote, path, quote2) => {
    if (path.includes('.') && !path.endsWith('.js') && !path.match(/\.[a-z]+$/)) {
      return `import(${quote}${path}.js${quote})`;
    }
    return match;
  });

  return { content: newContent, changed };
}

const cjsFiles = findCjsFiles(process.cwd());
console.log(`Found ${cjsFiles.length} .js files`);

let totalChanged = 0;
for (const file of cjsFiles) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const { content: newContent, changed } = fixImports(content, file);
    if (changed) {
      fs.writeFileSync(file, newContent, 'utf8');
      console.log(`Updated: ${file}`);
      totalChanged++;
    }
  } catch (err) {
    console.error(`Error processing ${file}:`, err.message);
  }
}

console.log(`\nTotal files updated: ${totalChanged}`);
