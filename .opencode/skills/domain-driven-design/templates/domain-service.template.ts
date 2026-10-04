/**
 * Domain Service Template - DDD
 * Ubicación: src/domain/services/<service-name>.service.ts
 * 
 * Reglas:
 * - Lógica de negocio que NO pertenece a una sola entidad
 * - Operaciones cross-aggregate
 * - Coordinación entre múltiples entidades/value objects
 * - Stateless (sin estado propio)
 * - Inyecta repositorios (interfaces) y otros domain services
 * - NO accede a infrastructure directamente
 */

import { Injectable } from '@shared/kernel/decorators';
import { Result, Ok, Err } from '@shared/kernel/result';
import { I<Entity1>Repository } from '../repositories/<entity1>.repository';
import { I<Entity2>Repository } from '../repositories/<entity2>.repository';
import { <Entity1> } from '../entities/<entity1>';
import { <Entity2> } from '../entities/<entity2>';
import { <ValueObject> } from '../value-objects/<vo-name>';
import { <DomainEvent> } from '../events/<aggregate>.events';

// ============================================
// INPUT/OUTPUT TYPES
// ============================================
export interface <Action>Input {
  tenantId: string;
  <entity1>Id: string;
  <entity2>Id: string;
  parametro1: <Tipo>;
  parametro2: <Tipo>;
}

export interface <Action>Output {
  <entity1>: <Entity1>;
  <entity2>: <Entity2>;
  resultado: <Tipo>;
}

// ============================================
// DOMAIN SERVICE CLASS
// ============================================
@Injectable()
export class <DomainName>DomainService {
  constructor(
    private readonly <entity1Lower>Repository: I<Entity1>Repository,
    private readonly <entity2Lower>Repository: I<Entity2>Repository,
    // Otros repositorios o domain services
  ) {}

  // ----- MAIN BUSINESS OPERATION -----
  async <accionPrincipal>(input: <Action>Input): Promise<Result<<Action>Output, Error>> {
    // 1. Obtener aggregates/entidades involucradas
    const [entity1Result, entity2Result] = await Promise.all([
      this.<entity1Lower>Repository.findById(input.<entity1>Id, input.tenantId),
      this.<entity2Lower>Repository.findById(input.<entity2>Id, input.tenantId),
    ]);

    if (!entity1Result.ok || !entity1Result.value) {
      return Err(new Error(`<Entity1> ${input.<entity1>Id} not found`));
    }
    if (!entity2Result.ok || !entity2Result.value) {
      return Err(new Error(`<Entity2> ${input.<entity2>Id} not found`));
    }

    const entity1 = entity1Result.value;
    const entity2 = entity2Result.value;

    // 2. Validar reglas de negocio cross-entity
    const validationResult = this.validateCrossEntityRules(entity1, entity2, input);
    if (!validationResult.ok) {
      return Err(validationResult.error);
    }

    // 3. Ejecutar lógica de dominio compleja
    const domainResult = this.executeDomainLogic(entity1, entity2, input);
    if (!domainResult.ok) {
      return Err(domainResult.error);
    }

    // 4. Retornar resultado (NO persistir - eso es responsabilidad del Use Case)
    return Ok({
      <entity1>: domainResult.value.entity1,
      <entity2>: domainResult.value.entity2,
      resultado: domainResult.value.resultado,
    });
  }

  // ----- VALIDACIÓN CROSS-ENTITY -----
  private validateCrossEntityRules(
    entity1: <Entity1>,
    entity2: <Entity2>,
    input: <Action>Input
  ): Result<void, Error> {
    // Ejemplos de validaciones cross-entity:
    
    // - Verificar que entity1 pertenece al mismo tenant que entity2
    if (entity1.tenantId !== entity2.tenantId) {
      return Err(new Error('Entities belong to different tenants'));
    }

    // - Verificar compatibilidad de estados
    if (entity1.estado === 'inactivo' || entity2.estado === 'inactivo') {
      return Err(new Error('Cannot operate on inactive entities'));
    }

    // - Verificar límites de negocio
    if (entity1.<campo> + input.parametro1 > entity1.max<Campo>) {
      return Err(new Error('Exceeds maximum allowed limit'));
    }

    // - Verificar dependencias
    if (!entity2.puedeSerUsadoPor(entity1)) {
      return Err(new Error('<Entity2> cannot be used by <Entity1> in current state'));
    }

    return Ok(undefined);
  }

  // ----- LÓGICA DE DOMINIO PURA -----
  private executeDomainLogic(
    entity1: <Entity1>,
    entity2: <Entity2>,
    input: <Action>Input
  ): Result<{ entity1: <Entity1>; entity2: <Entity2>; resultado: <Tipo> }, Error> {
    // 1. Calcular Value Objects necesarios
    const voResult = <ValueObject>.create(input.parametro1, input.parametro2);
    if (!voResult.ok) {
      return Err(voResult.error);
    }
    const valueObject = voResult.value;

    // 2. Ejecutar métodos de entidad que mutan estado
    const entity1Result = entity1.<metodoDeNegocio>(valueObject);
    if (!entity1Result.ok) {
      return Err(entity1Result.error);
    }

    const entity2Result = entity2.<otroMetodo>(input.parametro2);
    if (!entity2Result.ok) {
      return Err(entity2Result.error);
    }

    // 3. Calcular resultado final
    const resultado = this.calcularResultado(entity1, entity2, valueObject);

    return Ok({ entity1, entity2, resultado });
  }

  private calcularResultado(
    entity1: <Entity1>,
    entity2: <Entity2>,
    vo: <ValueObject>
  ): <Tipo> {
    // Lógica de cálculo pura
    return <calculado>;
  }

  // ----- OTROS MÉTODOS DE DOMINIO -----
  
  // Validación pura (sin side effects) - reusable
  static validarReglaNegocioCompleja(
    entity1: <Entity1>,
    entity2: <Entity2>,
    parametro: <Tipo>
  ): Result<void, Error> {
    // Validaciones que no requieren repositorios
    return Ok(undefined);
  }

  // Cálculo puro
  static calcular<Metrica>(entity1: <Entity1>, entity2: <Entity2>): <Tipo> {
    // Cálculo sin side effects
    return <calculado>;
  }
}

// ============================================
// EXAMPLE: PricingDomainService (Real)
// ============================================
/*
@Injectable()
export class PricingDomainService {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly promotionRepository: IPromotionRepository,
  ) {}

  async calculateOrderPrice(input: CalculatePriceInput): Promise<Result<PriceCalculation, Error>> {
    // 1. Obtener producto y cliente
    const [productResult, customerResult] = await Promise.all([
      this.productRepository.findById(input.productId, input.tenantId),
      this.customerRepository.findById(input.customerId, input.tenantId),
    ]);

    // 2. Validaciones
    // ...

    // 3. Calcular precio base
    const basePrice = product.price;

    // 4. Aplicar descuentos cliente
    const customerDiscount = this.calculateCustomerDiscount(customer, product);

    // 5. Aplicar promociones vigentes
    const promotions = await this.promotionRepository.findActiveForProduct(product.id, input.tenantId);
    const promotionDiscount = this.calculateBestPromotion(promotions, input.quantity);

    // 6. Calcular impuestos
    const tax = this.calculateTax(basePrice - customerDiscount - promotionDiscount, product.taxRate);

    // 7. Retornar desglose
    return Ok({
      subtotal: basePrice * input.quantity,
      discount: customerDiscount + promotionDiscount,
      tax,
      total: (basePrice - customerDiscount - promotionDiscount + tax) * input.quantity,
      breakdown: { basePrice, customerDiscount, promotionDiscount, tax },
    });
  }

  private calculateCustomerDiscount(customer: Customer, product: Product): Money {
    // Lógica de descuento por cliente
  }

  private calculateBestPromotion(promotions: Promotion[], quantity: number): Money {
    // Lógica de mejor promoción
  }

  private calculateTax(subtotal: Money, taxRate: number): Money {
    // Lógica de impuestos
  }
}
*/

// ============================================
// EXAMPLE: InventoryAllocationService (Real)
// ============================================
/*
@Injectable()
export class InventoryAllocationDomainService {
  constructor(
    private readonly lotRepository: IInventoryLotRepository,
    private readonly stockRepository: IStockRepository,
  ) {}

  // FEFO Allocation (First Expired, First Out)
  async allocateStockFEFO(
    productId: string,
    tenantId: string,
    quantity: number,
    condition?: StorageCondition
  ): Promise<Result<AllocationResult, Error>> {
    // 1. Obtener lotes disponibles ordenados por vencimiento (FEFO)
    const lotsResult = await this.lotRepository.findAvailableFEFO(productId, tenantId, condition);
    if (!lotsResult.ok) return Err(lotsResult.error);

    const availableLots = lotsResult.value;

    // 2. Validar stock suficiente
    const totalAvailable = availableLots.reduce((sum, lot) => sum + lot.cantidadActual, 0);
    if (totalAvailable < quantity) {
      return Err(new Error(`Insufficient stock: available ${totalAvailable}, requested ${quantity}`));
    }

    // 3. Asignar por FEFO
    const allocations: LotAllocation[] = [];
    let remaining = quantity;

    for (const lot of availableLots) {
      if (remaining <= 0) break;
      const allocated = Math.min(lot.cantidadActual, remaining);
      allocations.push({ lotId: lot.id, quantity: allocated });
      remaining -= allocated;
    }

    // 4. Retornar plan de asignación (NO ejecutar - eso lo hace Use Case)
    return Ok({
      productId,
      totalQuantity: quantity,
      allocations,
      strategy: 'FEFO',
    });
  }
}
*/