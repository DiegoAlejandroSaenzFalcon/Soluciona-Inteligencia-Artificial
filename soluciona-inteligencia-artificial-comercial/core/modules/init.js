'use strict';
// ============================================================
// Inicializador de sistema - Integración de licencias y control
// Compatible con Node.js - Sin uso de localStorage/window
// ============================================================

const fs = require('fs');
const path = require('path');

const TRIAL_FILE = path.join(__dirname, '../../data/trial_license.json');
const LICENSE_FILE = path.join(__dirname, '../../data/license_storage.json');

function readJsonSafe(filePath, fallback = null) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch {}
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

const state = {
  licenseData: null,
  messageConfig: null,
  userSystem: null,
  initialized: false
};

function initLicenseSystem() {
  const licenseStorage = readJsonSafe(LICENSE_FILE);
  const trialData = readJsonSafe(TRIAL_FILE);
  
  let trialActive = false;
  if (trialData && trialData.trial_start) {
    const trialEnd = new Date(trialData.trial_start).getTime() + (trialData.trial_days || 10) * 24 * 60 * 60 * 1000;
    trialActive = Date.now() < trialEnd;
  }
  
  state.licenseData = {
    isValid: !!licenseStorage || trialActive,
    isTrial: trialActive,
    hasWhatsApp: true,
    hasOrders: true,
    hasInventory: trialActive,
    hasAccounting: trialActive,
    fullPanel: trialActive
  };
  
  return state.licenseData;
}

function initMessageSystem() {
  state.messageConfig = {
    allowOutOfScope: true,
    personalMode: 'respond',
    saleMode: true,
    customerServiceMode: true,
    outOfScopeResponse: 'Lo siento, solo puedo ayudarte con pedidos y ventas.'
  };
  
  return state.messageConfig;
}

function initUserSystem() {
  state.userSystem = {
    users: [],
    currentUser: null,
    addUser: () => {},
    getCurrentUser: () => null,
    login: () => false
  };
  
  return state.userSystem;
}

function initSystems() {
  initLicenseSystem();
  initMessageSystem();
  initUserSystem();
  state.initialized = true;
  return {
    licenseData: state.licenseData,
    messageConfig: state.messageConfig,
    userSystem: state.userSystem
  };
}

initSystems();

if (typeof globalThis !== 'undefined') {
  globalThis.licenseData = state.licenseData;
  globalThis.messageConfig = state.messageConfig;
  globalThis.userSystem = state.userSystem;
  globalThis.initSystems = initSystems;
}

module.exports = {
  initSystems,
  initLicenseSystem,
  initMessageSystem,
  initUserSystem,
  getLicenseData: () => state.licenseData,
  getMessageConfig: () => state.messageConfig,
  getUserSystem: () => state.userSystem
};