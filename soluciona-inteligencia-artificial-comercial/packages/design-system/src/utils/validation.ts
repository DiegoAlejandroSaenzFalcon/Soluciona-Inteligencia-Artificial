// @soluciona/design-system/src/utils/validation.ts
// Utilidades de validación - Zod helpers + validadores comunes

import { z } from 'zod';

/**
 * Esquemas base reutilizables
 */

// Email válido
export const emailSchema = z.string().email({ message: 'Email inválido' });

// Teléfono colombiano (10 dígitos)
export const phoneCOSchema = z.string()
  .regex(/^\d{10}$/, { message: 'Teléfono debe tener 10 dígitos' })
  .transform(v => `+57 ${v.slice(0, 3)} ${v.slice(3, 6)} ${v.slice(6)}`);

// NIT colombiano (9-10 dígitos, con o sin DV)
export const nitSchema = z.string()
  .regex(/^\d{9,10}$/, { message: 'NIT inválido (9-10 dígitos)' });

// Contraseña segura (mín 8 chars, mayúscula, minúscula, número, especial)
export const passwordSchema = z.string()
  .min(8, { message: 'Mínimo 8 caracteres' })
  .max(128, { message: 'Máximo 128 caracteres' })
  .regex(/[A-Z]/, { message: 'Debe tener al menos una mayúscula' })
  .regex(/[a-z]/, { message: 'Debe tener al menos una minúscula' })
  .regex(/[0-9]/, { message: 'Debe tener al menos un número' })
  .regex(/[^A-Za-z0-9]/, { message: 'Debe tener al menos un carácter especial' });

// Texto requerido no vacío
export const requiredString = (fieldName = 'Campo') =>
  z.string().min(1, { message: `${fieldName} es requerido` });

// Texto opcional con longitud máxima
export const optionalString = (maxLength: number, fieldName = 'Campo') =>
  z.string().max(maxLength, { message: `${fieldName} no puede exceder ${maxLength} caracteres` }).optional();

// Número positivo
export const positiveNumber = (fieldName = 'Valor') =>
  z.number().positive({ message: `${fieldName} debe ser positivo` });

// Entero positivo
export const positiveInt = (fieldName = 'Valor') =>
  z.number().int().positive({ message: `${fieldName} debe ser un entero positivo` });

// Rango de números
export const numberRange = (min: number, max: number, fieldName = 'Valor') =>
  z.number().min(min, { message: `${fieldName} debe ser al menos ${min}` })
    .max(max, { message: `${fieldName} no puede exceder ${max}` });

// UUID válido
export const uuidSchema = z.string().uuid({ message: 'ID inválido' });

// URL válida
export const urlSchema = z.string().url({ message: 'URL inválida' });

// Fecha ISO string
export const isoDateSchema = z.string().datetime({ message: 'Fecha inválida (formato ISO)' });

// Fecha en formato YYYY-MM-DD
export const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Formato YYYY-MM-DD' });

// Código de moneda ISO 4217
export const currencySchema = z.string().length(3, { message: 'Código de moneda debe ser 3 letras (ISO 4217)' }).toUpperCase();

// Código de país ISO 3166-1 alpha-2
export const countryCodeSchema = z.string().length(2, { message: 'Código de país debe ser 2 letras' }).toUpperCase();

// Color hex
export const hexColorSchema = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, { message: 'Color hex inválido (#RGB o #RRGGBB)' });

// Array no vacío
export const nonEmptyArray = <T>(itemSchema: z.ZodType<T>, fieldName = 'Lista') =>
  z.array(itemSchema).min(1, { message: `${fieldName} debe tener al menos un elemento` });

// Objeto con claves específicas
export const strictObject = <T extends z.ZodRawShape>(shape: T) =>
  z.object(shape).strict();

/**
 * Validadores personalizados
 */

// Verifica que un string no sea solo espacios
export const notOnlyWhitespace = (value: string) => value.trim().length > 0;

// Verifica longitud en bytes (para base64, etc.)
export const maxBytes = (maxBytes: number) => (value: string) => {
  const bytes = new TextEncoder().encode(value).length;
  return bytes <= maxBytes;
};

// Valida que una fecha no sea futura
export const notFutureDate = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return date <= new Date();
};

// Valida que una fecha no sea pasada
export const notPastDate = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return date >= new Date();
};

/**
 * Helpers para crear esquemas compuestos
 */

// Paginación estándar
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

// Filtros de búsqueda genéricos
export const searchFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional()
}).partial();

// Respuesta paginada tipada
export const createPaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    pagination: z.object({
      page: z.number().int().positive(),
      pageSize: z.number().int().positive(),
      total: z.number().int().nonnegative(),
      totalPages: z.number().int().nonnegative(),
      hasNext: z.boolean(),
      hasPrev: z.boolean()
    })
  });

/**
 * Type guards para runtime validation
 */
export function isValidEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

export function isValidPhoneCO(phone: string): boolean {
  return phoneCOSchema.safeParse(phone).success;
}

export function isValidNIT(nit: string): boolean {
  return nitSchema.safeParse(nit).success;
}

export function isValidUUID(uuid: string): boolean {
  return uuidSchema.safeParse(uuid).success;
}

export function isValidCOP(value: number): boolean {
  return value >= 0 && Number.isFinite(value);
}

/**
 * Utilidades de transformación
 */

// Normaliza email (lowercase, trim)
export const normalizeEmail = (email: string) => email.trim().toLowerCase();

// Normaliza teléfono (solo dígitos)
export const normalizePhone = (phone: string) => phone.replace(/\D/g, '');

// Normaliza NIT (solo dígitos)
export const normalizeNIT = (nit: string) => nit.replace(/\D/g, '');

// Genera slug desde string
export const generateSlug = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

// Genera ID único simple (nanoid-like)
export const generateId = (length = 21) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);
  for (let i = 0; i < length; i++) {
    result += alphabet[randomBytes[i] % alphabet.length];
  }
  return result;
};