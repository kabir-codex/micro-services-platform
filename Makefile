.PHONY: help test lint test-node test-java test-frontend up down seed

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

test: test-node test-java test-frontend ## Run every service's test suite

lint: lint-node lint-frontend ## Run every linter

test-node: ## Orders API tests (node --test)
	cd backend-node && npm test

lint-node: ## Orders API eslint
	cd backend-node && npm run lint

test-java: ## Catalog API tests (mvn test)
	cd backend-java && mvn -B test

test-frontend: ## Frontend vitest suite
	cd frontend && npm test

lint-frontend: ## Frontend eslint
	cd frontend && npm run lint

up: ## Start the compose dev environment
	docker compose up --build -d

down: ## Stop the compose dev environment
	docker compose down

seed: ## Seed the local database (localhost only)
	./scripts/seed-db.sh
