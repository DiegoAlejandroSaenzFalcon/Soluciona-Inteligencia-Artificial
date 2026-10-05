'use strict';
/**
 * setup.js — Bootstrap interactivo para Soluciona IA Comercial.
 *
 * Uso:
 *   npm run setup
 *   node scripts/setup.js [--cliente <slug>]
 *
 * Flujo:
 * 1. Verifica entorno (reutiliza verify-environment.js)
 * 2. Si no hay .env → lo crea desde .env.example con secretos generados
 * 3. Pide configuración del negocio (o usa --cliente <slug>)
 * 4. Genera/actualiza config.json (standalone) o clients/<slug>/config.json
 * 5. Pide contraseña admin UNA vez y la guarda en .env (PANEL_PASSWORD)
 * 6. Inicializa BD SQLite (crea tablas si no existen)
 * 7. Ejecuta tests de verificación
 * 8. Reporta URLs y credenciales para arrancar
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');
const crypto = require('crypto');

const raiz = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const clienteArg = args.indexOf('--cliente') !== -1 ? args[args.indexOf('--cliente') + 1] : null;

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'cliente';
}

function preguntar(rl, texto, def) {
  return new Promise(res => {
    const prompt = def ? `${texto} [${def}]: ` : `${texto}: `;
    rl.question(prompt, r => res(r.trim() || def));
  });
}

function generarSecreto(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function generarPasswordAdmin() {
  // 16 bytes = 32 chars hex, legible pero seguro
  return crypto.randomBytes(16).toString('hex');
}

function leerEnv(ruta) {
  if (!fs.existsSync(ruta)) return {};
  const out = {};
  for (const linea of fs.readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function escribirEnv(ruta, env) {
  const lineas = [];
  for (const [k, v] of Object.entries(env)) {
    lineas.push(`${k}=${v}`);
  }
  fs.writeFileSync(ruta, lineas.join('\n') + '\n', 'utf8');
}

async function ejecutarSetup() {
  console.log('\n==========================================');
  console.log('  SOLUCIA IA — SETUP INTERACTIVO');
  console.log('==========================================\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  // 1. Verificar entorno base
  console.log('[1/7] Verificando entorno...\n');
  try {
    execSync('node scripts/verify-environment.js', { cwd: raiz, stdio: 'inherit' });
  } catch (e) {
    console.log('[INFO] Verificación con warnings (esperado en primera instalación)\n');
  }

  // 2. .env
  const envPath = path.join(raiz, '.env');
  const envExamplePath = path.join(raiz, '.env.example');
  let env = leerEnv(envPath);

  if (!fs.existsSync(envPath)) {
    console.log('[2/7] Creando .env desde .env.example...\n');
    if (!fs.existsSync(envExamplePath)) {
      console.error('[ERROR] No existe .env.example');
      process.exit(1);
    }
    const template = fs.readFileSync(envExamplePath, 'utf8');
    let contenido = template;

    // Reemplazar placeholders con valores generados
    const reemplazos = {
      'CHANGE_ME_GENERATE_WITH_OPENSSL_RAND_HEX_32': generarSecreto(32), // JWT_SECRET
      'CHANGE_ME_GENERATE_WITH_OPENSSL_RAND_HEX_16': generarPasswordAdmin(), // PANEL_PASSWORD
      'CHANGE_ME_USE_STRONG_PASSWORD': generarSecreto(24), // DB_PASS, MINIO_SECRET_KEY
      'your-nvidia-api-key-here': '', // LLM_API_KEY, ASISTENTES_IA_API_KEY, VISION_API_KEY
      'your-gemini-api-key-here': '', // GEMINI_API_KEY
    };

    for (const [placeholder, valor] of Object.entries(reemplazos)) {
      contenido = contenido.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), valor);
    }

    fs.writeFileSync(envPath, contenido, 'utf8');
    env = leerEnv(envPath);
    console.log('  ✅ .env creado con secretos generados localmente');
    console.log(`  🔐 PANEL_PASSWORD=${env.PANEL_PASSWORD} (guárdalo)`);
  } else {
    console.log('[2/7] .env ya existe\n');
  }

  // 3. Configuración del negocio
  console.log('\n[3/7] Configuración del negocio');
  let clienteSlug, clienteDir, configPath, esNuevoCliente;

  if (clienteArg) {
    clienteSlug = slugify(clienteArg);
    clienteDir = path.join(raiz, 'clients', clienteSlug);
    configPath = path.join(clienteDir, 'config.json');
    esNuevoCliente = !fs.existsSync(configPath);
    if (esNuevoCliente) {
      console.log(`  → Creando nuevo cliente: ${clienteSlug}`);
      fs.mkdirSync(clienteDir, { recursive: true });
    }
  } else {
    // Modo standalone (config.json en raíz)
    configPath = path.join(raiz, 'config.json');
    const configExiste = fs.existsSync(configPath);
    const usarDemo = await preguntar(rl, '¿Usar plantilla DEMO (clients/demo/config.json) como base?', 's');
    if (usarDemo.toLowerCase() === 's') {
      const demoConfig = JSON.parse(fs.readFileSync(path.join(raiz, 'clients', 'demo', 'config.json'), 'utf8'));
      fs.writeFileSync(configPath, JSON.stringify(demoConfig, null, 2) + '\n', 'utf8');
      console.log('  ✅ config.json creado desde demo');
    } else if (!configExiste) {
      // Crear config.json vacío con placeholders
      const configVacio = {
        negocio: 'Mi Negocio (configurar nombre)',
        segmento: 'comidas',
        ciiu: '5611',
        moneda: '$',
        hora_reporte: '21:00',
        puerto: 3000,
        numero_dueno: '',
        ubicacion_negocio: { lat: 0, lng: 0 },
        domicilios: { faixas: [], radio_max_entrega_km: 0, gratis_si_total_sobre: 0 },
        menu: { color: '#1f9d55', url: '', logo: '' },
        productos: []
      };
      fs.writeFileSync(configPath, JSON.stringify(configVacio, null, 2) + '\n', 'utf8');
      console.log('  ✅ config.json creado con placeholders');
    }
  }

  // 4. Editar config.json interactivo (solo campos clave)
  console.log('\n[4/7] Personalizando configuración...');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  if (!clienteArg) {
    config.negocio = await preguntar(rl, 'Nombre del negocio', config.negocio);
    config.segmento = await preguntar(rl, 'Segmento (comidas/salud/retail/belleza)', config.segmento || 'comidas');
    config.puerto = parseInt(await preguntar(rl, 'Puerto HTTP', String(config.puerto || 3000)), 10);
    config.numero_dueno = await preguntar(rl, 'WhatsApp dueño (formato 57300...)', config.numero_dueno);
    config.menu.color = await preguntar(rl, 'Color principal (hex)', config.menu?.color || '#1f9d55');
    config.menu.logo = await preguntar(rl, 'URL logo (opcional)', config.menu?.logo || '');
    config.ubicacion_negocio.lat = parseFloat(await preguntar(rl, 'Latitud GPS', String(config.ubicacion_negocio?.lat || 0)));
    config.ubicacion_negocio.lng = parseFloat(await preguntar(rl, 'Longitud GPS', String(config.ubicacion_negocio?.lng || 0)));
  } else if (esNuevoCliente) {
    // Para cliente nuevo desde plantilla demo
    const demoConfig = JSON.parse(fs.readFileSync(path.join(raiz, 'clients', 'demo', 'config.json'), 'utf8'));
    Object.assign(config, demoConfig);
    config.id = clienteSlug;
    config.negocio = await preguntar(rl, 'Nombre del negocio', 'Mi Negocio');
    config.puerto = 0; // se asigna auto
    config.numero_dueno = await preguntar(rl, 'WhatsApp dueño (formato 57300...)', '');
    config.menu.color = await preguntar(rl, 'Color principal (hex)', '#1f9d55');
    config.menu.logo = await preguntar(rl, 'URL logo (opcional)', '');
    config.ubicacion_negocio.lat = 0;
    config.ubicacion_negocio.lng = 0;
    // Limpiar productos demo
    config.productos = [];
  }

  // Asignar puerto si es 0
  if (!config.puerto || config.puerto === 0) {
    const used = new Set();
    try { used.add(JSON.parse(fs.readFileSync(path.join(raiz, 'config.json'), 'utf8')).puerto || 3000); } catch {}
    if (fs.existsSync(path.join(raiz, 'panel-central.json'))) {
      try { used.add(JSON.parse(fs.readFileSync(path.join(raiz, 'panel-central.json'), 'utf8')).puerto || 4000); } catch {}
    }
    const clientsDir = path.join(raiz, 'clients');
    if (fs.existsSync(clientsDir)) {
      for (const f of fs.readdirSync(clientsDir)) {
        try { used.add(JSON.parse(fs.readFileSync(path.join(clientsDir, f), 'utf8')).puerto || 0); } catch {}
      }
    }
    let p = 3001;
    while (used.has(p)) p++;
    config.puerto = p;
  }

  config.auth_dir = config.auth_dir || `auth_info_${clienteSlug || 'default'}`;
  if (!config.id && clienteSlug) config.id = clienteSlug;

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
  console.log(`  ✅ Configuración guardada en ${path.relative(raiz, configPath)}`);
  console.log(`  🌐 Puerto: ${config.puerto}`);

  // 5. Contraseña admin
  console.log('\n[5/7] Contraseña de administrador (Panel Empresarial)');
  const panelPass = await preguntar(rl, 'Contraseña para admin@localhost (mín 12 chars)', '');
  if (panelPass && panelPass.length >= 12) {
    env.PANEL_PASSWORD = panelPass;
    escribirEnv(envPath, env);
    console.log('  ✅ PANEL_PASSWORD actualizado en .env');
  } else {
    console.log('  ⚠️  Sin contraseña válida; se usará la generada automáticamente en .env');
  }

  // 6. Inicializar BD
  console.log('\n[6/7] Inicializando base de datos...');
  try {
    execSync('node -e "require(\'./core/db-sqlite.js\')"', { cwd: raiz, stdio: 'pipe' });
    console.log('  ✅ BD SQLite inicializada (data/neurallgo.db)');
  } catch (e) {
    console.log('  ⚠️  BD se creará al primer arranque de la app');
  }

  // 7. Tests de verificación
  console.log('\n[7/7] Ejecutando tests de verificación...');
  try {
    execSync('npm test', { cwd: raiz, stdio: 'inherit' });
    console.log('\n  ✅ Todos los tests pasan');
  } catch (e) {
    console.log('\n  ⚠️  Algunos tests fallaron; revisa antes de producción');
  }

  // Resumen final
  console.log('\n==========================================');
  console.log('  SETUP COMPLETADO');
  console.log('==========================================');
  console.log(`\n📁 Config: ${path.relative(raiz, configPath)}`);
  console.log(`🌐 Panel Empresarial: http://localhost:${config.puerto}/panel-empresarial`);
  console.log(`🔑 Login: admin@localhost`);
  console.log(`🔐 Password: ${env.PANEL_PASSWORD || '(generada en .env)'}`);
  console.log(`\n🚀 Para arrancar:`);
  if (clienteArg) {
    console.log(`   node index.js --cliente ${clienteSlug}`);
  } else {
    console.log(`   node index.js`);
  }
  console.log(`\n📝 Próximos pasos:`);
  console.log(`   1. Edita .env con tus API keys reales (NVIDIA, Meta, etc.)`);
  console.log(`   2. Configura WhatsApp Cloud API en .env si usas transporte oficial`);
  console.log(`   3. Para producción: DB_ENGINE=postgres + credenciales PG en .env`);
  console.log(`\n📚 Docs: clients/README.md | docs/PLAN-DE-TERMINACION-SOFTWARE.md`);

  rl.close();
}

ejecutarSetup().catch(e => {
  console.error('\n[ERROR]', e.message);
  process.exit(1);
});