COMPOSE ?= docker compose
DEV_COMPOSE ?= $(COMPOSE) -f docker-compose.yml -f docker-compose.local.yml

.PHONY: help dev dev-config dev-down up down build config logs ps ui-build api-check

help:
	@echo "Available commands:"
	@echo "  make dev        Local only: run docker-compose.yml + docker-compose.local.yml with rebuilds and attached logs"
	@echo "  make dev-config Local only: validate and print the local override Compose config"
	@echo "  make dev-down   Local only: stop the local override stack"
	@echo "  make up         Production shape: start docker-compose.yml in the background"
	@echo "  make down       Production shape: stop docker-compose.yml"
	@echo "  make build      Production shape: build Docker images"
	@echo "  make config     Production shape: validate and print docker-compose.yml"
	@echo "  make logs       Production shape: follow stack logs"
	@echo "  make ps         Production shape: show stack containers"
	@echo "  make ui-build   Run the Vite production build"
	@echo "  make api-check  Syntax-check API source files"

dev: .env
	$(DEV_COMPOSE) up --build

dev-config:
	$(DEV_COMPOSE) config

dev-down:
	$(DEV_COMPOSE) down

up: .env
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

build:
	$(COMPOSE) build

config:
	$(COMPOSE) config

logs:
	$(COMPOSE) logs -f

ps:
	$(COMPOSE) ps

ui-build:
	cd ui && npm run build

api-check:
	find api/src -name '*.js' -exec node --check {} \;

.env:
	cp .env.example .env
	@echo "Created .env from .env.example. Edit it before deploying to production."
