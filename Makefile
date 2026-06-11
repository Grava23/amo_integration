.PHONY: up up-prod up-dev down prisma dev-web build-web

COMPOSE_FILES = -f docker/docker-compose.yml -f docker/docker-compose.dev.yml

up up-prod: down
	docker compose -f docker/docker-compose.yml up -d --build

up-dev: down
	docker compose -f docker/docker-compose.dev.yml up -d --build

down:
	docker compose $(COMPOSE_FILES) down

prisma:
	npm run prisma:generate

dev-web:
	npm run dev:web

# VITE_API_URL=https://ваш-домен.ru make build-web
build-web:
	npm run build:web --prefix frontend