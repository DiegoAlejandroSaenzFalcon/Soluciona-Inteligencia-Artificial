# Security Hardening Template

## Formato: `docs/architecture/security.md` (por variante/módulo)

---

# Security Hardening - <Variante/Módulo>

**Versión**: 1.0
**Fecha**: YYYY-MM-DD
**Responsable**: Security Officer / Tech Lead
**Compliance**: OWASP Top 10, ISO 27001, Ley 1581, DIAN

---

## 1. Resumen de Postura de Seguridad

| Capa | Estado | Herramientas | Revisión |
|------|--------|--------------|----------|
| Código (SAST) | ✅ Clean | CodeQL, Semgrep | Cada PR |
| Dependencias (SCA) | ✅ Clean | npm audit, Trivy, Dependabot | Diario |
| Secretos | ✅ 0 leaks | Gitleaks (pre-commit + CI) | Cada commit |
| Contenedores | ✅ Hardened | Trivy, Hadolint, Cosign | Cada build |
| Runtime | 🟡 En progreso | Falco (futuro), AppArmor | - |
| Red | ✅ Segregada | mTLS, Network Policies, WAF | Trimestral |
| Datos | ✅ Cifrados | AES-256-GCM (rest), TLS 1.3 (transit) | Anual |

---

## 2. OWASP Top 10 Compliance

| ID | Riesgo | Implementación | Verificación |
|----|--------|----------------|--------------|
| **A01** | Broken Access Control | RLS PostgreSQL + RBAC + ABAC + Policy-as-Code | Integration tests + CodeQL |
| **A02** | Cryptographic Failures | TLS 1.3 everywhere, AES-256-GCM, Argon2id (passwords), Keys en Vault | SSL Labs A+, Code review |
| **A03** | Injection | Drizzle ORM (parameterized), Zod validation (all inputs), CSP | Semgrep rules + Unit tests |
| **A04** | Insecure Design | Threat modeling en specs P0/P1, Secure by Design, ADRs | Architect review |
| **A05** | Security Misconfiguration | Helmet.js, CSP nonce, HSTS, Secure cookies, Security headers | Observatory score A+ |
| **A06** | Vulnerable Components | Dependabot + Renovate (auto-PR), npm audit CI, Trivy containers | Daily scan |
| **A07** | Auth Failures | Keycloak (OIDC), MFA, Passkeys, Rate limiting, Account lockout, JWT rotation | Auth tests + Pen test |
| **A08** | Software Integrity | SLSA Level 3 target, SBOM (CycloneDX), Cosign signing, Provenance | CI verification |
| **A09** | Logging/Monitoring Failures | OpenTelemetry, Loki, Alertmanager, SLOs, Error budgets | Synthetic monitoring |
| **A10** | SSRF | Egress filtering, Allowlists, No user-controlled URLs, Private network isolation | Network policies |

---

## 3. Autenticación y Autorización

### 3.1 JWT Security
```typescript
// src/shared/utils/jwt.ts
import { SignJWT, jwtVerify, importJWK, createRemoteJWKSet } from 'jose';

const JWT_ALG = 'RS256';
const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';

// Rotación de claves (JWKS)
export const jwks = createRemoteJWKSet(new URL(`${process.env.KEYCLOAK_URL}/realms/soluciona/protocol/openid-connect/certs`));

export async function signAccessToken(payload: JWTPayload): Promise<string> {
  const privateKey = await getPrivateKey(); // Desde Vault/Keycloak
  return new SignJWT({ ...payload, typ: 'access' })
    .setProtectedHeader({ alg: JWT_ALG, kid: process.env.JWT_KID })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .setIssuer('soluciona-ia')
    .setAudience('soluciona-api')
    .sign(privateKey);
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: 'soluciona-ia',
    audience: 'soluciona-api',
    clockTolerance: 30,
  });
  return payload as JWTPayload;
}

// Refresh token rotation (almacenado en BD con hash)
export async function rotateRefreshToken(userId: string, oldTokenHash: string): Promise<string> {
  // Verificar hash, revocar old, crear new, almacenar hash
}
```

### 3.2 RBAC + ABAC (Casbin)
```typescript
// src/shared/auth/rbac.ts
import { newEnforcer } from 'casbin';
import { PrismaAdapter } from 'casbin-prisma-adapter';

// Modelo: request_definition = r_sub, r_obj, r_act
// Policy: p, role, resource, action
// p, admin, orders, *
// p, operador, orders, read
// p, operador, orders, create

export const enforcer = await newEnforcer(
  `
  [request_definition]
  r = sub, obj, act, tenant

  [policy_definition]
  p = sub, obj, act, tenant

  [role_definition]
  g = _, _

  [policy_effect]
  e = some(where (p.eft == allow))

  [matchers]
  m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act && r.tenant == p.tenant
  `,
  new PrismaAdapter(prisma)
);

// Uso en middleware
export function authorize(resource: string, action: string) {
  return async (request, reply) => {
    const allowed = await enforcer.enforce(
      request.user.role,
      resource,
      action,
      request.tenantId
    );
    if (!allowed) {
      return reply.code(403).send({ error: 'Forbidden', message: 'Insufficient permissions' });
    }
  };
}
```

### 3.3 Row Level Security (PostgreSQL)
```sql
-- Habilitado en TODAS las tablas de negocio
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_lots ENABLE ROW LEVEL SECURITY;
-- ... todas las tablas

-- Política única por tabla
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.current_tenant')::varchar);

-- Índice crítico para performance
CREATE INDEX idx_orders_tenant_id ON orders(tenant_id);

-- Middleware setea contexto en cada request
-- SET LOCAL app.current_tenant = 'tenant-uuid';
```

---

## 4. Validación de Entrada (Zod - 100% Coverage)

```typescript
// src/shared/schemas/order.schema.ts
import { z } from 'zod';

export const createOrderSchema = z.object({
  body: z.object({
    items: z.array(z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive().max(1000),
      unitPrice: z.number().nonnegative().max(1_000_000),
      notes: z.string().max(500).optional(),
    })).min(1).max(50),
    type: z.enum(['domicilio', 'recoger', 'mesa', 'consumo_local']),
    deliveryAddress: z.object({
      street: z.string().min(5).max(200),
      city: z.string().min(2).max(100),
      coordinates: z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      }).optional(),
    }).optional(),
    paymentMethod: z.enum(['efectivo', 'tarjeta', 'transferencia', 'nequi', 'daviplata', 'pse']).optional(),
  }),
  params: z.object({
    tenantId: z.string().uuid(), // Validado por middleware
  }),
  headers: z.object({
    'x-correlation-id': z.string().uuid().optional(),
    'idempotency-key': z.string().uuid().optional(),
  }),
});

// Middleware de validación global
export function validate(schema: AnyZodObject) {
  return async (request, reply) => {
    try {
      await schema.parseAsync({
        body: request.body,
        query: request.query,
        params: request.params,
        headers: request.headers,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Datos de entrada inválidos',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code,
          })),
        });
      }
      throw error;
    }
  };
}
```

---

## 5. Gestión de Secretos

### 5.1 Cero Secretos en Código/Git
```yaml
# .gitleaks.toml (config)
[allowlist]
description = "Claves de prueba conocidas"
paths = ["**/*.example", "**/*.template"]
regexes = ['test-key', 'placeholder', 'example']

[rules]
# Patrones personalizados para DIAN, NVIDIA, WhatsApp, etc.
[[rules]]
description = "NVIDIA API Key"
regex = 'nvidia[_-]?api[_-]?key["\']?\s*[:=]\s*["\']?[a-zA-Z0-9_-]{32,}'
tags = ["key", "nvidia"]

[[rules]]
description = "WhatsApp Access Token"
regex = 'whatsapp[_-]?access[_-]?token["\']?\s*[:=]\s*["\']?[A-Za-z0-9_-]{100,}'
tags = ["token", "whatsapp"]
```

### 5.2 Runtime Secrets (1Password CLI / Vault)
```bash
# Desarrollo local
op read "op://Soluciona/Development/NVIDIA_API_KEY" > .env.local

# CI/CD (GitHub Actions)
- name: Load secrets from 1Password
  uses: 1password/load-secrets-action@v1
  with:
    env-file: .env.ci

# Producción (Kubernetes + External Secrets Operator)
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: soluciona-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: soluciona-secrets
  data:
    - secretKey: JWT_SECRET
      remoteRef:
        key: soluciona/prod/jwt
        property: secret
```

---

## 6. Seguridad de Contenedores

### 6.1 Dockerfile Hardened (Multi-stage)
```dockerfile
# Dockerfile.prod
# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts
COPY . .
RUN npm run build

# Stage 2: Runtime (non-root, minimal)
FROM node:22-alpine AS runtime
RUN apk add --no-cache dumb-init tini
WORKDIR /app

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs

# Copy only production deps and build
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

USER nodejs

# Security: read-only root fs, no new privileges
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

### 6.2 Trivy Scan (CI)
```yaml
# .github/workflows/security.yml
- name: Trivy Container Scan
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: 'ghcr.io/org/soluciona-${{ matrix.variant }}:${{ github.sha }}'
    format: 'sarif'
    output: 'trivy-results.sarif'
    severity: 'HIGH,CRITICAL'
    ignore-unfixed: true
    vuln-type: 'os,library'

- name: Upload Trivy Results
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: 'trivy-results.sarif'
```

### 6.3 Cosign Signing
```bash
# Firmar imagen
cosign sign --yes ghcr.io/org/soluciona-comercial:v1.2.3

# Verificar en deploy
cosign verify --certificate-identity-regexp '.*' \
  --certificate-oidc-issuer-regexp '.*' \
  ghcr.io/org/soluciona-comercial:v1.2.3
```

---

## 7. Rate Limiting y DDoS Protection

```typescript
// src/interfaces/http/plugins/rate-limit.ts
import { rateLimit } from 'fastify-rate-limit';

export const rateLimitPlugin = async (fastify) => {
  // Global rate limit
  await fastify.register(rateLimit, {
    global: true,
    max: 1000,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
    errorMessage: 'Too many requests, please try again later',
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
  });

  // Stricter limits for auth endpoints
  fastify.register(rateLimit, {
    max: 10,
    timeWindow: '15 minutes',
    keyGenerator: (req) => req.ip,
    skipOnError: false,
  }, { prefix: '/api/auth' });

  // Per-tenant limits for API
  fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.tenantId || req.ip,
    allowList: ['127.0.0.1', '::1'],
  }, { prefix: '/api' });
};
```

---

## 8. Content Security Policy (CSP)

```typescript
// src/interfaces/http/plugins/security.ts
import helmet from '@fastify/helmet';

export const securityPlugin = async (fastify) => {
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Solo si necesario
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: ["'self'", 'wss:', 'https://api.nvidia.com'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
    noSniff: true,
    frameguard: { action: 'deny' },
  });

  // CSP Nonce para scripts inline necesarios
  fastify.addHook('onRequest', (req, reply) => {
    const nonce = crypto.randomBytes(16).toString('base64');
    req.nonce = nonce;
    reply.header('Content-Security-Policy', 
      reply.getHeader('Content-Security-Policy')?.replace("'unsafe-inline'", `'nonce-${nonce}'`) || ''
    );
  });
};
```

---

## 9. Auditoría y Compliance

### 9.1 Audit Log (Inmutable)
```sql
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id),
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, EXPORT, CONFIG_CHANGE
  entity VARCHAR(100) NOT NULL, -- tabla afectada
  entity_id VARCHAR(50), -- ID del registro
  before JSONB, -- valores anteriores
  after JSONB, -- valores nuevos
  ip INET,
  user_agent TEXT,
  correlation_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para queries de compliance
CREATE INDEX idx_audit_tenant_time ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_user_time ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity, entity_id);
CREATE INDEX idx_audit_correlation ON audit_logs(correlation_id);
```

### 9.2 Data Protection (Ley 1581 Colombia)
```typescript
// src/shared/utils/data-protection.ts
export const DATA_RETENTION = {
  audit_logs: '7 years',        // Ley 1480 + tributario
  personal_data: '5 years',     // Ley 1581 post-relación
  orders: '5 years',            // DIAN + tributario
  invoices: '10 years',         // DIAN Res 000042
  payments: '10 years',         // DIAN + bancario
  sessions: '30 days',          // Seguridad
  logs: '1 year',               // Operacional
};

// DPIA (Data Protection Impact Assessment) triggers
export function requiresDPIA(processing: ProcessingType): boolean {
  return [
    'systematic_monitoring',
    'large_scale_sensitive',
    'automated_decision_making',
    'new_technology',
  ].includes(processing);
}

// ARCO Rights Implementation
export async function handleARCORequest(request: ARCORequest): Promise<ARCOResponse> {
  // Access, Rectification, Cancellation, Opposition
  // 15 días hábiles response time (Ley 1581)
}
```

---

## 10. Security Testing Checklist

### Pre-Commit
- [ ] `gitleaks protect --staged` pasa
- [ ] `npm audit --audit-level=high` pasa
- [ ] No `console.log` con datos sensibles

### PR/CI
- [ ] CodeQL analysis pasa (0 high/critical)
- [ ] Semgrep scan pasa (0 high/critical)
- [ ] Trivy FS scan pasa (0 high/critical)
- [ ] Dependency check pasa (0 high/critical)
- [ ] Unit tests de auth/authorization pasan
- [ ] Integration tests de RLS pasan

### Pre-Deploy (Staging)
- [ ] OWASP ZAP baseline scan pasa
- [ ] SSL Labs test ≥ A
- [ ] Security headers verificados
- [ ] Penetration test (trimestral)

### Producción
- [ ] WAF rules activas
- [ ] DDoS protection (Cloudflare/AWS Shield)
- [ ] Certificados TLS válidos (> 30 días)
- [ ] Backup encryption verificado
- [ ] Incident response plan actualizado

---

## 11. Incident Response (Security)

```markdown
# Security Incident Response Plan

## Clasificación
- **SEV-1**: Brecha confirmada / Acceso no autorizado a datos
- **SEV-2**: Vulnerabilidad crítica explotable / Intento de intrusión
- **SEV-3**: Configuración insegura detectada / Fuga de metadatos

## Respuesta SEV-1 (Inmediata)
1. Aislar sistema afectado (network policy deny all)
2. Rotar todas las credenciales comprometidas
3. Notificar a PO + Legal + DPO (< 1 hora)
4. Preservar evidencias (logs, snapshots)
5. Iniciar investigación forense
6. Notificar a autoridades si datos personales (Ley 1581: 72h)

## Contactos
- DPO: <nombre> - <tel> - <email>
- Legal: <nombre> - <tel> - <email>
- CISO/Platform: <nombre> - <tel> - <email>
```