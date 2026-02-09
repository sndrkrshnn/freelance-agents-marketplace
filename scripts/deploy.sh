#!/bin/bash

###############################################################
# Deployment Script for Freelance AI Agents Marketplace
#
# Usage:
#   ./scripts/deploy.sh <environment> <version> [action]
#
# Environments: staging, production
# Actions: deploy, rollback, health-check, status
#
# Examples:
#   ./scripts/deploy.sh staging 1.0.0
#   ./scripts/deploy.sh production 1.0.0 deploy
#   ./scripts/deploy.sh staging health-check
#   ./scripts/deploy.sh production rollback
###############################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-staging}"
VERSION="${2:-}"
ACTION="${3:-deploy}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="/var/log/freelance-marketplace/deploy-${TIMESTAMP}.log"

# Load environment variables
load_env() {
    ENV_FILE="${PROJECT_ROOT}/.env.${ENVIRONMENT}"
    if [ -f "$ENV_FILE" ]; then
        # shellcheck source=/dev/null
        source "$ENV_FILE"
    else
        echo -e "${YELLOW}Warning: $ENV_FILE not found. Using default values.${NC}"
    fi
}

# Docker registry configuration
REGISTRY="${DOCKER_REGISTRY:-ghcr.io}"
BACKEND_IMAGE="${REGISTRY}/sndrkrshnn/freelance-marketplace-backend"
FRONTEND_IMAGE="${REGISTRY}/sndrkrshnn/freelance-marketplace-frontend"

# Namespace configuration
NAMESPACE="freelance-marketplace-${ENVIRONMENT}"

# Kubernetes configuration
KUBECONFIG="${KUBECONFIG:-$HOME/.kube/config}"

###############################################################
# Logging Functions
###############################################################

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} ✅ $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} ❌ $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} ⚠️  $1" | tee -a "$LOG_FILE"
}

###############################################################
# Validation Functions
###############################################################

validate_environment() {
    log "Validating environment: ${ENVIRONMENT}"
    
    case "$ENVIRONMENT" in
        staging|production)
            ;;
        *)
            log_error "Invalid environment: ${ENVIRONMENT}. Must be 'staging' or 'production'"
            exit 1
            ;;
    esac
    
    log_success "Environment validated"
}

validate_kubectl() {
    log "Checking kubectl installation..."
    
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi
    
    if [ ! -f "$KUBECONFIG" ]; then
        log_error "Kubeconfig file not found: $KUBECONFIG"
        exit 1
    fi
    
    kubectl cluster-info &> /dev/null || {
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    }
    
    log_success "kubectl validated"
}

validate_docker() {
    log "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    log_success "Docker validated"
}

###############################################################
# Kubernetes Functions
###############################################################

apply_kubernetes_manifests() {
    log "Applying Kubernetes manifests..."
    
    # Create namespace if it doesn't exist
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply ConfigMaps and Secrets
    kubectl apply -f "${PROJECT_ROOT}/k8s/${ENVIRONMENT}/configmap.yaml" -n "$NAMESPACE"
    kubectl apply -f "${PROJECT_ROOT}/k8s/${ENVIRONMENT}/secrets.yaml" -n "$NAMESPACE"
    
    log_success "Kubernetes manifests applied"
}

deploy_backend() {
    log "Deploying backend: ${BACKEND_IMAGE}:${VERSION}"
    
    # Update image in deployment
    kubectl set image deployment/backend \
        backend="${BACKEND_IMAGE}:${VERSION}" \
        -n "$NAMESPACE" \
        --record
    
    # Wait for rollout
    kubectl rollout status deployment/backend -n "$NAMESPACE" --timeout=5m
    
    log_success "Backend deployment completed"
}

deploy_frontend() {
    log "Deploying frontend: ${FRONTEND_IMAGE}:${VERSION}"
    
    # Update image in deployment
    kubectl set image deployment/frontend \
        frontend="${FRONTEND_IMAGE}:${VERSION}" \
        -n "$NAMESPACE" \
        --record
    
    # Wait for rollout
    kubectl rollout status deployment/frontend -n "$NAMESPACE" --timeout=5m
    
    log_success "Frontend deployment completed"
}

rollback_backend() {
    log "Rolling back backend deployment..."
    
    kubectl rollout undo deployment/backend -n "$NAMESPACE"
    kubectl rollout status deployment/backend -n "$NAMESPACE" --timeout=5m
    
    log_success "Backend rollback completed"
}

rollback_frontend() {
    log "Rolling back frontend deployment..."
    
    kubectl rollout undo deployment/frontend -n "$NAMESPACE"
    kubectl rollout status deployment/frontend -n "$NAMESPACE" --timeout=5m
    
    log_success "Frontend rollback completed"
}

###############################################################
# Health Check Functions
###############################################################

check_pod_status() {
    local deployment=$1
    local max_attempts=30
    local attempt=1
    
    log "Checking pod status for ${deployment}..."
    
    while [ $attempt -le $max_attempts ]; do
        local ready_replicas
        ready_replicas=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        local desired_replicas
        desired_replicas=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
        
        if [ "$ready_replicas" = "$desired_replicas" ] && [ "$ready_replicas" -gt 0 ]; then
            log_success "Deployment ${deployment} is healthy (Ready: ${ready_replicas}/${desired_replicas})"
            return 0
        fi
        
        log "Waiting for ${deployment} to be ready... (${attempt}/${max_attempts})"
        sleep 5
        attempt=$((attempt + 1))
    done
    
    log_error "Deployment ${deployment} failed to become ready"
    return 1
}

check_backend_health() {
    log "Checking backend health..."
    
    local backend_url
    backend_url=$(kubectl get ingress -n "$NAMESPACE" -o jsonpath='{.items[0].spec.rules[0].host}' 2>/dev/null || echo "")
    
    if [ -z "$backend_url" ]; then
        # Try service port-forward if ingress not available
        log_warning "No ingress found, checking via service..."
        kubectl run healthcheck --rm -i --restart=Never --image=busybox -- wget -qO- http://backend:5000/health || {
            log_error "Backend health check failed"
            return 1
        }
    else
        curl -f "https://${backend_url}/api/health" || {
            log_error "Backend health check failed"
            return 1
        }
    fi
    
    log_success "Backend is healthy"
    return 0
}

check_frontend_health() {
    log "Checking frontend health..."
    
    local frontend_url
    frontend_url=$(kubectl get ingress -n "$NAMESPACE" -o jsonpath='{.items[0].spec.rules[0].host}' 2>/dev/null || echo "")
    
    if [ -z "$frontend_url" ]; then
        log_warning "No ingress found, skipping frontend health check"
        return 0
    fi
    
    curl -f "https://${frontend_url}" || {
        log_error "Frontend health check failed"
        return 1
    }
    
    log_success "Frontend is healthy"
    return 0
}

run_health_checks() {
    log "Running health checks..."
    
    check_pod_status "backend" || exit 1
    check_pod_status "frontend" || exit 1
    
    # Wait a bit for services to be fully ready
    sleep 10
    
    check_backend_health || true
    check_frontend_health || true
    
    log_success "Health checks completed"
}

###############################################################
# Status Functions
###############################################################

show_deployment_status() {
    log "Deployment status for ${ENVIRONMENT}"
    
    echo ""
    echo "=== Kubernetes Deployments ==="
    kubectl get deployments -n "$NAMESPACE"
    
    echo ""
    echo "=== Pods ==="
    kubectl get pods -n "$NAMESPACE"
    
    echo ""
    echo "=== Services ==="
    kubectl get services -n "$NAMESPACE"
    
    echo ""
    echo "=== Ingress ==="
    kubectl get ingress -n "$NAMESPACE" || log_warning "No ingress configured"
    
    echo ""
    echo "=== Recent Events ==="
    kubectl get events -n "$NAMESPACE" --sort-by='.lastTimestamp' | tail -20
}

###############################################################
# Main Functions
###############################################################

deploy() {
    log "Starting deployment to ${ENVIRONMENT}..."
    
    validate_environment
    validate_kubectl
    
    if [ -z "$VERSION" ]; then
        log_error "Version is required for deployment"
        echo "Usage: $0 ${ENVIRONMENT} <version>"
        exit 1
    fi
    
    log "Deploying version: ${VERSION}"
    
    # Pull images (optional - k8s will pull automatically)
    # docker pull "${BACKEND_IMAGE}:${VERSION}"
    # docker pull "${FRONTEND_IMAGE}:${VERSION}"
    
    apply_kubernetes_manifests
    deploy_backend
    deploy_frontend
    run_health_checks
    
    log_success "Deployment to ${ENVIRONMENT} completed successfully!"
    
    # Save deployment info
    echo "${VERSION}" > "${PROJECT_ROOT}/.deployed-version-${ENVIRONMENT}"
}

rollback() {
    log "Starting rollback for ${ENVIRONMENT}..."
    
    validate_environment
    validate_kubectl
    
    # Ask for confirmation in production
    if [ "$ENVIRONMENT" = "production" ]; then
        echo -n "Are you sure you want to rollback production? (yes/no): "
        read -r CONFIRM
        if [ "$CONFIRM" != "yes" ]; then
            log "Rollback cancelled"
            exit 0
        fi
    fi
    
    rollback_backend
    rollback_frontend
    run_health_checks
    
    log_success "Rollback completed!"
}

health_check() {
    log "Running health checks for ${ENVIRONMENT}..."
    
    validate_environment
    validate_kubectl
    
    run_health_checks
}

status() {
    log "Getting status for ${ENVIRONMENT}..."
    
    validate_environment
    validate_kubectl
    
    show_deployment_status
}

display_usage() {
    cat << EOF
Deployment Script for Freelance AI Agents Marketplace

Usage:
  $0 <environment> <version> [action]

Environments:
  staging        Deploy to staging environment
  production     Deploy to production environment

Actions:
  deploy         Deploy specified version (default)
  rollback       Rollback to previous version
  health-check   Run health checks
  status         Show deployment status

Examples:
  $0 staging 1.0.0              Deploy version 1.0.0 to staging
  $0 staging health-check       Run health checks on staging
  $0 production rollback        Rollback production deployment
  $0 production                 Show production status

Environment Variables:
  DOCKER_REGISTRY    Docker registry (default: ghcr.io)
  KUBECONFIG         Path to kubeconfig file
  NAMESPACE          Kubernetes namespace

EOF
}

###############################################################
# Main Entry Point
###############################################################

main() {
    # Parse arguments
    if [ $# -eq 0 ]; then
        display_usage
        exit 0
    fi
    
    # Ensure log directory exists
    mkdir -p "$(dirname "$LOG_FILE")"
    
    log "Deployment script started"
    log "Environment: ${ENVIRONMENT}"
    log "Version: ${VERSION}"
    log "Action: ${ACTION}"
    
    case "$ACTION" in
        deploy)
            deploy
            ;;
        rollback)
            rollback
            ;;
        health-check)
            health_check
            ;;
        status)
            status
            ;;
        *)
            log_error "Unknown action: ${ACTION}"
            display_usage
            exit 1
            ;;
    esac
    
    log "Deployment script finished"
}

main "$@"
