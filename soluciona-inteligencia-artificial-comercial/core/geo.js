const EARTH_RADIUS_KM = 6371;

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function validarUbicacion(u) {
  if (!u || u.lat == null || u.lng == null) return false;
  const lat = toNum(u.lat);
  const lng = toNum(u.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 &&
    !(lat === 0 && lng === 0);
}

function rad(deg) {
  return (deg * Math.PI) / 180;
}

function distanciaHaversine(lat1, lng1, lat2, lng2) {
  const dLat = rad(toNum(lat2) - toNum(lat1));
  const dLng = rad(toNum(lng2) - toNum(lng1));
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(toNum(lat1))) * Math.cos(rad(toNum(lat2))) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

// Caché LRU simple de rutas OSRM (evita llamar a la API por coordenadas repetidas).
const cacheOSRM = new Map();
const CACHE_MAX = 300;

async function distanciaRutaOSRM(lat1, lng1, lat2, lng2) {
  const key = [toNum(lat1).toFixed(6), toNum(lng1).toFixed(6), toNum(lat2).toFixed(6), toNum(lng2).toFixed(6)].join(',');
  if (cacheOSRM.has(key)) return cacheOSRM.get(key);
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${toNum(lng1)},${toNum(lat1)};${toNum(lng2)},${toNum(lat2)}?overview=false`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const resp = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'soluciona-inteligencia-artificial-comercial' } });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    const data = await resp.json();
    const km = data && data.routes && data.routes[0] ? data.routes[0].distance / 1000 : null;
    if (km && km > 0) {
      cacheOSRM.set(key, km);
      if (cacheOSRM.size > CACHE_MAX) cacheOSRM.delete(cacheOSRM.keys().next().value);
    }
    return km;
  } catch {
    return null;
  }
}

async function distanciaRuta(lat1, lng1, lat2, lng2) {
  const ruta = await distanciaRutaOSRM(lat1, lng1, lat2, lng2);
  if (ruta != null && ruta > 0) return ruta;
  return distanciaHaversine(lat1, lng1, lat2, lng2);
}

// Calcula el costo de domicilio según las "faixas" de kilómetros configuradas.
// cfg = config.domicilios { faixas, radio_max_entrega_km, gratis_si_total_sobre }
// Devuelve { distancia, costo, faixa, fuera_radio }
function costoDomicilio(cfg, distanciaKm, subtotal) {
  const distancia = Math.max(0, toNum(distanciaKm));
  const C = cfg || {};
  const faixas = Array.isArray(C.faixas) ? C.faixas.filter(f => f && toNum(f.hasta_km) > 0) : [];
  const radio = toNum(C.radio_max_entrega_km);
  if (radio > 0 && distancia > radio) {
    return { distancia, costo: null, faixa: null, fuera_radio: true };
  }
  const faixa = faixas.find(f => distancia <= toNum(f.hasta_km)) || null;
  if (!faixa) {
    return { distancia, costo: null, faixa: null, fuera_radio: true };
  }
  const pedidoMin = toNum(faixa.pedido_minimo);
  if (pedidoMin > 0 && toNum(subtotal) > 0 && toNum(subtotal) < pedidoMin) {
    return { distancia, costo: null, faixa, fuera_radio: true, motivo: 'pedido_minimo' };
  }
  let costo = 0;
  const tipo = (faixa.tipo || 'fijo').toLowerCase();
  if (tipo === 'por_km') {
    const valorKm = toNum(faixa.valor);
    costo = Math.ceil(distancia * valorKm);
    if (costo < valorKm) costo = valorKm;
    if (toNum(faixa.minimo) > 0 && costo < toNum(faixa.minimo)) costo = toNum(faixa.minimo);
  } else if (tipo === 'fijo') {
    costo = toNum(faixa.valor);
  }
  const gratisTotal = toNum(C.gratis_si_total_sobre);
  if (gratisTotal > 0 && toNum(subtotal) >= gratisTotal && costo > 0) costo = 0;
  return { distancia, costo, faixa, fuera_radio: false };
}

module.exports = {
  validarUbicacion,
  distanciaHaversine,
  distanciaRuta,
  distanciaRutaOSRM,
  costoDomicilio
};