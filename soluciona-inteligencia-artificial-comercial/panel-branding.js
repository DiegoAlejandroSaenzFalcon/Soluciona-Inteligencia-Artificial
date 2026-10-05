'use strict';
// ============================================================
// Panel Empresarial — Branding por cliente (theme pack)
// ============================================================
async function cargarBranding() {
  try {
    const r = await fetch('/api/branding');
    if (!r.ok) return;
    const b = await r.json();
    aplicarBranding(b);
  } catch (e) {
    console.warn('[Branding] No se pudo cargar:', e.message);
  }
}

function aplicarBranding(b) {
  if (!b) return;
  const root = document.documentElement;
  // Color principal del cliente
  if (b.color) {
    root.style.setProperty('--ac', b.color);
    // Derivar tonos relacionados
    root.style.setProperty('--ac-light', hexToRgba(b.color, 0.15));
    root.style.setProperty('--ac-hover', shadeColor(b.color, -15));
  }
  // Logo del cliente
  if (b.logo) {
    const logoEl = document.querySelector('.brand-logo');
    if (logoEl) { logoEl.src = b.logo; logoEl.style.display = 'inline-block'; }
  }
  // Nombre del negocio en el sidebar
  if (b.nombreNegocio) {
    const nombreEl = document.getElementById('brandNombre');
    if (nombreEl) nombreEl.innerHTML = `<i class="fa-solid fa-building"></i> ${b.nombreNegocio} · Panel Empresarial`;
  }
  // Guardar en window para uso de otros módulos
  window.solucionaBranding = b;
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function shadeColor(hex, percent) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const amount = Math.round(2.55 * percent);
  const nr = Math.max(0, Math.min(255, r + amount));
  const ng = Math.max(0, Math.min(255, g + amount));
  const nb = Math.max(0, Math.min(255, b + amount));
  return '#' + [nr, ng, nb].map(x => x.toString(16).padStart(2, '0')).join('');
}

// Cargar branding al iniciar
document.addEventListener('DOMContentLoaded', cargarBranding);
// También exponer para carga manual
window.cargarBranding = cargarBranding;
window.aplicarBranding = aplicarBranding;