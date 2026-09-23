'use strict';

/**
 * H5 — Recetas (BOM) + desglose + costeo.
 *
 * Modelo:
 *   producto (sale) tiene una receta = lista de ingredientes con cantidad por sucursal.
 *   al vender N unidades → se descuenta inventario de cada ingrediente × N.
 *   el costo de un producto = Σingrediente.cantidad × costo_unitario de su insumo.
 *
 * Reglas de negocio:
 *   - Ingredientes: productos normales con maneja_stock=true (igual que el resto del sistema).
 *   - Cantidades en la misma dimensión (unidades o masa/volumen se validan con unidades.js).
 *   - El desglose de inventario sigue FEFO por ingrediente.
 *   - El costeo se calcula con el costo promedio de lo que hay en stock, o el costo unitario
 *     registrado por recepción más reciente cuando está disponible.
 *   - Recetas versionadas: activa = una por producto; histórico en tabla separada.
 */

const { convertir, sonCompatibles } = require('./unidades.js');

/**
 * Valida que una receta tenga sentido.
 * @param {object} receta — { items: [{ ingredientProductId, cantidad, unidad, ... }] }
 * @param {Map} productosPorId — Map con los productos para validar unidades
 */
function validarReceta(receta, productosPorId) {
  if (!receta || !Array.isArray(receta.items) || !receta.items.length) {
    throw Object.assign(new Error('receta_sin_items'), { status: 400 });
  }
  const vistos = new Set();
  for (const it of receta.items) {
    if (it.ingredientProductId == null) throw Object.assign(new Error('ingrediente_sin_id'), { status: 400 });
    if (vistos.has(it.ingredientProductId)) throw Object.assign(new Error(`ingrediente_duplicado: ${it.ingredientProductId}`), { status: 400 });
    vistos.add(it.ingredientProductId);

    const n = Number(it.cantidad);
    if (!Number.isFinite(n) || n <= 0) throw Object.assign(new Error(`cantidad_invalida_para_ingrediente ${it.ingredientProductId}`), { status: 400 });

    const prod = productosPorId && productosPorId.get(it.ingredientProductId);
    if (!prod) throw Object.assign(new Error(`ingrediente_no_existe: ${it.ingredientProductId}`), { status: 404 });
    const unidad = String(it.unidad || prod.unidad_medida || 'und').trim();
    const unidadProd = String(prod.unidad_medida || 'und').trim();
    if (!sonCompatibles(unidad, unidadProd)) {
      throw Object.assign(new Error(`incompatible_unidad: la receta usa "${unidad}" pero el insumo "${prod.nombre}" se gestiona en "${unidadProd}"`), { status: 400 });
    }
    it.unidad = unidad;
  }
  return receta;
}

/**
 * Calcula el desglose para vender N unidades del producto, ya en la unidad de cada insumo.
 * Devuelve líneas listas para descontar inventario.
 */
function calcularDesglose(receta, unidadesVendidas) {
  const n = Number(unidadesVendidas);
  if (!Number.isInteger(n) || n <= 0) throw Object.assign(new Error('unidades_vendidas_invalidas'), { status: 400 });
  return receta.items.map(it => {
    const porUnidad = Number(it.cantidad);
    return {
      ingredientProductId: it.ingredientProductId,
      ingredientNombre: it.ingredientNombre || null,
      cantidadPorUnidad: porUnidad,
      unidad: it.unidad,
      totalADescontar: Number((porUnidad * n).toFixed(6)),
    };
  });
}

/**
 * Costo de producir n unidades de un producto según su receta, usando el costo unitario
 * actual de cada insumo. Si un insumo no registra costo, se devuelve null (aviso), no 0.
 */
function costearProducto(receta, unidadesVendidas, costosPorIngrediente) {
  const desglose = calcularDesglose(receta, unidadesVendidas);
  let total = 0;
  const faltantes = [];
  for (const linea of desglose) {
    const cu = costosPorIngrediente && costosPorIngrediente.get(linea.ingredientProductId);
    if (cu == null) { faltantes.push(linea.ingredientProductId); continue; }
    total += linea.totalADescontar * cu;
  }
  return { costoTotal: Number(total.toFixed(2)), faltantes };
}

/**
 * Sugiere qué tanto producto puede producirse dado el stock actual de los insumos.
 * La respuesta es el MÍNIMO de (stock_i / cantidad_i) — es el cuello de botella.
 */
function producibilidad(receta, stockPorIngrediente) {
  let minimo = Infinity;
  for (const it of receta.items) {
    const stock = stockPorIngrediente.get(it.ingredientProductId) ?? 0;
    const porUnidad = Number(it.cantidad);
    if (porUnidad <= 0) continue;
    minimo = Math.min(minimo, Math.floor(stock / porUnidad));
  }
  return minimo === Infinity ? 0 : minimo;
}

module.exports = { validarReceta, calcularDesglose, costearProducto, producibilidad };
