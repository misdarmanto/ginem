.PHONY: help install dev dev-api dev-dashboard build build-api build-dashboard test lint lint-fix clean migrate seed docker-up docker-down

help:
	@echo "🚀 Ginem Dev Monorepo - Commands"
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "⚡ MOST USED:"
	@echo ""
	@echo "  make dev              - Run API + Dashboard (✨ RECOMMENDED)"
	@echo "  make build            - Build for production"
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "🔧 Setup:"
	@echo ""
	@echo "  make install          - Install dependencies"
	@echo "  make clean            - Clean & reinstall"
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "📊 Development:"
	@echo ""
	@echo "  make dev              - Run both (see above)"
	@echo "  make dev-api          - Run API only"
	@echo "  make dev-dashboard    - Run Dashboard only"
	@echo ""
	@echo "Build:"
	@echo "  make build            - Build all packages"
	@echo "  make build-api        - Build API only"
	@echo "  make build-dashboard  - Build Dashboard only"
	@echo ""
	@echo "Testing & Quality:"
	@echo "  make test             - Run all tests"
	@echo "  make lint             - Check linting"
	@echo "  make lint-fix         - Fix linting issues"
	@echo ""
	@echo "Database:"
	@echo "  make migrate          - Run migrations"
	@echo "  make seed             - Seed database"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-up        - Start Docker services"
	@echo "  make docker-down      - Stop Docker services"
	@echo "  make docker-logs      - View Docker logs"

install:
	npm install

clean:
	npm run clean

dev:
	npm run dev

dev-api:
	npm run dev:api

dev-dashboard:
	npm run dev:dashboard

build:
	npm run build

build-api:
	npm run build:api

build-dashboard:
	npm run build:dashboard

start:
	npm run start

test:
	npm run test

lint:
	npm run lint

lint-fix:
	npm run lint:fix

migrate:
	npm run migrate:up

seed:
	npm run seed

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-build:
	docker-compose build

docker-rebuild:
	docker-compose down && docker-compose build && docker-compose up -d
