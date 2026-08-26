import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const CustomerSchema = z.object({
  tipoIdentificacion: z.string().regex(/^(13|22|31|41|42|43|50|91)$/, 'Tipo identificación inválido'),
  identificacion: z.string().min(5, 'Identificación muy corta').max(20),
  nombre: z.string().min(2, 'Nombre muy corto').max(100),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  municipio: z.string().optional(),
  departamento: z.string().optional(),
  tipoIdentificacion: z.string().regex(/^(13|22|31|41|42|43|50|91)$/).default('31')
});

const InvoiceSchema = z.object({
  tipoDocumento: z.enum(['01', '02', '03', '04', '05']),
  prefijo: z.string().length(2, 'Prefijo debe tener 2 caracteres').regex(/^[A-Z]{2}$/, 'Prefijo debe ser 2 letras mayúsculas'),
  numero: z.number().int().positive(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha formato YYYY-MM-DD'),
  hora: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, 'Hora formato HH:MM:SS'),
  cliente: z.object({
    tipoIdentificacion: z.string().regex(/^(13|22|31|41|42|43|50|91)$/),
    identificacion: z.string().min(5).max(20),
    nombre: z.string().min(2).max(100),
    email: z.string().email().optional().or(z.literal('')),
    direccion: z.string().optional(),
    municipio: z.string().optional(),
    departamento: z.string().optional()
  }),
  items: z.array(z.object({
    descripcion: z.string().min(1).max(200),
    cantidad: z.number().positive(),
    precioUnitario: z.number().min(0),
    taxId: z.enum(['01', '03', '04']).default('01'),
    taxRate: z.number().min(0).max(100).default(19)
  })).min(1, 'Al menos un item requerido'),
  metodoPago: z.enum(['1', '2', '3', '4', '5', '6', '7']).default('1'),
  formaPago: z.enum(['1', '2', '3', '4', '5', '6']).default('1')
});

describe('Accounting - Customer Validation', () => {
  it('should validate valid customer', () => {
    const validCustomer = {
      tipoIdentificacion: '31',
      identificacion: '900123456',
      nombre: 'Empresa Ejemplo SAS',
      email: 'contacto@ejemplo.com',
      telefono: '3001234567',
      direccion: 'Calle 123 #45-67',
      municipio: '11001',
      departamento: '11'
    };
    const result = CustomerSchema.safeParse(validCustomer);
    expect(result.success).toBe(true);
  });

  it('should reject invalid tipoIdentificacion', () => {
    const invalidCustomer = {
      tipoIdentificacion: '99',
      identificacion: '900123456',
      nombre: 'Test'
    };
    const result = CustomerSchema.safeParse(invalidCustomer);
    expect(result.success).toBe(false);
    expect(result.error.errors[0].message).toBe('Tipo identificación inválido');
  });

  it('should reject invalid email', () => {
    const invalidCustomer = {
      tipoIdentificacion: '31',
      identificacion: '900123456',
      nombre: 'Test',
      email: 'not-an-email'
    };
    const result = CustomerSchema.safeParse(invalidCustomer);
    expect(result.success).toBe(false);
    expect(result.error.errors[0].message).toBe('Email inválido');
  });
});

describe('Accounting - Invoice Validation', () => {
  it('should validate valid invoice', () => {
    const validInvoice = {
      tipoDocumento: '01',
      prefijo: 'SE',
      numero: 123,
      fecha: '2024-01-15',
      hora: '14:30:00',
      cliente: {
        tipoIdentificacion: '31',
        identificacion: '900123456',
        nombre: 'Cliente Test',
        email: 'cliente@test.com',
        direccion: 'Calle 123',
        municipio: '11001',
        departamento: '11'
      },
      items: [
        {
          descripcion: 'Producto A',
          cantidad: 2,
          precioUnitario: 50000,
          taxId: '01',
          taxRate: 19
        }
      ],
      metodoPago: '1',
      formaPago: '1'
    };
    const result = InvoiceSchema.safeParse(validInvoice);
    expect(result.success).toBe(true);
  });

  it('should reject invoice without items', () => {
    const invalidInvoice = {
      tipoDocumento: '01',
      prefijo: 'SE',
      numero: 123,
      fecha: '2024-01-15',
      hora: '14:30:00',
      cliente: {
        tipoIdentificacion: '31',
        identificacion: '900123456',
        nombre: 'Cliente Test'
      },
      items: []
    };
    const result = InvoiceSchema.safeParse(invalidInvoice);
    expect(result.success).toBe(false);
    expect(result.error.errors[0].message).toBe('Al menos un item requerido');
  });

  it('should reject invalid prefijo', () => {
    const invalidInvoice = {
      tipoDocumento: '01',
      prefijo: 'se', // lowercase
      numero: 123,
      fecha: '2024-01-15',
      hora: '14:30:00',
      cliente: {
        tipoIdentificacion: '31',
        identificacion: '900123456',
        nombre: 'Cliente Test'
      },
      items: [{ descripcion: 'Test', cantidad: 1, precioUnitario: 10000 }]
    };
    const result = InvoiceSchema.safeParse(invalidInvoice);
    expect(result.success).toBe(false);
    expect(result.error.errors[0].message).toBe('Prefijo debe ser 2 letras mayúsculas');
  });

  it('should reject invalid fecha format', () => {
    const invalidInvoice = {
      tipoDocumento: '01',
      prefijo: 'SE',
      numero: 123,
      fecha: '15-01-2024', // wrong format
      hora: '14:30:00',
      cliente: {
        tipoIdentificacion: '31',
        identificacion: '900123456',
        nombre: 'Cliente Test'
      },
      items: [{ descripcion: 'Test', cantidad: 1, precioUnitario: 10000 }]
    };
    const result = InvoiceSchema.safeParse(invalidInvoice);
    expect(result.success).toBe(false);
    expect(result.error.errors[0].message).toBe('Fecha formato YYYY-MM-DD');
  });
});