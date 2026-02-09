#!/bin/bash

# ============================================
# Health Check Script
# Freelance AI Agents Marketplace
# ============================================

# This script checks the health of your deployed services
# Usage: ./scripts/health-check.sh <backend-url>

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKEND_URL=${1:-"https://localhost:5000"}
TIMEOUT=10

# Helper functions
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_header() {
    echo ""
    echo -e "${GREEN}$1${NC}"
    echo "=========================================="
}

# Test HTTP endpoint
test_endpoint() {
    local url="$1"
    local description="$2"
    local expected_status="${3:-200}"
    
    print_info "Testing: $description"
    
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$url" 2>/dev/null || echo "000")
    
    if [ "$status_code" = "$expected_status" ]; then
        print_success "Status: $status_code"
        return 0
    else
        print_error "Status: $status_code (expected: $expected_status)"
        return 1
    fi
}

# Get JSON response
get_json() {
    local url="$1"
    curl -s --max-time $TIMEOUT "$url" 2>/dev/null || echo '{"error":"request failed"}'
}

# Print banner
print_header "Freelance AI Marketplace - Health Check"
echo ""
echo "Backend URL: $BACKEND_URL"
echo "Timeout: ${TIMEOUT}s"
echo ""

# Counters
total_tests=0
passed_tests=0
failed_tests=0

# Test 1: Root Endpoint
print_header "Test 1: Root Endpoint"
total_tests=$((total_tests + 1))
if test_endpoint "$BACKEND_URL/" "Root endpoint"; then
    passed_tests=$((passed_tests + 1))
    echo ""
    get_json "$BACKEND_URL/" | jq '.' || get_json "$BACKEND_URL/"
else
    failed_tests=$((failed_tests + 1))
fi

# Test 2: Health Check
print_header "Test 2: Health Check Endpoint"
total_tests=$((total_tests + 1))
if test_endpoint "$BACKEND_URL/health" "Health check endpoint"; then
    passed_tests=$((passed_tests + 1))
    echo ""
    local health_data=$(get_json "$BACKEND_URL/health")
    echo "$health_data" | jq '.' 2>/dev/null || echo "$health_data"
    echo ""
    
    # Check if health is successful
    local status=$(echo "$health_data" | jq -r '.status' 2>/dev/null || echo "unknown")
    if [ "$status" = "healthy" ]; then
        print_success "Application is healthy"
    else
        print_warning "Application status: $status"
    fi
else
    failed_tests=$((failed_tests + 1))
fi

# Test 3: API Health
print_header "Test 3: API Health Endpoint"
total_tests=$((total_tests + 1))
if test_endpoint "$BACKEND_URL/api/v1/health" "API v1 health endpoint"; then
    passed_tests=$((passed_tests + 1))
    echo ""
    get_json "$BACKEND_URL/api/v1/health" | jq '.' || get_json "$BACKEND_URL/api/v1/health"
else
    failed_tests=$((failed_tests + 1))
    print_info "API v1 health endpoint may not exist (optional)"
fi

# Test 4: Redis Health (if endpoint exists)
print_header "Test 4: Redis Health"
total_tests=$((total_tests + 1))
if test_endpoint "$BACKEND_URL/api/v1/health/redis" "Redis health endpoint"; then
    passed_tests=$((passed_tests + 1))
    echo ""
    get_json "$BACKEND_URL/api/v1/health/redis" | jq '.' || get_json "$BACKEND_URL/api/v1/health/redis"
else
    failed_tests=$((failed_tests + 1))
    print_warning "Redis health endpoint not available (optional)"
fi

# Test 5: Response Time
print_header "Test 5: Response Time"
total_tests=$((total_tests + 1))
print_info "Testing response time..."
start_time=$(date +%s%N)
response=$(curl -s --max-time $TIMEOUT "$BACKEND_URL/health" 2>/dev/null)
end_time=$(date +%s%N)
response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds

echo "Response time: ${response_time}ms"

if [ $response_time -lt 1000 ]; then
    print_success "Response time is good (< 1s)"
    passed_tests=$((passed_tests + 1))
elif [ $response_time -lt 5000 ]; then
    print_warning "Response time is acceptable (< 5s)"
    passed_tests=$((passed_tests + 1))
else
    print_error "Response time is slow (> 5s)"
    failed_tests=$((failed_tests + 1))
fi

# Test 6: Database Connectivity (inferred from health)
print_header "Test 6: Database Connectivity"
total_tests=$((total_tests + 1))
print_info "Testing database connectivity..."
if curl -s --max-time $TIMEOUT "$BACKEND_URL/health" | grep -q "healthy"; then
    print_success "Database is connected (application is healthy)"
    passed_tests=$((passed_tests + 1))
else
    print_error "Database connection may have issues"
    failed_tests=$((failed_tests + 1))
fi

# Test 7: CORS / OPTIONS request
print_header "Test 7: CORS/Headers"
total_tests=$((total_tests + 1))
print_info "Testing CORS headers..."
local cors_headers=$(curl -s -I --max-time $TIMEOUT "$BACKEND_URL/health" 2>/dev/null | grep -i access-control || echo "")

if [ -n "$cors_headers" ]; then
    print_success "CORS headers present"
    echo "$cors_headers"
    passed_tests=$((passed_tests + 1))
else
    print_info "No CORS headers detected (may not be configured for this endpoint)"
    failed_tests=$((failed_tests + 1))
fi

# Test 8: HTTPS / SSL (if URL is HTTPS)
if [[ "$BACKEND_URL" == https://* ]]; then
    print_header "Test 8: SSL/TLS Certificate"
    total_tests=$((total_tests + 1))
    print_info "Checking SSL certificate..."
    
    if curl -f --max-time $TIMEOUT "$BACKEND_URL/health" &> /dev/null; then
        print_success "SSL certificate is valid"
        passed_tests=$((passed_tests + 1))
    else
        print_error "SSL certificate issue detected"
        failed_tests=$((failed_tests + 1))
    fi
fi

# Summary
print_header "Health Check Summary"
echo "Total Tests: $total_tests"
echo -e "${GREEN}Passed: $passed_tests${NC}"
echo -e "${RED}Failed: $failed_tests${NC}"
echo ""

# Exit with appropriate code
if [ $failed_tests -eq 0 ]; then
    print_success "All health checks passed!"
    exit 0
elif [ $failed_tests -le $((total_tests / 2)) ]; then
    print_warning "Some health checks failed, but service may still be operational"
    exit 1
else
    print_error "Multiple health checks failed - service may be down!"
    exit 2
fi
