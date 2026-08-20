'use strict';
// ============================================================
// Sistema de Módulos - Control de características y licencias
// Para Node.js (backend) - Usa archivos para persistencia
// Compatible con index.js: loadLicense(), getFeatures(), etc.
// ============================================================

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const LICENSE_FILE = path.join(DATA_DIR, 'license_storage.json');
const TRIAL_FILE = path.join(DATA_DIR, 'trial_license.json');

if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
}

function readJsonSafe(filePath, fallback = null) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error('Error leyendo', filePath, e.message);
  }
  return fallback;
}

function writeJsonSafe(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.error('Error escribiendo', filePath, e.message);
    return false;
  }
}

const PEDIDO_KEYWORDS = ['pedido', 'orden', 'comprar', 'quiero', 'necesito', 'cuanto', 'cuanto cuesta', 'precio', 'cantidad', 'total', 'factura', 'mesa', 'plato', 'comida', 'bebida'];
const PERSONAL_KEYWORDS = ['hola', 'gracias', 'familiar', 'familia', 'amigo', 'qué haces', 'hola amigo', 'hola hijo', 'hola hija'];

function esPedido(mensaje) {
  if (!mensaje) return false;
  const msg = mensaje.toLowerCase();
  return PEDIDO_KEYWORDS.some(k => msg.includes(k));
}

function esPersonal(mensaje) {
  if (!mensaje) return false;
  const msg = mensaje.toLowerCase();
  return PERSONAL_KEYWORDS.some(k => msg.includes(k));
}

const licenseState = {
  isValid: false,
  isTrial: false,
  features: {},
  trialDaysRemaining: 0
};

function computeTrialState(trialData) {
  if (!trialData || !trialData.trial_start) {
    return { active: false, daysRemaining: 0 };
  }
  const startMs = new Date(trialData.trial_start).getTime();
  const trialDays = trialData.trial_days || 10;
  const endMs = startMs + trialDays * 24 * 60 * 60 * 1000;
  const remainingMs = endMs - Date.now();
  const daysRemaining = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
  return { active: Date.now() < endMs, daysRemaining };
}

function loadLicense() {
  try {
    const trialData = readJsonSafe(TRIAL_FILE);
    const trialState = computeTrialState(trialData);
    
    const licenseData = readJsonSafe(LICENSE_FILE);
    
    if (licenseData && licenseData.license_key) {
      licenseState.isValid = true;
      licenseState.isTrial = false;
      licenseState.features = licenseData.features || {};
    } else if (trialState.active) {
      licenseState.isValid = true;
      licenseState.isTrial = true;
      licenseState.features = trialData.features || {};
      licenseState.trialDaysRemaining = trialState.daysRemaining;
    } else {
      const newTrial = {
        trial_start: new Date().toISOString(),
        trial_days: 10,
        features: {
          whatsapp: true,
          orders: true,
          inventory: true,
          accounting: true,
          full_panel: true
        }
      };
      writeJsonSafe(TRIAL_FILE, newTrial);
      licenseState.isValid = true;
      licenseState.isTrial = true;
      licenseState.features = newTrial.features;
      licenseState.trialDaysRemaining = 10;
    }
    
    return {
      valid: licenseState.isValid,
      type: licenseState.isTrial ? 'trial' : 'license',
      features: licenseState.features,
      trialDaysRemaining: licenseState.trialDaysRemaining
    };
  } catch (e) {
    console.error('[MÓDULOS] Error cargando licencia:', e.message);
    licenseState.isValid = true;
    licenseState.isTrial = true;
    licenseState.features = { whatsapp: true, orders: true, inventory: true, accounting: true, full_panel: true };
    licenseState.trialDaysRemaining = 10;
    return { valid: true, type: 'trial_fallback', features: licenseState.features, trialDaysRemaining: 10 };
  }
}

function getFeatures() {
  return { ...licenseState.features };
}

function hasFeature(feature) {
  return licenseState.features[feature] === true;
}

function isTrialActive() {
  return licenseState.isTrial;
}

function getTrialDaysRemaining() {
  return licenseState.trialDaysRemaining;
}

function detectMessageType(message) {
  if (esPedido(message)) return { type: 'pedido', confidence: 0.9 };
  if (esPersonal(message)) return { type: 'personal', confidence: 0.8 };
  return { type: 'unknown', confidence: 0.3 };
}

function shouldRespond(message, config = {}) {
  const type = detectMessageType(message);
  if (type.type === 'pedido') return true;
  const mode = config.personalMode || 'respond';
  if (type.type === 'personal') return mode === 'respond';
  return mode === 'respond';
}

function getResponse(message, config = {}) {
  const type = detectMessageType(message);
  const outOfScope = config.outOfScopeResponse || 'Soy un asistente especializado en pedidos y ventas.';
  
  if (type.type === 'pedido') {
    return { type: 'pedido', response: 'Procesando tu pedido...', confidence: type.confidence };
  }
  if (type.type === 'personal') {
    const mode = config.personalMode || 'respond';
    if (mode === 'ignore') return { type: 'personal', response: null, confidence: type.confidence, action: 'ignore' };
    return { type: 'personal', response: outOfScope, confidence: type.confidence, action: 'out_of_scope' };
  }
  return { type: 'unknown', response: null, confidence: type.confidence };
}

const result = loadLicense();
if (result && result.valid) {
  console.log('[MÓDULOS] Sistema cargado:', result.type, '| Trial:', licenseState.isTrial, '| Features:', Object.keys(licenseState.features).filter(f => licenseState.features[f]).join(', '));
}

module.exports = {
  loadLicense,
  getFeatures,
  hasFeature,
  isTrialActive,
  getTrialDaysRemaining,
  detectMessageType,
  shouldRespond,
  getResponse,
  esPedido,
  esPersonal
};