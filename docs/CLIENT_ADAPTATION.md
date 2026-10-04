# CLIENT_ADAPTATION.md — Framework de Adaptación al Cliente
# Soluciona Inteligencia Artificial

## 1. Propósito

Estandarizar el proceso de **implementación, configuración y entrega** de Soluciona IA para cada cliente, garantizando:
- Onboarding predecible (< 4 semanas piloto)
- Configuración por feature flags (sin code changes)
- Multi-tenancy real con aislamiento (RLS)
- White-label configurable
- Cumplimiento regulatorio por cliente

## 2. Perfilado del Cliente (Discovery - Semana 1)

### 2.1 Cuestionario Obligatorio

```markdown
# templates/cuestionario-onboarding.md

## Información General
- [ ] Razón Social / Nombre Comercial:
- [ ] NIT / Identificación Fiscal:
- [ ] CIIU Principal / Segmento: (comidas|salud|retail|belleza|profesionales|educacion|automotriz|inmobiliaria|turismo|logistica|mantenimiento|financieros)
- [ ] Dirección Principal:
- [ ] Ciudad / País:
- [ ] Contacto Técnico (Nombre, Email, Teléfono):
- [ ] Contacto Comercial (Nombre, Email, Teléfono):

## Volumen Transaccional (Estimado)
- [ ] Pedidos/día (promedio):
- [ ] Pedidos/día (pico):
- [ ] Facturas/mes:
- [ ] Productos en catálogo:
- [ ] Clientes activos:
- [ ] Proveedores activos:

## Canales de Venta Actuales
- [ ] WhatsApp Business: (Sí/No) → ¿API Oficial o Web?
- [ ] Web/App propia: (Sí/No) → Tecnología:
- [ ] Punto de Venta (POS): (Sí/No) → Marca/Modelo:
- [ ] Telefonía: (Sí/No) → Proveedor:
- [ ] Marketplaces: (Rappi, UberEats, iFood, otros):

## Integraciones Requeridas
- [ ] Contabilidad: (Siigo, Alegra, Contpy, Xero, QuickBooks, otro, ninguno)
- [ ] Facturación DIAN: (Proveedor actual / Propio / Ninguno)
- [ ] Nómina: (Siigo, Nominax, Buk, otro, ninguno)
- [ ] Logística: (Servientrega, Coordinadora, TCC, Envía, Rappi, Uber, propio, ninguno)
- [ ] Bancos: (Bancolombia, Davivienda, BBVA, Nequi, Daviplata, otro)
- [ ] ERP: (SAP, Oracle, Odoo, Microsoft Dynamics, otro)

## Requisitos Regulatorios
- [ ] ISO 27001: (Requerido / Deseable / No)
- [ ] ISO 22301: (Requerido / Deseable / No)
- [ ] HIPAA / Salud: (Sí/No)
- [ ] PCI-DSS: (Sí/No)
- [ ] Ley 1581 (Datos Personales): (Sí - obligatorio Colombia)
- [ ] DIAN Facturación: (Sí - obligatorio Colombia)
- [ ] Auditoría Interna: (Frecuencia)

## Equipo TI Interno
- [ ] Tienen equipo TI: (Sí/No) → Tamaño:
- [ ] MSP Externo: (Sí/No) → Nombre:
- [ ] Infraestructura: (Cloud AWS/Azure/GCP / On-premise / Híbrido)
- [ ] Kubernetes: (Sí/No) → Versión:
- [ ] Observabilidad: (Grafana/Datadog/New Relic/otro/ninguno)

## Expectativas Comerciales
- [ ] Tier objetivo: (FREE / PRO / ENTERPRISE)
- [ ] Presupuesto mensual estimado (USD):
- [ ] Timeline deseado para piloto:
- [ ] Criterios de éxito del piloto:
- [ ] Referencias permitidas: (Sí/No)
```

### 2.2 Matriz de Segmentos (Configuración Base por CIIU)

```typescript
// src/shared/config/segments.ts
export const SEGMENT_DEFAULTS: Record<string, SegmentConfig> = {
  comidas: {
    defaultModules: ['orders', 'inventory', 'kitchen', 'delivery', 'billing', 'crm'],
    featureFlags: {
      inventoryAdvanced: true,
      recipeManagement: true,
      lotTracking: true,
      kitchenDisplay: true,
      deliveryRouting: true,
    },
    compliance: ['dian-billing', 'ley-1581', 'ley-1480'],
    units: ['unidad', 'kg', 'g', 'lt', 'ml', 'caja', 'docena'],
    storageConditions: ['ambiente', 'refrigerado', 'congelado', 'seco'],
  },
  salud: {
    defaultModules: ['appointments', 'patients', 'clinical-history', 'billing', 'inventory', 'crm'],
    featureFlags: {
      hipaaCompliance: true,
      patientPortal: true,
      appointmentReminders: true,
      clinicalNotes: true,
    },
    compliance: ['hipaa', 'ley-1581', 'dian-billing'],
  },
  retail: {
    defaultModules: ['pos', 'inventory', 'suppliers', 'billing', 'crm', 'loyalty'],
    featureFlags: {
      barcodeScanning: true,
      multiWarehouse: true,
      loyaltyProgram: true,
      giftCards: true,
    },
    compliance: ['ley-1581', 'ley-1480', 'dian-billing'],
  },
  // ... otros segmentos
};

export interface SegmentConfig {
  defaultModules: string[];
  featureFlags: Record<string, boolean>;
  compliance: string[];
  units: string[];
  storageConditions?: string[];
}
```

## 3. Proceso de Implementación por Cliente

```
DISCOVERY (Semana 1)
    │
    ▼
SPEC CLIENTE (Semana 2) ──► SPEC-CLIENTE-<NOMBRE>.md
    │                          ├── Custom fields / workflows
    │                          ├── Integrations mapping
    │                          ├── Compliance requirements
    │                          └── SLA definitions
    ▼
CONFIGURACIÓN (Semana 3-4)
    ├── Tenant setup + branding
    ├── Feature flags activation
    ├── Integrations config (API keys, webhooks)
    ├── DIAN certification (si aplica)
    └── Data migration (si aplica)
    ▼
PILOTO CONTROLADO (Semana 5-8)
    ├── Usuarios clave + datos reales limitados
    ├── Daily standups + feedback loop
    ├── Métricas de adopción + performance
    └── Ajustes iterativos
    ▼
GO-LIVE (Semana 9+)
    ├── Migración completa
    ├── Capacitación equipo
    ├── Documentación entregable
    ├── Soporte hipercare (30 días)
    └── Revisión mensual (QBR)
```

### 3.1 Spec Cliente (Plantilla)

```markdown
# SPEC-CLIENTE-<NOMBRE>: Adaptación para <Cliente>

**Contexto**: Implementación de Soluciona IA para <Cliente> (<Segmento>)
**Actor**: Equipo implementación + PO Cliente
**Prioridad**: P0

### Given (Precondiciones)
- Contrato firmado + NDA + DPA
- Cuestionario onboarding completado
- Accesos otorgados (WhatsApp, DIAN, ERP, Bancos)
- Infraestructura aprobada (Cloud/On-prem)

### When (Configuración)
1. Crear tenant en plataforma
2. Activar feature flags por segmento + custom
3. Configurar branding white-label
4. Configurar integraciones (API keys, webhooks, mappings)
5. Cargar datos maestros (productos, clientes, proveedores)
6. Certificar DIAN (si aplica)
7. Configurar usuarios + RBAC
8. Configurar alertas + reportes

### Then (Resultado)
- Tenant funcional en <URL cliente>
- Todos los módulos contracted operativos
- Integraciones validadas end-to-end
- Usuarios capacitados
- Documentación entregada
- Soporte hipercare activo

### Criterios de Aceptación
- [ ] AC-1: Login + 2FA funciona para todos los usuarios
- [ ] AC-2: Pedido WhatsApp → Panel → Factura DIAN (E2E)
- [ ] AC-3: Inventario con lotes/vencimientos (si segmento comida)
- [ ] AC-4: Integración ERP sincroniza productos/precios
- [ ] AC-5: Reportes DIAN generan sin errores
- [ ] AC-6: Branding white-label aplicado correctamente
- [ ] AC-7: Alertas configuradas llegan a canales correctos
- [ ] AC-8: Backup + restore probado

### Configuración Específica Cliente
| Parámetro | Valor |
|-----------|-------|
| Tenant ID | `cli-<slug>` |
| Dominio personalizado | `app.<cliente>.com` |
| WhatsApp Business Account ID | `WABA-XXX` |
| DIAN Software ID / PIN | Configurado en vault |
| ERP API Endpoint | `https://erp.cliente.com/api` |
| Feature Flags Override | `{...}` |
```

## 4. Multi-Tenant Isolation (RLS PostgreSQL)

### 4.1 Implementación Canónica

```sql
-- Habilitado en TODAS las tablas de negocio
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
-- ... todas las tablas

-- Política única por tabla
CREATE POLICY tenant_isolation ON products
  USING (tenant_id = current_setting('app.current_tenant')::varchar);

-- Índice crítico para performance
CREATE INDEX idx_products_tenant_id ON products(tenant_id);
```

### 4.2 Middleware de Contexto (Fastify)

```typescript
// src/interfaces/http/plugins/tenant-context.ts
import { FastifyPluginAsync } from 'fastify';
import { getPool } from '@/infrastructure/database/pool';

export const tenantContextPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (request, reply) => {
    // 1. Extraer tenant ID (subdomain, header, JWT claim, config)
    let tenantId: string;

    if (request.headers['x-tenant-id']) {
      tenantId = request.headers['x-tenant-id'] as string;
    } else if (request.user?.tenantId) {
      tenantId = request.user.tenantId;
    } else {
      // Resolver por subdominio: cliente.app.soluciona.ai
      const host = request.headers.host || '';
      const subdomain = host.split('.')[0];
      if (subdomain && subdomain !== 'app' && subdomain !== 'api') {
        const result = await getPool().query(
          'SELECT id FROM tenants WHERE slug = $1 AND activo = true',
          [subdomain]
        );
        if (result.rows[0]) tenantId = result.rows[0].id;
      }
    }

    if (!tenantId) {
      return reply.code(400).send({ error: 'Tenant context required' });
    }

    // 2. Verificar tenant activo
    const tenant = await getPool().query(
      'SELECT id, nombre, slug FROM tenants WHERE id = $1 AND activo = true',
      [tenantId]
    );

    if (!tenant.rows[0]) {
      return reply.code(403).send({ error: 'Tenant not found or inactive' });
    }

    // 3. Setear contexto RLS para TODA la transacción
    request.tenantId = tenantId;
    request.tenant = tenant.rows[0];

    // 4. Setear variable de sesión PostgreSQL (RLS)
    await getPool().query(`SET LOCAL app.current_tenant = $1`, [tenantId]);
  });

  // Limpiar contexto al final
  fastify.addHook('onSend', async (request, reply, payload) => {
    if (request.tenantId) {
      await getPool().query(`RESET app.current_tenant`).catch(() => {});
    }
    return payload;
  });
};
```

## 5. Feature Flags por Cliente (Config-Driven)

### 5.1 Sistema de Flags

```typescript
// src/shared/config/features.ts
export interface FeatureFlags {
  // Core
  orders: boolean;
  inventory: boolean;
  billing: boolean;
  crm: boolean;

  // Advanced
  inventoryAdvanced: boolean;
  lotTracking: boolean;
  recipeManagement: boolean;
  autoSupplierOrder: boolean;
  kitchenDisplay: boolean;
  deliveryRouting: boolean;

  // AI
  aiChatbot: boolean;
  aiAssistants: boolean;
  aiVision: boolean;
  aiRAG: boolean;
  aiFunctionCalling: boolean;
  aiGuardrails: boolean;
  multiLLMRouter: boolean;
  fineTuning: boolean;

  // Compliance
  dianBilling: boolean;
  dianPayroll: boolean;
  iso27001: boolean;
  hipaa: boolean;
  pciDss: boolean;

  // Integrations
  whatsappCloud: boolean;
  whatsappBaileys: boolean;
  erpIntegration: boolean;
  posIntegration: boolean;
  loyaltyProgram: boolean;

  // White-label
  whiteLabelApps: boolean;
  customDomain: boolean;
  customBranding: boolean;

  // Limits (per tier)
  maxUsers: number;
  maxBranches: number;
  maxOrdersMonth: number;
  maxWhatsAppNumbers: number;
  aiChatbotPerDay: number;
  aiAssistantsPerDay: number;
  aiVisionPerDay: number;
}

// Configuración por Tier (Base)
export const TIER_DEFAULTS: Record<Tier, FeatureFlags> = {
  FREE: {
    orders: true,
    inventory: true,
    billing: true,
    crm: false,
    inventoryAdvanced: false,
    lotTracking: false,
    recipeManagement: false,
    autoSupplierOrder: false,
    kitchenDisplay: false,
    deliveryRouting: false,
    aiChatbot: true,
    aiAssistants: true,
    aiVision: false,
    aiRAG: false,
    aiFunctionCalling: false,
    aiGuardrails: false,
    multiLLMRouter: false,
    fineTuning: false,
    dianBilling: true,
    dianPayroll: false,
    iso27001: false,
    hipaa: false,
    pciDss: false,
    whatsappCloud: true,
    whatsappBaileys: true,
    erpIntegration: false,
    posIntegration: false,
    loyaltyProgram: false,
    whiteLabelApps: false,
    customDomain: false,
    customBranding: false,
    maxUsers: 2,
    maxBranches: 1,
    maxOrdersMonth: 500,
    maxWhatsAppNumbers: 1,
    aiChatbotPerDay: 100,
    aiAssistantsPerDay: 50,
    aiVisionPerDay: 10,
  },
  PRO: { /* ... */ },
  ENTERPRISE: { /* ... */ },
};

// Override por cliente (en BD + cache Redis)
export async function getClientFeatures(tenantId: string): Promise<FeatureFlags> {
  const cacheKey = `features:${tenantId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const result = await db.query(
    'SELECT features FROM tenant_features WHERE tenant_id = $1',
    [tenantId]
  );

  const features = result.rows[0]?.features || TIER_DEFAULTS[getTier(tenantId)];
  await redis.setex(cacheKey, 300, JSON.stringify(features)); // 5 min TTL
  return features;
}
```

### 5.2 Uso en Código (Type-Safe)

```typescript
// src/application/use-cases/create-order.use-case.ts
import { getClientFeatures } from '@/shared/config/features';

export class CreateOrderUseCase {
  async execute(input: CreateOrderInput): Promise<Result<Order, Error>> {
    const features = await getClientFeatures(input.tenantId);

    // Validar feature flag
    if (!features.orders) {
      return Err(new Error('Orders module not enabled for this tenant'));
    }

    // Validar límites
    if (features.maxOrdersMonth > 0) {
      const currentMonthOrders = await this.orderRepo.countThisMonth(input.tenantId);
      if (currentMonthOrders >= features.maxOrdersMonth) {
        return Err(new Error('Monthly order limit exceeded'));
      }
    }

    // Lógica de negocio...
  }
}
```

## 6. White-Label Configuration

### 6.1 Configuración de Marca

```typescript
// src/shared/config/branding.ts
export interface TenantBranding {
  // Visual
  logoUrl: string;              // SVG/PNG, max 200x200
  faviconUrl: string;           // ICO/PNG 32x32
  primaryColor: string;         // Hex (#1a73e8)
  secondaryColor: string;       // Hex (#34a853)
  backgroundColor: string;      // Hex (#ffffff)
  fontFamily: string;           // 'Inter', 'Roboto', 'system-ui'

  // App
  appName: string;              // 'Mi Restaurante'
  appShortName: string;         // 'MiResto'
  supportEmail: string;         // 'soporte@micliente.com'
  supportPhone: string;         // '+57 1 234 5678'
  customDomain?: string;        // 'app.micliente.com'

  // Legal
  companyName: string;          // 'Mi Restaurante SAS'
  companyNit: string;           // '900.123.456-7'
  companyAddress: string;       // 'Calle 123 #45-67, Bogotá'
  termsUrl?: string;            // 'https://micliente.com/terminos'
  privacyUrl?: string;          // 'https://micliente.com/privacidad'

  // CSS Overrides (avanzado)
  cssOverrides?: string;        // CSS custom properties override

  // Mobile Apps
  androidPackageName?: string;  // 'com.micliente.app'
  iosBundleId?: string;         // 'com.micliente.app'
  playStoreUrl?: string;
  appStoreUrl?: string;
}

// Default branding (fallback)
export const DEFAULT_BRANDING: TenantBranding = {
  logoUrl: '/assets/logo-soluciona.svg',
  faviconUrl: '/assets/favicon.ico',
  primaryColor: '#1a73e8',
  secondaryColor: '#34a853',
  backgroundColor: '#ffffff',
  fontFamily: 'Inter, system-ui, sans-serif',
  appName: 'Soluciona IA',
  appShortName: 'Soluciona',
  supportEmail: 'soporte@soluciona.ai',
  supportPhone: '+57 300 000 0000',
  companyName: 'Soluciona Inteligencia Artificial SAS',
  companyNit: '900.000.000-0',
  companyAddress: 'Bogotá, Colombia',
};
```

### 6.2 Aplicación en Frontend (React + CSS Variables)

```tsx
// packages/design-system/src/theme/BrandingProvider.tsx
import { createContext, useContext, useEffect, ReactNode } from 'react';
import { getTenantBranding } from '@comercial/shared/config/branding';

const BrandingContext = createContext<TenantBranding>(DEFAULT_BRANDING);

export function BrandingProvider({ children, tenantId }: { children: ReactNode; tenantId: string }) {
  const [branding, setBranding] = useState<TenantBranding>(DEFAULT_BRANDING);

  useEffect(() => {
    getTenantBranding(tenantId).then(setBranding);
  }, [tenantId]);

  useEffect(() => {
    // Aplicar CSS variables al :root
    const root = document.documentElement;
    root.style.setProperty('--color-primary', branding.primaryColor);
    root.style.setProperty('--color-secondary', branding.secondaryColor);
    root.style.setProperty('--color-background', branding.backgroundColor);
    root.style.setProperty('--font-family', branding.fontFamily);

    // Favicon dinámico
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (favicon) favicon.href = branding.faviconUrl;

    // Título documento
    document.title = branding.appName;

    // CSS overrides
    if (branding.cssOverrides) {
      const styleId = 'tenant-css-overrides';
      let styleEl = document.getElementById(styleId) as HTMLStyleElement;
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = branding.cssOverrides;
    }
  }, [branding]);

  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
```

## 7. Migración de Datos (Onboarding)

### 7.1 Plantillas de Carga

```csv
# templates/products-import.csv
tenant_id,codigo,nombre,descripcion,precio,costo,unidad_medida,stock_minimo,categoria,impuestos,activo
cli-abc,PROD-001,"Hamburguesa Clásica","Carne 150g, queso, lechuga, tomate",25000,12000,unidad,5,"Hamburguesas","[{""codigo"":""01"",""porcentaje"":19}]",true
cli-abc,PROD-002,"Papas Fritas","Porción mediana",8000,2000,unidad,10,"Acompañamientos","[{""codigo"":""01"",""porcentaje"":19}]",true
```

```csv
# templates/customers-import.csv
tenant_id,tipo_identificacion,identificacion,dv,nombre,email,telefono,direccion,ciudad,regimen,cupo_credito,dias_credito,activo
cli-abc,CC,1234567890,1,"Juan Pérez","juan@email.com","3001234567","Calle 123","Bogotá","común",500000,30,true
```

### 7.2 Script de Migración

```typescript
// scripts/migrate-client-data.ts
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { getPool } from '../src/infrastructure/database/pool';
import { validateProductImport, validateCustomerImport } from '../src/shared/utils/validation';

async function migrateClientData(tenantId: string, files: { products?: string; customers?: string }) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);

    if (files.products) {
      const content = readFileSync(files.products, 'utf-8');
      const records = parse(content, { columns: true, skip_empty_lines: true });

      for (const record of records) {
        const validated = validateProductImport(record);
        await client.query(
          `INSERT INTO products (tenant_id, codigo, nombre, descripcion, precio, costo, unidad_medida, stock_minimo, categoria_id, impuestos, activo, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
           ON CONFLICT (tenant_id, codigo) DO UPDATE SET
             nombre = EXCLUDED.nombre,
             precio = EXCLUDED.precio,
             updated_at = NOW()`,
          [tenantId, validated.codigo, validated.nombre, validated.descripcion, validated.precio, validated.costo, validated.unidad_medida, validated.stock_minimo, validated.categoria_id, JSON.stringify(validated.impuestos), validated.activo]
        );
      }
    }

    if (files.customers) {
      // Similar para customers...
    }

    await client.query('COMMIT');
    console.log(`✅ Migración completada para tenant ${tenantId}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

## 8. Entregables al Cliente (Package de Entrega)

### 8.1 Documentación Entregada

| Documento | Formato | Descripción |
|-----------|---------|-------------|
| Manual de Usuario | PDF + Web | Guía completa por rol (Admin, Operador, Cocina, Delivery) |
| Manual de API | OpenAPI 3.1 (YAML/HTML) | Endpoints, schemas, ejemplos |
| Runbooks Operativos | Markdown | Procedimientos: backup, restore, scaling, incidentes |
| Arquitectura Técnica | PDF + Draw.io | Diagramas C4, flujos de datos, seguridad |
| Matriz de Cumplimiento | Excel | Checklist DIAN, Ley 1581, ISO 27001, etc. |
| Plan de Contingencia | PDF | RTO/RPO, procedimientos DR, contactos |
| Credenciales (Vault) | 1Password / Bitwarden | Accesos rotados post-entrega |

### 8.2 Capacitación

```markdown
# Plan de Capacitación Estándar (4 sesiones x 2h)

## Sesión 1: Fundamentos + Panel Admin
- Arquitectura general
- Gestión de usuarios + RBAC + 2FA
- Configuración negocio (horarios, sucursales, impuestos)
- Branding white-label

## Sesión 2: Operación Diaria
- Pedidos: WhatsApp, Web, Mesa, Domicilio
- Cocina: KDS, estados, tiempos
- Inventario: Stock, lotes, vencimientos, recepciones
- Clientes: CRM, historial, segmentación

## Sesión 3: Administración Avanzada
- Facturación DIAN: Config, emisión, consulta, anulación
- Proveedores: Órdenes, recepciones, conciliación
- Reportes: Ventas, inventario, financieros, BI
- Alertas: Stock, pedidos, pagos, sistema

## Sesión 4: Integraciones + Mantenimiento
- APIs: Autenticación, webhooks, rate limits
- ERP/POS: Mappings, sincronización, troubleshooting
- Backups: Programación, verificación, restore
- Soporte: Canales, SLAs, escalamiento
```

## 9. Soporte Post-Go-Live (Hipercare + Steady State)

### 9.1 Hipercare (30 días post Go-Live)

| Nivel | Horario | Canales | SLA Respuesta | SLA Resolución |
|-------|---------|---------|---------------|----------------|
| L1 | 7am-10pm | WhatsApp + Email | < 15 min | < 2 horas |
| L2 | 8am-6pm | WhatsApp + Email + Call | < 30 min | < 4 horas |
| L3 (On-call) | 24/7 | Phone (solo SEV-1) | < 15 min | < 1 hora |

### 9.2 Steady State (Post Hipercare)

| Tier | Soporte | Canales | SLA Respuesta | SLA Resolución |
|------|---------|---------|---------------|----------------|
| FREE | Community | GitHub Issues / Discord | Best effort | Best effort |
| PRO | Business | Email 24h / Chat 8am-6pm | < 4 horas | < 24 horas |
| ENTERPRISE | 24/7/TAM | Phone + Email + Chat + Slack | < 15 min (P1) | < 4 horas (P1) |

## 10. Revisión Mensual (QBR - Quarterly Business Review)

```markdown
# QBR Template - Cliente <Nombre> - Mes YYYY-MM

## Métricas de Adopción
| Métrica | Actual | Mes Anterior | Tendencia | Objetivo |
|---------|--------|--------------|-----------|----------|
| Usuarios activos (MAU) | | | ↗️/↘️/➡️ | |
| Pedidos procesados | | | | |
| Facturas emitidas | | | | |
| Tiempo avg pedido→factura | | | | |
| Adopción módulos (%) | | | | |

## Métricas Técnicas
| Métrica | Actual | SLO | Estado |
|---------|--------|-----|--------|
| Uptime | | 99.9% | ✅/⚠️/❌ |
| API P95 latency | | <200ms | |
| Error rate | | <0.1% | |
| Backup success rate | | 100% | |

## Incidentes del Mes
| ID | Severidad | Resumen | RCA | Acción Preventiva |
|----|-----------|---------|-----|-------------------|

## Feedback Cliente
- Qué funciona bien:
- Qué mejorar:
- Nuevas necesidades:
- NPS (0-10):

## Roadmap Próximo Trimestre
- [ ] Feature X
- [ ] Integración Y
- [ ] Upgrade Tier
```

## 11. Offboarding (Si Aplica)

```markdown
# Checklist Offboarding

- [ ] Exportación completa de datos (SQL + CSV + PDF)
- [ ] Migración a plataforma destino (scripts proporcionados)
- [ ] Revocación accesos (API keys, DB, WhatsApp, DIAN)
- [ ] Eliminación tenant (anonymization + drop schema)
- [ ] Certificado de destrucción de datos (Ley 1581)
- [ ] Facturación final + liquidación
- [ ] Encuesta salida (NPS + feedback)
- [ ] Retención docs legales (5 años - Ley 1480)
```

---

*Última actualización: 2026-09-21 | Versión 1.0.0*