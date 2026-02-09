#!/bin/bash
################################################################################
# Backup Verification Script for Freelance AI Marketplace
#
# Features:
# - Check backup file existence
# - Verify gzip/gpg integrity
# - Check backup file size
# - Test restore to temporary database
# - Generate verification report
################################################################################

set -euo pipefail

# Source configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/backup-config.sh"
init_config

################################################################################
# Verification Variables
################################################################################

VERIFICATION_START_TIME=$(date +%s)
VERIFICATION_REPORT="${LOG_DIR}/verification_report_$(date +%Y%m%d_%H%M%S).txt"
VERIFY_ALL=false
VERIFY_LATEST=false
BACKUP_FILE=""
TEMP_VERIFY_DB="verify_$(date +%s)_$$"
TEMP_VERIFY_DIR="${TEMP_DIR}/verify_$$"
BACKUP_PASSED=0
BACKUP_FAILED=0
BACKUP_WARNINGS=0
VERIFICATION_SUMMARY=""

# Arrays to store results
declare -a FAILED_BACKUPS
declare -a PASSED_BACKUPS
declare -a WARNED_BACKUPS

################################################################################
# Helper Functions
################################################################################

# Display usage information
usage() {
    cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Verify backup file integrity and test restore capability.

OPTIONS:
  -f, --file FILE          Verify specific backup file
  -a, --all                Verify all backups in backup directories
  -l, --latest             Verify latest backup from each directory
  -r, --report FILE        Generate report to specified file
  -t, --test-restore       Perform test restore to temporary database
  -q, --quiet              Quiet mode (minimal output)
  -h, --help               Display this help message

EXAMPLES:
  # Verify a specific backup
  $(basename "$0") -f /path/to/backup.sql.gz

  # Verify all backups
  $(basename "$0") --all

  # Verify latest backups only
  $(basename "$0") --latest

  # Verify with test restore
  $(basename "$0") -f backup.sql.gz --test-restore

EOF
}

# Log verification message
log_verify() {
    local level="$1"
    shift
    local message="$*"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    if [[ "${QUIET_MODE:-false}" != "true" ]]; then
        case "${level}" in
            ERROR) echo -e "${RED}[${timestamp}] [${level}] ${message}${NC}" ;;
            WARN)  echo -e "${YELLOW}[${timestamp}] [${level}] ${message}${NC}" ;;
            INFO)  echo -e "${GREEN}[${timestamp}] [${level}] ${message}${NC}" ;;
            *)     echo "[${timestamp}] [${level}] ${message}" ;;
        esac
    fi
    
    # Write to report file
    echo "[${timestamp}] [${level}] ${message}" >> "${VERIFICATION_REPORT}"
}

# Increment counters
increment_counter() {
    local status="$1"
    case "${status}" in
        PASSED) ((BACKUP_PASSED++)) ;;
        FAILED) ((BACKUP_FAILED++)) ;;
        WARNING) ((BACKUP_WARNINGS++)) ;;
    esac
}

# Add to results list
add_result() {
    local status="$1"
    local backup="$2"
    local message="$3"
    
    case "${status}" in
        PASSED) PASSED_BACKUPS+=("${backup}: ${message}") ;;
        FAILED) FAILED_BACKUPS+=("${backup}: ${message}") ;;
        WARNING) WARNED_BACKUPS+=("${backup}: ${message}") ;;
    esac
}

# Format file size
format_size() {
    local bytes=$1
    if [[ ${bytes} -ge 1073741824 ]]; then
        echo "$(echo "scale=2; ${bytes} / 1073741824" | bc) GB"
    elif [[ ${bytes} -ge 1048576 ]]; then
        echo "$(echo "scale=2; ${bytes} / 1048576" | bc) MB"
    elif [[ ${bytes} -ge 1024 ]]; then
        echo "$(echo "scale=2; ${bytes} / 1024" | bc) KB"
    else
        echo "${bytes} bytes"
    fi
}

################################################################################
# Verification Functions
################################################################################

# Check if backup file exists
check_file_exists() {
    local backup_file="$1"
    
    if [[ ! -f "${backup_file}" ]]; then
        log_verify "ERROR" "File does not exist: ${backup_file}"
        increment_counter "FAILED"
        add_result "FAILED" "${backup_file}" "File does not exist"
        return 1
    fi
    
    log_verify "INFO" "File exists: ${backup_file}"
    return 0
}

# Check if backup file is readable
check_file_readable() {
    local backup_file="$1"
    
    if [[ ! -r "${backup_file}" ]]; then
        log_verify "ERROR" "File is not readable: ${backup_file}"
        increment_counter "FAILED"
        add_result "FAILED" "${backup_file}" "File not readable"
        return 1
    fi
    
    return 0
}

# Check backup file size
check_file_size() {
    local backup_file="$1"
    local min_size="${2:-1024}"  # Default 1KB minimum
    
    local file_size
    file_size=$(stat -f%z "${backup_file}" 2>/dev/null || stat -c%s "${backup_file}" 2>/dev/null)
    
    if [[ ${file_size} -lt ${min_size} ]]; then
        log_verify "ERROR" "File size too small: $(format_size ${file_size}) (minimum: $(format_size ${min_size}))"
        increment_counter "FAILED"
        add_result "FAILED" "${backup_file}" "File size too small"
        return 1
    fi
    
    if [[ ${file_size} -lt 1048576 ]]; then
        log_verify "WARN" "File size is small: $(format_size ${file_size})"
        increment_counter "WARNING"
        add_result "WARNING" "${backup_file}" "File size is small"
    else
        log_verify "INFO" "File size: $(format_size ${file_size})"
    fi
    
    return 0
}

# Check file modification time
check_file_age() {
    local backup_file="$1"
    local max_age_days="${2:-30}"
    
    local file_age_seconds
    file_age_seconds=$(($(date +%s) - $(stat -f%m "${backup_file}" 2>/dev/null || stat -c%Y "${backup_file}" 2>/dev/null)))
    local file_age_days=$((file_age_seconds / 86400))
    
    if [[ ${file_age_days} -gt ${max_age_days} ]]; then
        log_verify "WARN" "Backup is ${file_age_days} days old (consider archiving)"
        increment_counter "WARNING"
        add_result "WARNING" "${backup_file}" "Backup is ${file_age_days} days old"
    else
        log_verify "INFO" "Backup age: ${file_age_days} days"
    fi
    
    return 0
}

# Verify gzip integrity
check_gzip_integrity() {
    local backup_file="$1"
    
    if [[ ! "${backup_file}" =~ \.gz$ ]]; then
        log_verify "DEBUG" "Not a gzip file, skipping gzip check"
        return 0
    fi
    
    if ! command -v gzip &>/dev/null; then
        log_verify "WARN" "gzip command not found, skipping integrity check"
        return 0
    fi
    
    if ! gzip -t "${backup_file}" 2>&1 | tee -a "${VERIFICATION_REPORT}"; then
        log_verify "ERROR" "Gzip integrity check failed"
        increment_counter "FAILED"
        add_result "FAILED" "${backup_file}" "Gzip integrity check failed"
        return 1
    fi
    
    log_verify "INFO" "Gzip integrity check passed"
    return 0
}

# Verify GPG integrity (if encrypted)
check_gpg_integrity() {
    local backup_file="$1"
    
    if [[ ! "${backup_file}" =~ \.gpg$ ]]; then
        log_verify "DEBUG" "Not a GPG encrypted file, skipping GPG check"
        return 0
    fi
    
    if [[ "${HAS_GPG}" != "true" ]]; then
        log_verify "WARN" "GPG command not found, cannot verify encrypted backup"
        increment_counter "WARNING"
        add_result "WARNING" "${backup_file}" "Cannot verify GPG integrity"
        return 0
    fi
    
    if [[ -z "${BACKUP_ENCRYPTION_KEY}" ]]; then
        log_verify "WARN" "No encryption key provided, skipping GPG verification"
        increment_counter "WARNING"
        add_result "WARNING" "${backup_file}" "No encryption key"
        return 0
    fi
    
    local passphrase_file="${TEMP_DIR}/.gpg_passphrase.$$"
    echo "${BACKUP_ENCRYPTION_KEY}" > "${passphrase_file}"
    chmod 600 "${passphrase_file}"
    
    if ! gpg --batch --passphrase-file "${passphrase_file}" --decrypt \
        "${backup_file}" > /dev/null 2>&1; then
        log_verify "ERROR" "GPG integrity check failed (possibly wrong key)"
        rm -f "${passphrase_file}"
        increment_counter "FAILED"
        add_result "FAILED" "${backup_file}" "GPG integrity check failed"
        return 1
    fi
    
    rm -f "${passphrase_file}"
    log_verify "INFO" "GPG integrity check passed"
    return 0
}

# Verify checksum
check_checksum() {
    local backup_file="$1"
    local checksum_file="${backup_file}.sha256"
    
    if [[ ! -f "${checksum_file}" ]]; then
        log_verify "DEBUG" "No checksum file found, skipping checksum verification"
        return 0
    fi
    
    if command -v sha256sum &>/dev/null; then
        if ! sha256sum -c "${checksum_file}" 2>&1 | tee -a "${VERIFICATION_REPORT}"; then
            log_verify "ERROR" "Checksum verification failed"
            increment_counter "FAILED"
            add_result "FAILED" "${backup_file}" "Checksum verification failed"
            return 1
        fi
    elif command -v shasum &>/dev/null; then
        if ! shasum -a 256 -c "${checksum_file}" 2>&1 | tee -a "${VERIFICATION_REPORT}"; then
            log_verify "ERROR" "Checksum verification failed"
            increment_counter "FAILED"
            add_result "FAILED" "${backup_file}" "Checksum verification failed"
            return 1
        fi
    else
        log_verify "WARN" "Checksum tool not found, skipping checksum verification"
        return 0
    fi
    
    log_verify "INFO" "Checksum verification passed"
    return 0
}

# Test restore to temporary database
check_test_restore() {
    local backup_file="$1"
    
    if [[ "${PERFORM_TEST_RESTORE:-false}" != "true" ]]; then
        log_verify "DEBUG" "Test restore disabled, skipping"
        return 0
    fi
    
    log_verify "INFO" "Performing test restore to temporary database..."
    
    # Create temp directory
    mkdir -p "${TEMP_VERIFY_DIR}"
    
    # Decrypt if needed
    local restore_file="${backup_file}"
    if [[ "${backup_file}" =~ \.gpg$ ]]; then
        restore_file="${TEMP_VERIFY_DIR}/decrypted.dump"
        local passphrase_file="${TEMP_DIR}/.gpg_passphrase.$$"
        echo "${BACKUP_ENCRYPTION_KEY}" > "${passphrase_file}"
        if ! gpg --batch --yes --passphrase-file "${passphrase_file}" \
            --decrypt --output "${restore_file}" "${backup_file}" 2>&1 | tee -a "${VERIFICATION_REPORT}"; then
            log_verify "ERROR" "Failed to decrypt backup for test restore"
            rm -f "${passphrase_file}"
            increment_counter "FAILED"
            add_result "FAILED" "${backup_file}" "Decryption failed for test restore"
            return 1
        fi
        rm -f "${passphrase_file}"
    fi
    
    # Decompress if needed
    if [[ "${restore_file}" =~ \.gz$ ]]; then
        local decompressed="${TEMP_VERIFY_DIR}/restored.dump"
        if ! gunzip -c "${restore_file}" > "${decompressed}" 2>&1; then
            log_verify "ERROR" "Failed to decompress backup for test restore"
            increment_counter "FAILED"
            add_result "FAILED" "${backup_file}" "Decompression failed"
            return 1
        fi
        restore_file="${decompressed}"
    fi
    
    # Create temporary database
    if ! ${PSQL_BIN} -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres \
        -c "CREATE DATABASE ${TEMP_VERIFY_DB};" 2>&1 | tee -a "${VERIFICATION_REPORT}"; then
        log_verify "ERROR" "Failed to create temporary database"
        increment_counter "FAILED"
        add_result "FAILED" "${backup_file}" "Failed to create temporary database"
        return 1
    fi
    
    # Perform test restore
    local pg_restore_opts=(
        -h "${DB_HOST}"
        -p "${DB_PORT}"
        -U "${DB_USER}"
        -d "${TEMP_VERIFY_DB}"
        -v
        -j "${PARALLEL_JOBS}"
        "${restore_file}"
    )
    
    if ! ${PG_RESTORE_BIN} "${pg_restore_opts[@]}" 2>&1 | tee -a "${VERIFICATION_REPORT}"; then
        log_verify "ERROR" "Test restore failed"
        ${PSQL_BIN} -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres \
            -c "DROP DATABASE IF EXISTS ${TEMP_VERIFY_DB};" &>/dev/null || true
        increment_counter "FAILED"
        add_result "FAILED" "${backup_file}" "Test restore failed"
        return 1
    fi
    
    # Check if tables were restored
    local table_count
    table_count=$(${PSQL_BIN} -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TEMP_VERIFY_DB}" \
        -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
    
    # Drop temporary database
    ${PSQL_BIN} -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres \
        -c "DROP DATABASE ${TEMP_VERIFY_DB};" &>/dev/null || true
    
    if [[ -z "${table_count}" ]] || [[ "${table_count}" == "0" ]]; then
        log_verify "WARN" "Test restore succeeded but no tables found"
        increment_counter "WARNING"
        add_result "WARNING" "${backup_file}" "No tables restored"
        return 0
    fi
    
    log_verify "INFO" "Test restore successful (${table_count} tables restored)"
    return 0
}

# Verify a single backup file
verify_backup() {
    local backup_file="$1"
    
    echo ""
    log_verify "INFO" "========================================"
    log_verify "INFO" "Verifying: ${backup_file}"
    log_verify "INFO" "========================================"
    
    local checks_failed=0
    
    # Run all checks
    check_file_exists "${backup_file}" || ((checks_failed++))
    check_file_readable "${backup_file}" || ((checks_failed++))
    check_file_size "${backup_file}" || ((checks_failed++))
    check_file_age "${backup_file}" || true
    check_gzip_integrity "${backup_file}" || ((checks_failed++))
    check_gpg_integrity "${backup_file}" || ((checks_failed++))
    check_checksum "${backup_file}" || ((checks_failed++))
    check_test_restore "${backup_file}" || ((checks_failed++))
    
    # Determine overall status
    if [[ ${checks_failed} -gt 0 ]]; then
        log_verify "ERROR" "Backup verification FAILED (${checks_failed} checks failed)"
        return 1
    else
        log_verify "INFO" "Backup verification PASSED"
        increment_counter "PASSED"
        add_result "PASSED" "${backup_file}" "All checks passed"
        return 0
    fi
}

# Verify all backups in directories
verify_all_backups() {
    log_verify "INFO" "Verifying all backups..."
    
    local backup_count=0
    
    # Find all backup files
    while IFS= read -r -d '' backup_file; do
        verify_backup "${backup_file}" || true
        ((backup_count++))
    done < <(find "${BACKUP_DAILY_DIR}" "${BACKUP_WEEKLY_DIR}" "${BACKUP_MONTHLY_DIR}" \
        -name "${BACKUP_FILE_PREFIX}_*${BACKUP_FILE_EXTENSION}*" -type f -print0 2>/dev/null)
    
    log_verify "INFO" "Verified ${backup_count} backup files"
}

# Verify latest backup from each directory
verify_latest_backups() {
    log_verify "INFO" "Verifying latest backups from each directory..."
    
    for dir in "${BACKUP_DAILY_DIR}" "${BACKUP_WEEKLY_DIR}" "${BACKUP_MONTHLY_DIR}"; do
        if [[ ! -d "${dir}" ]]; then
            log_verify "DEBUG" "Directory does not exist: ${dir}"
            continue
        fi
        
        local latest_backup
        latest_backup=$(find "${dir}" -name "${BACKUP_FILE_PREFIX}_*${BACKUP_FILE_EXTENSION}*" \
            -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -n1 | cut -d' ' -f2-)
        
        if [[ -n "${latest_backup}" ]]; then
            verify_backup "${latest_backup}"
        else
            log_verify "WARN" "No backups found in ${dir}"
        fi
    done
}

# Generate verification report
generate_report() {
    local report_file="$1"
    
    cat > "${report_file}" <<REPORT_HEADER
================================================================================
                 DATABASE BACKUP VERIFICATION REPORT
================================================================================

Report Generated: $(date '+%Y-%m-%d %H:%M:%S')
Verification System: Freelance AI Marketplace
Database: ${DB_NAME}
Directory: ${BACKUP_DIR}

SUMMARY
-------
Total Backups Verified: $((BACKUP_PASSED + BACKUP_FAILED + BACKUP_WARNINGS))
Passed: ${BACKUP_PASSED}
Failed: ${BACKUP_FAILED}
Warnings: ${BACKUP_WARNINGS}

REPORT_HEADER

    # Add passed backups
    if [[ ${#PASSED_BACKUPS[@]} -gt 0 ]]; then
        cat >> "${report_file}" <<SECTION
================================================================================
                           PASSED BACKUPS (${BACKUP_PASSED})
================================================================================
SECTION
        for backup in "${PASSED_BACKUPS[@]}"; do
            printf "  ✓ %s\n" "${backup}" >> "${report_file}"
        done
        echo "" >> "${report_file}"
    fi

    # Add failed backups
    if [[ ${#FAILED_BACKUPS[@]} -gt 0 ]]; then
        cat >> "${report_file}" <<SECTION
================================================================================
                           FAILED BACKUPS (${BACKUP_FAILED})
================================================================================
SECTION
        for backup in "${FAILED_BACKUPS[@]}"; do
            printf "  ✗ %s\n" "${backup}" >> "${report_file}"
        done
        echo "" >> "${report_file}"
    fi

    # Add warnings
    if [[ ${#WARNED_BACKUPS[@]} -gt 0 ]]; then
        cat >> "${report_file}" <<SECTION
================================================================================
                           WARNINGS (${BACKUP_WARNINGS})
================================================================================
SECTION
        for backup in "${WARNED_BACKUPS[@]}"; do
            printf "  ⚠ %s\n" "${backup}" >> "${report_file}"
        done
        echo "" >> "${report_file}"
    fi

    cat >> "${report_file}" <<REPORT_FOOTER
================================================================================
                         END OF VERIFICATION REPORT
================================================================================
REPORT_FOOTER

    log_verify "INFO" "Verification report saved to: ${report_file}"
}

# Display summary
display_summary() {
    local verification_end_time
    verification_end_time=$(date +%s)
    local duration=$((verification_end_time - VERIFICATION_START_TIME))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    
    echo ""
    echo "========================================"
    echo "      Verification Summary"
    echo "========================================"
    echo "Total Verified: $((BACKUP_PASSED + BACKUP_FAILED + BACKUP_WARNINGS))"
    echo -e "${GREEN}Passed: ${BACKUP_PASSED}${NC}"
    
    if [[ ${BACKUP_FAILED} -gt 0 ]]; then
        echo -e "${RED}Failed: ${BACKUP_FAILED}${NC}"
    fi
    
    if [[ ${BACKUP_WARNINGS} -gt 0 ]]; then
        echo -e "${YELLOW}Warnings: ${BACKUP_WARNINGS}${NC}"
    fi
    
    echo "Duration: ${minutes}m ${seconds}s"
    echo "========================================"
    echo ""
}

# Cleanup temp files
cleanup() {
    log_verify "DEBUG" "Cleaning up temporary files..."
    rm -rf "${TEMP_VERIFY_DIR}" 2>/dev/null || true
    
    # Drop temp database if exists
    ${PSQL_BIN} -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres \
        -c "DROP DATABASE IF EXISTS ${TEMP_VERIFY_DB};" &>/dev/null || true
}

# Signal handlers
trap cleanup EXIT

################################################################################
# Command Line Parsing
################################################################################

while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--file)
            BACKUP_FILE="$2"
            shift 2
            ;;
        -a|--all)
            VERIFY_ALL=true
            shift
            ;;
        -l|--latest)
            VERIFY_LATEST=true
            shift
            ;;
        -r|--report)
            VERIFICATION_REPORT="$2"
            shift 2
            ;;
        -t|--test-restore)
            PERFORM_TEST_RESTORE=true
            shift
            ;;
        -q|--quiet)
            QUIET_MODE=true
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
# Main Verification Process
################################################################################

main() {
    echo ""
    log_verify "INFO" "========================================"
    log_verify "INFO" "Starting Backup Verification"
    log_verify "INFO" "========================================"
    
    # Execute verification based on options
    if [[ "${VERIFY_ALL}" == "true" ]]; then
        verify_all_backups
    elif [[ "${VERIFY_LATEST}" == "true" ]]; then
        verify_latest_backups
    elif [[ -n "${BACKUP_FILE}" ]]; then
        # Resolve absolute path
        if [[ "${BACKUP_FILE}" != /* ]]; then
            BACKUP_FILE="$(pwd)/${BACKUP_FILE}"
        fi
        
        verify_backup "${BACKUP_FILE}"
    else
        log_verify "ERROR" "No verification target specified. Use --file, --all, or --latest"
        usage
        exit 1
    fi
    
    # Generate report and display summary
    generate_report "${VERIFICATION_REPORT}"
    display_summary
    
    log_verify "INFO" "Verification completed"
    
    # Exit with error code if any failures
    if [[ ${BACKUP_FAILED} -gt 0 ]]; then
        exit 1
    fi
}

# Run main function
main "$@"
