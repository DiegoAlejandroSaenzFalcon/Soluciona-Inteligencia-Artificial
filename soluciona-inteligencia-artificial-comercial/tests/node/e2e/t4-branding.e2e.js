const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../..');
const NODE = process.execPath;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForHttp(url, child, timeoutMs = 20000) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
    if (child.exitCode !== null) {
      throw new Error(`server exited with code ${child.exitCode}: ${lastError?.message || 'no HTTP response'}`);
    }
    try {
      const response = await fetch(url);
      return response;
    } catch (error) {
      lastError = error;
      await sleep(250);
    }
  }
  throw new Error(`timeout waiting for ${url}: ${lastError?.message || 'no HTTP response'}`);
}

async function runClientSmoke({ client, port, expectedColor }) {
  const child = spawn(NODE, ['index.js', '--cliente', client], {
    cwd: ROOT,
    env: {
      ...process.env,
      DISABLE_WHATSAPP: 'true',
      PANEL_PASSWORD: 'e2e-test-password',
      PORT_OVERRIDE: String(port),
      NODE_ENV: 'test'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let output = '';
  child.stdout.on('data', chunk => { output += chunk.toString(); });
  child.stderr.on('data', chunk => { output += chunk.toString(); });

  try {
    const base = `http://127.0.0.1:${port}`;
    const brandingResponse = await waitForHttp(`${base}/api/branding`, child);
    assert.equal(brandingResponse.status, 200);

    const branding = await brandingResponse.json();
    assert.equal(branding.clienteId, client);
    assert.equal(branding.color, expectedColor);
    assert.equal(branding.segmento, 'comidas');
    assert.ok(branding.nombreNegocio);

    const panelResponse = await fetch(`${base}/panel-empresarial`);
    assert.equal(panelResponse.status, 200);
    const panelHtml = await panelResponse.text();
    assert.match(panelHtml, /panel-branding\.js/);

    const brandingScriptResponse = await fetch(`${base}/panel-branding.js`);
    assert.equal(brandingScriptResponse.status, 200);
    const brandingScript = await brandingScriptResponse.text();
    assert.match(brandingScript, /cargarBranding/);
    assert.match(brandingScript, /aplicarBranding/);
  } finally {
    if (child.exitCode === null) {
      child.kill('SIGTERM');
      await Promise.race([
        new Promise(resolve => child.once('exit', resolve)),
        sleep(3000)
      ]);
      if (child.exitCode === null) child.kill('SIGKILL');
    }
    if (child.exitCode !== 0 && child.exitCode !== null) {
      throw new Error(`client ${client} server failed. Output:\n${output}`);
    }
  }
}

test('T4 E2E: each client pack exposes isolated branding through the public panel API', async () => {
  await runClientSmoke({ client: 'demo', port: 4311, expectedColor: '#1f9d55' });
  await runClientSmoke({ client: 'demo2', port: 4312, expectedColor: '#e67e22' });
});
