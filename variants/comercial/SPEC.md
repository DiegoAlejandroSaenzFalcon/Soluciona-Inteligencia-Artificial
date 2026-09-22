# SPEC.md — Spec Driven Development: Variante Comercial
# Soluciona Inteligencia Artificial - SaaS Multi-tenant para Restaurantes/Comercios

## 1. Visión de la Variante

**Soluciona IA Comercial** es un SaaS multi-tenant para automatización completa de establecimientos de comida (restaurantes, comida rápida, dark kitchens, catering):

- **Pedidos omnicanal**: WhatsApp Business API, Web, App móvil, Telefonía
- **Inventario inteligente**: Lotes, vencimientos (FEFO), condiciones de almacenamiento, recetas, mermas
- **Facturación DIAN**: Factura electrónica 2.1, nómina electrónica, multi-país (CFDI, SUNAT, AFIP, SII)
- **Contabilidad & Finanzas**: PUC Colombia, NIIF, conciliación bancaria, activos fijos
- **Nómina & RRHH**: Contratos, liquidación, seguridad social, nómina electrónica DIAN
- **CRM & Marketing**: Leads, pipeline, campañas WhatsApp/Email/SMS, loyalty, gamificación
- **IA Nativa**: Pipeline unificado, RAG, Function Calling, Multi-LLM Router, Guardrails, Fine-tuning
- **Apps móviles**: Owner, Delivery, Cliente (Kotlin Multiplatform + Compose)
- **Multi-tenant real**: Row-Level Security PostgreSQL en TODAS las tablas

## 2. Arquitectura Específica

```
soluciona-inteligencia-artificial-comercial/
├── src/
│   ├── domain/           # Entities: Order, Product, Customer, Invoice, Lot, Employee, etc.
│   ├── application/      # Use Cases: CreateOrder, AllocateStockFEFO, CalculatePrice, etc.
│   ├── infrastructure/   # Drizzle repos, WhatsApp Cloud API, DIAN middleware, NVIDIA AI
│   ├── interfaces/       # Fastify HTTP, WebSocket, GraphQL
│   └── shared/           # Kernel: Result, Events, Config, Observability
├── packages/design-system/  # React + Storybook UI components
├── dian-middleware/        # Facturación electrónica (Python/Node)
├── monitoring/             # Prometheus, Grafana, Loki, Tempo
├── nginx/                  # Reverse proxy configs
└── docker-compose*.yml     # Orquestación completa
```

## 3. Dominios Principales (Bounded Contexts)

| Dominio | Entidades Principales | Use Cases Clave |
|---------|----------------------|-----------------|
| **Orders** | Order, OrderItem, Payment | CreateOrder, UpdateStatus, ProcessPayment, CancelOrder |
| **Inventory** | Product, Lot, Stock, Movement, Recipe | CreateLot, AllocateStockFEFO, ReceivePO, CountStock |
| **Billing** | Invoice, InvoiceItem, Payment, CreditNote | EmitInvoice, QueryDIAN, CancelInvoice, GeneratePDF |
| **Accounting** | Account, JournalEntry, JournalLine | CreateEntry, PostEntry, GenerateReport, ClosePeriod |
| **Payroll** | Employee, Period, Detail, Provision | CalculatePayroll, GenerateElectronic, PayEmployees |
| **CRM** | Customer, Lead, Campaign, Loyalty | CreateLead, RunCampaign, CalculatePoints, RedeemRewards |
| **AI** | Assistant, Conversation, Embedding, Function | ChatCompletion, VisionAnalysis, FunctionCall, RAGQuery |
| **Auth** | User, Session, Permission, Role | Login, Register, MFA, PasswordReset, TokenRotation |

## 4. Especificaciones Prioritarias (Roadmap)

### P0 - Crítico (En producción / En desarrollo)
| SPEC-ID | Título | Estado | Descripción |
|---------|--------|--------|-------------|
| SPEC-001 | Autenticación JWT + 2FA + Rotación | ✅ Done | Login, refresh, MFA TOTP, rotación automática secrets |
| SPEC-002 | Multi-tenant RLS PostgreSQL | ✅ Done | Políticas en todas las tablas, contexto por request |
| SPEC-003 | Pedidos WhatsApp (Baileys legacy) | ✅ Done | QR login, recibir/enviar, media, webhooks |
| SPEC-004 | Pedidos WhatsApp Cloud API | 🟡 En progreso | Migración oficial Meta, webhooks, plantillas |
| SPEC-005 | Inventario: Lotes + Vencimientos + Condición | ✅ Done (H1) | Lotes obligatorios, FEFO, alertas vencimiento |
| SPEC-006 | Facturación DIAN (Software Propio) | 🟡 En progreso | Habilitación, timbre, consulta, anulación, PDF/QR |
| SPEC-007 | Panel Web (Dashboard + Admin) | ✅ Done | Login, dashboard, CRUDs, reportes, configuración |
| SPEC-008 | Observabilidad (OTEL + Prometheus + Grafana) | 🟡 Parcial | Logs, métricas, trazas, health checks |

### P1 - Alto (Próximos 2-4 sprints)
| SPEC-ID | Título | Prioridad | Descripción |
|---------|--------|-----------|-------------|
| SPEC-010 | Inventario: Unidades/Conversiones (H3) | P1 | kg↔g, L↔mL, caja↔unidad, presentaciones |
| SPEC-011 | Inventario: Mermas + Conteo Físico (H4) | P1 | Merma por motivo, ajuste, conciliación |
| SPEC-012 | Inventario: Recetas + Consumo (H5) | P1 | BOM, costo receta, consumo automático por venta |
| SPEC-013 | Compras: OC + Recepción + Proveedores | P1 | Flujo completo purchase-to-pay |
| SPEC-014 | Contabilidad: Asientos automáticos | P1 | Factura→asiento, pago→asiento, nómina→asiento |
| SPEC-015 | CRM: Leads + Pipeline + Campañas WhatsApp | P1 | Kanban, automatizaciones, plantillas |
| SPEC-016 | IA: Pipeline unificado + RAG + Function Calling | P1 | Asistentes panel, chatbot pedidos, visión menú |
| SPEC-017 | Apps móviles: Owner + Delivery + Cliente | P1 | KMP + Compose, offline-first, push |

### P2 - Medio (Roadmap 6-12 meses)
| SPEC-ID | Título | Descripción |
|---------|--------|-------------|
| SPEC-020 | Logística: VRP + GPS + POD Blockchain | Ruteo óptimo, tracking real, prueba entrega |
| SPEC-021 | BI/Analytics: dbt + MetricFlow + Text-to-SQL | Self-service BI, alertas anomalías, forecasting |
| SPEC-022 | Nómina electrónica DIAN completa | Envío automático, firma ONAC, consulta |
| SPEC-023 | Multi-país facturación | CFDI México, SUNAT Perú, AFIP Argentina, SII Chile |
| SPEC-024 | White-label apps + Custom domain | Branding por tenant, stores propias |
| SPEC-025 | Chaos Engineering + Game Days | LitmusChaos, pruebas mensuales |

## 5. Quality Gates Específicos Comercial

| Gate | Herramienta | Umbral | Específico |
|------|-------------|--------|------------|
| Unit Tests | Vitest | >85% | Domain logic, pricing, FEFO, tax calc |
| Integration Tests | Vitest + Testcontainers | Critical paths | DB, DIAN, WhatsApp, NVIDIA |
| E2E Tests | Playwright | 10 flows | Login→Order→Invoice→Payment |
| DIAN Compliance | Certificación DIAN | 100% | Timbre, CUFE, QR, XML, PDF válidos |
| WhatsApp Compliance | Meta Business API | 100% | Rate limits, plantillas aprobadas, opt-in |
| Performance | k6 | P95<200ms | 1000 concurrent users |
| Security | CodeQL + Semgrep + Trivy | 0 high/crit | OWASP Top 10, secretos, dependencias |

## 6. Feature Flags por Tier

```typescript
// src/shared/config/features.comercial.ts
export const COMERCIAL_TIER_FEATURES = {
  FREE: {
    maxUsers: 2, maxBranches: 1, maxOrdersMonth: 500,
    whatsappNumbers: 1, aiChatbotDay: 100, aiAssistantsDay: 50,
    inventoryAdvanced: false, lotTracking: false, recipeManagement: false,
    autoSupplierOrder: false, kitchenDisplay: false, deliveryRouting: false,
    dianInvoicesMonth: 50, accountingAdvanced: false, payrollAdvanced: false,
    crmMarketing: false, aiRAG: false, multiLLM: false, fineTuning: false,
    whiteLabel: false, customDomain: false, ssoPasskeys: false,
  },
  PRO: {
    maxUsers: 25, maxBranches: 5, maxOrdersMonth: 10000,
    whatsappNumbers: 3, aiChatbotDay: 5000, aiAssistantsDay: 2000,
    inventoryAdvanced: true, lotTracking: true, recipeManagement: true,
    autoSupplierOrder: true, kitchenDisplay: true, deliveryRouting: true,
    dianInvoicesMonth: 500, accountingAdvanced: false, payrollAdvanced: false,
    crmMarketing: true, aiRAG: true, multiLLM: true, fineTuning: false,
    whiteLabel: false, customDomain: false, ssoPasskeys: true,
  },
  ENTERPRISE: {
    maxUsers: Infinity, maxBranches: Infinity, maxOrdersMonth: Infinity,
    whatsappNumbers: Infinity, aiChatbotDay: Infinity, aiAssistantsDay: Infinity,
    inventoryAdvanced: true, lotTracking: true, recipeManagement: true,
    autoSupplierOrder: true, kitchenDisplay: true, deliveryRouting: true,
    dianInvoicesMonth: Infinity, accountingAdvanced: true, payrollAdvanced: true,
    crmMarketing: true, aiRAG: true, multiLLM: true, fineTuning: true,
    whiteLabel: true, customDomain: true, ssoPasskeys: true,
  },
} as const;
```

## 7. Cumplimiento Regulatorio Colombiano

| Normativa | Implementación | Estado |
|-----------|----------------|--------|
| Ley 1581/2012 (Datos Personales) | DPO, ROPA, DPIA, ARCO, consentimiento granular, brechas 72h | ✅ |
| Ley 1480/2011 (Consumidor) | Retracto 5d, garantía, PQR 15d, cláusulas abusivas nulas | ✅ |
| Ley 527/1999 (Comercio Electrónico) | Validez mensajes, firma electrónica ONAC | ✅ |
| Res. DIAN 000042 (Factura Electrónica) | Proveedor certificado, XML+PDF, timbre auto | ✅ |
| Res. DIAN 000091 (Nómina Electrónica) | Envío automático, firma digital ONAC | 🟡 |
| ISO 27001/27701 | SGSI, controles A.5-A.18, DPIA | 🟡 |
| ISO 22301 | BIA, RTO<4h, RPO<1h, DR test trimestral | 🔴 |

## 8. Métricas de Negocio (KPIs)

| Métrica | Target | Fuente |
|---------|--------|--------|
| Pedidos procesados/día | > 10,000 | DB + Metrics |
| Tiempo avg pedido→factura | < 30 seg | Traces |
| Uptime plataforma | 99.9% | Prometheus |
| Error rate API | < 0.1% | Prometheus |
| Adopción IA (chatbot/asistentes) | > 60% | Events |
| Churn mensual (PRO) | < 3% | Billing |
| NPS clientes | > 50 | Survey |

## 9. Especificaciones Técnicas Detalladas

### 9.1 WhatsApp Cloud API Migration (SPEC-004)
```gherkin
Feature: Migración Baileys → WhatsApp Cloud API
  Scenario: Recibir mensaje entrante
    Given webhook configurado en Meta Developer
    And plantillas aprobadas: "order_confirmation", "delivery_update"
    When cliente envía "Hola" al número verificado
    Then webhook recibe payload con wa_id, message_id, text.body
    And sistema responde con plantilla "order_confirmation"
    And se crea conversación en BD con correlation_id
```

### 9.2 FEFO Stock Allocation (SPEC-005 Extension)
```gherkin
Feature: Asignación FEFO automática
  Scenario: Salida de inventario descuenta lote más próximo a vencer
    Given 3 lotes producto "Pollo": LOTE-A(vence 2024-01-20, 10kg), LOTE-B(vence 2024-01-25, 15kg), LOTE-C(vence 2024-02-01, 20kg)
    When se registra salida 18kg
    Then se descuenta: LOTE-A 10kg (queda 0), LOTE-B 8kg (queda 7)
    And LOTE-C NO se toca
    And se emiten events StockDecreased por cada lote
```

### 9.3 DIAN Invoice Flow (SPEC-006)
```gherkin
Feature: Facturación electrónica DIAN
  Scenario: Emitir factura desde pedido
    Given pedido en estado "entregado" con pago "pagado"
    And cliente tiene datos DIAN completos (NIT, régimen, responsabilidad)
    When operador ejecuta "Facturar"
    Then sistema genera XML UBL 2.1
    And envía a DIAN (habilitación/producción)
    And recibe CUFE + QR + estado "emitida"
    And guarda XML/PDF en MinIO
    And notifica cliente (WhatsApp/Email)
```

---

*Versión: 1.0.0 | Actualizado: 2026-09-21 | Variante: Comercial*