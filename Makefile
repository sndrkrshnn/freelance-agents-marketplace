# Makefile for Freelance AI Agents Marketplace
# Common development tasks and commands

.PHONY: help install install-backend install-backend-dev install-frontend install-frontend-dev clean test test-backend test-frontend lint lint-backend lint-frontend build build-backend build-frontend docker docker-up docker-down docker-logs docker-clean deploy deploy-staging deploy-production health-check rollback

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m # No Color

# Variables
BACKEND_DIR := backend
FRONTEND_DIR := frontend
DOCKER_COMPOSE := docker-compose
NODE_VERSION := 18

help: ## Show this help message
	@echo "$(BLUE)Freelance AI Agents Marketplace - Available Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-25s$(NC) %s\n", $$1, $$2}'

# ============================================
# Installation
# ============================================

install: install-backend-dev install-frontend-dev ## Install all dependencies (development)
	@echo "$(GREEN)✓ All dependencies installed$(NC)"

install-backend: ## Install backend production dependencies
	@cd $(BACKEND_DIR) && npm ci --production
	@echo "$(GREEN)✓ Backend production dependencies installed$(NC)"

install-backend-dev: ## Install backend development dependencies
	@cd $(BACKEND_DIR) && npm ci
	@echo "$(GREEN)✓ Backend development dependencies installed$(NC)"

install-frontend: ## Install frontend production dependencies
	@cd $(FRONTEND_DIR) && npm ci
	@echo "$(GREEN)✓ Frontend production dependencies installed$(NC)"

install-frontend-dev: ## Install frontend development dependencies
	@cd $(FRONTEND_DIR) && npm ci
	@echo "$(GREEN)✓ Frontend development dependencies installed$(NC)"

# ============================================
# Development
# ============================================

dev: ## Start all services in development mode
	@echo "$(BLUE)Starting development servers...$(NC)"
	@$(MAKE) -j2 dev-backend dev-frontend

dev-backend: ## Start backend development server
	@cd $(BACKEND_DIR) && npm run dev

dev-frontend: ## Start frontend development server
	@cd $(FRONTEND_DIR) && npm run dev

# ============================================
# Testing
# ============================================

test: test-backend test-frontend ## Run all tests
	@echo "$(GREEN)✓ All tests completed$(NC)"

test-backend: ## Run backend tests
	@echo "$(BLUE)Running backend tests...$(NC)"
	@cd $(BACKEND_DIR) && npm test

test-backend-coverage: ## Run backend tests with coverage
	@echo "$(BLUE)Running backend tests with coverage...$(NC)"
	@cd $(BACKEND_DIR) && npm test -- --coverage

test-frontend: ## Run frontend type check
	@echo "$(BLUE)Running frontend type check...$(NC)"
	@cd $(FRONTEND_DIR) && npm run type-check

# ============================================
# Linting
# ============================================

lint: lint-backend lint-frontend ## Run all linters
	@echo "$(GREEN)✓ All linting completed$(NC)"

lint-backend: ## Lint backend code
	@echo "$(BLUE)Linting backend...$(NC)"
	@cd $(BACKEND_DIR) && npm run lint

lint-frontend: ## Lint frontend code
	@echo "$(BLUE)Linting frontend...$(NC)"
	@cd $(FRONTEND_DIR) && npm run lint

format: format-backend format-frontend ## Format all code

format-backend: ## Format backend code with Prettier
	@cd $(BACKEND_DIR) && npm run format --if-present || npx prettier --write "src/**/*.js"

format-frontend: ## Format frontend code with Prettier
	@cd $(FRONTEND_DIR) && npm run format --if-present || npx prettier --write "src/**/*.{ts,tsx,css}"

# ============================================
# Building
# ============================================

build: build-backend build-frontend ## Build all projects

build-backend: ## Build backend for production
	@echo "$(BLUE)Building backend...$(NC)"
	@cd $(BACKEND_DIR) && npm run build || echo "No build script for backend"
	@echo "$(GREEN)✓ Backend built$(NC)"

build-frontend: ## Build frontend for production
	@echo "$(BLUE)Building frontend...$(NC)"
	@cd $(FRONTEND_DIR) && npm run build
	@echo "$(GREEN)✓ Frontend built$(NC)"

# ============================================
# Docker
# ============================================

docker-up: ## Start Docker containers
	@echo "$(BLUE)Starting Docker containers...$(NC)"
	@$(DOCKER_COMPOSE) up -d
	@echo "$(GREEN)✓ Docker containers started$(NC)"
	@echo "$(YELLOW)Frontend: http://localhost:3000$(NC)"
	@echo "$(YELLOW)Backend: http://localhost:5000$(NC)"
	@echo "$(YELLOW)pgAdmin: http://localhost:5050$(NC)"
	@echo "$(YELLOW)Redis Commander: http://localhost:8081$(NC)"

docker-down: ## Stop Docker containers
	@echo "$(BLUE)Stopping Docker containers...$(NC)"
	@$(DOCKER_COMPOSE) down
	@echo "$(GREEN)✓ Docker containers stopped$(NC)"

docker-logs: ## Show Docker logs
	@$(DOCKER_COMPOSE) logs -f

docker-logs-backend: ## Show backend logs
	@$(DOCKER_COMPOSE) logs -f backend

docker-logs-frontend: ## Show frontend logs
	@$(DOCKER_COMPOSE) logs -f frontend

docker-restart: docker-down docker-up ## Restart Docker containers

docker-build: ## Rebuild Docker containers
	@echo "$(BLUE)Rebuilding Docker containers...$(NC)"
	@$(DOCKER_COMPOSE) build
	@echo "$(GREEN)✓ Docker containers rebuilt$(NC)"

docker-clean: ## Remove all Docker containers, volumes, and images
	@echo "$(BLUE)Cleaning up Docker...$(NC)"
	@$(DOCKER_COMPOSE) down -v --rmi all
	@echo "$(GREEN)✓ Docker cleaned$(NC)"

docker-status: ## Show Docker container status
	@$(DOCKER_COMPOSE) ps

# ============================================
# Database
# ============================================

db-migrate: ## Run database migrations
	@cd $(BACKEND_DIR) && npm run migrations:run

db-seed: ## Seed database with sample data
	@cd $(BACKEND_DIR) && npm run seed

db-reset: ## Reset database
	@echo "$(YELLOW)Warning: This will delete all data!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS freelance_agents_db;"; \
		docker-compose exec postgres psql -U postgres -c "CREATE DATABASE freelance_agents_db;"; \
		cd $(BACKEND_DIR) && npm run migrations:run && npm run seed; \
		echo "$(GREEN)✓ Database reset$(NC)"; \
	fi

# ============================================
# Deployment
# ============================================

deploy: deploy-staging ## Deploy to staging (default)

deploy-staging: ## Deploy to staging environment
	@echo "$(BLUE)Deploying to staging...$(NC)"
	@./scripts/deploy.sh staging auto
	@echo "$(GREEN)✓ Deployed to staging$(NC)"

deploy-production: ## Deploy to production environment
	@echo "$(BLUE)Deploying to production...$(NC)"
	@echo "$(YELLOW)This requires manual approval!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		./scripts/deploy.sh production auto; \
		echo "$(GREEN)✓ Deployed to production$(NC)"; \
	else \
		echo "Deployment cancelled"; \
	fi

health-check: ## Run health checks
	@./scripts/deploy.sh staging health-check

rollback: ## Rollback deployment
	@echo "$(YELLOW)Rolling back deployment...$(NC)"
	@read -p "Which environment? [staging/production]: " env; \
	./scripts/deploy.sh $$env rollback

# ============================================
# CI/CD
# ============================================

ci: lint test build-frontend ## Run CI tasks locally

ci-full: ci test-backend-coverage ## Run full CI tasks with coverage

# ============================================
# Utility
# ============================================

clean: ## Clean build artifacts and dependencies
	@echo "$(BLUE)Cleaning...$(NC)"
	@rm -rf $(BACKEND_DIR)/node_modules
	@rm -rf $(BACKEND_DIR)/dist
	@rm -rf $(BACKEND_DIR)/coverage
	@rm -rf $(FRONTEND_DIR)/node_modules
	@rm -rf $(FRONTEND_DIR)/dist
	@rm -rf $(FRONTEND_DIR)/.vite
	@rm -rf $(FRONTEND_DIR)/coverage
	@echo "$(GREEN)✓ Cleaned$(NC)"

update: ## Update all dependencies
	@echo "$(BLUE)Updating dependencies...$(NC)"
	@cd $(BACKEND_DIR) && npx npm-check-updates -u && npm install
	@cd $(FRONTEND_DIR) && npx npm-check-updates -u && npm install
	@echo "$(GREEN)✓ Dependencies updated$(NC)"

audit: ## Run security audit
	@echo "$(BLUE)Running security audit...$(NC)"
	@cd $(BACKEND_DIR) && npm audit
	@cd $(FRONTEND_DIR) && npm audit

git-hooks: ## Install git hooks
	@echo "$(BLUE)Installing git hooks...$(NC)"
	@cp scripts/git-hooks/pre-commit .git/hooks/pre-commit
	@chmod +x .git/hooks/pre-commit
	@echo "$(GREEN)✓ Git hooks installed$(NC)"

# ============================================
# Info
# ============================================

info: ## Show project information
	@echo "$(BLUE)Project Information$(NC)"
	@echo "Backend Node: $$(cd $(BACKEND_DIR) && node --version)"
	@echo "Frontend Node: $$(cd $(FRONTEND_DIR) && node --version)"
	@echo "Backend version: $$(cd $(BACKEND_DIR) && node -p "require('./package.json').version")"
	@echo "Frontend version: $$(cd $(FRONTEND_DIR) && node -p "require('./package.json').version")"

status: ## Show development status
	@echo "$(BLUE)Development Status$(NC)"
	@echo ""
	@echo "Docker:"
	@$(DOCKER_COMPOSE) ps
	@echo ""
	@echo "Processes on port 3000:"
	@lsof -ti:3000 > /dev/null && echo "Frontend running ✓" || echo "Frontend not running"
	@echo "Processes on port 5000:"
	@lsof -ti:5000 > /dev/null && echo "Backend running ✓" || echo "Backend not running"

.PHONY: help install install-backend install-backend-dev install-frontend install-frontend-dev clean test test-backend test-frontend lint lint-backend lint-frontend build build-backend build-frontend docker docker-up docker-down docker-logs docker-clean deploy deploy-staging deploy-production health-check rollback
