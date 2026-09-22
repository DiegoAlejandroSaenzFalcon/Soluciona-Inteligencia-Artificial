# Observability Setup Template

## Formato: `docs/architecture/observability.md` (por variante/módulo)

---

# Observabilidad - <Variante/Módulo>

**Versión**: 1.0
**Fecha**: YYYY-MM-DD
**Responsable**: <Nombre>
**Stack**: OpenTelemetry + Prometheus + Grafana + Loki + Tempo

---

## 1. Arquitectura de Observabilidad

```
┌─────────────────────────────────────────────────────────────────┐
│                        APLICACIÓN                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Logs      │  │  Metrics    │  │  Traces     │             │
│  │  (Pino)     │  │ (Prometheus)│  │  (OTEL)     │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         ▼                ▼                ▼                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              OpenTelemetry Collector                     │   │
│  │  (Receiver: OTLP) → (Processor: Batch) → (Exporters)    │   │
│  └─────────────────────────────────────────────────────────┘   │
│         │                │                │                     │
│         ▼                ▼                ▼                     │
│  ┌──────────┐    ┌──────────────┐   ┌──────────┐              │
│  │  Loki    │    │ Prometheus   │   │  Tempo   │              │
│  │  (Logs)  │    │ (Metrics)    │   │ (Traces) │              │
│  └──────────┘    └──────────────┘   └──────────┘              │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          ▼                                     │
│                 ┌────────────────┐                             │
│                 │   Grafana      │                             │
│                 │  (Visualización)│                            │
│                 └────────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Logging (Pino + Loki)

### 2.1 Configuración Logger Base
```typescript
// src/shared/utils/logger.ts
import pino from 'pino';
import { randomUUID } from 'crypto';

const isProd = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      ...bindings,
      service: 'soluciona-<module>',
      version: process.env.APP_VERSION,
      environment: process.env.NODE_ENV,
    }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      '*.password',
      '*.token',
      '*.secret',
      '*.authorization',
      '*.apiKey',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },
  // Pretty print en desarrollo
  transport: isProd ? undefined : {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

// Child logger con contexto
export function getLogger(context: string, bindings: Record<string, unknown> = {}) {
  return logger.child({ context, ...bindings });
}

// Correlation ID middleware
export function correlationIdMiddleware() {
  return async (request, reply) => {
    const correlationId = request.headers['x-correlation-id'] as string || randomUUID();
    request.log = logger.child({ correlationId });
    reply.header('x-correlation-id', correlationId);
  };
}
```

### 2.2 Estructura de Logs (JSON)
```json
{
  "level": 30,
  "time": "2026-09-21T10:30:00.123Z",
  "service": "soluciona-comercial",
  "version": "1.2.3",
  "environment": "production",
  "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "context": "order.use-case",
  "msg": "Order created successfully",
  "orderId": "ord-123",
  "tenantId": "cli-abc",
  "amount": 25000
}
```

### 2.3 Labels Loki (para queries eficientes)
| Label | Valor | Descripción |
|-------|-------|-------------|
| `service` | `soluciona-comercial` | Nombre del servicio |
| `environment` | `production` | Entorno |
| `level` | `info/error/warn` | Nivel de log |
| `context` | `order.use-case` | Contexto código |
| `tenant_id` | `cli-abc` | Tenant (para multi-tenant) |
| `correlation_id` | `uuid` | Trazabilidad end-to-end |

---

## 3. Métricas (Prometheus + Grafana)

### 3.1 Métricas RED Obligatorias (Por Endpoint)

```typescript
// src/shared/observability/metrics.ts
import { Counter, Histogram, Gauge, Registry } from 'prom-client';

const register = new Registry();
register.setDefaultLabels({ service: 'soluciona-<module>', environment: process.env.NODE_ENV });

// HTTP Metrics (auto-instrumentado por OTEL)
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'tenant_id'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

// Business Metrics
export const ordersCreated = new Counter({
  name: 'orders_created_total',
  help: 'Total orders created',
  labelNames: ['tenant_id', 'type', 'status'],
  registers: [register],
});

export const inventoryStockLevel = new Gauge({
  name: 'inventory_stock_level',
  help: 'Current stock level per product',
  labelNames: ['tenant_id', 'product_id', 'warehouse'],
  registers: [register],
});

// System Metrics (auto via node-exporter + OTEL)
```

### 3.2 SLOs y Alertas (Prometheus Rules)

```yaml
# monitoring/prometheus/rules/slos.yml
groups:
  - name: soluciona-slos
    interval: 30s
    rules:
      # Availability
      - alert: ServiceDown
        expr: up{job="soluciona-<module>"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
          
      # Latency SLO (P95 < 200ms)
      - alert: HighLatencyP95
        expr: |
          histogram_quantile(0.95, 
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le, job)
          ) > 0.2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P95 latency > 200ms for {{ $labels.job }}"

      # Error Rate SLO (< 0.1%)
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (job)
          /
          sum(rate(http_requests_total[5m])) by (job)
          > 0.001
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Error rate > 0.1% for {{ $labels.job }}"

      # Business: Orders processing
      - alert: OrdersProcessingStalled
        expr: |
          rate(orders_created_total[10m]) == 0
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "No orders created in 15 minutes"

      # Database
      - alert: DatabaseConnectionsHigh
        expr: pg_stat_database_connections / pg_settings_max_connections > 0.8
        for: 5m
        labels:
          severity: warning
```

### 3.3 Dashboards Grafana (JSON)

```json
{
  "dashboard": {
    "title": "Soluciona <Module> - RED Dashboard",
    "tags": ["soluciona", "<module>", "red"],
    "panels": [
      {
        "title": "Request Rate (req/s)",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[1m])) by (method, route)",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Error Rate (%)",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status_code=~\"5..\"}[1m])) by (route) / sum(rate(http_requests_total[1m])) by (route) * 100",
            "legendFormat": "{{route}}"
          }
        ]
      },
      {
        "title": "Latency P50/P95/P99",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))",
            "legendFormat": "P50 {{route}}"
          },
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))",
            "legendFormat": "P95 {{route}}"
          },
          {
            "expr": "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))",
            "legendFormat": "P99 {{route}}"
          }
        ]
      }
    ]
  }
}
```

---

## 4. Trazas Distribuidas (OpenTelemetry + Tempo)

### 4.1 Configuración OTEL
```typescript
// src/shared/observability/otel.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION, ATTR_DEPLOYMENT_ENVIRONMENT } from '@opentelemetry/semantic-conventions';

export const otelSDK = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'soluciona-<module>',
    [ATTR_SERVICE_VERSION]: process.env.APP_VERSION || 'dev',
    [ATTR_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
  metricReader: new PrometheusExporter({
    port: parseInt(process.env.PROMETHEUS_PORT || '9464'),
    endpoint: '/metrics',
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fastify': { enabled: true },
      '@opentelemetry/instrumentation-pg': { enabled: true },
      '@opentelemetry/instrumentation-redis': { enabled: true },
      '@opentelemetry/instrumentation-http': { enabled: true },
    }),
  ],
});

otelSDK.start();

process.on('SIGTERM', () => {
  otelSDK.shutdown().catch(console.error);
});
```

### 4.2 Atributos de Span Obligatorios
| Atributo | Valor | Ejemplo |
|----------|-------|---------|
| `span.name` | `<method> <route>` | `POST /api/orders` |
| `http.method` | `GET/POST/PUT/DELETE` | `POST` |
| `http.route` | Route pattern | `/api/orders` |
| `http.status_code` | `200/400/500` | `201` |
| `tenant.id` | Tenant UUID | `cli-abc123` |
| `user.id` | User ID (si autenticado) | `usr-456` |
| `db.operation` | `SELECT/INSERT/UPDATE` | `INSERT` |
| `db.table` | Nombre tabla | `orders` |
| `error` | `true/false` | `false` |

---

## 5. Health Checks

### 5.1 Endpoints
```typescript
// src/interfaces/http/routes/health.ts
export const healthRoutes = async (fastify) => {
  // Liveness - Proceso vivo
  fastify.get('/health/live', async () => ({
    status: 'alive',
    timestamp: new Date().toISOString(),
  }));

  // Readiness - Listo para tráfico (DB + Redis + Deps)
  fastify.get('/health/ready', async () => {
    const checks = await Promise.allSettled([
      checkDatabase(),
      checkRedis(),
      checkExternalApis(),
    ]);
    
    const allHealthy = checks.every(c => c.status === 'fulfilled');
    
    return {
      status: allHealthy ? 'ready' : 'not ready',
      timestamp: new Date().toISOString(),
      checks: checks.map((c, i) => ({
        name: ['database', 'redis', 'external'][i],
        status: c.status,
        ...(c.status === 'rejected' ? { error: c.reason.message } : {}),
      })),
    };
  });

  // Deep Health - Detallado para debugging
  fastify.get('/health', { preHandler: [fastify.authenticate] }, async () => ({
    status: 'ok',
    version: process.env.APP_VERSION,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      whatsapp: await checkWhatsApp(),
      dian: await checkDIAN(),
    },
  }));
};
```

---

## 6. Log Aggregation Queries (Loki/LogQL)

```logql
# Errores últimos 15 min por servicio
{service="soluciona-comercial", level="error"} |= "error" | json | __error__="" | count by (context) over 15m

# Latencia alta correlacionada con logs
{service="soluciona-comercial"} | json | duration > 1000 | correlation_id

# Traza completa por correlation_id
{service=~"soluciona-.*"} | json | correlation_id="a1b2c3d4-..."

# Tenant específico
{service="soluciona-comercial", tenant_id="cli-abc"} | json
```

---

## 7. Alerting (Alertmanager)

```yaml
# monitoring/alertmanager/config.yml
route:
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'critical-pager'
      continue: true
    - match:
        severity: warning
      receiver: 'warning-slack'

receivers:
  - name: 'default'
    slack_configs:
      - channel: '#alerts'
        send_resolved: true
  - name: 'critical-pager'
    pagerduty_configs:
      - service_key: '<PAGERDUTY_KEY>'
  - name: 'warning-slack'
    slack_configs:
      - channel: '#alerts-warning'
        send_resolved: true

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'job']
```