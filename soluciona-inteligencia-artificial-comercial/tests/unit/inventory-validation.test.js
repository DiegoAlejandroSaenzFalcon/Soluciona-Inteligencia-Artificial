import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

// Test schemas for input validation (using zod as used in the project)
const ProductSchema = z.object({
  nombre: z.string({ required_error: 'Nombre requerido' }).min(1, 'Nombre requerido').max(100),
  precio: z.number().positive('Precio debe ser positivo'),
  stockMinimo: z.number().min(0).default(0),
  stockMaximo: z.number().min(0).optional(),
  codigo: z.string().optional(),
  taxId: z.string().regex(/^(01|03|04)$/, 'Código impuesto inválido').default('01'),
  taxRate: z.number().min(0).max(100, 'taxRate debe estar entre 0 y 100').default(19)
});

const InventoryItemSchema = z.object({
  productId: z.number().int().positive(),
  cantidad: z.number().positive('Cantidad debe ser positiva'),
  precioUnitario: z.number().positive('Precio debe ser positivo'),
  taxId: z.string().regex(/^(01|03|04)$/).default('01'),
  taxRate: z.number().min(0).max(100).default(19)
});

describe('Inventory - Input Validation', () => {
  it('should validate valid product', () => {
    const validProduct = {
      nombre: 'Producto Test',
      precio: 10000,
      stockMinimo: 5,
      stockMaximo: 100,
      codigo: 'PROD-001',
      taxId: '01',
      taxRate: 19
    };
    const result = ProductSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  it('should reject product without nombre', () => {
    const invalidProduct = {
      precio: 10000
    };
    const result = ProductSchema.safeParse(invalidProduct);
    expect(result.success).toBe(false);
    expect(result.error.errors[0].message).toBe('Nombre requerido');
  });

  it('should reject negative precio', () => {
    const invalidProduct = {
      nombre: 'Test',
      precio: -100
    };
    const result = ProductSchema.safeParse(invalidProduct);
    expect(result.success).toBe(false);
    expect(result.error.errors[0].message).toBe('Precio debe ser positivo');
  });

  it('should reject invalid taxId', () => {
    const invalidProduct = {
      nombre: 'Test',
      precio: 10000,
      taxId: '99'
    };
    const result = ProductSchema.safeParse(invalidProduct);
    expect(result.success).toBe(false);
    expect(result.error.errors[0].message).toBe('Código impuesto inválido');
  });

  it('should reject taxRate out of range', () => {
    const invalidProduct = {
      nombre: 'Test',
      precio: 10000,
      taxRate: 150
    };
    const result = ProductSchema.safeParse(invalidProduct);
    expect(result.success).toBe(false);
    expect(result.error.errors[0].message).toContain('taxRate');
  });
});

describe('Inventory - Item Validation', () => {
  it('should validate valid inventory item', () => {
    const validItem = {
      productId: 1,
      cantidad: 5,
      precioUnitario: 10000,
      taxId: '01',
      taxRate: 19
    };
    const result = InventoryItemSchema.safeParse(validItem);
    expect(result.success).toBe(true);
  });

  it('should reject zero or negative cantidad', () => {
    const invalidItem = {
      productId: 1,
      cantidad: 0,
      precioUnitario: 10000
    };
    const result = InventoryItemSchema.safeParse(invalidItem);
    expect(result.success).toBe(false);
    expect(result.error.errors[0].message).toBe('Cantidad debe ser positiva');
  });
});