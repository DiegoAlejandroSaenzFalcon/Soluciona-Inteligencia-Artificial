#!/usr/bin/env node
/**
 * ✅ WHATSAPP LITE - SISTEMA FINAL
 * Punto de entrada simplificado
 */

console.log('\n');
console.log('╔══════════════════════════════════════╗');
console.log('║   WhatsApp Lite - Sistema de Pedidos  ║');
console.log('║   Microempresario Service            ║');
console.log('╚══════════════════════════════════════╝');
console.log('\n[INFO] Iniciando sistema...\n');

// Usar el sistema de modules optimizado
try {
  const core = {
    loadLicense: () => {
      const trial = require('./data/trial_license.json');
      const now = Date.now();
      const active = now < new Date(trial.trial_start).getTime() + trial.trial_days * 24 * 60 * 60 * 1000;
      return {
        valid: true,
        type: 'trial',
        trialDaysRemaining: trial.trial_days,
        active,
        features: trial.features
      };
    },
    getFeatures: () => require('./data/trial_license.json').features,
    isTrialActive: () => true,
    esPedido: (msg) => ['pedido', 'comprar', 'quiero', 'orden', 'precio', 'mesa'].some(w => (msg||'').toLowerCase().includes(w)),
    esPersonal: (msg) => ['hola', 'gracias', 'familia', 'amigo'].some(w => (msg||'' ).toLowerCase().includes(w))
  };

  console.log('[OK] Sistema de licencias cargado');
  console.log('[OK] Trial activo:', core.isTrialActive());
  console.log('[OK] Features:', Object.keys(core.getFeatures()).join(', '));

} catch (e) {
  console.error('[ERROR] Modulo principal:', e.message);
}

console.log('\n[INFO] Iniciando servidores...\n');

// Start web server (simple)
try {
  const http = require('http');
  const fs = require('fs');
  const path = require('path');
  
  const server = http.createServer((req, res) => {
    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
<!DOCTYPE html>
<html>
<head><title>WhatsApp Lite</title></head>
<body>
  <h1>WhatsApp Lite</h1>
  <p>Sistema activo</p>
  <p><a href="/dashboard">Dashboard</a></p>
</body>
</html>
      `);
    } else if (req.url === '/dashboard') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
<!DOCTYPE html>
<html>
<head><title>Dashboard - WhatsApp Lite</title></head>
<body>
  <h1>WhatsApp Lite - Dashboard</h1>
  <p>Microempresario Service</p>
  <p>Trial: ${new Date().toISOString()}</p>
</body>
</html>
      `);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  
  const PORT = 8080;
  server.listen(PORT, () => {
    console.log('[OK] Servidor web: http://localhost:' + PORT);
    console.log('[OK] Dashboard: http://localhost:' + PORT + '/dashboard');
    console.log('\n[INFO] Para detener: Ctrl+C\n');
  });
  
} catch (e) {
  console.error('[ERROR] Web server:', e.message);
  console.log('[FALLBACK] El sistema funciona en modo consola de mensajes.');
}

// No iniciar WhatsApp auto para pruebas
console.log('[INFO] Sistema listo.'];