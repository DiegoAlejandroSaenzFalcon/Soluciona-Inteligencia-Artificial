const { config } = require('../config.js');
const db = require('./db.js');

// ============================================================
// FACTURACIÓN ELECTRÓNICA (DIAN) — genérica y por proveedor
// ============================================================
// En Colombia la emisión de factura electrónica 2.1 va SIEMPRE por un
// proveedor tecnológico habilitado ante la DIAN (Alegra, Siigo, Factus,
// Alanube, OpenData, General Systems...). No hay API pública de la DIAN.
//
// Este módulo define el contrato único para emitir facturas desde un
// pedido registrado, sin importar el proveedor:
//
//   "facturacion": {
//     "proveedor": "alegra",            // alegra | siigo | factus | ... (nombre del adaptador)
//     "emision_automatica": true,       // false = solo cuando cambie estado_pago a 'pagado'
//     "estado_dispara": "pagado",       // estado_pago que dispara la factura
//     "retenciones_automaticas": false  // true si el proveedor las calcula solo
//   }
//
// La emisión usa el MISMO framework de integración (core/integracion.js):
// cada adaptador (alegra/siigo/...) ya sabe poner stamp: {send:true} /
// {generateStamp:true} para enviar a la DIAN. Si el proveedor no está
// registrado ahí, se puede dejar una cola pendiente y exportar.
//
// Requisitos previos del negocio (se configuran en el panel del proveedor,
// no por API):
//   - Habilitación DIAN (RUT resp. 52, ambiente de habilitación, pruebas).
//   - Firma electrónica y numeración/resolución asociada.

const PENDIENTES_FILE = null; // las pendientes viven en SQLite (estado_pago + columna factura)

function configFacturacion() {
  return config.facturacion || null;
}

// Estado de un pedido respecto a facturación.
function estadoFactura(pedido) {
  const fc = configFacturacion();
  if (!fc || !fc.proveedor) return 'no_configurado';
  if (pedido.factura_emitida) return 'emitida';
  if (fc.emision_automatica && (!fc.estado_dispara || pedido.estado_pago === fc.estado_dispara)) return 'pendiente_emision';
  return 'pendiente_manual';
}

// Intenta emitir la factura de un pedido con el proveedor configurado.
// Devuelve { ok, facturaId, error }.
async function emitirFactura(pedido) {
  const fc = configFacturacion();
  if (!fc || !fc.proveedor) return { ok: false, error: 'facturación no configurada' };
  const { REGISTRO } = require('./integracion.js');
  const adaptador = REGISTRO[fc.proveedor];
  if (!adaptador) return { ok: false, error: `proveedor "${fc.proveedor}" no registrado` };

  const cfg = {
    ...(config.integracion && config.integracion.tipo === fc.proveedor ? config.integracion : {}),
    ...(fc.cfg || {}),
    stamp_dian: true,
    enviar_mail: fc.enviar_mail !== false
  };
  try {
    const payload = {
      cliente: config.clienteId,
      negocio: config.negocio,
      recibido: new Date().toISOString(),
      pedido
    };
    const ok = await adaptador.enviar(payload, cfg);
    if (ok) {
      db.patchPedido(pedido.id, {
        factura_emitida: new Date().toISOString(),
        factura_proveedor: fc.proveedor
      });
      return { ok: true, facturaId: pedido.id };
    }
    return { ok: false, error: 'el proveedor no confirmó la factura' };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
}

// Al cobrar/confirmar un pedido, dispara la factura si está configurada
// la emisión automática. Se llama al marcar "entregado" (o pagado) desde
// el panel/KDS.
async function intentarEmitirAlCobrar(pedido) {
  const fc = configFacturacion();
  if (!fc || !fc.proveedor || !fc.emision_automatica) return;
  if (pedido.factura_emitida) return;
  if (fc.estado_dispara && pedido.estado_pago !== fc.estado_dispara && pedido.estado !== fc.estado_dispara) return;
  const r = await emitirFactura(pedido);
  console.log(r.ok
    ? `[FACTURA] Pedido #${pedido.id} facturado con ${fc.proveedor}.`
    : `[FACTURA] Pedido #${pedido.id} sin facturar: ${r.error}`);
  return r;
}

// Lista pedidos sin facturar (para el panel / reporte).
function pendientesDeFacturar() {
  const fc = configFacturacion();
  if (!fc || !fc.proveedor) return [];
  return db.leerPedidos().filter(p => !p.factura_emitida);
}

module.exports = {
  configFacturacion, estadoFactura, emitirFactura,
  intentarEmitirAlCobrar, pendientesDeFacturar
};
