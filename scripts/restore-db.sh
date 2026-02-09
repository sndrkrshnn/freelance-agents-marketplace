#!/bin/bash
################################################################################
# Database Restore Script for Freelance AI Marketplace
#
# Features:
# - Restore from backup file
# - Pre-restore validation
# - Backup existing database before restore
# - Interactive confirmation prompts
# - Rollback capability
# - Restore from specific timestamp
# - Support for encrypted backups
################################################################################

set -euo pipefail

# Source configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/backup-config.sh"
init_config

################################################################################
# Restore Variables
################################################################################

RESTORE_START_TIME=$(date +%s)
RESTORE_LOG="${LOG_DIR}/restore_$(date +%Y%m%d_%H%M%S).log"
BACKUP_FILE=""
BACKUP_FILE_DECRYPTED=""
TEMP_RESTORE_DIR="${TEMP_DIR}/restore_$$"
ROLLBACK_BACKUP=""
PERFORM_ROLLBACK=false
TARGET_DB="${DB_NAME}_restore_$$"

# Colors for prompts
YELLOW='\033[1;33m'
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

################################################################################
# Helper Functions
################################################################################

# Log restore-specific messages
log_restore() {
    local level="$1"
    shift
    local message="$*"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${level}] ${message}" | tee -a "${RESTORE_LOG}"
}

# Display usage information
usage() {
    cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Restore database from backup file.

OPTIONS:
  -f, --file FILE          Backup file to restore from
  -d, --database NAME      Target database name (default: ${DB_NAME})
  -l, --list               List available backups
  -t, --timestamp TIME     Restore from specific timestamp (YYYYMMDD_HHMMSS)
  -r, --rollback           Enable automatic rollback on failure
  -y, --yes                Skip confirmation prompts
  -h, --help               Display this help message

EXAMPLES:
  # Restore from a specific file
  $(basename "$0") -f /path/to/backup.sql.gz

  # List available backups
  $(basename "$0") --list

  # Restore from timestamp
  $(basename "$0") --timestamp 20240209_020000

  # Rollback on failure
  $(basename "$0") -f backup.sql.gz --rollback

BACKUP LOCATIONS:
  Daily:   ${BACKUP_DAILY_DIR}
  Weekly:  ${BACKUP_WEEKLY_DIR}
  Monthly: ${BACKUP_MONTHLY_DIR}

EOF
}

# Prompt for confirmation
confirm() {
    local prompt="$1"
    local default="${2:-n}"
    
    if [[ "${SKIP_CONFIRMATION}" == "true" ]]; then
        return 0
    fi
    
    local yn
    if [[ "${default}" == "y" ]]; then
        read -rp "${prompt} [Y/n]: " yn
        yn=${yn:-y}
    else
        read -rp "${prompt} [y/N]: " yn
        yn=${yn:-n}
    fi
    
    [[ "${yn,,}" =~ ^(yes|y)$ ]]
}

# List available backups
list_backups() {
    echo ""
    echo "=== Available Backups ==="
    echo ""
    
    # List daily backups
    echo "Daily Backups:"
    if ls "${BACKUP_DAILY_DIR}/${BACKUP_FILE_PREFIX}"_*${BACKUP_FILE_EXTENSION}* &>/dev/null 2>&1; then
        ls -lh "${BACKUP_DAILY_DIR}/${BACKUP_FILE_PREFIX}"_*${BACKUP_FILE_EXTENSION}* 2>/dev/null | \
            awk '{print $9, "("$5")"}' | \
            while IFS= read -r line; do
                local filename=$(echo "$line" | awk '{print $1}')
                local size=$(echo "$line" | awk '{print $2}')
                local timestamp=$(echo "$filename" | grep -oP '\d{8}_\d{6}')
                local age=$(( ($(date +%s) - $(date -j -f "%Y%m%d_%H%M%S" "${timestamp}" +%s 2>/dev/null || echo 0)) / 86400 ))
                printf "  - %-50s %10s  (age: %d days)\n" "$(basename "${filename}")" "${size}" "${age}"
            done
    else
        echo "  No daily backups found"
    fi
    
    echo ""
    echo "Weekly Backups:"
    if ls "${BACKUP_WEEKLY_DIR}/${BACKUP_FILE_PREFIX}"_*${BACKUP_FILE_EXTENSION}* &>/dev/null 2>&1; then
        ls -lh "${BACKUP_WEEKLY_DIR}/${BACKUP_FILE_PREFIX}"_*${BACKUP_FILE_EXTENSION}* 2>/dev/null | \
            awk '{print $9, "("$5")"}' | \
            while IFS= read -r line; do
                local filename=$(echo "$line" | awk '{print $1}')
                local size=$(echo "$line" | awk '{print $2}')
                printf "  - %-50s %10s\n" "$(basename "${filename}")" "${size}"
            done
    else
        echo "  No weekly backups found"
    fi
    
    echo ""
    echo "Monthly Backups:"
    if ls "${BACKUP_MONTHLY_DIR}/${BACKUP_FILE_PREFIX}"_*${BACKUP_FILE_EXTENSION}* &>/dev/null 2>&1; then
        ls -lh "${BACKUP_MONTHLY_DIR}/${BACKUP_FILE_PREFIX}"_*${BACKUP_FILE_EXTENSION}* 2>/dev/null | \
            awk '{print $9, "("$5")"}' | \
            while IFS= read -r line; do
                local filename=$(echo "$line" | awk '{print $1}')
                local size=$(echo "$line" | awk '{print $2}')
                printf "  - %-50s %10s\n" "$(basename "${filename}")" "${size}"
            done
    else
        echo "  No monthly backups found"
    fi
    
    echo ""
}

# Find backup by timestamp
find_backup_by_timestamp() {
    local timestamp="$1"
    
    log_restore "INFO" "Searching for backup with timestamp: ${timestamp}"
    
    local backup_file=""
    for dir in "${BACKUP_DAILY_DIR}" "${BACKUP_WEEKLY_DIR}" "${BACKUP_MONTHLY_DIR}"; do
        local file
        file=$(find "${dir}" -name "${BACKUP_FILE_PREFIX}_${timestamp}${BACKUP_FILE_EXTENSION}*" 2>/dev/null | head -n1)
        if [[ -n "${file}" ]]; then
            backup_file="${file}"
            break
        fi
    done
    
    if [[ -z "${backup_file}" ]]; then
        log_restore "ERROR" "No backup found with timestamp: ${timestamp}"
        return 1
    fi
    
    BACKUP_FILE="${backup_file}"
    log_restore "INFO" "Found backup: ${BACKUP_FILE}"
    return 0
}

# Verify backup file
verify_backup_file() {
    log_restore "INFO" "Verifying backup file: ${BACKUP_FILE}"
    
    # Check if file exists
    if [[ ! -f "${BACKUP_FILE}" ]]; then
        log_restore "ERROR" "Backup file does not exist: ${BACKUP_FILE}"
        return 1
    fi
    
    # Check file size
    local file_size
    file_size=$(stat -f%z "${BACKUP_FILE}" 2>/dev/null || stat -c%s "${BACKUP_FILE}" 2>/dev/null)
    
    if [[ ${file_size} -lt 1024 ]]; then
        log_restore "ERROR" "Backup file is too small: ${file_size} bytes"
        return 1
    fi
    
    log_restore "INFO" "Backup file size: ${file_size} bytes"
    
    # Check if file is encrypted
    if [[ "${BACKUP_FILE}" =~ \.gpg$ ]]; then
        log_restore "INFO" "Backup file is encrypted"
        
        if [[ -z "${BACKUP_ENCRYPTION_KEY}" ]]; then
            log_restore "ERROR" "Backup is encrypted but no encryption key provided"
            return 1
        fi
        
        if [[ "${HAS_GPG}" != "true" ]]; then
            log_restore "ERROR" "GPG is required to decrypt backup but not found"
            return 1
        fi
    fi
    
    # Verify gzip integrity
    if [[ "${BACKUP_FILE}" =~ \.gz$ ]]; then
        if ! gzip -t "${BACKUP_FILE}" 2>&1; then
            log_restore "ERROR" "Gzip integrity check failed"
            return 1
        fi
        log_restore "INFO" "Gzip integrity check passed"
    fi
    
    # Verify checksum if exists
    local checksum_file="${BACKUP_FILE}.sha256"
    if [[ -f "${checksum_file}" ]]; then
        log_restore "INFO" "Verifying checksum..."
        if command -v sha256sum &>/dev/null; then
            if ! sha256sum -c "${checksum_file}" &>/dev/null; then
                log_restore "ERROR" "Checksum verification failed"
                return 1
            fi
        elif command -v shasum &>/dev/null; then
            if ! shasum -a 256 -c "${checksum_file}" &>/dev/null; then
                log_restore "ERROR" "Checksum verification failed"
                return 1
            fi
        fi
        log_restore "INFO" "Checksum verification passed"
    fi
    
    log_restore "INFO" "Backup file verification completed successfully"
    return 0
}

# Decrypt backup file
decrypt_backup() {
    if [[ ! "${BACKUP_FILE}" =~ \.gpg$ ]]; then
        log_restore "DEBUG" "Backup file is not encrypted, skipping decryption"
        BACKUP_FILE_DECRYPTED="${BACKUP_FILE}"
        return 0
    fi
    
    log_restore "INFO" "Decrypting backup file..."
    
    mkdir -p "${TEMP_RESTORE_DIR}"
    BACKUP_FILE_DECRYPTED="${TEMP_RESTORE_DIR}/$(basename "${BACKUP_FILE}" .gpg)"
    
    local passphrase_file="${TEMP_DIR}/.gpg_passphrase.$$"
    echo "${BACKUP_ENCRYPTION_KEY}" > "${passphrase_file}"
    chmod 600 "${passphrase_file}"
    
    if ! gpg --batch --yes --passphrase-file "${passphrase_file}" \
        --decrypt --output "${BACKUP_FILE_DECRYPTED}" \
        "${BACKUP_FILE}"; then
        log_restore "ERROR" "Failed to decrypt backup file"
        rm -f "${passphrase_file}"
        return 1
    fi
    
    rm -f "${passphrase_file}"
    log_restore "INFO" "Backup decrypted successfully: ${BACKUP_FILE_DECRYPTED}"
    return 0
}

# Create pre-restore backup
create_pre_restore_backup() {
    log_restore "INFO" "Creating pre-restore backup..."
    
    local timestamp
    timestamp=$(date '+%Y%m%d_%H%M%S')
    local pre_restore_file="${BACKUP_DIR}/pre_restore_${timestamp}.sql.gz"
    
    # Create directory if needed
    mkdir -p "${BACKUP_DIR}"
    
    # Dump current database
    local pg_dump_opts=(
        -h "${DB_HOST}"
        -p "${DB_PORT}"
        -U "${DB_USER}"
        -d "${DB_NAME}"
        -F c
        -f "${TEMP_DIR}/pre_restore_${timestamp}.dump"
        -v
        -j "${PARALLEL_JOBS}"
    )
    
    if ! ${PG_DUMP_BIN} "${pg_dump_opts[@]}" &>> "${RESTORE_LOG}"; then
        log_restore "ERROR" "Failed to create pre-restore backup"
        return 1
    fi
    
    # Compress
    gzip -${COMPRESSION_LEVEL} -c "${TEMP_DIR}/pre_restore_${timestamp}.dump" > "${pre_restore_file}"
    rm -f "${TEMP_DIR}/pre_restore_${timestamp}.dump"
    
    ROLLBACK_BACKUP="${pre_restore_file}"
    log_restore "INFO" "Pre-restore backup created: ${ROLLBACK_BACKUP}"
    return 0
}

# Restore to temporary database first
restore_to_temp_db() {
    log_restore "INFO" "Restoring to temporary database: ${TARGET_DB}"
    
    # Create temporary database
    if ! ${PSQL_BIN} -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres \
        -c "CREATE DATABASE ${TARGET_DB};" &>> "${RESTORE_LOG}"; then
        log_restore "ERROR" "Failed to create temporary database"
        return 1
    fi
    
    # Restore to temporary database
    local pg_restore_opts=(
        -h "${DB_HOST}"
        -p "${DB_PORT}"
        -U "${DB_USER}"
        -d "${TARGET_DB}"
        -v
        -j "${PARALLEL_JOBS}"
        "${BACKUP_FILE_DECRYPTED}"
    )
    
    if ! ${PG_RESTORE_BIN} "${pg_restore_opts[@]}" &>> "${RESTORE_LOG}"; then
        log_restore "ERROR" "Failed to restore to temporary database"
        # Cleanup temp database
        ${PSQL_BIN} -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres \
            -c "DROP DATABASE IF EXISTS ${TARGET_DB};" &>/dev/null || true
        return 1
    fi
    
    log_restore "INFO" "Successfully restored to temporary database"
    return 0
}

# Perform actual restore
perform_restore() {
    log_restore "WARN" "=== CRITICAL OPERATION ==="
    log_restore "WARN" "About to restore database: ${DB_NAME}"
    log_restore "WARN" "This will overwrite all existing data!"
    log_restore "WARN" "=========================="
    
    if ! confirm "Do you want to proceed with the restore?"; then
        log_restore "INFO" "Restore cancelled by user"
        return 1
    fi
    
    # Kill existing connections
    log_restore "INFO" "Terminating existing database connections..."
    ${PSQL_BIN} -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres \
        -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" &>> "${RESTORE_LOG}" || true
    
    # Drop existing database
    log_restore "INFO" "Dropping existing database..."
    if ! ${PSQL_BIN} -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres \
        -c "DROP DATABASE IF EXISTS ${DB_NAME};" &>> "${RESTORE_LOG}"; then
        log_restore "ERROR" "Failed to drop existing database"
        return 1
    fi
    
    # Create database
    log_restore "INFO" "Creating new database..."
    if ! ${PSQL_BIN} -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres \
        -c "CREATE DATABASE ${DB_NAME};" &>> "${RESTORE_LOG}"; then
        log_restore "ERROR" "Failed to create database"
        return 1
    fi
    
    # Restore from temp database or directly from backup
    if [[ -n "${TARGET_DB}" ]]; then
        log_restore "INFO" "Copying from temporary database..."
        ${PSQL_BIN} -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres \
            -c "ALTER DATABASE ${TARGET_DB} RENAME TO ${DB_NAME};" &>> "${RESTORE_LOG}"
    else
        log_restore "INFO" "Restoring directly from backup..."
        local pg_restore_opts=(
            -h "${DB_HOST}"
            -p "${DB_PORT}"
            -U "${DB_USER}"
            -d "${DB_NAME}"
            -v
            -j "${PARALLEL_JOBS}"
            "${BACKUP_FILE_DECRYPTED}"
        )
        
        if ! ${PG_RESTORE_BIN} "${pg_restore_opts[@]}" &>> "${RESTORE_LOG}"; then
            log_restore "ERROR" "Failed to restore database"
            return 1
        fi
    fi
    
    log_restore "INFO" "Database restored successfully"
    return 0
}

# Rollback on failure
rollback_restore() {
    if [[ -z "${ROLLBACK_BACKUP}" ]]; then
        log_restore "ERROR" "No rollback backup available"
        return 1
    fi
    
    log_restore "WARN" "Starting rollback..."
    
    # Decrypt rollback backup if needed
    local rollback_file="${ROLLBACK_BACKUP}"
    if [[ "${ROLLBACK_BACKUP}" =~ \.gpg$ ]]; then
       .rollback_file="${TEMP_DIR}/rollback_decrypted.$$"
        local passphrase_file="${TEMP_DIR}/.gpg_passphrase.$$"
        echo "${BACKUP_ENCRYPTION_KEY}" > "${passphrase_file}"
        gpg --batch --yes --passphrase-file "${passphrase_file}" \
            --decrypt --output "${rollback_file}" "${ROLLBACK_BACKUP}" &>/dev/null
        rm -f "${passphrase_file}"
    fi
    
    # Decompress,gunzip -c "${rollback_file}" > "${TEMP_DIR}/rollback.dump$$"
    
    # Kill connections
    ${PSQL_BIN} -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres \
        -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" &>/dev/null || true
    
    # Drop and recreate database
    ${PSQL_BIN} -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres \
        -c "DROP DATABASE IF EXISTS ${DB_NAME};" &>/dev/null || true
    
    ${PSQL_BIN} -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres \
        -c "CREATE DATABASE ${DB_NAME};" &>/dev/null || true
    
    # Restore rollback backup
    ${PG_RESTORE_BIN} -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" \
        -d "${DB_NAME}" -v -j "${PARALLEL_JOBS}" "${TEMP_DIR}/rollback.dump.$$" &>> "${RESTORE_LOG}" || true
    
    rm -f "${TEMP_DIR}/rollback.dump.$$"
    rm -f "${rollback_file}"
    
    log_restore "WARN" "Rollback completed"
}

# Display restore summary
display_restore_summary() {
    local restore_end_time
    restore_end_time=$(date +%s)
    local duration=$((restore_end_time - RESTORE_START_TIME))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    
    echo ""
    echo "========================================"
    echo "      Restore Summary"
    echo "========================================"
    echo "Status: SUCCESS"
    echo "Database: ${DB_NAME}"
    echo "Source: ${BACKUP_FILE}"
    echo "Duration: ${minutes}m ${seconds}s"
    echo "Log: ${RESTORE_LOG}"
    echo "========================================"
    echo ""
}

# Cleanup temporary files
cleanup_temp_files() {
    log_restore "INFO" "Cleaning up temporary files..."
    
    # Drop temporary database if exists
    if [[ -n "${TARGET_DB}" ]]; then
        ${PSQL_BIN} -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres \
            -c "DROP DATABASE IF EXISTS ${TARGET_DB};" &>/dev/null || true
    fi
    
    # Remove temp directories and files
    rm -rf "${TEMP_RESTORE_DIR}" 2>/dev/null || true
    rm -f "${TEMP_DIR}"/.gpg_passphrase.* 2>/dev/null || true
    rm -f "${TEMP_DIR}"/*_decrypted* 2>/dev/null || true
    rm -f "${TEMP_DIR}"/*.dump 2>/dev/null || true
    
    log_restore "INFO" "Temporary files cleaned up"
}

# Error handler
handle_error() {
    local error_line=$1
    log_restore "ERROR" "Restore failed at line ${error_line}"
    
    if [[ "${PERFORM_ROLLBACK}" == "true" ]]; then
        rollback_restore
    fi
    
    cleanup_temp_files
    
    # Send notification
    send_email_notification "FAILED" "Database restore failed at line ${error_line}. See log: ${RESTORE_LOG}"
    send_slack_notification "FAILED" "Database restore failed. See log for details."
    
    exit 1
}

# Trap errors
trap 'handle_error ${LINENO}' ERR

################################################################################
# Command Line Parsing
################################################################################

SKIP_CONFIRMATION=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--file)
            BACKUP_FILE="$2"
            shift 2
            ;;
        -d|--database)
            DB_NAME="$2"
            shift 2
            ;;
        -l|--list)
            list_backups
            exit 0
            ;;
        -t|--timestamp)
            if ! find_backup_by_timestamp "$2"; then
                exit 1
            fi
            shift 2
            ;;
        -r|--rollback)
            PERFORM_ROLLBACK=true
            shift
            ;;
        -y|--yes)
            SKIP_CONFIRMATION=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

################################################################################
# Main Restore Process
################################################################################

main() {
    # Check if backup file is specified
    if [[ -z "${BACKUP_FILE}" ]]; then
        echo "Error: No backup file specified"
        echo ""
        usage
        exit 1
    fi
    
    # Resolve absolute path
    if [[ "${BACKUP_FILE}" != /* ]]; then
        BACKUP_FILE="$(pwd)/${BACKUP_FILE}"
    fi
    
    log_restore "INFO" "========================================"
    log_restore "INFO" "Starting Database Restore"
    log_restore "INFO" "========================================"
    log_restore "INFO" "Backup File: ${BACKUP_FILE}"
    log_restore "INFO" "Target Database: ${DB_NAME}"
    log_restore "INFO" "Rollback Enabled: ${PERFORM_ROLLBACK}"
    
    # Execute restore steps
    verify_backup_file || exit 1
    decrypt_backup || exit 1
    create_pre_restore_backup || log_restore "WARN" "Pre-restore backup failed, proceeding without rollback backup"
    restore_to_temp_db || exit 1
    perform_restore || exit 1
    
    # Cleanup and summary
    cleanup_temp_files
    display_restore_summary
    
    # Send success notification
    send_email_notification "SUCCESS" "Database restore completed successfully from: ${BACKUP_FILE}"
    send_slack_notification "SUCCESS" "Database restored successfully"
    
    log_restore "INFO" "Restore process completed successfully"
    return 0
}

# Run main function
main "$@"
