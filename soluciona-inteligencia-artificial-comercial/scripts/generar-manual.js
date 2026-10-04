'use strict';
/**
 * scripts/generar-manual.js — Manual personalizado por cliente (V2).
 *
 * El manual nunca contiene secretos. Vive en docs/clientes/<slug>/ del repositorio privado.
 *
 *   node scripts/generar-manual.js --cliente san-angel
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const i = args.indexOf('--cliente');
if (i === -1 || !args[i + 1]) {
  console.error('Uso: node scripts/generar-manual.js --cliente <slug> [--out ruta.md]');
  process.exit(1);
}
const rawArg = String(args[i + 1]);
// Si acaba en .json (absoluta o relativa, no un slug), no sanitizar — usarla como está.
const esRutaAJson = rawArg.endsWith('.json');
const slug = esRutaAJson ? rawArg : rawArg.replace(/[^a-zA-Z0-9._-]/g, '');
const io = args.indexOf('--out');
const outPathArg = io !== -1 ? args[io + 1] : null;

const raiz = path.resolve(__dirname, '..');
// El pack puede vivir en clients/<slug>/ del producto o en cualquier ruta (ej: repo privado del cliente).
const packPathEnProducto = esRutaAJson ? null : path.join(raiz, 'clients', slug, 'config.json');
const packPath = packPathEnProducto && fs.existsSync(packPathEnProducto) ? packPathEnProducto : slug;
if (!fs.existsSync(packPath)) {
  console.error(`ERROR: no existe el pack del cliente: ${packPathEnProducto || '(no slug)'} (ni como ruta: ${packPath})`);
  process.exit(1);
}
const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
const fecha = new Date().toISOString().slice(0, 10);
const negocioAmigable = pack.negocio || '[nombre-vacío]';

function generar() {
  const L = [];
  L.push(`# MANUAL DE IMPLEMENTACIÓN — ${negocioAmigable}`);
  L.push(`> Generado: ${fecha} | Cliente: ${slug} | Sistema: Soluciona IA`);
  L.push('');
  L.push('---');
  L.push('');
  L.push('## 1. Tu sistema, en una línea');
  L.push(`Este manual es exclusivo de **${negocioAmigable}**. Cada paso parte de tu configuración real, no de un ejemplo genérico.`);
  L.push('');
  L.push('## 2. Tu catálogo hoy');
  if (Array.isArray(pack.productos) && pack.productos.length) {
    const byCat = {};
    for (const p of pack.productos) {
      const c = p.categoria || 'Otros';
      (byCat[c] = byCat[c] || []).push(p);
    }
    for (const [cat, items] of Object.entries(byCat)) {
      L.push(`### ${cat}`);
      for (const it of items) {
        const precio = Number(it.precio || 0).toLocaleString('es-CO');
        L.push(`- **${it.nombre}** — $${precio} COP`);
      }
      L.push('');
    }
  } else {
    L.push('- *(Aún no hay catálogo cargado)*');
  }
  L.push('');
  L.push('## 3. Tus accesos (qué debes tener a la mano)');
  L.push('- [ ] Panel empresarial: `admin@localhost` + la contraseña que elegiste (no va aquí)');
  L.push('- [ ] Panel legado: la contraseña maestra (PANEL_PASSWORD, no va aquí)');
  L.push('- [ ] WhatsApp (Cloud API oficial): número del negocio');
  L.push('- [ ] Cuentas de Meta/Google del negocio (sin que nadie más las tenga)');
  L.push('');
  L.push('## 4. Lo que aún falta y quién lo trae');
  L.push('| Qué | Quién | Estado |');
  L.push('|---|---|---|');
  L.push('| Credenciales Meta (WhatsApp) | Dueño (en app de Meta) | ⏳ |');
  L.push('| Claves de IA (NVIDIA/Gemini) | Dueño / proveedor elegido | ⏳ |');
  L.push('| Acceso a facturación propia (si la hay) | Dueño (contador) | ⏳ |');
  L.push('');
  L.push('## 5. Cómo levantarlo cuando quieras');
  L.push('```powershell');
  L.push('cd soluciona-inteligencia-artificial-comercial');
  L.push(`node index.js --cliente "${slug}"`);
  L.push('```');
  L.push('Panel: http://localhost:3000 · Empresarial: http://localhost:3000/panel-empresarial');
  L.push('');
  L.push('## 6. Qué nunca debe pasar en tu sistema');
  L.push('- Nunca mandes una foto de contraseña/clave por chat con NADIE');
  L.push('- Nunca dejes el panel abierto en un PC compartido sin logout');
  L.push('- Nunca actives 2FA sin guardar los códigos de recuperación');
  L.push('');
  L.push('---');
  L.push('*Documento generado automáticamente a partir del pack del cliente. No modificar a mano; regenerar con el script.*');
  L.push(`*Fecha: ${fecha} | Versión: 1.0.0*`);
  return L.join('\n');
}

function main() {
  const out = outPathArg
    ? path.resolve(outPathArg)
    : path.join(raiz, 'docs', 'clientes', slug, `manual-${fecha}.md`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, generar(), 'utf8');
  console.log(`Manual generado: ${out}`);
}

main();
