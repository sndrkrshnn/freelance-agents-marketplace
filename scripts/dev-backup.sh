#!/bin/bash
################################################################################
# Development Backup Script for Freelance AI Marketplace
#
# Quick backup/restore for local development
# - Fast backup without compression for quick operations
# - Simple one-command backup/restore
# - Designed for development environments
################################################################################

set -euo pipefail

# Source configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Source base config but override some settings for dev
if [[ -f "${SCRIPT_DIR}/backup-config.sh" ]]; then
    source "${SCRIPT_DIR}/backup-config.sh"
fi

# Dev-specific overrides
BACKUP_DIR="${PROJECT_ROOT}/dev-backups"
VERIFY_BACKUP=false
BACKUP_ENCRYPT=false
LOG_LEVEL="${LOG_LEVEL:-ERROR}"  # Less verbose for dev

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

################################################################################
# Helper Functions
################################################################################

# Simple log function for dev
log_dev() {
    echo -e "${GREEN}[DEV-BACKUP]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[DEV-BACKUP]${NC} $*"
}

# Display usage
usage() {
    cat <<EOF
Development Backup Script for Freelance AI Marketplace

Quick backup/restore for local development (no compression, fast operations)

USAGE:
  $(basename "$0") COMMAND [OPTIONS]

COMMANDS:
  backup, b              Create a quick backup
  restore, r             Restore from latest backup
  list, l                List available backups
  clean, c               Clean old backups (keep last 5)

OPTIONS:
  -f, --file FILE        Specify backup file (for restore)
  -n, --name NAME        Custom backup name

EXAMPLES:
  # Create a quick backup
  $(basename "$0") backup

  # Create a named backup
  $(basename "$0") backup -n before-feature-x

  # Restore latest backup
  $(basename "$0") restore

  # Restore from specific file
  $(basename "$0\") restore -f dev_backup_20240209.sql

  # List all backups
  $(basename "$0\") list

  # Clean old backups (keep last 5)
  $(basename "$0\") clean

BACKUP LOCATION: ${BACKUP_DIR}
DATABASE: ${DB_NAME}

EOF
}

# Setup dev backup directory
setup_dev_dir() {
    mkdir -p "${BACKUP_DIR}"
    log_dev "Backup directory: ${BACKUP_DIR}"
}

# Get database password
get_db_password() {
    if [[ -n "${DATABASE_URL:-}" ]]; then
        echo "${DATABASE_URL}" | sed -n 's/^.*:\([^@]*\)@.*$/\1/p'
    else
        echo "${DB_PASSWORD:-}"
    fi
}

# Quick backup (no compression)
dev_backup() {
    local custom_name="${1:-}"
    local timestamp
    timestamp=$(date '+%Y%m%d_%H%M%S')
    
    if [[ -n "${custom_name}" ]]; then
        local filename="dev_backup_${custom_name}.sql"
    else
        local filename="dev_backup_${timestamp}.sql"
    fi
    
    local backup_file="${BACKUP_DIR}/${filename}"
    
    log_dev "Creating development backup..."
    log_dev "File: ${backup_file}"
    
    # Set PGPASSWORD
    export PGPASSWORD
    PGPASSWORD="$(get_db_password)"
    
    # Create dump using pg_dump (plain SQL format, no compression)
    if pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" \
        -d "${DB_NAME}" --no-owner --no-acl -f "${backup_file}" 2>&1; then
        
        # Get file info
        local file_size
        file_size=$(du -h "${backup_file}" | cut -f1)
        
        log_dev "✓ Backup created successfully"
        log_dev "  Size: ${file_size}"
        log_dev "  File: ${backup_file}"
        
        # Create symlink to latest
        ln -sf "${filename}" "${BACKUP_DIR}/latest.sql"
        log_dev "  Latest: ${BACKUP_DIR}/latest.sql"
        
        return 0
    else
        log_warn "✗ Backup failed"
        return 1
    fi
}

# Quick restore
dev_restore() {
    local backup_file="${1:-}"
    
    # If no file specified, use latest
    if [[ -z "${backup_file}" ]]; then
        backup_file="${BACKUP_DIR}/latest.sql"
        
        if [[ ! -f "${backup_file}" ]]; then
            log_warn "No latest backup found"
            return 1
        fi
    fi
    
    # Resolve path
    if [[ "${backup_file}" != /* ]]; then
        backup_file="${BACKUP_DIR}/${backup_file}"
    fi
    
    # Check if file exists
    if [[ ! -f "${backup_file}" ]]; then
        log_warn "Backup file not found: ${backup_file}"
        return 1
    fi
    
    log_warn "=========================================="
    log_warn "   DANGEROUS OPERATION"
    log_warn "=========================================="
    log_warn "About to restore database: ${DB_NAME}"
    log_warn "This will DELETE all current data!"
    log_warn "=========================================="
    
    read -rp "Are you sure? Type 'yes' to continue: " confirmation
    if [[ "${confirmation}" != "yes" ]]; then
        log_dev "Restore cancelled"
        return 0
    fi
    
    log_dev "Restoring from: ${backup_file}"
    
    # Set PGPASSWORD
    export PGPASSWORD
    PGPASSWORD="$(get_db_password)"
    
    # Kill existing connections
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres &>/dev/null <<EOF
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();
EOF
    
    # Drop and recreate database
    if ! psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres &>/dev/null <<EOF
DROP DATABASE IF EXISTS ${DB_NAME};
CREATE DATABASE ${DB_NAME};
EOF
    then
        log_warn "Failed to recreate database"
        return 1
    fi
    
    # Restore from SQL file
    if psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" \
        -d "${DB_NAME}" -f "${backup_file}" 2>&1 | grep -v "SET\|SELECT\|WARNING"; then
        
        log_dev "✓ Restore completed successfully"
        return 0
    else
        log_warn "✗ Restore failed"
        return 1
    fi
}

# List backups
list_backups() {
    echo ""
    echo "=== Available Development Backups ==="
    echo ""
    
    if ls "${BACKUP_DIR}"/dev_backup_*.sql &>/dev/null 2>&1; then
        ls -lht "${BACKUP_DIR}"/dev_backup_*.sql 2>/dev/null | \
            awk '{
                filename=$9
                size=$5
                date=$6" "$7" "$8
                printf "  %-50s %10s  %s\n", filename, size, date
            }'
        
        # Show latest symlink
        if [[ -L "${BACKUP_DIR}/latest.sql" ]]; then
            local latest_target
            latest_target=$(readlink "${BACKUP_DIR}/latest.sql")
            echo ""
            printf "  ${GREEN}→ Latest link points to: ${latest_target}${NC}\n"
        fi
    else
        echo "  No backups found"
    fi
    
    echo ""
    
    # Show total size
    local total_size
    total_size=$(du -sh "${BACKUP_DIR}" 2>/dev/null | cut -f1)
    log_dev "Total backup directory size: ${total_size}"
}

# Clean old backups (keep last 5)
clean_backups() {
    local keep_count="${1:-5}"
    
    log_dev "Cleaning old backups (keeping last ${keep_count})..."
    
    local count=0
    while IFS= read -r -d '' file; do
        ((count++))
        if [[ ${count} -gt ${keep_count} ]]; then
            log_warn "  Removing: $(basename "${file}")"
            rm -f "${file}"
        fi
    done < <(find "${BACKUP_DIR}" -name "dev_backup_*.sql" -type f -printf '%T@ %p\0' 2>/dev/null | \
        sort -rzn | cut -z -d' ' -f2-)
    
    log_dev "✓ Cleanup complete"
}

# Check database connection
check_db_connection() {
    export PGPASSWORD
    PGPASSWORD="$(get_db_password)"
    
    if psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres \
        -c "SELECT 1" &>/dev/null; then
        return 0
    else
        log_warn "Cannot connect to database server"
        return 1
    fi
}

################################################################################
# Main
################################################################################

# Setup
setup_dev_dir

# Parse command
COMMAND="${1:-}"

case "${COMMAND}" in
    backup|b)
        custom_name=""
        shift || true
        
        # Parse options
        while [[ $# -gt 0 ]]; do
            case $1 in
                -n|--name)
                    custom_name="$2"
                    shift 2
                    ;;
                *)
                    log_warn "Unknown option: $1"
                    usage
                    exit 1
                    ;;
            esac
        done
        
        check_db_connection || exit 1
        dev_backup "${custom_name}"
        ;;
    
    restore|r)
        backup_file=""
        shift || true
        
        # Parse options
        while [[ $# -gt 0 ]]; do
            case $1 in
                -f|--file)
                    backup_file="$2"
                    shift 2
                    ;;
                *)
                    log_warn "Unknown option: $1"
                    usage
                    exit 1
                    ;;
            esac
        done
        
        check_db_connection || exit 1
        dev_restore "${backup_file}"
        ;;
    
    list|l)
        list_backups
        ;;
    
    clean|c)
        clean_backups
        ;;
    
    *)
        usage
        exit 1
        ;;
esac
