const { config } = require('../../config.cjs');

const FACTUS_BASE = 'https://api.factus.com.co/v1';

async function getFactusToken(cfg) {
  const resp = await fetch(`${FACTUS_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cfg.email, password: cfg.password })
  });
  if (!resp.ok) throw new Error(`Factus auth: ${resp.status}`);
  const data = await resp.json();
  return data.access_token;
}

async function enviarFactus(payload, cfg) {
  const { pedido } = payload;
  const token = await getFactusToken(cfg);

  const items = pedido.items.map((item, idx) => ({
    code: item.producto,
    description: item.producto,
    quantity: item.cantidad,
    unit_price: item.precioUnitario,
    tax_rate: 19,
    unit_measure: '94'
  }));

  const body = {
    document_type: 'invoice',
    prefix: cfg.prefijo || 'SETP',
    number: pedido.id.toString(),
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toISOString().slice(11, 19),
    customer: {
      identification: pedido.telefono || '222222222222',
      name: pedido.remitente || 'Cliente Genérico',
      email: cfg.customer_email || 'cliente@ejemplo.com',
      address: pedido.direccion || 'Sin dirección',
      city_code: cfg.city_code || '11001',
      phone: pedido.telefono || ''
    },
    items,
    payment_form: cfg.payment_form || '1',
    payment_method: cfg.payment_method || '10',
    notes: `Pedido WhatsApp #${pedido.id}`
  };

  const resp = await fetch(`${FACTUS_BASE}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(`Factus: ${resp.status} ${JSON.stringify(data)}`);

  console.log('[FACTUS] Factura creada:', data.cufe || data.id);
  return { ok: true, cufe: data.cufe, id: data.id, qr: data.qr };
}

module.exports = { enviar: enviarFactus };