// Genera imágenes PNG profesionales del menú a partir de config.productos.
// Diseño: SVG → PNG (2x) con @resvg/resvg-js. El menú se divide en VARIAS
// páginas (imágenes) para que cada una sea legible en el celular.
// Se regenera solo si cambian los productos (hash del menú).
// Colores de marca configurables en config.menu.color / config.menu.logo.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Resvg } = require('@resvg/resvg-js');
const { config } = require('../config.js');

const ANCHO = 1080;          // px base (WhatsApp muestra hasta 1080)
const ESCALA = 2;            // 2x para nitidez
const MARGEN = 64;
const ANCHO_CONTENIDO = ANCHO - MARGEN * 2;
const ALTO_MAXIMO = 4800;    // px base por página (WhatsApp: máx ~5000)

function monedaLimpia() {
  const m = (config.moneda || '$').trim();
  if (/^cop\b|^col\b/i.test(m)) return '$';
  if (/:\s*\$+\s*:?\s*$/i.test(m)) return '$';
  return m;
}

function colorMarca() {
  return (config.menu && config.menu.color) || '#1f9d55';
}

function esc(t) {
  return String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function hashMenu() {
  const h = crypto.createHash('sha1');
  for (const p of config.productos || []) {
    h.update(p.nombre).update('|').update(String(p.precio)).update('|')
      .update(p.ingredientes || '').update('|').update(p.categoria || '');
  }
  h.update('|color:' + ((config.menu && config.menu.color) || ''));
  h.update('|logo:' + ((config.menu && config.menu.logo) || ''));
  return h.digest('hex').slice(0, 12);
}

// Envuelve texto en varias líneas respetando un ancho máximo estimado.
function envolver(texto, maxCharsPorLinea) {
  const palabras = String(texto).split(/\s+/).filter(Boolean);
  const lineas = [];
  let actual = '';
  for (const w of palabras) {
    if ((actual + ' ' + w).trim().length > maxCharsPorLinea) {
      if (actual) lineas.push(actual);
      actual = w;
    } else {
      actual = (actual + ' ' + w).trim();
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

// Costo vertical de una categoría completa (para paginar sin cortar secciones).
function costoCategoria(lista) {
  let c = 64 + 20; // título + separador
  for (const p of lista) {
    if (p.nombre.length > 34) {
      c += 56 * envolver(p.nombre, 34).length;
    } else {
      c += 56;
    }
    if (p.ingredientes) {
      c += envolver(p.ingredientes, 58).length * 38 + 10;
    } else {
      c += 14;
    }
  }
  return c;
}

// Construye el SVG de UNA página. cats = [{ cat, lista }].
function construirPaginaSVG(negocio, color, moneda, cats, numPagina, totalPaginas, logo) {
  let y = 0;
  const partes = [];

  // ---- Header ----
  const altoHeader = logo ? 350 : 300;
  partes.push(`<rect x="0" y="0" width="${ANCHO}" height="${altoHeader}" fill="${color}"/>`);
  if (logo) {
    partes.push(`<image x="${ANCHO / 2 - 70}" y="40" width="140" height="140" href="${logo}" preserveAspectRatio="xMidYMid meet"/>`);
    partes.push(`<text x="${ANCHO / 2}" y="245" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="72" font-weight="700" fill="#ffffff">${esc(negocio)}</text>`);
  } else {
    partes.push(`<text x="${ANCHO / 2}" y="170" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="76" font-weight="700" fill="#ffffff">${esc(negocio)}</text>`);
  }
  partes.push(`<text x="${ANCHO / 2}" y="${altoHeader - 52}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="32" fill="#eafff2">🍽️ MENÚ  ·  PIDE POR ESTE CHAT</text>`);
  y = altoHeader + 10;

  // ---- Categorías ----
  for (const { cat, lista } of cats) {
    partes.push(`<text x="${MARGEN}" y="${y + 40}" font-family="Segoe UI, Arial, sans-serif" font-size="44" font-weight="700" fill="${color}">${esc(cat)}</text>`);
    y += 84;
    partes.push(`<line x1="${MARGEN}" y1="${y - 30}" x2="${ANCHO - MARGEN}" y2="${y - 30}" stroke="${color}" stroke-opacity="0.3" stroke-width="2"/>`);
    for (const p of lista) {
      const precioTxt = `${moneda}${p.precio.toLocaleString('es-CO')}`;
      const precioAncho = precioTxt.length * 20 + 20;
      const precioX = ANCHO - MARGEN - precioAncho;
      if (p.nombre.length > 34) {
        const partesN = envolver(p.nombre, 34);
        partes.push(`<text x="${MARGEN}" y="${y + 8}" font-family="Segoe UI, Arial, sans-serif" font-size="34" font-weight="600" fill="#1c2733"><tspan x="${MARGEN}" dy="0">${esc(partesN[0])}</tspan>${partesN.slice(1).map(l => `<tspan x="${MARGEN}" dy="40">${esc(l)}</tspan>`).join('')}</text>`);
        y += 56 * partesN.length;
      } else {
        partes.push(`<text x="${MARGEN}" y="${y + 8}" font-family="Segoe UI, Arial, sans-serif" font-size="34" font-weight="600" fill="#1c2733">${esc(p.nombre)}</text>`);
        y += 56;
      }
      partes.push(`<text x="${precioX}" y="${y - 28}" font-family="Segoe UI, Arial, sans-serif" font-size="32" font-weight="700" fill="${color}" text-anchor="end">${esc(precioTxt)}</text>`);
      if (p.ingredientes) {
        const lineas = envolver(p.ingredientes, 58);
        partes.push(`<text x="${MARGEN + 24}" y="${y + 6}" font-family="Segoe UI, Arial, sans-serif" font-size="25" fill="#5b6b7b"><tspan x="${MARGEN + 24}" dy="0">${esc(lineas[0])}</tspan>${lineas.slice(1).map(l => `<tspan x="${MARGEN + 24}" dy="34">${esc(l)}</tspan>`).join('')}</text>`);
        y += lineas.length * 38 + 10;
      } else {
        y += 14;
      }
    }
    y += 36;
  }

  // ---- Footer ----
  y += 20;
  partes.push(`<rect x="0" y="${y}" width="${ANCHO}" height="130" fill="${color}"/>`);
  partes.push(`<text x="${ANCHO / 2}" y="${y + 56}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="34" font-weight="600" fill="#ffffff">📲 Escríbenos y pide tu pedido</text>`);
  const horas = config.horario ? esc(config.horario) : '';
  if (horas) {
    partes.push(`<text x="${ANCHO / 2}" y="${y + 102}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="26" fill="#eafff2">${horas}</text>`);
  }
  if (totalPaginas > 1) {
    partes.push(`<text x="${ANCHO / 2}" y="${y + 34}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="600" fill="#ffffff">PÁGINA ${numPagina} DE ${totalPaginas}</text>`);
  }
  y += 130;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${y}" viewBox="0 0 ${ANCHO} ${y}">
  <rect x="0" y="0" width="${ANCHO}" height="${y}" fill="#fbfcfd"/>
  ${partes.join('\n  ')}
</svg>`;
}

// Divide categorías en páginas que quepan en ALTO_MAXIMO y con máximo 4
// secciones por página (para que cada imagen se vea ordenada y legible).
function paginar(porCat) {
  const paginas = [];
  let actual = [];
  let altoActual = 0;
  const headerFooter = 430;
  for (const [cat, lista] of porCat) {
    const costo = costoCategoria(lista);
    const muyAlto = actual.length && altoActual + costo + headerFooter > ALTO_MAXIMO;
    const demasiadasSecciones = actual.length >= 4;
    if (muyAlto || demasiadasSecciones) {
      paginas.push(actual);
      actual = [];
      altoActual = 0;
    }
    actual.push({ cat, lista });
    altoActual += costo;
  }
  if (actual.length) paginas.push(actual);
  return paginas;
}

// Genera (o reusa) los PNG del menú. Devuelve array de paths (vacío si falla).
function generarMenuPNG(dirCache) {
  try {
    const dir = dirCache || path.resolve(__dirname, '..', 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const h = hashMenu();
    const prods = config.productos || [];
    const catDe = p => p.categoria || '📦 Otros';
    const porCat = new Map();
    for (const p of prods) {
      if (!porCat.has(catDe(p))) porCat.set(catDe(p), []);
      porCat.get(catDe(p)).push(p);
    }
    const paginas = paginar(porCat);
    const color = colorMarca();
    const moneda = monedaLimpia();
    const negocio = config.negocio || 'Nuestro menú';
    const logo = (config.menu && config.menu.logo && fs.existsSync(path.resolve(__dirname, '..', config.menu.logo)))
      ? path.resolve(__dirname, '..', config.menu.logo)
      : '';
    const archivos = [];
    paginas.forEach((cats, i) => {
      const archivo = path.join(dir, `menu-${h}-${i + 1}.png`);
      if (fs.existsSync(archivo)) {
        archivos.push(archivo);
        return;
      }
      const svg = construirPaginaSVG(negocio, color, moneda, cats, i + 1, paginas.length, logo);
      const resvg = new Resvg(svg, {
        fitTo: { mode: 'width', value: ANCHO * ESCALA },
        font: { loadSystemFonts: true, defaultFontFamily: 'Segoe UI' }
      });
      const png = resvg.render().asPng();
      fs.writeFileSync(archivo, png);
      archivos.push(archivo);
    });
    return archivos;
  } catch (e) {
    console.log('[MENU-IMG] No pude generar la imagen:', e && e.message ? e.message : e);
    return [];
  }
}

module.exports = { generarMenuPNG, construirPaginaSVG, paginar, hashMenu, monedaLimpia };
