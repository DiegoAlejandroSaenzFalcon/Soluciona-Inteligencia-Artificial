# SOLUCIONA INTELIGENCIA ARTIFICIAL

> **Plataforma de automatización y atención con IA** — organizada en **variantes hermanas** según segmento de mercado.
> Código versionado para **reconstruir cualquier variante de forma exacta y profesional**.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Status](https://img.shields.io/badge/Status-Active-brightgreen.svg)]
[![GitHub Pages](https://img.shields.io/badge/Docs-GitHub%20Pages-brightgreen.svg)](https://diegoalejandrosaenzfalcon.github.io/Soluciona-Inteligencia-Artificial/)
[![CI/CD](https://img.shields.io/badge/CI-GitHub%20Actions-blue.svg)](https://github.com/features/actions)
[![Autor](https://img.shields.io/badge/Autor-Diego%20Alejandro%20Saenz%20Falcon-blue.svg)](https://github.com/DiegoAlejandroSaenzFalcon)

---

## 🎯 ¿Qué es esto?

Un **monorepositorio actualmente público** que agrupa **dos desarrollos activos** y **reserva espacio para un tercero**.
Cada variante es **autónoma**: su propio `README.md`, instalación, configuración de ejemplo y despliegue.

| Variante | Carpeta | Estado | Descripción |
|----------|---------|--------|-------------|
| **Comercial** | `soluciona-inteligencia-artificial-comercial/` | ✅ Activo | Bot de pedidos por WhatsApp para establecimientos (restaurantes, locales). Sistema multi-negocio: pedidos, menú, clientes, conversaciones, consumo IA, panel web, panel central. |
| **Empresarial** | `soluciona-inteligencia-artificial-empresarial/` | ✅ Activo | Motor de soporte TI automatizado: tickets con SLA, base de conocimiento, triage con IA, agentes de opencode, paquetes de confianza y política de seguridad. |
| **Residencial** | `soluciona-inteligencia-artificial-residencial/` | 🔒 Reservado | Se desarrollará a futuro. |

---

## 🏗️ Arquitectura del Monorepositorio

```
Soluciona-Inteligencia-Artificial/
├── .github/workflows/        # CI/CD (gitleaks, docs, pages)
├── docs/                     # MkDocs config + índice
├── mkdocs.yml                # Documentación técnica unificada
├── soluciona-inteligencia-artificial-comercial/
│   ├── .github/workflows/    # CI/CD específico (lint, tests, docker, deploy)
│   ├── core/                 # Lógica de negocio (pedidos, menú, clientes, IA, facturación)
│   ├── src/                  # Backend API (Fastify + TypeScript)
│   ├── packages/design-system/  # UI components (React + Storybook)
│   ├── dian-middleware/      # Facturación electrónica DIAN (Colombia)
│   ├── kernel/               # Logger, middleware, correlación
│   ├── monitoring/           # Prometheus, Grafana, Loki, Tempo
│   ├── nginx/                # Reverse proxy producción
│   ├── tests/                # Unit + integración
│   ├── docker-compose*.yml   # Orquestación completa
│   └── README.md             # Instalación, config, despliegue
├── soluciona-inteligencia-artificial-empresarial/
│   ├── .opencode/agents/     # Agentes: revisor, solver, triager
│   ├── docs/                 # 01-plan-maestro → 06-legal-checklist
│   ├── kb/                   # Base de conocimiento (Markdown)
│   ├── scripts/              # Automatización (PowerShell/bash)
│   ├── templates/            # Onboarding, perfiles cliente
│   ├── tickets/              # Sistema de tickets (git-tracked)
│   ├── clientes/             # Datos cliente (gitignored en prod)
│   ├── opencode.json         # Configuración agentes
│   └── README.md             # Instalación, uso, arquitectura
└── soluciona-inteligencia-artificial-residencial/
    └── README.md             # Placeholder (reservado)
```

---

## 🚀 Inicio Rápido (Variante Comercial)

### Prerrequisitos
- Node.js 20+ / Python 3.11+ / Docker + Docker Compose
- Cuenta NVIDIA (API keys para LLM/Visión/Asistentes)
- WhatsApp Business API (o WhatsApp Web para desarrollo)

### Instalación
```bash
# 1. Clonar
git clone https://github.com/DiegoAlejandroSaenzFalcon/Soluciona-Inteligencia-Artificial.git
cd Soluciona-Inteligencia-Artificial/soluciona-inteligencia-artificial-comercial

# 2. Configurar entorno
cp .env.example .env
cp config.example.json config.json
# Editar .env y config.json con tus credenciales

# 3. Desarrollo (Docker)
docker compose -f docker-compose.example.yml up -d

# 4. Producción
docker compose -f docker-compose.yml up -d
```

### Verificación
```bash
# Panel web:       http://localhost:3000
# Panel central:   http://localhost:4000
# Health check:    curl http://localhost:3000/health
```

---

## 🔐 Seguridad (Estándar Cero Secretos)

**Governance finding (2026-10-06):** this repository is currently public on GitHub. Commercial source and deployment architecture must be reviewed before production; visibility must be changed to private by the repository owner before any proprietary production code is treated as protected.

| ❌ Nunca se versiona | ✅ Se versiona (plantillas) |
|----------------------|-----------------------------|
| API keys reales (NVIDIA, Gemini, Telegram, etc.) | `.env.example` / `config.example.json` |
| Sesiones WhatsApp (`auth_info/`, `.wwebjs_auth/`) | Estructura de carpetas vacías (`.gitkeep`) |
| Bases de datos con datos reales (`data/`, `*.db`, `*.sqlite`) | `init-scripts/` (SQL limpio) |
| Configuraciones reales (`config.json`, `.env`, `.pem`, `.key`) | `keycloak/realm-export.json` (con placeholders) |

> **Regla:** `git add` falla si detecta secretos (gitleaks en pre-commit + CI).

---

## 📚 Documentación

| Fuente | Qué contiene |
|--------|--------------|
| **MkDocs (GitHub Pages)** | https://diegoalejandrosaenzfalcon.github.io/Soluciona-Inteligencia-Artificial/ — índice unificado + navegación a cada variante |
| **Comercial** | `soluciona-inteligencia-artificial-comercial/README.md` + `docs/INTEGRACION.md`, `docs/MULTIPLATAFORMA.md`, `docs/PLAN_MIGRACION_*.md` |
| **Empresarial** | `soluciona-inteligencia-artificial-empresarial/docs/01-plan-maestro.md` → `06-legal-checklist.md` + `kb/*.md` |
| **Residencial** | Pendiente |

### Ver docs localmente
```bash
pip install mkdocs mkdocs-material
mkdocs serve
# http://localhost:8000
```

---

## ⚙️ CI/CD (GitHub Actions)

| Workflow | Trigger | Qué hace |
|----------|---------|----------|
| `gitleaks.yml` | Push/PR a cualquier rama | Escaneo de secretos (historia completa) — **requerido para merge** |
| `docs.yml` | Push a `main` / manual | Construye MkDocs + deploy a GitHub Pages |
| `pages.yml` | Push a `main` / manual | Deploy alternativo a GitHub Pages |
| `ci-cd.yml` (comercial) | Push/PR a `main`/`develop` / release | Lint (ruff/eslint) + Type-check (mypy/tsc) + Tests (pytest/vitest) + Security (CodeQL, Semgrep, Trivy) + Docker build/push + Deploy staging/prod |

---

## 📦 Stack Tecnológico (Estándar 2024)

| Capa | Comercial | Empresarial |
|------|-----------|-------------|
| **Runtime** | Node.js 20 (Fastify) / Python 3.11 (DIAN) | PowerShell 7 / Bash / Node.js (opencode) |
| **DB** | SQLite (dev) → PostgreSQL 16 (prod) | Git (Markdown) + SQLite opcional |
| **IA** | NVIDIA Nemotron/Llama (chat, visión, asistentes) | opencode agents + triage IA |
| **Contenedores** | Docker + Docker Compose (multi-arch) | N/A (scripts + agents) |
| **Observabilidad** | Prometheus + Grafana + Loki + Tempo + Jaeger | Logs estructurados + métricas básicas |
| **CI/CD** | GitHub Actions (matrix, cache, SARIF) | GitHub Actions (lint, test agents) |
| **Calidad** | ESLint + Prettier + TypeScript strict + Husky | Ruff + Black + mypy + pre-commit |
| **Versionado** | SemVer + Conventional Commits + changelog | SemVer + Conventional Commits |

---

## 📋 Comandos Útiles (Makefile / NPM Scripts)

```bash
# Comercial
cd soluciona-inteligencia-artificial-comercial
npm run dev          # Desarrollo con hot-reload
npm run lint         # ESLint + Prettier check
npm run typecheck    # TypeScript strict
npm run test         # Vitest (unit + integración)
npm run test:unit    # Solo unitarios
npm run db:migrate   # Migraciones (drizzle)
npm run build        # Build producción
docker compose up -d # Orquestación completa

# Empresarial
cd soluciona-inteligencia-artificial-empresarial
opencode run         # Ejecuta agentes
pwsh scripts/nuevo-ticket.ps1 -Cliente "ACME" -Titulo "Falla red"
```

---

## 🏷️ Versionado y Releases

**Semantic Versioning** + **Conventional Commits**:

```bash
# Formato commit
feat(comercial): añade deduplicación de pedidos por cliente
fix(empresarial): corrige cálculo SLA en festivos
docs(readme): actualiza arquitectura monorepo
chore(deps): actualiza dependencias Node 20 → 22
```

---

## 🤝 Contribuir

> Repositorio **privado** — contribuciones solo por invitación / equipo interno.

1. Rama: `feat/tu-mejora` o `fix/tu-correccion`
2. Commits convencionales (`feat:`, `fix:`, `docs:`, `chore:`)
3. `make check` / `npm run lint && npm run typecheck && npm run test` pasa
4. Pull Request con descripción clara (qué, por qué, cómo validar)
5. Revisión + gitleaks verde → merge a `main`

---

## 📄 Licencia

**MIT License** — libre para usar, modificar, distribuir.
Ver `LICENSE` en la raíz.

```
Copyright (c) 2024-2026 Diego Alejandro Saenz Falcon

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

---

## 👤 Autor

**Diego Alejandro Saenz Falcon**  
`diegoalejandrosaenzfalcon@gmail.com`  
GitHub: [@DiegoAlejandroSaenzFalcon](https://github.com/DiegoAlejandroSaenzFalcon)

> *Construido en privado, entregando en serio. Código que se puede auditar, reconstruir y escalar.*