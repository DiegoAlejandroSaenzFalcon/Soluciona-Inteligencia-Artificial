const fs = require('fs');
const path = require('path');
const { config } = require('../config');

// Importar adaptadores POS
const { enviarFactura: enviarDianGratuito } = require('./adaptadores/dian-gratuito');
const { enviar: enviarFactus } = require('./adaptadores/factus');
const { enviar: enviarAlanube } = require('./adaptadores/alanube');
const { enviar: enviarOpenData } = require('./adaptadores/opendata');
const { enviar: enviarDianPropio } = require('./adaptadores/dian-propio');

// ============================================================
// FRAMEWORK DE INTEGRACIÓN POS — pluggable por adaptador
// ============================================================
// Cada negocio define en su config:  "integracion": { "tipo": "alegra", ... }
// El contrato estándar de pedido (pedidoEstandar) es lo que cada
// adaptador traduce al formato del POS destino.
//
// Cómo agregar un POS nuevo (ej: "factus", "anota", "elypsis"):
//   1. Crea un archivo en core/adaptadores/<nombre>.js con:
//      async function enviar(pedido, cfg) { ... return true/false }
//      module.exports = { tipo: '<nombre>', enviar }
//   2. Regístralo en REGISTRO abajo (import + push).
//   3. En el config del cliente: "integracion": { "tipo": "<nombre>", ...claves del POS }
//   4. Documenta las claves en docs/INTEGRACION.md.

// Contrato estándar de pedido: formato común que cualquier POS puede consumir.
function pedidoEstandar(pedido) {
  return {
    cliente: config.clienteId,
    negocio: config.nombreNegocio(),
    recibido: new Date().toISOString(),
    pedido: {
      id: pedido.id,
      fecha: pedido.fecha,
      dia: pedido.dia,
      remitente: pedido.remitente,
      telefono: pedido.telefono,
      items: (pedido.items || []).map(i => ({
        producto: i.producto,
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
        subtotal: i.subtotal
      })),
      total: pedido.total,
      direccion: pedido.direccion || '',
      lat: pedido.lat || '',
      lng: pedido.lng || '',
      estado: pedido.estado || 'recibido'
    }
  };
}

// ---------- Adaptadores ----------

// POS propio (nativo): el pedido ya quedó registrado en SQLite y visible en el
// panel y en la cocina (KDS). Este adaptador representa ese POS integrado.
async function enviarPosPropio(payload, cfg) {
  console.log(`[POS] Pedido #${payload.pedido.id} registrado en el POS propio (panel + cocina).`);
  return true;
}

async function enviarWebhook(payload, cfg) {
  const headers = { 'Content-Type': 'application/json' };
  if (cfg.token) headers['Authorization'] = `Bearer ${cfg.token}`;
  if (cfg.header && cfg.valor) headers[cfg.header] = cfg.valor;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), cfg.timeout || 8000);
  try {
    const resp = await fetch(cfg.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    if (!resp.ok) {
      console.error(`[INTEGRACION] webhook devolvió ${resp.status} para pedido #${payload.pedido.id}`);
      return false;
    }
    console.log(`[INTEGRACION] webhook OK pedido #${payload.pedido.id} -> ${cfg.url}`);
    return true;
  } catch (e) {
    console.error('[INTEGRACION] webhook falló:', e.message || e);
    return false;
  } finally {
    clearTimeout(t);
  }
}

async function enviarArchivo(payload, cfg) {
  const salida = cfg.salida
    ? (path.isAbsolute(cfg.salida) ? cfg.salida : path.join(config.dataDir, cfg.salida))
    : path.join(config.dataDir, 'integracion.jsonl');
  fs.appendFileSync(salida, JSON.stringify(payload) + '\n', 'utf8');
  console.log(`[INTEGRACION] archivo OK pedido #${payload.pedido.id} -> ${salida}`);
  return true;
}

async function enviarTelegram(payload, cfg) {
  const p = payload.pedido;
  const lineas = p.items.map(i => `• ${i.cantidad} x ${i.producto} = ${config.moneda}${i.subtotal.toLocaleString('es-CO')}`).join('\n');
  const texto = `📦 Nuevo pedido #${p.id} (${config.nombreNegocio()})\n${lineas}\n💰 Total: ${config.moneda}${p.total.toLocaleString('es-CO')}\n📍 ${p.direccion || 'Recoge en local'} | 📞 ${p.telefono}`;
  const resp = await fetch(`https://api.telegram.org/bot${cfg.token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: cfg.chat_id, text: texto })
  });
  if (!resp.ok) {
    console.error(`[INTEGRACION] telegram devolvió ${resp.status}`);
    return false;
  }
  console.log(`[INTEGRACION] telegram OK pedido #${p.id}`);
  return true;
}

// Siigo Nube — API oficial (docs: developers.siigo.com)
async function enviarSiigo(payload, cfg) {
  const p = payload.pedido;
  const base = cfg.base_url || 'https://api.siigo.com';
  const auth = await fetch(`${base}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Partner-Id': cfg.partner_id || '' },
    body: JSON.stringify({ username: cfg.username, access_key: cfg.access_key })
  });
  if (!auth.ok) {
    console.error(`[SIIGO] auth devolvió ${auth.status}`);
    return false;
  }
  const { access_token } = await auth.json();
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${access_token}`,
    'Partner-Id': cfg.partner_id || ''
  };
  const pago = cfg.payment_id
    ? [{ id: cfg.payment_id, value: p.total, due_date: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10) }]
    : [];
  const body = {
    document: { id: cfg.document_id },
    date: new Date().toISOString().slice(0, 10),
    customer: { identification: cfg.customer_identification || p.telefono || '' },
    items: p.items.map(i => ({
      code: cfg.codigos_productos && cfg.codigos_productos[i.producto] || i.producto,
      quantity: i.cantidad,
      price: i.precioUnitario,
      taxes: cfg.tax_id ? [{ id: cfg.tax_id }] : []
    })),
    payments: pago,
    stamp: { send: !!cfg.stamp_dian },
    mail: { send: !!cfg.enviar_mail }
  };
  const resp = await fetch(`${base}/v1/invoices`, {
    method: 'POST', headers, body: JSON.stringify(body)
  });
  const texto = await resp.text();
  if (!resp.ok) {
    console.error(`[SIIGO] factura devolvió ${resp.status}: ${texto.slice(0, 400)}`);
    return false;
  }
  console.log(`[SIIGO] factura creada pedido #${p.id} -> ${texto.slice(0, 200)}`);
  return true;
}

// Alegra (Colombia) — API oficial (docs: developer.alegra.com)
async function enviarAlegra(payload, cfg) {
  const p = payload.pedido;
  const base = cfg.base_url || 'https://api.alegra.com';
  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Basic ' + Buffer.from(`${cfg.email}:${cfg.token}`).toString('base64')
  };
  // 1) Busca o crea el cliente por identificación
  let clientId = null;
  const q = await fetch(`${base}/api/v1/contacts?identification=${encodeURIComponent(cfg.customer_identification || p.telefono || '')}`, { headers });
  if (q.ok) {
    const lista = await q.json();
    clientId = lista && lista[0] && lista[0].id ? lista[0].id : null;
  }
  if (!clientId) {
    const cc = await fetch(`${base}/api/v1/contacts`, {
      method: 'POST', headers,
      body: JSON.stringify({
        name: { firstName: p.remitente || 'Cliente', lastName: '' },
        kindOfPerson: 'PERSON_ENTITY',
        regime: cfg.regime || 'SIMPLIFIED_REGIME',
        identificationObject: {
          type: cfg.id_type || 'CC',
          number: cfg.customer_identification || p.telefono || '000000'
        },
        type: ['client']
      })
    });
    const c = await cc.json();
    clientId = c && c.id ? c.id : null;
  }
  const items = [];
  for (const i of p.items) {
    let itemId = cfg.codigos_productos && cfg.codigos_productos[i.producto];
    if (!itemId) {
      const it = await fetch(`${base}/api/v1/items?query=${encodeURIComponent(i.producto)}`, { headers });
      const l = await it.json();
      itemId = l && l[0] && l[0].id ? l[0].id : null;
    }
    if (!itemId) {
      const nc = await fetch(`${base}/api/v1/items`, {
        method: 'POST', headers,
        body: JSON.stringify({ name: i.producto, price: i.precioUnitario, type: 'product', tax: cfg.tax_id ? [{ id: cfg.tax_id }] : [] })
      });
      const n = await nc.json();
      itemId = n && n.id ? n.id : null;
    }
    items.push({ id: itemId, price: i.precioUnitario, quantity: i.cantidad });
  }
  const body = {
    date: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
    client: clientId || '',
    items,
    paymentForm: cfg.payment_form || 'CASH',
    status: 'open',
    stamp: cfg.stamp_dian ? { generateStamp: true } : undefined
  };
  const resp = await fetch(`${base}/api/v1/invoices`, {
    method: 'POST', headers, body: JSON.stringify(body)
  });
  const texto = await resp.text();
  if (!resp.ok) {
    console.error(`[ALEGRA] factura devolvió ${resp.status}: ${texto.slice(0, 400)}`);
    return false;
  }
  console.log(`[ALEGRA] factura creada pedido #${p.id} -> ${texto.slice(0, 200)}`);
  return true;
}

// Registro de adaptadores: agrega aquí cada POS nuevo.
const REGISTRO = {
  'pos-propio': { enviar: enviarPosPropio },
  webhook: { enviar: enviarWebhook },
  archivo: { enviar: enviarArchivo },
  telegram: { enviar: enviarTelegram },
  siigo: { enviar: enviarSiigo },
  alegra: { enviar: enviarAlegra },
  factus: { enviar: enviarFactus },
  alanube: { enviar: enviarAlanube },
  opendata: { enviar: enviarOpenData },
  'dian-gratuito': { enviar: enviarDianGratuito },
  'dian-propio': { enviar: enviarDianPropio }
};

// Despacha el pedido al destino configurado. Si no hay integración o es 'kds'/'none',
// el pedido ya quedó guardado en SQLite (nuestro propio panel/KDS lo lee).
async function enviarPedido(pedido) {
  const cfg = config.integracion;
  if (!cfg || !cfg.tipo || cfg.tipo === 'kds' || cfg.tipo === 'none' || cfg.tipo === 'pos-propio') return;
  const adaptador = REGISTRO[cfg.tipo];
  if (!adaptador) {
    console.warn(`[INTEGRACION] tipo desconocido: ${cfg.tipo} (pos-propio | webhook | archivo | telegram | siigo | alegra | factus | alanube | opendata | dian-gratuito)`);
    return;
  }
  const payload = pedidoEstandar(pedido);
  try {
    await adaptador.enviar(payload, cfg);
  } catch (e) {
    console.error(`[INTEGRACION] falló envío (${cfg.tipo}):`, e && e.message ? e.message : e);
  }
}

module.exports = { enviarPedido, pedidoEstandar, REGISTRO };