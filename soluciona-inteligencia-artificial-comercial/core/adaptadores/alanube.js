const { config } = require('../../config.cjs');

const ALANUBE_BASE = 'https://api.alanube.com/v1';

async function getAlanubeToken(cfg) {
  const resp = await fetch(`${ALANUBE_BASE}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: cfg.username, password: cfg.password })
  });
  if (!resp.ok) throw new Error(`Alanube auth: ${resp.status}`);
  const data = await resp.json();
  return data.access_token;
}

async function enviarAlanube(payload, cfg) {
  const { pedido } = payload;
  const token = await getAlanubeToken(cfg);

  const items = pedido.items.map((item, idx) => ({
    code: item.producto,
    description: item.producto,
    quantity: item.cantidad,
    unit_price: item.precioUnitario,
    tax_rate: 19,
    unit_measure: '94'
  }));

  const body = {
    document_type: '01',
    prefix: cfg.prefijo || 'SETP',
    number: pedido.id.toString(),
    date: new Date().toISOString().slice(0, 10),
    customer: {
      type_id: cfg.customer_type_id || '31',
      identification: pedido.telefono || '222222222222',
      name: pedido.remitente || 'Cliente Genérico',
      email: cfg.customer_email || 'cliente@ejemplo.com',
      address: pedido.direccion || 'Sin dirección',
      city: cfg.customer_city || '11001'
    },
    items,
    payment_form: cfg.payment_form || '1',
    payment_method: cfg.payment_method || '10'
  };

  const resp = await fetch(`${ALANUBE_BASE}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(`Alanube: ${resp.status} ${JSON.stringify(data)}`);

  console.log('[ALANUBE] Factura creada:', data.cufe || data.id);
  return { ok: true, cufe: data.cufe, id: data.id, qr: data.qr };
}

module.exports = { enviar: enviarAlanube };