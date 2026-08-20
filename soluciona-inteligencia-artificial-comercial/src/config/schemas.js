'use strict';
const { z } = require('zod');

// ============================================================
// Secciones de configuración (alineadas con config_section enum)
// ============================================================
const SECTIONS = ['negocio', 'menu', 'ia', 'domicilios', 'pagos', 'nomina', 'bi', 'integraciones', 'notificaciones'];

// Qué claves top-level de config.json pertenecen a cada sección
const SECTION_KEYS = {
  negocio: ['negocio', 'segmento', 'ciiu', 'moneda', 'hora_reporte', 'puerto', 'numero_dueno', 'horario', 'ubicacion_negocio'],
  menu: ['menu', 'productos'],
  ia: ['llm', 'asistentes_ia', 'vision', 'gemini_model'],
  domicilios: ['domicilios', 'pregunta_direccion'],
  pagos: ['facturacion'],
  notificaciones: ['mensaje_bienvenida', 'mensaje_fallback', 'agencias_categorias', 'max_unidades_confirmar'],
  nomina: ['nomina'],
  bi: ['bi'],
  integraciones: ['integraciones'],
};

const faixaSchema = z.object({
  hasta_km: z.number().positive(),
  tipo: z.enum(['gratis', 'fijo', 'por_km']),
  valor: z.number().nonnegative(),
  minimo: z.number().nonnegative().optional(),
  pedido_minimo: z.number().nonnegative().optional(),
}).passthrough();

const SCHEMAS = {
  negocio: z.object({
    negocio: z.string().min(1).max(150),
    segmento: z.enum(['comidas', 'salud', 'retail', 'belleza', 'profesionales', 'educacion', 'automotriz', 'inmobiliaria', 'turismo', 'logistica', 'mantenimiento', 'financieros']).optional(),
    ciiu: z.string().regex(/^\d{2,4}$/).optional(),
    moneda: z.string().min(1).max(5).optional(),
    hora_reporte: z.string().regex(/^\d{1,2}:\d{2}$/).optional(),
    puerto: z.number().int().min(1).max(65535).optional(),
    numero_dueno: z.string().regex(/^\d{9,15}$/).optional(),
    horario: z.string().max(200).optional(),
    ubicacion_negocio: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }).passthrough().optional(),
  }).passthrough(),

  menu: z.object({
    menu: z.object({
      url: z.string().url().optional().or(z.literal('')),
      imagenes: z.array(z.string()).optional(),
      color: z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i).optional(),
      logo: z.string().optional(),
    }).passthrough().optional(),
    productos: z.array(z.object({
      nombre: z.string().min(1),
      alias: z.array(z.string()).optional(),
      precio: z.number().positive(),
      ingredientes: z.string().optional(),
      categoria: z.string().optional(),
    }).passthrough()).optional(),
  }).passthrough(),

  ia: z.object({
    llm: z.object({
      proveedor: z.string().optional(),
      base_url: z.string().url().optional(),
      modelo: z.string().optional(),
      limite_diario: z.number().int().nonnegative().optional(),
      limite_mensual: z.number().int().nonnegative().optional(),
    }).passthrough().optional(),
    asistentes_ia: z.object({
      modelo: z.string().optional(),
      limite_diario: z.number().int().nonnegative().optional(),
      limite_mensual: z.number().int().nonnegative().optional(),
    }).passthrough().optional(),
    vision: z.object({
      modelo: z.string().optional(),
      limite_diario: z.number().int().nonnegative().optional(),
      limite_mensual: z.number().int().nonnegative().optional(),
    }).passthrough().optional(),
    gemini_model: z.string().optional(),
  }).passthrough(),

  domicilios: z.object({
    domicilios: z.object({
      faixas: z.array(faixaSchema).optional(),
      radio_max_entrega_km: z.number().nonnegative().optional(),
      gratis_si_total_sobre: z.number().nonnegative().optional(),
    }).passthrough().optional(),
    pregunta_direccion: z.string().max(300).optional(),
  }).passthrough(),

  pagos: z.object({
    facturacion: z.object({
      proveedor: z.string().optional(),
      emision_automatica: z.boolean().optional(),
      estado_dispara: z.string().optional(),
      enviar_mail: z.boolean().optional(),
      email_remitente: z.string().email().optional().or(z.literal('')),
      email_cliente: z.string().email().optional().or(z.literal('')),
    }).passthrough().optional(),
  }).passthrough(),

  notificaciones: z.object({
    mensaje_bienvenida: z.string().max(2000).optional(),
    mensaje_fallback: z.string().max(2000).optional(),
    agencias_categorias: z.array(z.string()).optional(),
    max_unidades_confirmar: z.number().int().positive().optional(),
  }).passthrough(),

  nomina: z.record(z.unknown()),
  bi: z.record(z.unknown()),
  integraciones: z.record(z.unknown()),
};

function getSectionKeys(section) {
  return SECTION_KEYS[section] || [];
}

function validateSection(section, payload) {
  const schema = SCHEMAS[section];
  if (!schema) return { error: 'seccion_invalida' };
  const result = schema.safeParse(payload);
  if (!result.success) {
    return {
      error: 'validacion',
      issues: result.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
    };
  }
  return { data: result.data };
}

module.exports = { SECTIONS, SECTION_KEYS, SCHEMAS, getSectionKeys, validateSection };