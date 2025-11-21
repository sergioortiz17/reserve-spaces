.PHONY: help build up down logs clean dev

# Default target
help:
	@echo "Available commands:"
	@echo "  build    - Build all Docker images"
	@echo "  up       - Start all services"
	@echo "  down     - Stop all services"
	@echo "  logs     - View logs from all services"
	@echo "  clean    - Remove all containers, images, and volumes"
	@echo "  dev      - Start development environment"

# Build all Docker images
build:
	docker-compose build

# Start all services
up:
	docker-compose up -d

# Stop all services
down:
	docker-compose down

# View logs
logs:
	docker-compose logs -f

# Clean everything
clean:
	docker-compose down -v --rmi all
	docker system prune -f

# Development environment
dev:
	docker-compose up --build

# Development helpers
backend-dev:
	cd app/backend && go run cmd/server/main.go

frontend-dev:
	cd app/frontend && npm run dev

install-deps:
	cd app/backend && go mod tidy
	cd app/frontend && npm install