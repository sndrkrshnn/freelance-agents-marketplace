#!/bin/bash
################################################################################
# Backup Configuration Script for Freelance AI Marketplace
# This script sources all backup configuration variables
################################################################################

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

################################################################################
# Configuration Defaults
################################################################################

# Database Configuration (can be overridden by environment variables)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-freelance_agents_db}"
DB_USER="${DB_USER:-postgres}"

# Backup Directory Configuration
BACKUP_DIR="${BACKUP_DIR:-${PROJECT_ROOT}/backups}"
BACKUP_DAILY_DIR="${BACKUP_DIR}/daily"
BACKUP_WEEKLY_DIR="${BACKUP_DIR}/weekly"
BACKUP_MONTHLY_DIR="${BACKUP_DIR}/monthly"

# Retention Policy
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
BACKUP_RETENTION_WEEKS="${BACKUP_RETENTION_WEEKS:-4}"
BACKUP_RETENTION_MONTHS="${BACKUP_RETENTION_MONTHS:-12}"

# Backup Schedule (for cron)
BACKUP_SCHEDULE="${BACKUP_SCHEDULE:-0 2 * * *}"  # Daily at 2 AM

# AWS S3 Configuration (optional)
AWS_S3_BUCKET="${AWS_S3_BUCKET:-}"
AWS_S3_PREFIX="${AWS_S3_PREFIX:-(database-backups/}"
AWS_S3_REGION="${AWS_S3_REGION:-us-east-1}"

# Encryption
BACKUP_ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-}"
BACKUP_ENCRYPT="${BACKUP_ENCRYPT:-false}"

# Notification Configuration
ALERT_EMAIL="${ALERT_EMAIL:-}"
ALERT_EMAIL_FROM="${ALERT_EMAIL_FROM:-backups@freelance-marketplace.com}"
SMTP_HOST="${SMTP_HOST:-localhost}"
SMTP_PORT="${SMTP_PORT:-587}"
SMTP_USER="${SMTP_USER:-}"
SMTP_PASS="${SMTP_PASS:-}"
SMTP_USE_TLS="${SMTP_USE_TLS:-true}"

# Slack/Discord Notifications
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
DISCORD_WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-}"

# Logging Configuration
LOG_DIR="${LOG_DIR:-${PROJECT_ROOT}/logs}"
LOG_FILE="${LOG_DIR}/backup.log"
LOG_LEVEL="${LOG_LEVEL:-INFO}"
LOG_MAX_SIZE="${LOG_MAX_SIZE:-100M}"  # Maximum log file size before rotation

# Backup File Naming Convention
BACKUP_FILE_PREFIX="freelance_agents_db"
BACKUP_FILE_EXTENSION=".sql.gz"
ENCRYPTED_EXTENSION=".gz.gpg"

# PostgreSQL Configuration
PG_DUMP_BIN="${PG_DUMP_BIN:-pg_dump}"
PG_RESTORE_BIN="${PG_RESTORE_BIN:-pg_restore}"
PSQL_BIN="${PSQL_BIN:-psql}"

# Temporary Directory
TEMP_DIR="${TEMP_DIR:-/tmp/freelance-marketplace-backup}"

# Memory Limit (for large backups)
BACKUP_MEMORY_LIMIT="${BACKUP_MEMORY_LIMIT:-2G}"

# Compression Level (1-9, higher = better compression but slower)
COMPRESSION_LEVEL="${COMPRESSION_LEVEL:-6}"

# Parallel Jobs (for pg_dump -j flag)
PARALLEL_JOBS="${PARALLEL_JOBS:-4}"

# Validation Settings
VERIFY_BACKUP="${VERIFY_BACKUP:-true}"
VERIFY_TEMP_DB="${VERIFY_TEMP_DB:-verify_$(date +%s)"

# Environment
ENVIRONMENT="${NODE_ENV:-development}"

################################################################################
# Derived Paths
################################################################################

LOG_FILE_PATH="${LOG_FILE}"
TEMP_BACKUP_DIR="${TEMP_DIR}"

################################################################################
# Helper Functions
################################################################################

# Log message with timestamp and level
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Check if log level is enabled
    case "${LOG_LEVEL}" in
        DEBUG) ;;
        INFO) [[ "${level}" == "DEBUG" ]] && return 0 ;;
        WARN) [[ "${level}" =~ ^(DEBUG|INFO)$ ]] && return 0 ;;
        ERROR) [[ "${level}" =~ ^(DEBUG|INFO|WARN)$ ]] && return 0 ;;
    esac
    
    # Color codes based on level
    local color=''
    case "${level}" in
        ERROR) color="${RED}" ;;
        WARN) color="${YELLOW}" ;;
        INFO) color="${GREEN}" ;;
        DEBUG) color="${BLUE}" ;;
    esac
    
    # Output to console
    echo -e "${color}[${timestamp}] [${level}] ${message}${NC}"
    
    # Write to log file
    if [[ -d "${LOG_DIR}" ]]; then
        echo "[${timestamp}] [${level}] ${message}" >> "${LOG_FILE_PATH}"
    fi
}

# Check if required tools are available
check_requirements() {
    local missing_tools=()
    local required_tools=(
        "pg_dump"
        "psql"
        "gzip"
        "date"
        "find"
        "du"
    )
    
    # Check for optional tools
    command -v gpg &>/dev/null && export HAS_GPG=true || export HAS_GPG=false
    command -v aws &>/dev/null && export HAS_AWS=true || export HAS_AWS=false
    
    for tool in "${required_tools[@]}"; do
        if ! command -v "${tool}" &>/dev/null; then
            missing_tools+=("${tool}")
        fi
    done
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        log "ERROR" "Missing required tools: ${missing_tools[*]}"
        return 1
    fi
    
    log "INFO" "All required tools are available"
    return 0
}

# Create necessary directories
setup_directories() {
    local dirs=(
        "${BACKUP_DIR}"
        "${BACKUP_DAILY_DIR}"
        "${BACKUP_WEEKLY_DIR}"
        "${BACKUP_MONTHLY_DIR}"
        "${LOG_DIR}"
        "${TEMP_DIR}"
    )
    
    for dir in "${dirs[@]}"; do
        if [[ ! -d "${dir}" ]]; then
            mkdir -p "${dir}"
            log "INFO" "Created directory: ${dir}"
        fi
    done
    
    log "INFO" "All backup directories are ready"
}

# Get database password from DATABASE_URL or separate variables
get_db_password() {
    if [[ -n "${DATABASE_URL:-}" ]]; then
        # Extract password from DATABASE_URL
        # Format: postgresql://user:password@host:port/dbname
        echo "${DATABASE_URL}" | sed -n 's/^.*:\([^@]*\)@.*$/\1/p'
    else
        echo "${DB_PASSWORD:-}"
    fi
}

# Export PGPASSWORD for PostgreSQL commands
export_db_password() {
    export PGPASSWORD="$(get_db_password)"
}

# Get backup file path with timestamp
get_backup_filename() {
    local timestamp
    timestamp=$(date '+%Y%m%d_%H%M%S')
    echo "${BACKUP_FILE_PREFIX}_${timestamp}${BACKUP_FILE_EXTENSION}"
}

# Get encrypted backup filename
get_encrypted_filename() {
    local base_filename="$1"
    echo "${base_filename}${ENCRYPTED_EXTENSION}"
}

# Validate configuration
validate_config() {
    local errors=0
    
    # Check if DB_NAME is set
    if [[ -z "${DB_NAME}" ]]; then
        log "ERROR" "DB_NAME is not set"
        ((errors++))
    fi
    
    # Check if backup directory is writable
    if [[ ! -w "${BACKUP_DIR}" ]]; then
        log "ERROR" "Backup directory is not writable: ${BACKUP_DIR}"
        ((errors++))
    fi
    
    # Check disk space (at least 1GB free recommended)
    local free_space
    free_space=$(df -BG "${BACKUP_DIR}" | awk 'NR==2 {print $4}' | tr -d 'G')
    if [[ ${free_space} -lt 1 ]]; then
        log "WARN" "Low disk space in ${BACKUP_DIR}: ${free_space}GB free"
    fi
    
    # Check if encryption key is provided when encryption is enabled
    if [[ "${BACKUP_ENCRYPT}" == "true" && -z "${BACKUP_ENCRYPTION_KEY}" ]]; then
        log "WARN" "Encryption enabled but no encryption key provided"
    fi
    
    # Validate S3 configuration if bucket is set
    if [[ -n "${AWS_S3_BUCKET}" ]]; then
        if [[ "${HAS_AWS}" != "true" ]]; then
            log "WARN" "AWS S3 bucket configured but AWS CLI not found"
        fi
    fi
    
    if [[ ${errors} -gt 0 ]]; then
        return 1
    fi
    
    log "INFO" "Configuration validation passed"
    return 0
}

# Display current configuration
display_config() {
    log "INFO" "=== Current Backup Configuration ==="
    log "INFO" "Database: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
    log "INFO" "Backup Directory: ${BACKUP_DIR}"
    log "INFO" "Retention: ${BACKUP_RETENTION_DAYS} days, ${BACKUP_RETENTION_WEEKS} weeks, ${BACKUP_RETENTION_MONTHS} months"
    log "INFO" "Schedule: ${BACKUP_SCHEDULE}"
    log "INFO" "Encryption: ${BACKUP_ENCRYPT}"
    log "INFO" "Verify Backups: ${VERIFY_BACKUP}"
    log "INFO" "Log Level: ${LOG_LEVEL}"
    log "INFO" "Environment: ${ENVIRONMENT}"
    
    if [[ -n "${AWS_S3_BUCKET}" ]]; then
        log "INFO" "S3 Bucket: ${AWS_S3_BUCKET}"
    fi
    
    if [[ -n "${ALERT_EMAIL}" ]]; then
        log "INFO" "Alert Email: ${ALERT_EMAIL}"
    fi
    
    if [[ -n "${SLACK_WEBHOOK_URL}" ]]; then
        log "INFO" "Slack Notifications: Enabled"
    fi
    
    if [[ -n "${DISCORD_WEBHOOK_URL}" ]]; then
        log "INFO" "Discord Notifications: Enabled"
    fi
}

# Initialize configuration
init_config() {
    # Load environment file if it exists
    local env_file="${PROJECT_ROOT}/backend/.env"
    if [[ -f "${env_file}" ]]; then
        set -a
        source "${env_file}"
        set +a
        log "INFO" "Loaded environment variables from ${env_file}"
    fi
    
    # Check requirements
    check_requirements || exit 1
    
    # Setup directories
    setup_directories
    
    # Validate configuration
    validate_config || log "WARN" "Configuration validation had warnings"
    
    # Export database password
    export_db_password
    
    # Display configuration
    display_config
}

# Script entry point - Only run init if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    init_config
fi
