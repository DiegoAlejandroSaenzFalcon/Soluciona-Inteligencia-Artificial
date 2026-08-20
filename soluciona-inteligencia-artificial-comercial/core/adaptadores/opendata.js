const { config } = require('../../config');

const OPENDATA_BASE = 'https://api.opendata.com.co/v1';

async function getOpenDataToken(cfg) {
  const resp = await fetch(`${OPENDATA_BASE}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: cfg.api_key, secret_key: cfg.secret_key })
  });
  if (!resp.ok) throw new Error(`OpenData auth: ${resp.status}`);
  const data = await resp.json();
  return data.token;
}

async function enviarOpenData(payload, cfg) {
  const { pedido } = payload;
  const token = await getOpenDataToken(cfg);

  const items = pedido.items.map((item, idx) => ({
    codigo: item.producto,
    descripcion: item.producto,
    cantidad: item.cantidad,
    precio_unitario: item.precioUnitario,
    iva: 19,
    unidad: '94'
  }));

  const body = {
    tipo_documento: '01',
    prefijo: cfg.prefijo || 'SETP',
    numero: pedido.id.toString(),
    fecha: new Date().toISOString().slice(0, 10),
    cliente: {
      tipo_id: cfg.cliente_tipo_id || '31',
      identificacion: pedido.telefono || '222222222222',
      nombre: pedido.remitente || 'Cliente Genérico',
      email: cfg.cliente_email || 'cliente@ejemplo.com',
      direccion: pedido.direccion || 'Sin dirección',
      ciudad: cfg.cliente_ciudad || '11001'
    },
    items,
    forma_pago: cfg.forma_pago || '1',
    metodo_pago: cfg.metodo_pago || '10'
  };

  const resp = await fetch(`${OPENDATA_BASE}/facturas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(`OpenData: ${resp.status} ${JSON.stringify(data)}`);

  console.log('[OPENDATA] Factura creada:', data.cufe || data.id);
  return { ok: true, cufe: data.cufe, id: data.id, qr: data.qr };
}

module.exports = { enviar: enviarOpenData };