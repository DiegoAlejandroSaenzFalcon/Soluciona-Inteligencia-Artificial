const fs = require('fs');
const path = require('path');

const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
const MAX_FILES = 7; // 7 días
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

let currentDate = null;
let currentStream = null;
let currentSize = 0;

function getLogFilePath() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(LOG_DIR, `soluciona-${dateStr}.log`);
}

function rotateIfNeeded() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  
  if (dateStr !== currentDate || currentSize > MAX_SIZE) {
    if (currentStream) {
      currentStream.end();
      currentStream = null;
    }
    currentDate = dateStr;
    const filePath = getLogFilePath();
    currentStream = fs.createWriteStream(filePath, { flags: 'a' });
    currentSize = 0;
    
    // Limpiar logs antiguos (> 7 días)
    try {
      const files = fs.readdirSync(path.dirname(getLogFilePath()))
        .filter(f => f.startsWith('soluciona-') && f.endsWith('.log'))
        .map(f => ({ name: f, path: path.join(path.dirname(getLogFilePath()), f) }))
        .sort((a, b) => b.name.localeCompare(a.name));
      
      for (const f of files.slice(7)) {
        fs.unlinkSync(f.path);
      }
    } catch {}
  }
}

function writeToLog(entry) {
  rotateIfNeeded();
  if (currentStream) {
    const line = JSON.stringify(entry) + '\n';
    currentStream.write(line);
    currentSize += Buffer.byteLength(line);
  }
}

// También escribir a consola (para compatibilidad)
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = (...args) => {
  originalLog.apply(console, args);
  try { writeToLog({ timestamp: new Date().toISOString(), level: 'info', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') }); } catch {}
};

console.warn = (...args) => {
  originalWarn.apply(console, args);
  try { writeToLog({ timestamp: new Date().toISOString(), level: 'warn', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') }); } catch {}
};

console.error = (...args) => {
  originalError.apply(console, args);
  try { writeToLog({ timestamp: new Date().toISOString(), level: 'error', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') }); } catch {}
};

// Inicializar stream inicial
rotateIfNeeded();

module.exports = { writeToLog, rotateIfNeeded };
