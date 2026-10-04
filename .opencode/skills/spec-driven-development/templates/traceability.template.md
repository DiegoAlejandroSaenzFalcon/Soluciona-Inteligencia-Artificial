# Traceability Matrix Template

## Formato: Spec ↔ Code ↔ Tests ↔ Docs

| Spec ID | Req Negocio | AC-ID | Domain Entity | Use Case | Repository | HTTP Route | Unit Test | Int Test | E2E Test | ADR | Doc API | Runbook | Estado |
|---------|-------------|-------|---------------|----------|------------|------------|-----------|----------|----------|-----|---------|---------|--------|
| SPEC-042 | REQ-INV-001 | AC-01 | `InventoryLot` | `CreateLotUseCase` | `LotRepository` | `POST /inventory/lots` | `lot.test.ts` | `lot.int.test.ts` | `lot.e2e.ts` | ADR-012 | `lots.md` | `lot-mgmt.md` | ✅ Done |
| SPEC-042 | REQ-INV-001 | AC-02 | `InventoryLot` | `CreateLotUseCase` | - | `POST /inventory/lots` | `lot.validation.test.ts` | - | - | - | `lots.md` | - | ✅ Done |
| SPEC-042 | REQ-INV-002 | AC-05 | `InventoryLot` | `ListLotsUseCase` | `LotRepository` | `GET /products/:id/lots` | `lot.list.test.ts` | `lot.list.int.test.ts` | - | - | `lots.md` | - | ✅ Done |
| SPEC-042 | REQ-INV-003 | AC-08 | `InventoryLot` | `IssueStockUseCase` | `LotRepository` | `POST /inventory/issue` | `lot.fefo.test.ts` | `lot.fefo.int.test.ts` | `lot.fefo.e2e.ts` | ADR-012 | `lots.md` | `lot-mgmt.md` | 🟡 In Prog |

## Checklist de Trazabilidad Completa

### Por Spec
- [ ] Cada AC tiene al menos 1 test automatizado (Unit/Integration)
- [ ] Cada AC mapea a código específico (Entity, UseCase, Repository, Route)
- [ ] Cada entidad de dominio tiene tests de invariantes
- [ ] Cada Use Case tiene tests de happy path + edge cases
- [ ] Cada Repository tiene tests de integración con DB real
- [ ] Cada Route HTTP tiene tests de contrato (OpenAPI)
- [ ] ADRs referenciados para decisiones arquitectónicas
- [ ] Documentación API generada y actualizada
- [ ] Runbook operativo para funcionalidad crítica

### Por Componente de Código

#### Domain Entities
```markdown
| Entity | Invariantes Tested | State Transitions | Domain Events | Value Objects |
|--------|-------------------|-------------------|---------------|---------------|
| Product | ✅ create, price, stock | N/A | ProductCreated, PriceUpdated | Money, SKU |
| Order | ✅ create, status transitions | ✅ 9 estados | OrderCreated, StatusChanged | OrderItem |
| InventoryLot | ✅ create, validation, FEFO | N/A | LotCreated, LotExpired | LotNumber, ExpiryDate |
```

#### Use Cases (Application)
```markdown
| Use Case | Input Validation | Business Logic | Transaction | Idempotency | Events |
|----------|-----------------|----------------|-------------|-------------|--------|
| CreateLotUseCase | ✅ Zod schema | ✅ Lot creation | ✅ DB transaction | ✅ idempotency-key | ✅ LotCreated |
| ListLotsUseCase | ✅ Pagination params | ✅ FEFO sort | Read-only | N/A | N/A |
| IssueStockUseCase | ✅ Quantity + product | ✅ FEFO allocation | ✅ DB transaction | ✅ idempotency-key | ✅ StockDecreased |
```

#### Repositories (Infrastructure)
```markdown
| Repository | Interface | CRUD | Custom Queries | Transaction | RLS Tested |
|------------|-----------|------|----------------|-------------|------------|
| LotRepository | ILotRepository | ✅ | findByProduct, findExpiring | ✅ | ✅ |
| ProductRepository | IProductRepository | ✅ | findLowStock, findByCategory | ✅ | ✅ |
```

#### HTTP Routes (Interfaces)
```markdown
| Route | Method | Auth | Validation | Response | OpenAPI | Rate Limit |
|-------|--------|------|------------|----------|---------|------------|
| /inventory/lots | POST | ✅ JWT+RBAC | ✅ Zod | 201 + LotDTO | ✅ | ✅ |
| /products/:id/lots | GET | ✅ JWT | ✅ Params | 200 + LotDTO[] | ✅ | ✅ |
| /inventory/lots/por-vencer | GET | ✅ JWT | ✅ Query | 200 + LotDTO[] | ✅ | ✅ |
```

## Métricas de Cobertura de Trazabilidad

| Métrica | Fórmula | Objetivo | Actual |
|---------|---------|----------|--------|
| AC Coverage | ACs con test / Total ACs | 100% | - |
| Code Coverage (Domain) | Lines tested / Total lines | > 90% | - |
| Code Coverage (Application) | Lines tested / Total lines | > 85% | - |
| Code Coverage (Infrastructure) | Lines tested / Total lines | > 70% | - |
| API Coverage | Endpoints con test / Total | 100% | - |
| Doc Coverage | Endpoints documentados / Total | 100% | - |

## Herramientas de Verificación

```bash
# 1. Verificar trazabilidad spec → tests
node scripts/check-traceability.js SPEC-042

# 2. Generar reporte de cobertura por spec
node scripts/coverage-by-spec.js

# 3. Verificar OpenAPI specs vs implementación
npm run api:validate

# 4. Verificar ADRs vinculados
node scripts/check-adrs.js
```

## Script: check-traceability.js

```javascript
#!/usr/bin/env node
/**
 * Traceability Checker
 * Verifica que cada AC en una spec tiene tests y código asociado
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve, extname } from 'path';

function checkTraceability(specId) {
  // 1. Parsear spec y extraer ACs
  const specPath = resolve(`docs/specs/${specId}.md`);
  const specContent = readFileSync(specPath, 'utf-8');
  
  const acRegex = /\| (AC-\d+) \|/g;
  const acs = [...specContent.matchAll(acRegex)].map(m => m[1]);
  
  console.log(`\n🔍 Verificando trazabilidad para ${specId}`);
  console.log(`   ACs encontrados: ${acs.join(', ')}\n`);
  
  // 2. Buscar tests unitarios
  const unitTests = findTests('tests/unit', specId);
  const intTests = findTests('tests/integration', specId);
  const e2eTests = findTests('tests/e2e', specId);
  
  // 3. Buscar código relacionado
  const domainFiles = findCode('src/domain', specId);
  const appFiles = findCode('src/application', specId);
  const infraFiles = findCode('src/infrastructure', specId);
  const interfaceFiles = findCode('src/interfaces', specId);
  
  // 4. Reporte
  console.log('📊 RESULTADOS:');
  console.log(`   Unit Tests: ${unitTests.length} archivos`);
  console.log(`   Integration Tests: ${intTests.length} archivos`);
  console.log(`   E2E Tests: ${e2eTests.length} archivos`);
  console.log(`   Domain Code: ${domainFiles.length} archivos`);
  console.log(`   Application Code: ${appFiles.length} archivos`);
  console.log(`   Infrastructure Code: ${infraFiles.length} archivos`);
  console.log(`   Interface Code: ${interfaceFiles.length} archivos`);
  
  // 5. Verificar cada AC
  console.log('\n✅ AC COVERAGE:');
  for (const ac of acs) {
    const hasUnit = unitTests.some(f => f.includes(ac.toLowerCase()));
    const hasInt = intTests.some(f => f.includes(ac.toLowerCase()));
    const hasE2E = e2eTests.some(f => f.includes(ac.toLowerCase()));
    const status = hasUnit || hasInt || hasE2E ? '✅' : '❌';
    console.log(`   ${status} ${ac}: Unit=${hasUnit} Int=${hasInt} E2E=${hasE2E}`);
  }
}

function findTests(dir, specId) {
  const files = [];
  try {
    const entries = readdirSync(dir, { recursive: true });
    for (const entry of entries) {
      if (extname(entry) === '.ts' || extname(entry) === '.test.ts') {
        const content = readFileSync(resolve(dir, entry), 'utf-8');
        if (content.includes(specId) || content.toLowerCase().includes(specId.toLowerCase().replace('spec-', ''))) {
          files.push(entry);
        }
      }
    }
  } catch {}
  return files;
}

function findCode(dir, specId) {
  // Buscar referencias a spec en comentarios JSDoc o nombres de archivos
  const files = [];
  try {
    const entries = readdirSync(dir, { recursive: true });
    for (const entry of entries) {
      if (extname(entry) === '.ts' && !entry.includes('.test.')) {
        const content = readFileSync(resolve(dir, entry), 'utf-8');
        if (content.includes(`SPEC-${specId.split('-')[1]}`) || content.includes(`@spec ${specId}`)) {
          files.push(entry);
        }
      }
    }
  } catch {}
  return files;
}

// CLI
const specId = process.argv[2];
if (!specId) {
  console.error('Uso: node check-traceability.js SPEC-XXX');
  process.exit(1);
}
checkTraceability(specId);
```