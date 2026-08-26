# Soluciona IA - Makefile
# Common development tasks

.PHONY: help install dev build test lint typecheck format clean docker-up docker-down docker-logs migrate migrate-verify

# Default target
help:
	@echo "Soluciona IA - Available Commands"
	@echo ""
	@echo "Development:"
	@echo "  install       - Install all dependencies"
	@echo "  dev           - Start development server"
	@echo "  build         - Build for production"
	@echo "  start         - Start production server"
	@echo ""
	@echo "Testing:"
	@echo "  test          - Run all tests"
	@echo "  test:unit     - Run unit tests"
	@echo "  test:integration  - Run integration tests"
	@echo "  test:e2e      - Run E2E tests"
	@echo "  test:watch    - Run tests in watch mode"
	@echo "  test:coverage - Run tests with coverage"
	@echo ""
	@echo "Code Quality:"
	@echo "  lint          - Run ESLint"
	@echo "  typecheck     - Run TypeScript type checking"
	@echo "  format        - Format code with Prettier"
	@echo "  check         - Run all quality checks (lint + typecheck + format)"
	@echo ""
	@echo "Database:"
	@echo "  migrate       - Run database migrations"
	@echo "  migrate:verify - Verify migration integrity"
	@echo "  migrate:rollback - Rollback last migration"
	@echo "  db:seed       - Seed database with test data"
	@echo "  db:reset      - Reset database (drop + migrate + seed)"
	@echo ""
	@echo "Docker:"
	@echo "  docker-up     - Start all services (dev)"
	@echo "  docker-down   - Stop all services"
	@echo "  docker-logs   - View docker logs"
	@echo "  docker-build  - Build production image"
	@echo "  docker-push   - Push Docker image"
	@echo ""
	@echo "Database Migration:"
	@echo "  migrate:sqlite-pg  - Migrate SQLite to PostgreSQL"
	@echo "  migrate:verify     - Verify migration checksums"
	@echo ""
	@echo "Cleanup:"
	@echo "  clean         - Clean build artifacts"
	@echo "  clean:all     - Clean everything including node_modules"
	@echo ""
	@echo "Deployment:"
	@echo "  deploy:staging   - Deploy to staging"
	@echo "  deploy:prod      - Deploy to production"

# ============================================================
# Development
# ============================================================
install:
	npm ci

dev:
	npm run dev

build:
	npm run build

start:
	npm start

# ============================================================
# Testing
# ============================================================
test:
	npm run test

test:unit:
	npm run test:unit

test:integration:
	npm run test:integration

test:e2e:
	npm run test:e2e

test:watch:
	npm run test:watch

test:coverage:
	npm run test:coverage

# ============================================================
# Code Quality
# ============================================================
lint:
	npm run lint

typecheck:
	npm run typecheck

format:
	npm run format

check: lint typecheck format

# ============================================================
# Database
# ============================================================
migrate:
	npm run db:migrate

migrate:verify:
	npm run db:verify

migrate:rollback:
	npm run db:rollback

db:seed:
	npm run db:seed

db:reset:
	npm run db:reset

# ============================================================
# Docker
# ============================================================
docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-build:
	docker build -f Dockerfile.prod -t soluciona-ia:latest .

docker-push:
	docker push ghcr.io/$(shell basename `git rev-parse --show-toplevel`):latest

# ============================================================
# Database Migration
# ============================================================
migrate:sqlite-pg:
	node --experimental-sqlite scripts/migrate-sqlite-to-pg.js

migrate:verify:
	node --experimental-sqlite scripts/migrate-sqlite-to-pg.js --verify

# ============================================================
# Cleanup
# ============================================================
clean:
	rm -rf dist/
	rm -rf coverage/
	rm -rf .nyc_output/
	rm -rf .eslintcache
	rm -rf *.tsbuildinfo

clean:all: clean
	rm -rf node_modules/
	rm -rf dist/
	rm -rf coverage/
	rm -rf logs/
	rm -rf data/backups/
	rm -rf .nyc_output/
	rm -rf .eslintcache

# ============================================================
# Deployment
# ============================================================
deploy:staging:
	@echo "Deploying to staging..."
	# Add your staging deployment commands here

deploy:prod:
	@echo "Deploying to production..."
	# Add your production deployment commands here

# ============================================================
# Utility
# ============================================================
reset-db:
	rm -f data/neurallgo.db
	rm -rf data/backups/
	make migrate

logs:
	tail -f logs/*.log 2>/dev/null || echo "No log files found"

health:
	curl -s http://localhost:3000/api/health | jq .

# ============================================================
# Development Helpers
# ============================================================
reset: clean install migrate db:seed

fresh: clean install migrate db:seed dev

# ============================================================
# CI/CD Local Simulation
# ============================================================
ci-local: lint typecheck test:unit test:integration build
	@echo "All CI checks passed!"