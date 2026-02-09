#!/bin/bash

# ============================================
# Docker Setup Verification Script
# Freelance AI Agents Marketplace
# ============================================

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
TOTAL=0
PASSED=0
FAILED=0
WARNINGS=0

echo -e "${BLUE}═════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Docker Setup Verification${NC}"
echo -e "${BLUE}  Freelance AI Agents Marketplace${NC}"
echo -e "${BLUE}═════════════════════════════════════════════════════════${NC}"
echo ""

# Function to check file
check_file() {
    local file="$1"
    local desc="$2"
    local required="${3:-true}"
    
    TOTAL=$((TOTAL + 1))
    
    if [ -f "$file" ]; then
        local size=$(du -h "$file" | cut -f1)
        echo -e "${GREEN}✓${NC} $desc"
        echo -e "   ${BLUE}→${NC} $file ($size)"
        PASSED=$((PASSED + 1))
        return 0
    else
        if [ "$required" = "true" ]; then
            echo -e "${RED}✗${NC} $desc"
            echo -e "   ${RED}→${NC} $file (MISSING)"
            FAILED=$((FAILED + 1))
            return 1
        else
            echo -e "${YELLOW}⚠${NC} $desc (optional)"
            echo -e "   ${YELLOW}→${NC} $file (not found)"
            WARNINGS=$((WARNINGS + 1))
            return 2
        fi
    fi
}

# Function to check directory
check_dir() {
    local dir="$1"
    local desc="$2"
    local required="${3:-true}"
    
    TOTAL=$((TOTAL + 1))
    
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓${NC} $desc"
        echo -e "   ${BLUE}→${NC} $dir"
        PASSED=$((PASSED + 1))
        return 0
    else
        if [ "$required" = "true" ]; then
            echo -e "${RED}✗${NC} $desc"
            echo -e "   ${RED}→${NC} $dir (MISSING)"
            FAILED=$((FAILED + 1))
            return 1
        else
            echo -e "${YELLOW}⚠${NC} $desc (optional)"
            echo -e "   ${YELLOW}→${NC} $dir (not found)"
            WARNINGS=$((WARNINGS + 1))
            return 2
        fi
    fi
}

# Function to check executable
check_exec() {
    local file="$1"
    local desc="$2"
    
    TOTAL=$((TOTAL + 1))
    
    if [ -x "$file" ]; then
        echo -e "${GREEN}✓${NC} $desc (executable)"
        echo -e "   ${BLUE}→${NC} $file"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗${NC} $desc (not executable)"
        echo -e "   ${RED}→${NC} $file"
        echo -e "   ${YELLOW}   Fix: chmod +x $file${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Function to check command
check_command() {
    local cmd="$1"
    local desc="$2"
    local min_version="${3:-}"
    
    TOTAL=$((TOTAL + 1))
    
    if command -v "$cmd" &> /dev/null; then
        local version=$($cmd --version 2>&1 | head -n1 || echo "version unknown")
        echo -e "${GREEN}✓${NC} $desc"
        echo -e "   ${BLUE}→${NC} $version"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗${NC} $desc (not found)"
        echo -e "   ${RED}→${NC} $cmd is not installed"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo -e "${BLUE}[1/6] Checking Root Files${NC}"
echo "─────────────────────────────────────────────────────────────"
check_file "docker-compose.yml" "Docker Compose (Production)"
check_file "docker-compose.dev.yml" "Docker Compose (Development)"
check_file ".dockerignore" "Docker Ignore (Root)"
check_file ".env.example" "Environment Template (Root)"
echo ""

echo -e "${BLUE}[2/6] Checking Backend Files${NC}"
echo "─────────────────────────────────────────────────────────────"
check_file "backend/Dockerfile" "Backend Dockerfile"
check_file "backend/.dockerignore" "Backend Docker Ignore"
check_file "backend/.env.production" "Backend Production Environment"
echo ""

echo -e "${BLUE}[3/6] Checking Frontend Files${NC}"
echo "─────────────────────────────────────────────────────────────"
check_file "frontend/Dockerfile" "Frontend Dockerfile"
check_file "frontend/.dockerignore" "Frontend Docker Ignore"
check_file "frontend/nginx.conf" "Frontend Nginx Configuration"
check_file "frontend/.env.example" "Frontend Environment Template"
echo ""

echo -e "${BLUE}[4/6] Checking Nginx Configuration${NC}"
echo "─────────────────────────────────────────────────────────────"
check_file "nginx/nginx.conf" "Nginx Reverse Proxy Configuration"
check_dir "nginx/conf.d" "Nginx Config Directory"
check_file "nginx/conf.d/default.conf" "Nginx Default Config"
echo ""

echo -e "${BLUE}[5/6] Checking Scripts${NC}"
echo "─────────────────────────────────────────────────────────────"
check_exec "scripts/start-docker.sh" "Start Docker Script"
check_file "scripts/init-db.sql" "Database Initialization Script"
check_file "scripts/backup-db.sh" "Database Backup Script" false
check_file "scripts/restore-db.sh" "Database Restore Script" false
check_file "scripts/verify-backup.sh" "Backup Verification Script" false
echo ""

echo -e "${BLUE}[6/6] Checking System Requirements${NC}"
echo "─────────────────────────────────────────────────────────────"
check_command "docker" "Docker"
check_command "docker" "Docker Compose (via docker compose)"
echo ""

# Check for .env file
echo -e "${BLUE}[Optional] Environment Configuration${NC}"
echo "─────────────────────────────────────────────────────────────"
if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} .env file exists"
    
    # Check for critical variables
    if grep -q "POSTGRES_PASSWORD=" .env && ! grep -q "POSTGRES_PASSWORD=change_this" .env; then
        echo -e "   ${GREEN}→${NC} POSTGRES_PASSWORD is set"
    else
        echo -e "   ${YELLOW}→${NC} POSTGRES_PASSWORD needs configuration"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    if grep -q "JWT_SECRET=" .env && ! grep -q "JWT_SECRET=change_this" .env; then
        echo -e "   ${GREEN}→${NC} JWT_SECRET is set"
    else
        echo -e "   ${YELLOW}→${NC} JWT_SECRET needs configuration"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠${NC} .env file not found (required for running)"
    echo -e "   ${YELLOW}→${NC} Run: cp .env.example .env"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Summary
echo -e "${BLUE}═════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Summary${NC}"
echo -e "${BLUE}═════════════════════════════════════════════════════════${NC}"
echo -e "  Total Checks:   ${BLUE}$TOTAL${NC}"
echo -e "  ${GREEN}Passed:${NC}         ${GREEN}$PASSED${NC}"
if [ $WARNINGS -gt 0 ]; then
    echo -e "  ${YELLOW}Warnings:${NC}       ${YELLOW}$WARNINGS${NC}"
fi
if [ $FAILED -gt 0 ]; then
    echo -e "  ${RED}Failed:${NC}          ${RED}$FAILED${NC}"
fi
echo ""

if [ $FAILED -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓✓✓ All checks passed! Your Docker setup is complete. ✓✓✓${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo -e "  1. Create .env file: ${YELLOW}cp .env.example .env${NC}"
    echo -e "  2. Edit .env with your configuration: ${YELLOW}nano .env${NC}"
    echo -e "  3. Start services: ${YELLOW}./scripts/start-docker.sh start prod${NC}"
    echo -e "  4. Or start dev mode: ${YELLOW}./scripts/start-docker.sh start dev${NC}"
    echo ""
    echo -e "For more information, see: ${BLUE}DOCKER_README.md${NC}"
    exit 0
elif [ $FAILED -eq 0 ]; then
    echo -e "${YELLOW}⚠ Setup is mostly complete, but some warnings exist.${NC}"
    echo ""
    echo -e "${BLUE}Review the warnings above and configure accordingly.${NC}"
    exit 0
else
    echo -e "${RED}✗✗✗ Some required files or configurations are missing. ✗✗✗${NC}"
    echo ""
    echo -e "${RED}Please address the failed checks above.${NC}"
    exit 1
fi
