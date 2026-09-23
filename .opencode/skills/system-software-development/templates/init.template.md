# INIT.template.md — System Software Development Initialization

## 1. Propósito
Plantilla para inicializar un nuevo proyecto/módulo/variante siguiendo estándares SSD de Soluciona IA.

## 2. Checklist de Inicialización

### 2.1 Estructura de Directorios
```bash
# Ejecutar en raíz del nuevo módulo
mkdir -p .github/workflows .opencode/agents .opencode/skills docs/architecture docs/api docs/runbooks docs/adr
mkdir -p src/{domain,application,infrastructure,interfaces,shared}
mkdir -p tests/{unit,integration,e2e}
mkdir -p scripts monitoring
touch Makefile package.json tsconfig.json .env.example config.example.json .gitignore README.md SPEC.md INIT.md
```

### 2.2 Configuración Base (package.json)
```json
{
  "name": "@soluciona/<module-name>",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22.0.0" },
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts",
    "format": "prettier --write .",
    "test": "vitest run",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:coverage": "vitest run --coverage",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:seed": "tsx src/db/seed.ts",
    "db:studio": "drizzle-kit studio",
    "check": "npm run lint && npm run typecheck && npm run test:unit"
  },
  "dependencies": {
    "fastify": "^4.28.1",
    "zod": "^3.22.4",
    "drizzle-orm": "^0.31.2",
    "pg": "^8.11.5",
    "pino": "^9.0.0",
    "pino-pretty": "^11.2.1",
    "@opentelemetry/api": "^1.9.0",
    "@opentelemetry/sdk-node": "^0.52.0",
    "@opentelemetry/auto-instrumentations-node": "^0.40.0",
    "@opentelemetry/exporter-prometheus": "^0.52.0",
    "@opentelemetry/exporter-trace-otlp-http": "^0.52.0",
    "@opentelemetry/resources": "^1.25.0",
    "@opentelemetry/semantic-conventions": "^1.25.0",
    "uuid": "^9.0.1",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "@types/node": "^20.14.2",
    "@types/pg": "^8.11.6",
    "@types/uuid": "^9.0.8",
    "typescript": "^5.4.5",
    "tsx": "^4.23.12",
    "vitest": "^1.6.1",
    "@vitest/coverage-v8": "^1.6.1",
    "eslint": "^8.57.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-import": "^2.29.1",
    "eslint-plugin-prettier": "^5.2.1",
    "prettier": "^3.3.2",
    "drizzle-kit": "^0.22.8",
    "husky": "^9.0.11",
    "lint-staged": "^15.2.7",
    "@commitlint/cli": "^19.0.0",
    "@commitlint/config-conventional": "^19.0.0"
  }
}
```

### 2.3 TypeScript Strict Config (tsconfig.json)
```json
{
  "extends": "@soluciona/tsconfig-base",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@domain/*": ["src/domain/*"],
      "@application/*": ["src/application/*"],
      "@infrastructure/*": ["src/infrastructure/*"],
      "@interfaces/*": ["src/interfaces/*"],
      "@shared/*": ["src/shared/*"]
    }
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 2.4 ESLint + Prettier (eslint.config.js)
```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  prettier,
  {
    plugins: {
      import: importPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      'import/order': ['error', { 'newlines-between': 'always' }],
      'import/no-unresolved': 'error',
      'import/no-cycle': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
    },
    settings: {
      'import/resolver': {
        typescript: { alwaysTryTypes: true },
      },
    },
  }
);
```

### 2.5 Pre-commit Hooks (.husky/pre-commit)
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
npx lint-staged
```

### 2.6 lint-staged (package.json)
```json
"lint-staged": {
  "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,yml,yaml}": ["prettier --write"]
}
```

### 2.7 Commitlint (commitlint.config.js)
```js
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'revert']],
    'scope-enum': [2, 'always', ['comercial', 'empresarial', 'residencial', 'root', 'shared', 'docs', 'ci', 'deps']],
    'subject-case': [2, 'always', 'sentence-case'],
    'subject-empty': [2, 'never'],
    'subject-max-length': [2, 'always', 100],
  },
};
```

## 3. Archivos Fundamentales a Crear

| Archivo | Descripción | Template |
|---------|-------------|----------|
| `SPEC.md` | Especificación del módulo | `spec-driven-development/spec.template.md` |
| `INIT.md` | Este archivo (inicialización) | Este template |
| `GOVERNANCE.md` | Políticas del módulo | Root GOVERNANCE.md |
| `QUALITY_GATES.md` | Quality gates del módulo | Root QUALITY_GATES.md |
| `README.md` | Documentación de inicio | Ver abajo |
| `.env.example` | Variables de entorno plantilla | Ver abajo |
| `config.example.json` | Configuración plantilla | Ver abajo |
| `.gitignore` | Archivos ignorados | Ver abajo |

### 3.1 README.md Mínimo
```markdown
# @soluciona/<module-name>

> <Descripción breve - 1 línea>

## Inicio Rápido
```bash
npm ci
cp .env.example .env
npm run dev
```

## Scripts
- `npm run dev` - Desarrollo con hot reload
- `npm run build` - Build producción
- `npm run check` - Lint + TypeCheck + Tests
- `npm run test` - Todos los tests
- `npm run db:migrate` - Migraciones DB

## Arquitectura
[Clean Architecture + DDD + Event-Driven](../GOVERNANCE.md#23-clean-architecture--ddd-enforceado)

## Specs
Ver [SPEC.md](./SPEC.md)

## Quality Gates
Ver [QUALITY_GATES.md](./QUALITY_GATES.md)
```

### 3.2 .env.example
```bash
# App
NODE_ENV=development
APP_VERSION=0.1.0
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/soluciona_<module>
# O para SQLite dev:
# DATABASE_URL=file:./data/dev.db

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=change-me-in-production-min-32-chars
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Observability
LOG_LEVEL=info
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
PROMETHEUS_PORT=9464

# Feature Flags (JSON)
FEATURE_FLAGS='{"orders":true,"inventory":true,"billing":true}'

# External APIs (placeholders)
NVIDIA_API_KEY=your-nvidia-key
WHATSAPP_ACCESS_TOKEN=your-whatsapp-token
DIAN_CERT_PATH=./certs/dian.p12
```

### 3.3 config.example.json
```json
{
  "name": "soluciona-<module>",
  "version": "0.1.0",
  "business": {
    "name": "Mi Negocio",
    "nit": "900000000-0",
    "address": "Calle 123, Ciudad",
    "phone": "+57 1 234 5678",
    "email": "contacto@minegocio.com"
  },
  "database": {
    "host": "localhost",
    "port": 5432,
    "name": "soluciona_<module>",
    "user": "postgres",
    "password": "postgres",
    "poolSize": 10,
    "ssl": false
  },
  "redis": {
    "host": "localhost",
    "port": 6379
  },
  "features": {
    "orders": true,
    "inventory": true,
    "billing": true,
    "crm": false,
    "ai": false
  },
  "limits": {
    "maxUsers": 2,
    "maxBranches": 1,
    "maxOrdersMonth": 500
  }
}
```

### 3.4 .gitignore
```
# Dependencies
node_modules/
.pnp
.pnp.js

# Build
dist/
build/
*.tsbuildinfo

# Environment
.env
.env.local
.env.*.local
config.json
*.pem
*.key
*.p12
*.crt

# Database
data/
*.db
*.sqlite
*.sqlite3

# Logs
logs/
*.log
npm-debug.log*

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Test
coverage/
.nyc_output/

# Misc
*.tgz
.cache/
.temp/
tmp/
```

## 4. Comandos de Verificación Post-Init

```bash
# 1. Instalar dependencias
npm ci

# 2. Verificar TypeScript
npm run typecheck

# 3. Verificar Lint
npm run lint

# 4. Verificar Tests (deben pasar - aunque estén vacíos)
npm run test:unit

# 5. Verificar Build
npm run build

# 6. Verificar Pre-commit
npx husky install
git add . && git commit -m "chore: initial commit" --no-verify
# Debe pasar lint-staged

# 7. Verificar Git Hooks
echo 'test' > test.ts && git add test.ts && git commit -m "test: verify hooks" --no-verify
# Debe fallar por lint/prettier
rm test.ts
```

## 5. Próximos Pasos

1. **Crear primera SPEC** usando `spec-driven-development` skill
2. **Configurar CI/CD** (`.github/workflows/ci.yml`)
3. **Configurar Docker** (`Dockerfile`, `docker-compose.yml`)
4. **Configurar Observabilidad** (OTEL, Prometheus, Grafana)
5. **Configurar Base de Datos** (Drizzle schema + migración inicial)
6. **Registrar en Root** (actualizar `package.json` workspaces en raíz)