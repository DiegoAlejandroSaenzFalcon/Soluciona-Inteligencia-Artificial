'use strict';
// ============================================================
// Sistema de Licencias - Validación y gestión
// Para Node.js (backend) - Usa archivos para persistencia
// ============================================================

const fs = require('fs');
const path = require('path');

const LICENSE_FILE = path.join(__dirname, '../../../data/license_storage.json');
const TRIAL_FILE = path.join(__dirname, '../../../data/trial_license.json');

class LicenseManager {
  constructor() {
    this.license = null;
    this.trial = null;
  }

  getLicenseFile() {
    try {
      if (fs.existsSync(LICENSE_FILE)) {
        return JSON.parse(fs.readFileSync(LICENSE_FILE, 'utf8'));
      }
    } catch {}
    return null;
  }

  getTrialFile() {
    try {
      if (fs.existsSync(TRIAL_FILE)) {
        return JSON.parse(fs.readFileSync(TRIAL_FILE, 'utf8'));
      }
    } catch {}
    return null;
  }

  isTrialActive(trialDays = 10) {
    const trial = this.getTrialFile();
    if (!trial || !trial.trial_start) return false;
    return Date.now() < new Date(trial.trial_start).getTime() + trialDays * 24 * 60 * 60 * 1000;
  }

  createTrial() {
    const trial = {
      trial_start: new Date().toISOString(),
      trial_days: 10,
      features: { whatsapp: true, orders: true, inventory: true, accounting: true, full_panel: true }
    };
    try {
      fs.writeFileSync(TRIAL_FILE, JSON.stringify(trial, null, 2));
    } catch (e) {
      console.error('Error creando trial:', e.message);
    }
    return trial;
  }

  loadLicense() {
    const trial = this.getTrialFile();
    if (trial) {
      return { valid: true, type: 'trial', data: trial, features: trial.features };
    }
    
    const license = this.getLicenseFile();
    if (license) {
      return { valid: true, type: 'license', data: license, features: license.features };
    }
    
    const newTrial = this.createTrial();
    return { valid: true, type: 'trial_new', data: newTrial, features: newTrial.features };
  }

  isTrialActiveDays(days = 10) {
    return this.isTrialActive(days);
  }

  getTrialDays() {
    const trial = this.getTrialFile();
    if (trial && trial.trial_start) {
      return Math.floor((new Date(trial.trial_start).getTime() + trial.days * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000));
    }
    return 0;
  }
}

module.exports = {
  LicenseManager
};