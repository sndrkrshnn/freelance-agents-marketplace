#!/bin/bash

# ============================================
# Docker Deployment Script
# Freelance AI Agents Marketplace
# ============================================
#
# This script provides easy management of Docker containers
# for the Freelance AI Agents Marketplace.
#
# Usage: ./start-docker.sh [command] [environment]
#
# Commands:
#   start       Start all services
#   stop        Stop all services
#   restart     Restart all services
#   logs        Show logs from all services
#   status      Show status of all services
#   build       Build all images
#   clean       Remove containers, volumes, and images
#   migrate     Run database migrations
#   seed        Seed database with sample data
#   shell       Open shell in a service
#   health      Run health checks
#
# Environment:
#   prod        Production environment (default)
#   dev         Development environment with hot-reload
# ============================================

set -euo pipefail

# ============================================
# Script Configuration
# ============================================
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"
readonly COMPOSE_DEV_FILE="$PROJECT_ROOT/docker-compose.dev.yml"
readonly ENV_FILE="$PROJECT_ROOT/.env"
readonly ENV_PROD_FILE="$PROJECT_ROOT/backend/.env.production"

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color

# ============================================
# Logging Functions
# ============================================
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

log_header() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}========================================${NC}"
}

# ============================================
# Helper Functions
# ============================================
check_docker() {
    log_step "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    log_success "Docker is installed: $(docker --version)"
}

check_docker_compose() {
    log_step "Checking Docker Compose installation..."
    if ! docker compose version &> /dev/null; then
        if ! command -v docker-compose &> /dev/null; then
            log_error "Docker Compose is not installed. Please install it first."
            exit 1
        fi
    fi
    log_success "Docker Compose is available"
}

check_env_files() {
    log_step "Checking environment files..."
    
    if [[ ! -f "$ENV_FILE" ]]; then
        log_warning ".env file not found. Creating from example..."
        if [[ -f "$PROJECT_ROOT/.env.example" ]]; then
            cp "$PROJECT_ROOT/.env.example" "$ENV_FILE"
            log_success "Created .env file. Please configure it before starting."
            return 1
        else
            log_error "No .env.example file found."
            return 1
        fi
    fi
    
    # Check for production env file
    if [[ ! -f "$ENV_PROD_FILE" ]]; then
        log_warning ".env.production not found in backend/. Using only .env"
    fi
    
    # Load and validate required variables
    source "$ENV_FILE"
    
    local missing_vars=()
    
    # Required variables
    if [[ -z "${POSTGRES_PASSWORD:-}" ]]; then
        missing_vars+=("POSTGRES_PASSWORD")
    fi
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_warning "Missing required environment variables: ${missing_vars[*]}"
        log_warning "Please set these in your .env file"
    fi
    
    log_success "Environment files OK"
    return 0
}

validate_environment() {
    log_header "Validating Environment"
    
    check_docker
    check_docker_compose
    check_env_files
    
    # Create required directories
    log_step "Creating required directories..."
    mkdir -p "$PROJECT_ROOT/scripts"
    mkdir -p "$PROJECT_ROOT/nginx/conf.d"
    mkdir -p "$PROJECT_ROOT/uploads"
    mkdir -p "$PROJECT_ROOT/backend/logs"
    mkdir -p "$PROJECT_ROOT/frontend/logs"
    
    log_success "All directories created"
    
    # Set permissions
    log_step "Setting directory permissions..."
    chmod -R 755 "$PROJECT_ROOT/scripts" 2>/dev/null || true
    chmod +x "$SCRIPT_DIR/start-docker.sh" 2>/dev/null || true
    chmod +x "$SCRIPT_DIR/init-db.sql" 2>/dev/null || true
    
    log_success "Environment validation complete"
}

get_compose_command() {
    local environment="${1:-prod}"
    
    if [[ "$environment" == "dev" ]]; then
        echo "docker compose -f $COMPOSE_FILE -f $COMPOSE_DEV_FILE"
    else
        echo "docker compose -f $COMPOSE_FILE"
    fi
}

wait_for_service() {
    local service="$1"
    local max_wait="${2:-60}"
    local count=0
    
    log_step "Waiting for $service to be healthy..."
    
    while [[ $count -lt $max_wait ]]; do
        local status
        status=$(docker compose -f "$COMPOSE_FILE" ps -q "$service" | xargs -r docker inspect --format='{{.State.Health.Status}}' 2>/dev/null || echo "")
        
        if [[ "$status" == "healthy" ]]; then
            log_success "$service is healthy"
            return 0
        fi
        
        sleep 2
        ((count++))
        echo -n "."
    done
    
    echo ""
    log_warning "$service did not become healthy within ${max_wait}s"
    return 1
}

run_health_checks() {
    log_header "Running Health Checks"
    
    local compose_cmd
    compose_cmd=$(get_compose_command "$ENVIRONMENT")
    
    local services=("postgres" "redis" "backend" "frontend" "nginx")
    local all_healthy=true
    
    for service in "${services[@]}"; do
        log_step "Checking $service..."
        
        if $compose_cmd ps | grep -q "$service"; then
            local health_status
            health_status=$($compose_cmd ps "$service" --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | cut -d'"' -f4 || echo "no-healthcheck")
            
            if [[ "$health_status" == "healthy" ]]; then
                log_success "$service: ✓ Healthy"
            elif [[ "$health_status" == "unhealthy" ]]; then
                log_error "$service: ✗ Unhealthy"
                all_healthy=false
            else
                log_warning "$service: ⚠ Running (no healthcheck or starting)"
            fi
        else
            log_warning "$service: Not running"
        fi
    done
    
    if $all_healthy; then
        log_success "All services are healthy!"
        return 0
    else
        log_warning "Some services are not healthy"
        return 1
    fi
}

# ============================================
# Command Functions
# ============================================
cmd_start() {
    log_header "Starting Services - $environment"
    
    validate_environment
    
    local compose_cmd
    compose_cmd=$(get_compose_command "$environment")
    
    log_step "Pulling latest images..."
    $compose_cmd pull || log_warning "Some images could not be pulled (using local versions)"
    
    log_step "Building images if needed..."
    $compose_cmd build --parallel
    
    log_step "Starting containers..."
    $compose_cmd up -d
    
    log_step "Waiting for services to be ready..."
    sleep 5
    
    # Wait for critical services
    wait_for_service "postgres" 60
    wait_for_service "redis" 30
    wait_for_service "backend" 60
    wait_for_service "frontend" 20
    wait_for_service "nginx" 10
    
    # Run health checks
    run_health_checks
    
    log_success "Services started successfully!"
    
    echo ""
    log_info "Application URLs:"
    if [[ "$environment" == "dev" ]]; then
        echo "  • Frontend (Vite):    http://localhost:3000"
        echo "  • Backend API:        http://localhost:5000"
        echo "  • PGAdmin:            http://localhost:8080"
        echo "  • Redis Commander:    http://localhost:8081"
        echo "  • Mailhog:            http://localhost:8025"
    else
        echo "  • Application:        http://localhost"
        echo "  • API:                http://localhost/api"
    fi
    echo ""
}

cmd_stop() {
    log_header "Stopping Services"
    
    local compose_cmd
    compose_cmd=$(get_compose_command "$environment")
    
    log_step "Stopping all containers..."
    $compose_cmd stop
    
    log_success "All services stopped"
}

cmd_restart() {
    log_header "Restarting Services"
    
    cmd_stop
    sleep 2
    cmd_start
}

cmd_logs() {
    local service="${2:-}"
    local follow="${3:-}"
    
    log_header "Viewing Logs"
    
    local compose_cmd
    compose_cmd=$(get_compose_command "$environment")
    
    if [[ -n "$service" ]]; then
        log_info "Showing logs for service: $service"
        if [[ "$follow" == "-f" ]]; then
            $compose_cmd logs -f "$service"
        else
            $compose_cmd logs "$service"
        fi
    else
        log_info "Showing logs for all services (last 100 lines each)"
        if [[ "$follow" == "-f" ]]; then
            $compose_cmd logs -f
        else
            $compose_cmd logs --tail=100
        fi
    fi
}

cmd_status() {
    log_header "Service Status"
    
    local compose_cmd
    compose_cmd=$(get_compose_command "$environment")
    
    log_info "Container Status:"
    $compose_cmd ps
    
    echo ""
    log_info "Resource Usage:"
    if command -v docker stats &> /dev/null; then
        docker stats --no-stream
    fi
}

cmd_build() {
    log_header "Building Images"
    
    local compose_cmd
    compose_cmd=$(get_compose_command "$environment")
    
    log_step "Building all images without cache..."
    $compose_cmd build --no-cache --parallel
    
    log_success "Build complete"
}

cmd_clean() {
    log_header "Cleaning Up"
    
    log_warning "This will remove:"
    echo "  • All containers"
    echo "  • All volumes"
    echo "  • All images"
    echo ""
    
    read -p "Are you sure? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_step "Stopping and removing containers..."
        docker compose -f "$COMPOSE_FILE" down -v --remove-orphans
        
        log_step "Removing images..."
        docker images -q "freelance-marketplace-*" | xargs -r docker rmi -f
        
        log_step "Removing unused volumes..."
        docker volume prune -f
        
        log_step "Removing unused images..."
        docker image prune -a -f
        
        log_success "Cleanup complete"
    else
        log_info "Cleanup cancelled"
    fi
}

cmd_migrate() {
    log_header "Running Database Migrations"
    
    local compose_cmd
    compose_cmd=$(get_compose_command "$environment")
    
    log_step "Ensuring database is running..."
    $compose_cmd up -d postgres
    
    wait_for_service "postgres" 60
    
    log_step "Running migrations..."
    $compose_cmd exec -T backend npm run migrations:run
    
    log_success "Migrations completed"
}

cmd_seed() {
    log_header "Seeding Database"
    
    local compose_cmd
    compose_cmd=$(get_compose_command "$environment")
    
    log_step "Ensuring database is running..."
    $compose_cmd up -d postgres backend
    
    wait_for_service "postgres" 60
    wait_for_service "backend" 60
    
    log_step "Seeding database..."
    $compose_cmd exec -T backend npm run seed
    
    log_success "Database seeded with sample data"
}

cmd_shell() {
    local service="${2:-backend}"
    
    log_header "Opening Shell in $service"
    
    local compose_cmd
    compose_cmd=$(get_compose_command "$environment")
    
    log_info "Opening shell in $service container..."
    $compose_cmd exec "$service" /bin/sh
}

cmd_health() {
    log_header "Health Checks"
    
    validate_environment
    run_health_checks
    
    return $?
}

cmd_help() {
    cat << HELP
${CYAN}Freelance AI Marketplace - Docker Management Script${NC}

${YELLOW}Usage:${NC} $0 [command] [environment]

${YELLOW}Commands:${NC}
  start [env]    Start all services
  stop [env]     Stop all services
  restart [env]  Restart all services
  logs [env]     Show logs from all services
  logs [env] [service]  Show logs for specific service
  logs [env] [service] -f  Follow logs
  status [env]   Show status of all services
  build [env]    Build all images
  clean          Remove containers, volumes, and images
  migrate [env]  Run database migrations
  seed [env]     Seed database with sample data
  shell [env] [service]  Open shell in a service (default: backend)
  health [env]   Run health checks
  help           Show this help message

${YELLOW}Environment:${NC}
  prod           Production environment (default)
  dev            Development environment with hot-reload

${YELLOW}Examples:${NC}
  $0 start prod              Start production environment
  $0 start dev               Start development environment
  $0 logs dev backend -f     Follow backend logs in dev mode
  $0 shell dev postgres      Open shell in Postgres container
  $0 health prod             Run health checks for production

HELP
}

# ============================================
# Main Script
# ============================================
main() {
    local command="${1:-start}"
    local environment="${2:-prod}"
    local extra_arg="${3:-}"

    # Validate environment
    if [[ "$environment" != "prod" && "$environment" != "dev" ]]; then
        log_error "Invalid environment: $environment. Must be 'prod' or 'dev'"
        exit 1
    fi
    
    # Export environment for subshells
    export ENVIRONMENT="$environment"

    # Execute command
    case "$command" in
        start)
            cmd_start
            ;;
        stop)
            cmd_stop
            ;;
        restart)
            cmd_restart
            ;;
        logs)
            cmd_logs "$extra_arg" "${4:-}"
            ;;
        status)
            cmd_status
            ;;
        build)
            cmd_build
            ;;
        clean)
            cmd_clean
            ;;
        migrate)
            cmd_migrate
            ;;
        seed)
            cmd_seed
            ;;
        shell)
            cmd_shell "$extra_arg"
            ;;
        health)
            cmd_health
            ;;
        help|--help|-h)
            cmd_help
            ;;
        *)
            log_error "Unknown command: $command"
            echo ""
            cmd_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
