const fs = require('fs');
const path = require('path');
const readline = require('readline');

const BASE = __dirname;
const CLIENTES_DIR = path.join(BASE, 'clientes');
const PLANTILLA = path.join(CLIENTES_DIR, 'EJEMPLO.json');
const PANEL_CFG = path.join(BASE, 'panel-central.json');

function siguientePuerto() {
  const usados = new Set();
  const cfgDef = path.join(BASE, 'config.json');
  try { if (fs.existsSync(cfgDef)) usados.add(JSON.parse(fs.readFileSync(cfgDef, 'utf8')).puerto || 3000); } catch {}
  try { if (fs.existsSync(PANEL_CFG)) usados.add(JSON.parse(fs.readFileSync(PANEL_CFG, 'utf8')).puerto || 4000); } catch {}
  if (fs.existsSync(CLIENTES_DIR)) {
    for (const f of fs.readdirSync(CLIENTES_DIR).filter(f => f.endsWith('.json'))) {
      try { usados.add(JSON.parse(fs.readFileSync(path.join(CLIENTES_DIR, f), 'utf8')).puerto || 0); } catch {}
    }
  }
  let p = 3001;
  while (usados.has(p)) p++;
  return p;
}

function slug(nombre) {
  return String(nombre || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'cliente';
}

function preguntar(rl, texto) {
  return new Promise(res => rl.question(texto, r => res(r.trim())));
}

async function main() {
  if (!fs.existsSync(PLANTILLA)) {
    console.error('[!] No existe clientes/EJEMPLO.json (plantilla).');
    process.exit(1);
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('=== Crear cliente nuevo ===');
  const nombre = await preguntar(rl, 'Nombre del negocio (ej: Hamburguesas El Quinde): ');
  if (!nombre) { console.error('[!] Nombre requerido.'); process.exit(1); }
  const id = await preguntar(rl, `ID del cliente [${slug(nombre)}]: `) || slug(nombre);
  if (!/^[a-z0-9-]+$/.test(id)) { console.error('[!] ID inválido (solo minúsculas, números y guiones).'); process.exit(1); }
  const archivo = path.join(CLIENTES_DIR, id + '.json');
  if (fs.existsSync(archivo)) { console.error(`[!] Ya existe ${archivo}`); process.exit(1); }
  const puerto = siguientePuerto();
  const dueno = await preguntar(rl, 'Número del dueño (formato internacional, ej 573001234567): ');

  const cfg = JSON.parse(fs.readFileSync(PLANTILLA, 'utf8'));
  cfg.id = id;
  cfg.negocio = nombre;
  cfg.puerto = puerto;
  cfg.auth_dir = 'auth_info_' + id;
  if (dueno) cfg.numero_dueno = dueno;
  delete cfg.panel_password;

  fs.mkdirSync(CLIENTES_DIR, { recursive: true });
  fs.writeFileSync(archivo, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
  console.log(`\n[OK] Creado ${archivo}`);
  console.log(`[OK] Negocio: ${nombre} | Puerto web: ${puerto}`);
  console.log(`\nSiguientes pasos:`);
  console.log(`  1. Edita ${id}.json: menú de productos, llave IA (llm.api_key), integración POS y panel_password.`);
  console.log(`  2. Ejecuta:  iniciar-cliente.bat ${id}`);
  console.log(`  3. Escanea el QR con el WhatsApp del negocio (Ajustes > Dispositivos vinculados).`);
  console.log(`  4. Abre el panel: http://localhost:${puerto}`);
  console.log(`  5. Si usas el Panel Central, se verá solo en http://localhost:4000`);
}

main().catch(e => { console.error('[!] Error:', e.message); process.exit(1); });