# QUALITY_GATES.md — Quality Gates Obligatorios
# Soluciona Inteligencia Artificial

## 1. Definición de Quality Gate

Un **Quality Gate** es un punto de control automatizado que **bloquea el merge** si no se cumplen los criterios mínimos de calidad. No son sugerencias: son **requisitos obligatorios**.

## 2. Gates por Etapa (Pipeline)

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  PRE-COMMIT │──▶│    PR/CI    │──▶│   MERGE     │──▶│  STAGING    │──▶│ PRODUCTION  │
│  (Local)    │   │  (GitHub)   │   │  (Main)     │   │  (Deploy)   │   │  (Release)  │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
     │                │                │                │                │
     ▼                ▼                ▼                ▼                ▼
  • Lint           • All pre-      • Branch         • Health        • Canary
  • Format         commit          protection       checks          deploy
  • Typecheck      • Quality       • Required       • Smoke         • 10→50→100%
  • Unit tests     gates           reviews          tests           • Rollback
  • Secrets        • Security      • PO approval    • Metrics       if SLOs fail
  scan             scans           • Spec linked
```

## 3. Gates Detallados

### 3.1 Pre-commit (Local - Husky + lint-staged)

| Check | Herramienta | Comando | Bloqueante |
|-------|-------------|---------|------------|
| Lint | ESLint | `npx eslint --fix` | ✅ Sí |
| Format | Prettier | `npx prettier --write` | ✅ Sí |
| TypeCheck | TypeScript | `npx tsc --noEmit` | ⚠️ Warn (lento) |
| Secrets | Gitleaks | `gitleaks protect --staged` | ✅ Sí |

**Configuración** (`.husky/pre-commit`):
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
npx lint-staged
```

### 3.2 PR / CI (GitHub Actions - Obligatorio para Merge)

#### 3.2.1 Quality Job (Paralelo)

```yaml
quality:
  runs-on: ubuntu-latest
  timeout-minutes: 30
  steps:
    - uses: actions/checkout@v4
      with: { fetch-depth: 0 }  # Para gitleaks history

    - uses: actions/setup-node@v4
      with:
        node-version: '22'
        cache: 'npm'
        cache-dependency-path: '<variant>/package-lock.json'

    - name: Install dependencies
      run: npm ci
      working-directory: <variant>

    # Lint + Format
    - name: Lint
      run: npm run lint
      working-directory: <variant>

    - name: Format check
      run: npm run format:check
      working-directory: <variant>

    # TypeCheck
    - name: TypeScript strict check
      run: npm run typecheck
      working-directory: <variant>

    # Unit Tests
    - name: Unit tests with coverage
      run: npm run test:unit -- --coverage
      working-directory: <variant>
      env:
        NODE_ENV: test

    # Coverage threshold enforcement
    - name: Check coverage thresholds
      run: npx vitest run --coverage --reporter=verbose
      working-directory: <variant>
```

#### 3.2.2 Security Job (Paralelo)

```yaml
security:
  runs-on: ubuntu-latest
  timeout-minutes: 20
  steps:
    - uses: actions/checkout@v4
      with: { fetch-depth: 0 }

    # SAST - CodeQL
    - name: Initialize CodeQL
      uses: github/codeql-action/init@v3
      with:
        languages: typescript
        working-directory: <variant>

    - name: Perform CodeQL Analysis
      uses: github/codeql-action/analyze@v3

    # SAST - Semgrep
    - name: Semgrep Scan
      uses: returntocorp/semgrep-action@v1
      with:
        config: >-
          p/secrets
          p/typescript
          p/owasp-top-ten
          p/nodejs

    # SCA - Trivy (fs scan)
    - name: Trivy FS Scan
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: './<variant>'
        format: 'sarif'
        output: 'trivy-results.sarif'

    - name: Upload Trivy results
      uses: github/codeql-action/upload-sarif@v3
      with:
        sarif_file: 'trivy-results.sarif'

    # Secrets - Gitleaks (full history)
    - name: Gitleaks Scan
      uses: gitleaks/gitleaks-action@v2
      with:
        args: "--verbose --redact"

    # Dependencies - npm audit
    - name: npm audit
      run: npm audit --audit-level=high
      working-directory: <variant>
      continue-on-error: true  # No bloquear por deps, solo reportar
```

#### 3.2.3 Integration Tests Job (Sequencial después de quality)

```yaml
integration:
  needs: quality
  runs-on: ubuntu-latest
  timeout-minutes: 45
  services:
    postgres:
      image: postgres:16-alpine
      env:
        POSTGRES_DB: soluciona_test
        POSTGRES_USER: postgres
        POSTGRES_PASSWORD: postgres
      ports: ['5432:5432']
      options: >-
        --health-cmd="pg_isready -U postgres"
        --health-interval=10s
        --health-timeout=5s
        --health-retries=5
    redis:
      image: redis:7-alpine
      ports: ['6379:6379']
      options: --health-cmd="redis-cli ping" --health-interval=10s --health-timeout=5s --health-retries=5

  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: '22', cache: 'npm' }

    - run: npm ci
      working-directory: <variant>

    - run: npm run db:migrate
      working-directory: <variant>
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/soluciona_test

    - run: npm run test:integration
      working-directory: <variant>
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/soluciona_test
        REDIS_URL: redis://localhost:6379
```

### 3.3 Merge Protection (Branch Protection Rules)

**Configuración en GitHub (Settings → Branches → main/develop):**

| Regla | Configuración |
|-------|---------------|
| Require PR reviews | ✅ 1 approval mínimo |
| Dismiss stale reviews | ✅ On new commits |
| Require review from CODEOWNERS | ✅ |
| Require status checks | ✅ All jobs (quality, security, integration) |
| Require branches up to date | ✅ Before merging |
| Require linear history | ✅ |
| Require signed commits | ✅ (futuro: cosign) |
| Restrict pushes | ✅ Only admins |
| Allow force pushes | ❌ |
| Allow deletions | ❌ |

### 3.4 Staging Deployment Gates

| Check | Herramienta | Umbral | Acción si Falla |
|-------|-------------|--------|-----------------|
| Health `/health/live` | curl | 200 OK | Rollback automático |
| Health `/health/ready` | curl | 200 OK + DB+Redis OK | Rollback automático |
| Smoke Tests | Playwright | Critical paths pass | Rollback automático |
| Error Rate (5 min) | Prometheus | < 1% | Alert + manual review |
| Latency P95 (5 min) | Prometheus | < 500ms | Alert + manual review |
| Log Errors (5 min) | Loki | 0 ERROR level | Alert + manual review |

### 3.5 Production Release Gates

| Check | Herramienta | Umbral | Acción si Falla |
|-------|-------------|--------|-----------------|
| Canary 10% (10 min) | ArgoCD + Prometheus | Error rate < 0.5%, P95 < 300ms | Auto-rollback |
| Canary 50% (30 min) | ArgoCD + Prometheus | Error rate < 0.5%, P95 < 300ms | Auto-rollback |
| Canary 100% | ArgoCD | All metrics green | Promote |
| Post-deploy smoke | Playwright | 100% pass | Alert on-call |
| Business metrics (1h) | Grafana | Orders/min normal, no anomalies | Alert PO |

## 4. Thresholds Numéricos (Configurables por Variante)

### 4.1 Cobertura de Tests

```json
// vitest.config.ts (coverage thresholds)
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.d.ts',
        '**/*.config.*',
        'src/main.ts',
        'src/**/index.ts',  // Barrel files
      ],
    },
  },
});
```

### 4.2 Lint Rules (ESLint - Error Level)

```js
// eslint.config.js (extracto)
module.exports = {
  rules: {
    // TypeScript strict
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',

    // Security
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',

    // Best practices
    'prefer-const': 'error',
    'no-var': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'default-case': 'error',

    // Imports
    'import/order': ['error', { 'newlines-between': 'always' }],
    'import/no-unresolved': 'error',
    'import/no-cycle': 'error',

    // Promises
    'prefer-promise-reject-errors': 'error',
    'no-return-await': 'error',
  },
};
```

### 4.3 Performance Budgets

| Métrica | Budget | Medición |
|---------|--------|----------|
| Bundle size (JS gzipped) | < 100 KB | webpack-bundle-analyzer |
| First Contentful Paint | < 1.5s | Lighthouse CI |
| Time to Interactive | < 3.5s | Lighthouse CI |
| API P95 latency | < 200ms | Prometheus histogram |
| DB query P95 | < 50ms | pg_stat_statements |
| Memory usage (container) | < 512MB | cAdvisor |

## 5. Excepciones y Waivers

### 5.1 Proceso de Excepción

1. **Crear Issue**: `WAIVER-<ID>: <Justificación>`
2. **Aprobación**: Tech Lead + PO (ambos)
3. **Duración**: Máximo 1 sprint (2 semanas)
4. **Tracking**: Label `waiver` en PR + comentario con link a issue
5. **Revisión**: Obligatoria en próximo sprint planning

### 5.2 Template Waiver

```markdown
# WAIVER-<ID>: <Título>

**Gate**: <quality|security|coverage|performance>
**Regla**: <Específica, ej: "coverage lines > 80%">
**Componente**: <Archivo/Modulo afectado>
**Justificación**: <Por qué no se puede cumplir AHORA>
**Plan de Remediación**: <Qué se hará, cuándo, quién>
**Riesgo**: <Qué pasa si no se arregla>
**Aprobado por**: @tech-lead @po
**Expira**: YYYY-MM-DD
```

## 6. Métricas de Calidad (Dashboard)

### 6.1 KPIs Principales (Grafana Dashboard)

| Panel | Query | Alerta |
|-------|-------|--------|
| CI Pass Rate | `rate(github_actions_job_success_total[1h])` | < 95% |
| Coverage Trend | `vitest_coverage_lines_pct` | < 80% |
| Security Findings | `codeql_alerts_high_critical` | > 0 |
| Secret Leaks | `gitleaks_findings_total` | > 0 |
| Deploy Frequency | `count(deployments[1d])` | < 1/día (develop) |
| Lead Time | `pr_merged_at - pr_created_at` | > 24h |
| MTTR | `incident_resolved_at - incident_created_at` | > 1h (SEV-1) |

### 6.2 Quality Report (Semanal Automático)

```bash
# Generado por GitHub Action semanal
# Output: quality-report-YYYY-WW.md

## Quality Report - Week WW/YYYY

### Summary
- PRs merged: X
- CI pass rate: Y%
- Avg lead time: Zh
- Security findings: 0 high, 0 critical
- Secret leaks: 0

### Coverage
| Variant | Lines | Functions | Branches | Statements |
|---------|-------|-----------|----------|------------|
| comercial | 82% | 85% | 73% | 81% |
| empresarial | N/A | N/A | N/A | N/A |

### Technical Debt
- New TODO/FIXME: X
- Resolved: Y
- Net change: +Z

### Waivers Active
- WAIVER-001: coverage branches (expires YYYY-MM-DD)

### Action Items
- [ ] Fix flaky test in inventory-lots
- [ ] Update drizzle-orm to 0.32
- [ ] Review ADR-005 (WhatsApp migration)
```

## 7. Herramientas y Versiones (Lockfile)

```json
// package.json (root) - versions locked
{
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "7.x",
    "@typescript-eslint/parser": "7.x",
    "eslint": "8.57.x",
    "eslint-config-prettier": "9.x",
    "eslint-plugin-import": "2.29.x",
    "eslint-plugin-prettier": "5.x",
    "eslint-plugin-promise": "6.x",
    "prettier": "3.3.x",
    "typescript": "5.4.x",
    "vitest": "1.6.x",
    "@vitest/coverage-v8": "1.6.x",
    "husky": "9.x",
    "lint-staged": "15.x",
    "@commitlint/cli": "19.x",
    "@commitlint/config-conventional": "19.x",
    "gitleaks": "8.x"
  }
}
```

## 8. Checklist Pre-Merge (Para Developers)

```markdown
# PR Checklist (Copiar en descripción PR)

## Spec & Design
- [ ] Spec existe y está aprobada (link: SPEC-XXX)
- [ ] ADR creado si decisión arquitectónica nueva (link: ADR-NNN)
- [ ] Threat modeling completado (para P0/P1)

## Code Quality
- [ ] `npm run lint` pasa localmente
- [ ] `npm run typecheck` pasa localmente
- [ ] `npm run test:unit` pasa localmente
- [ ] Cobertura > 80% (nuevo código)
- [ ] No `any` types sin justificación
- [ ] No console.log / debugger en código

## Tests
- [ ] Tests unitarios para nueva lógica (Given/When/Then)
- [ ] Tests de integración para DB/API externas
- [ ] Edge cases cubiertos (errores, límites, vacíos)
- [ ] Tests son determinísticos (no flaky)

## Security
- [ ] No secretos en código (verificado gitleaks local)
- [ ] Validación Zod en todos los inputs HTTP
- [ ] SQL parameterizado (Drizzle) - sin string concat
- [ ] Rate limiting en endpoints públicos

## Documentation
- [ ] JSDoc en funciones públicas/exportadas
- [ ] README actualizado si cambio en API/config
- [ ] CHANGELOG actualizado (o conventional commit)
- [ ] Runbook actualizado si cambio operacional

## Operations
- [ ] Health checks actualizados
- [ ] Métricas/Logs añadidos para nueva funcionalidad
- [ ] Migración DB reversible (si aplica)
- [ ] Feature flag para rollback rápido (si riesgo alto)

## Review
- [ ] Self-review completado
- [ ] Asignado a reviewer técnico
- [ ] PO tagged para approval (si feature visible)
```

---

*Última actualización: 2026-09-21 | Versión 1.0.0*