#!/bin/bash

# ============================================
# Render Migration Script
# Freelance AI Agents Marketplace
# ============================================

# This script handles database migrations on Render
# It's designed to run automatically during deployment

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
MAX_RETRIES=10
RETRY_INTERVAL=5

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Wait for database to be ready
wait_for_database() {
    print_info "Waiting for database to be ready..."
    
    local retries=0
    while [ $retries -lt $MAX_RETRIES ]; do
        if node -e "
            const { Pool } = require('pg');
            const pool = new Pool({ connectionString: process.env.DATABASE_URL });
            pool.query('SELECT 1')
                .then(() => { pool.end(); process.exit(0); })
                .catch((err) => { pool.end(); process.exit(1); });
        "; then
            print_info "Database is ready!"
            return 0
        fi
        
        retries=$((retries + 1))
        if [ $retries -lt $MAX_RETRIES ]; then
            print_warning "Database not ready, retrying in ${RETRY_INTERVAL}s... ($retries/$MAX_RETRIES)"
            sleep $RETRY_INTERVAL
        fi
    done
    
    print_error "Database did not become ready after $MAX_RETRIES attempts"
    return 1
}

# Wait for Redis to be ready
wait_for_redis() {
    if [ -z "$REDIS_URL" ]; then
        print_warning "REDIS_URL not set, skipping Redis check"
        return 0
    fi
    
    print_info "Waiting for Redis to be ready..."
    
    local retries=0
    while [ $retries -lt $MAX_RETRIES ]; do
        if node -e "
            const redis = require('redis');
            const client = redis.createClient({ url: process.env.REDIS_URL });
            client.connect()
                .then(() => client.ping())
                .then(() => { client.disconnect(); process.exit(0); })
                .catch((err) => { client.disconnect(); process.exit(1); });
        "; then
            print_info "Redis is ready!"
            return 0
        fi
        
        retries=$((retries + 1))
        if [ $retries -lt $MAX_RETRIES ]; then
            print_warning "Redis not ready, retrying in ${RETRY_INTERVAL}s... ($retries/$MAX_RETRIES)"
            sleep $RETRY_INTERVAL
        fi
    done
    
    print_error "Redis did not become ready after $MAX_RETRIES attempts"
    return 1
}

# Run migrations
run_migrations() {
    print_info "Running database migrations..."
    
    if node src/db/migrate.js; then
        print_info "Migrations completed successfully!"
        return 0
    else
        print_error "Migration failed!"
        return 1
    fi
}

# Rollback on error
rollback_migration() {
    print_warning "Attempting to rollback migration..."
    
    # Check if rollback file exists
    if [ -f "src/db/rollback.js" ]; then
        if node src/db/rollback.js; then
            print_info "Rollback completed"
        else
            print_error "Rollback failed!"
        fi
    else
        print_warning "No rollback script found, skipping rollback"
    fi
}

# Verify migration success
verify_migration() {
    print_info "Verifying migrations..."
    
    if node -e "
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        pool.query('SELECT table_name FROM information_schema.tables WHERE table_schema = '\''public'\'' ORDER BY table_name')
            .then(result => {
                console.log('Tables:', result.rows.map(r => r.table_name).join(', '));
                pool.end();
                process.exit(0);
            })
            .catch(err => {
                console.error('Verification failed:', err.message);
                pool.end();
                process.exit(1);
            });
    "; then
        print_info "Migration verification successful!"
        return 0
    else
        print_error "Migration verification failed!"
        return 1
    fi
}

# Main execution
main() {
    print_info "Starting migration process..."
    print_info "Environment: ${NODE_ENV:-development}"
    
    # Validate environment
    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL is not set!"
        exit 1
    fi
    
    # Wait for database
    if ! wait_for_database; then
        print_error "Failed to connect to database"
        exit 1
    fi
    
    # Wait for Redis (optional)
    wait_for_redis || {
        print_warning "Redis check failed, but continuing..."
    }
    
    # Run migrations
    if ! run_migrations; then
        print_error "Migration failed, attempting rollback..."
        rollback_migration
        exit 1
    fi
    
    # Verify migrations
    if verify_migration; then
        print_info "All migrations completed successfully!"
        exit 0
    else
        print_error "Migration verification failed!"
        exit 1
    fi
}

# Run main function
main "$@"
