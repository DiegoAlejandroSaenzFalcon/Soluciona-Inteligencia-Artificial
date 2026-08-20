'use strict';
// ============================================================
// Panel WhatsApp Lite - Versión simplificada para microempresas
// Features: 10-day trial, post-trial reduction, message control
// ARCHIVO DE NAVEGADOR (frontend)
// ============================================================
let trialMode = false;
let messageConfig = {
  personalMode: 'respond',
  allowOutOfScope: true,
  outOfScopeResponse: 'Soy un asistente especializado en pedidos y ventas. No estoy programado para ayudarte con consultas personales.'
};

function initWhatsAppLite() {
  try {
    const trialStorage = JSON.parse(localStorage.getItem('trial_license') || 'null');
    const now = Date.now();
    const trialStart = trialStorage && trialStorage.trial_start;
    
    if (!trialStorage) {
      localStorage.setItem('trial_license', JSON.stringify({
        trial_start: new Date().toISOString(),
        trial_days: 10,
        features: { whatsapp: true, orders: true, inventory: false, accounting: false, full_panel: true }
      }));
      trialMode = true;
    } else {
      trialMode = now < new Date(trialStorage.trial_start).getTime() + 10 * 24 * 60 * 60 * 1000;
    }
    
    setupEventListeners();
  } catch (e) {
    console.error('Error iniciando WhatsApp Lite:', e);
    const errorEl = document.getElementById('error_message');
    if (errorEl) errorEl.textContent = 'Error inicializando sistema';
  }
}

function setupEventListeners() {
  if (typeof document === 'undefined') return;
  document.addEventListener('DOMContentLoaded', () => {
    if (!trialMode) {
      const adv = document.getElementById('advanced_features');
      if (adv) adv.style.display = 'none';
      const red = document.getElementById('reduced_panel');
      if (red) red.style.display = 'block';
    }
  });
}

function isTrialActive() {
  return trialMode;
}

function switchToReducedMode() {
  trialMode = false;
  localStorage.removeItem('trial_license');
  localStorage.setItem('license_key', JSON.stringify({ trial_expired: true }));
}

if (typeof window !== 'undefined') {
  window.initWhatsAppLite = initWhatsAppLite;
  window.isTrialActive = isTrialActive;
  window.switchToReducedMode = switchToReducedMode;
}