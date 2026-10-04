# Given/When/Then Template

## Formato Estándar

```gherkin
Feature: <Nombre de la feature>
  As a <actor>
  I want to <acción>
  So that <beneficio>

  Background:
    Given <precondición común 1>
    And <precondición común 2>

  Scenario: <Escenario principal - Happy Path>
    Given <precondición específica 1>
    And <precondición específica 2>
    When <acción del actor>
    Then <resultado observable 1>
    And <resultado observable 2>
    And <evento de dominio emitido>

  Scenario: <Escenario alternativo - Validación>
    Given <precondición>
    When <acción inválida>
    Then <error específico>
    And <no hay cambios de estado>
    And <se loggea apropiadamente>

  Scenario: <Escenario edge - No encontrado>
    Given <entidad no existe>
    When <acción sobre entidad inexistente>
    Then <404 Not Found>
    And <mensaje claro para usuario>

  Scenario: <Escenario edge - Conflicto>
    Given <entidad ya existe con clave única>
    When <intento crear duplicado>
    Then <409 Conflict>
    And <detalle del conflicto>

  Scenario: <Escenario edge - Permisos>
    Given <actor sin permiso requerido>
    When <acción protegida>
    Then <403 Forbidden>
    And <no se expone información sensible>

  Scenario: <Escenario edge - Concurrencia>
    Given <dos actores modifican misma entidad>
    When <segundo actor envía versión obsoleta>
    Then <409 Version Conflict>
    And <versión actual en respuesta>
```

## Mapeo a Spec Formal

| Gherkin | Spec Section |
|---------|--------------|
| `Given` | **Given (Precondiciones)** |
| `When` | **When (Acción)** |
| `Then` | **Then (Resultado Esperado)** |
| `And` | Detalles adicionales en misma sección |
| `Background` | Precondiciones comunes a todos los escenarios |

## Ejemplo Completo: Crear Producto con Lotes

```gherkin
Feature: Gestión de Lotes en Inventario Alimentario
  As a Operador de Restaurante
  I want to registrar lotes con fecha de vencimiento y condición
  So that pueda aplicar FEFO y evitar mermas por vencimiento

  Background:
    Given el tenant "restaurante-demo" está activo
    And el usuario "operador@demo.com" tiene rol "operador"
    And el producto "Pollo Entero" (PROD-001) existe y maneja stock
    And la feature flag "inventoryAdvanced" está habilitada
    And la feature flag "lotTracking" está habilitada

  Scenario: Recepción de mercancía con lote obligatorio
    Given el proveedor "Distribuidora Avícola SA" está activo
    And una orden de compra OC-2024-001 está en estado "enviada"
    And el producto "Pollo Entero" está en la OC con cantidad 50kg
    When el operador registra la recepción:
      | Campo | Valor |
      | purchaseOrderId | OC-2024-001 |
      | productId | PROD-001 |
      | cantidad | 50 |
      | lote | "LOTE-2024-01-15-A" |
      | fechaVencimiento | "2024-01-22" |
      | condicion | "refrigerado" |
      | costoUnitario | 8500 |
    Then el sistema responde 201 Created
    And se crea el lote "LOTE-2024-01-15-A" con 50kg iniciales
    And el stock del producto aumenta en 50kg
    And se emite evento "InventoryLotCreated"
    And se emite evento "StockIncreased"
    And la orden de compra pasa a "recibida"

  Scenario: Rechazar recepción sin lote
    Given misma configuración que escenario anterior
    When el operador intenta registrar recepción SIN campo "lote"
    Then el sistema responde 400 Bad Request
    And el error indica: "El campo lote es obligatorio para productos con manejo de lotes"
    And NO se crea ningún lote
    And NO se modifica el stock
    And la orden de compra permanece en "enviada"

  Scenario: Validar fecha de vencimiento inválida
    Given misma configuración
    When el operador registra recepción con fechaVencimiento "2024-02-30" (inválida)
    Then el sistema responde 400 Bad Request
    And el error indica: "Fecha de vencimiento inválida: 2024-02-30 no existe"

  Scenario: Listar lotes por vencer (FEFO)
    Given existen 3 lotes del producto PROD-001:
      | Lote | Vencimiento | Cantidad | Condición |
      | LOTE-A | 2024-01-20 | 10 | refrigerado |
      | LOTE-B | 2024-01-25 | 15 | refrigerado |
      | LOTE-C | 2024-02-01 | 20 | congelado |
    When el operador consulta GET /api/inventory/products/PROD-001/lots/por-vencer?dias=7
    Then el sistema responde 200 OK
    And retorna lotes ordenados por vencimiento (FEFO):
      | Orden | Lote | Días para vencer |
      | 1 | LOTE-A | 5 |
      | 2 | LOTE-B | 10 |
    And LOTE-C NO aparece (vence en >7 días)

  Scenario: Salida de inventario aplica FEFO automático
    Given los 3 lotes del escenario anterior
    When se registra una salida de 18kg del producto PROD-001
    Then el sistema descuenta:
      | Lote | Cantidad descontada | Queda |
      | LOTE-A | 10 | 0 |
      | LOTE-B | 8 | 7 |
    And LOTE-C NO se toca (FEFO respeta vencimiento)
    And se emiten eventos "StockDecreased" por cada lote afectado
```