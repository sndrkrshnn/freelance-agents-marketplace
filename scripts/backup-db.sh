#!/bin/bash
################################################################################
# Database Backup Script for Freelance AI Marketplace
# 
# Features:
# - Full database dump using pg_dump
# - Gzip compression
# - Timestamped filenames
# - Local backup storage
# - Remote backup to AWS S3 (optional)
# - Backup validation
# - Retention policy enforcement
# - Automatic cleanup of old backups
# - Comprehensive logging and error handling
# - Email notifications on failure
################################################################################

set -euo pipefail

# Source configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/backup-config.sh"
init_config

################################################################################
# Backup Variables
################################################################################

BACKUP_START_TIME=$(date +%s)
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILENAME="${BACKUP_FILE_PREFIX}_${TIMESTAMP}${BACKUP_FILE_EXTENSION}"
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILENAME}"
TEMP_BACKUP_FILE="${TEMP_DIR}/${BACKUP_FILENAME}"

# Determine if this is a weekly backup (Sunday)
DAY_OF_WEEK=$(date +%u)
IS_WEEKLY=$(( DAY_OF_WEEK == 7 ))

# Determine if this is a monthly backup (1st of month)
DAY_OF_MONTH=$(date +%d)
IS_MONTHLY=$(( DAY_OF_MONTH == 1 ))

# Final backup location based on type
if [[ "${IS_MONTHLY}" == "1" ]]; then
    FINAL_BACKUP_DIR="${BACKUP_MONTHLY_DIR}"
    BACKUP_TYPE="monthly"
elif [[ "${IS_WEEKLY}" == "1" ]]; then
    FINAL_BACKUP_DIR="${BACKUP_WEEKLY_DIR}"
    BACKUP_TYPE="weekly"
else
    FINAL_BACKUP_DIR="${BACKUP_DAILY_DIR}"
    BACKUP_TYPE="daily"
fi

FINAL_BACKUP_FILE="${FINAL_BACKUP_DIR}/${BACKUP_FILENAME}"

################################################################################
# Notification Functions
################################################################################

# Send email notification
send_email_notification() {
    local status="$1"
    local message="$2"
    
    if [[ -z "${ALERT_EMAIL}" ]]; then
        log "DEBUG" "No alert email configured, skipping notification"
        return 0
    fi
    
    if ! command -v mail &>/dev/null; then
        log "WARN" "mail command not found, cannot send email notification"
        return 1
    fi
    
    local subject="[Freelance Marketplace] Database Backup ${status}"
    local full_message="Backup Script: ${0}
Timestamp: ${TIMESTAMP}
Database: ${DB_NAME}
Type: ${BACKUP_TYPE}
Status: ${status}

${message}"
    
    echo "${full_message}" | mail -s "${subject}" -r "${ALERT_EMAIL_FROM}" "${ALERT_EMAIL}"
    log "INFO" "Email notification sent to ${ALERT_EMAIL}"
}

# Send Slack notification
send_slack_notification() {
    local status="$1"
    local message="$2"
    
    if [[ -z "${SLACK_WEBHOOK_URL}" ]]; then
        log "DEBUG" "No Slack webhook configured, skipping notification"
        return 0
    fi
    
    local color
    case "${status}" in
        SUCCESS) color="#36a64f" ;;
        FAILED) color="#dc3545" ;;
        WARNING) color="#ffc107" ;;
    esac
    
    local payload
    payload=$(cat <<EOF
{
  "attachments": [
    {
      "color": "${color}",
      "title": "Database Backup ${status}",
      "fields": [
        {
          "title": "Database",
          "value": "${DB_NAME}",
          "short": true
        },
        {
          "title": "Type",
          "value": "${BACKUP_TYPE}",
          "short": true
        },
        {
          "title": "Timestamp",
          "value": "${TIMESTAMP}",
          "short": true
        },
        {
          "title": "Environment",
          "value": "${ENVIRONMENT}",
          "short": true
        }
      ],
      "text": "${message}"
    }
  ]
}
EOF
)
    
    curl -s -X POST "${SLACK_WEBHOOK_URL}" \
        -H 'Content-Type: application/json' \
        -d "${payload}" &>/dev/null && log "INFO" "Slack notification sent"
}

# Send Discord notification
send_discord_notification() {
    local status="$1"
    local message="$2"
    
    if [[ -z "${DISCORD_WEBHOOK_URL}" ]]; then
        log "DEBUG" "No Discord webhook configured, skipping notification"
        return 0
    fi
    
    local color
    case "${status}" in
        SUCCESS) color=5814783 ;;
        FAILED) color=16007990 ;;
        WARNING) color=16776960 ;;
    esac
    
    local payload
    payload=$(cat <<EOF
{
  "embeds": [
    {
      "title": "Database Backup ${status}",
      "color": ${color},
      "fields": [
        {
          "name": "Database",
          "value": "${DB_NAME}",
          "inline": true
        },
        {
          "name": "Type",
          "value": "${BACKUP_TYPE}",
          "inline": true
        },
        {
          "name": "Timestamp",
          "value": "${TIMESTAMP}",
          "inline": true
        },
        {
          "name": "Environment",
          "value": "${ENVIRONMENT}",
          "inline": true
        }
      ],
      "description": "${message}"
    }
  ]
}
EOF
)
    
    curl -s -X POST "${DISCORD_WEBHOOK_URL}" \
        -H 'Content-Type: application/json' \
        -d "${payload}" &>/dev/null && log "INFO" "Discord notification sent"
}

# Send all notifications
send_notifications() {
    local status="$1"
    local message="$2"
    
    send_email_notification "${status}" "${message}"
    send_slack_notification "${status}" "${message}"
    send_discord_notification "${status}" "${message}"
}

################################################################################
# Backup Functions
################################################################################

# Pre-backup checks
pre_backup_checks() {
    log "INFO" "Performing pre-backup checks..."
    
    # Check if database is accessible
    if ! ${PSQL_BIN} -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "SELECT 1" &>/dev/null; then
        log "ERROR" "Cannot connect to database server at ${DB_HOST}:${DB_PORT}"
        return 1
    fi
    
    # Check if database exists
    if ! ${PSQL_BIN} -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -lqt | cut -d \| -f 1 | grep -qw "${DB_NAME}"; then
        log "ERROR" "Database ${DB_NAME} does not exist"
        return 1
    fi
    
    # Check database size
    local db_size
    db_size=$(${PSQL_BIN} -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -t -c \
        "SELECT pg_size_pretty(pg_database_size('${DB_NAME}'))")
    log "INFO" "Database size: ${db_size}"
    
    # Check available disk space
    local available_space
    available_space=$(df -BG "${TEMP_DIR}" | awk 'NR==2 {print $4}' | tr -d 'G')
    log "INFO" "Available disk space in ${TEMP_DIR}: ${available_space}GB"
    
    if [[ ${available_space} -lt 1 ]]; then
        log "ERROR" "Insufficient disk space for backup"
        return 1
    fi
    
    log "INFO" "Pre-backup checks completed successfully"
    return 0
}

# Create database dump
create_dump() {
    log "INFO" "Creating database dump of ${DB_NAME}..."
    
    local pg_dump_opts=(
        -h "${DB_HOST}"
        -p "${DB_PORT}"
        -U "${DB_USER}"
        -d "${DB_NAME}"
        -F c  # Custom format
        -f "${TEMP_BACKUP_FILE}"
        -v    # Verbose
        -j "${PARALLEL_JOBS}"  # Parallel jobs
    )
    
    # Execute pg_dump
    if ! ${PG_DUMP_BIN} "${pg_dump_opts[@]}" 2>&1 | while IFS= read -r line; do
        log "DEBUG" "${line}"
    done; then
        log "ERROR" "Failed to create database dump"
        return 1
    fi
    
    # Check if backup file was created
    if [[ ! -f "${TEMP_BACKUP_FILE}" ]]; then
        log "ERROR" "Backup file was not created"
        return 1
    fi
    
    log "INFO" "Database dump created successfully"
    return 0
}

# Compress backup
compress_backup() {
    log "INFO" "Compressing backup file..."
    
    local compressed_file="${TEMP_BACKUP_FILE}.gz"
    
    # Compress the file
    if ! gzip -${COMPRESSION_LEVEL} -c "${TEMP_BACKUP_FILE}" > "${compressed_file}"; then
        log "ERROR" "Failed to compress backup file"
        return 1
    fi
    
    # Remove uncompressed file
    rm -f "${TEMP_BACKUP_FILE}"
    
    # Update temp backup file path
    TEMP_BACKUP_FILE="${compressed_file}"
    BACKUP_FILENAME="${BACKUP_FILENAME}.gz"
    FINAL_BACKUP_FILE="${FINAL_BACKUP_DIR}/${BACKUP_FILENAME}"
    
    # Get compressed file size
    local compressed_size
    compressed_size=$(du -h "${TEMP_BACKUP_FILE}" | cut -f1)
    log "INFO" "Backup compressed successfully: ${compressed_size}"
    
    return 0
}

# Encrypt backup (optional)
encrypt_backup() {
    if [[ "${BACKUP_ENCRYPT}" != "true" ]]; then
        log "DEBUG" "Encryption disabled, skipping"
        return 0
    fi
    
    if [[ -z "${BACKUP_ENCRYPTION_KEY}" ]]; then
        log "WARN" "Encryption enabled but no key provided, skipping"
        return 0
    fi
    
    if [[ "${HAS_GPG}" != "true" ]]; then
        log "WARN" "GPG not found, cannot encrypt backup"
        return 0
    fi
    
    log "INFO" "Encrypting backup file..."
    
    local encrypted_file="${TEMP_BACKUP_FILE}${ENCRYPTED_EXTENSION: -4}"
    local passphrase_file="${TEMP_DIR}/.gpg_passphrase.$$"
    
    # Create temporary passphrase file
    echo "${BACKUP_ENCRYPTION_KEY}" > "${passphrase_file}"
    chmod 600 "${passphrase_file}"
    
    # Encrypt the file
    if ! gpg --batch --yes --passphrase-file "${passphrase_file}" \
        --symmetric --cipher-algo AES256 \
        --output "${encrypted_file}" \
        "${TEMP_BACKUP_FILE}"; then
        log "ERROR" "Failed to encrypt backup file"
        rm -f "${passphrase_file}"
        return 1
    fi
    
    # Remove passphrase file
    rm -f "${passphrase_file}"
    
    # Remove unencrypted file
    rm -f "${TEMP_BACKUP_FILE}"
    
    # Update paths
    TEMP_BACKUP_FILE="${encrypted_file}"
    BACKUP_FILENAME="${BACKUP_FILENAME}${ENCRYPTED_EXTENSION: -4}"
    FINAL_BACKUP_FILE="${FINAL_BACKUP_DIR}/${BACKUP_FILENAME}"
    
    log "INFO" "Backup encrypted successfully"
    return 0
}

# Validate backup integrity
validate_backup() {
    if [[ "${VERIFY_BACKUP}" != "true" ]]; then
        log "DEBUG" "Backup validation disabled, skipping"
        return 0
    fi
    
    log "INFO" "Validating backup integrity..."
    
    # Check file size (should be at least 1KB)
    local file_size
    file_size=$(stat -f%z "${TEMP_BACKUP_FILE}" 2>/dev/null || stat -c%s "${TEMP_BACKUP_FILE}" 2>/dev/null)
    
    if [[ ${file_size} -lt 1024 ]]; then
        log "ERROR" "Backup file is too small: ${file_size} bytes"
        return 1
    fi
    
    log "INFO" "Backup file size: ${file_size} bytes"
    
    # Test gzip integrity
    if [[ "${TEMP_BACKUP_FILE}" =~ \.gz$ ]]; then
        if ! gzip -t "${TEMP_BACKUP_FILE}" 2>&1; then
            log "ERROR" "Gzip integrity check failed"
            return 1
        fi
        log "INFO" "Gzip integrity check passed"
    fi
    
    # Test GPG integrity (if encrypted)
    if [[ "${TEMP_BACKUP_FILE}" =~ \.gpg$ && "${HAS_GPG}" == "true" ]]; then
        if ! gpg --batch --passphrase "${BACKUP_ENCRYPTION_KEY}" --decrypt "${TEMP_BACKUP_FILE}" > /dev/null 2>&1; then
            log "ERROR" "GPG integrity check failed"
            return 1
        fi
        log "INFO" "GPG integrity check passed"
    fi
    
    log "INFO" "Backup validation completed successfully"
    return 0
}

# Move backup to final location
move_backup() {
    log "INFO" "Moving backup to ${FINAL_BACKUP_DIR}..."
    
    # Ensure target directory exists
    mkdir -p "${FINAL_BACKUP_DIR}"
    
    # Atomic move
    mv "${TEMP_BACKUP_FILE}" "${FINAL_BACKUP_FILE}"
    
    # Get final file size
    local final_size
    final_size=$(du -h "${FINAL_BACKUP_FILE}" | cut -f1)
    
    log "INFO" "Backup stored at: ${FINAL_BACKUP_FILE}"
    log "INFO" "Final backup size: ${final_size}"
    
    return 0
}

# Upload to S3 (optional)
upload_to_s3() {
    if [[ -z "${AWS_S3_BUCKET}" ]]; then
        log "DEBUG" "S3 bucket not configured, skipping upload"
        return 0
    fi
    
    if [[ "${HAS_AWS}" != "true" ]]; then
        log "WARN" "AWS CLI not found, cannot upload to S3"
        return 1
    fi
    
    log "INFO" "Uploading backup to S3..."
    
    local s3_path="s3://${AWS_S3_BUCKET}/${AWS_S3_PREFIX}${BACKUP_TYPE}/${TIMESTAMP}/${BACKUP_FILENAME}"
    
    # Upload with server-side encryption
    if ! aws s3 cp "${FINAL_BACKUP_FILE}" "${s3_path}" \
        --storage-class STANDARD_IA \
        --server-side-encryption AES256 \
        --region "${AWS_S3_REGION}"; then
        log "ERROR" "Failed to upload backup to S3"
        return 1
    fi
    
    log "INFO" "Backup uploaded to S3: ${s3_path}"
    return 0
}

# Cleanup old backups
cleanup_old_backups() {
    log "INFO" "Cleaning up old backups..."
    
    local total_removed=0
    
    # Cleanup old daily backups
    local old_daily
    old_daily=$(find "${BACKUP_DAILY_DIR}" -name "${BACKUP_FILE_PREFIX}_*${BACKUP_FILE_EXTENSION}*" \
        -type f -mtime +${BACKUP_RETENTION_DAYS} 2>/dev/null | wc -l)
    
    if [[ ${old_daily} -gt 0 ]]; then
        find "${BACKUP_DAILY_DIR}" -name "${BACKUP_FILE_PREFIX}_*${BACKUP_FILE_EXTENSION}*" \
            -type f -mtime +${BACKUP_RETENTION_DAYS} -delete
        log "INFO" "Removed ${old_daily} old daily backups"
        total_removed=$((total_removed + old_daily))
    fi
    
    # Cleanup old weekly backups
    local old_weekly
    old_weekly=$(find "${BACKUP_WEEKLY_DIR}" -name "${BACKUP_FILE_PREFIX}_*${BACKUP_FILE_EXTENSION}*" \
        -type f -mtime +$((BACKUP_RETENTION_WEEKS * 7)) 2>/dev/null | wc -l)
    
    if [[ ${old_weekly} -gt 0 ]]; then
        find "${BACKUP_WEEKLY_DIR}" -name "${BACKUP_FILE_PREFIX}_*${BACKUP_FILE_EXTENSION}*" \
            -type f -mtime +$((BACKUP_RETENTION_WEEKS * 7)) -delete
        log "INFO" "Removed ${old_weekly} old weekly backups"
        total_removed=$((total_removed + old_weekly))
    fi
    
    # Cleanup old monthly backups
    local old_monthly
    old_monthly=$(find "${BACKUP_MONTHLY_DIR}" -name "${BACKUP_FILE_PREFIX}_*${BACKUP_FILE_EXTENSION}*" \
        -type f -mtime +$((BACKUP_RETENTION_MONTHS * 30)) 2>/dev/null | wc -l)
    
    if [[ ${old_monthly} -gt 0 ]]; then
        find "${BACKUP_MONTHLY_DIR}" -name "${BACKUP_FILE_PREFIX}_*${BACKUP_FILE_EXTENSION}*" \
            -type f -mtime +$((BACKUP_RETENTION_MONTHS * 30)) -delete
        log "INFO" "Removed ${old_monthly} old monthly backups"
        total_removed=$((total_removed + old_monthly))
    fi
    
    # Cleanup temporary files
    find "${TEMP_DIR}" -type f -mtime +1 -delete 2>/dev/null || true
    
    if [[ ${total_removed} -gt 0 ]]; then
        log "INFO" "Total files removed: ${total_removed}"
    else
        log "INFO" "No old backups to remove"
    fi
    
    # Display disk space usage
    local backup_total_size
    backup_total_size=$(du -sh "${BACKUP_DIR}" | cut -f1)
    log "INFO" "Total backup directory size: ${backup_total_size}"
    
    return 0
}

# Create backup checksum
create_checksum() {
    log "INFO" "Creating backup checksum..."
    
    local checksum_file="${FINAL_BACKUP_FILE}.sha256"
    
    if command -v sha256sum &>/dev/null; then
        sha256sum "${FINAL_BACKUP_FILE}" > "${checksum_file}"
    elif command -v shasum &>/dev/null; then
        shasum -a 256 "${FINAL_BACKUP_FILE}" > "${checksum_file}"
    else
        log "WARN" "sha256sum/shasum not found, skipping checksum creation"
        return 0
    fi
    
    log "INFO" "Checksum created: ${checksum_file}"
    return 0
}

# Display backup summary
display_summary() {
    local backup_end_time
    backup_end_time=$(date +%s)
    local duration=$((backup_end_time - BACKUP_START_TIME))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    
    echo ""
    log "INFO" "=== Backup Summary ==="
    log "INFO" "Status: SUCCESS"
    log "INFO" "Type: ${BACKUP_TYPE}"
    log "INFO" "Database: ${DB_NAME}"
    log "INFO" "Backup File: ${FINAL_BACKUP_FILE}"
    log "INFO" "Timestamp: ${TIMESTAMP}"
    log "INFO" "Duration: ${minutes}m ${seconds}s"
    log "INFO" "======================"
    echo ""
}

################################################################################
# Error Handler
################################################################################

# Cleanup function on error
cleanup_on_error() {
    local error_line=$1
    log "ERROR" "Backup failed at line ${error_line}"
    
    # Remove incomplete backup file
    if [[ -f "${TEMP_BACKUP_FILE}" ]]; then
        rm -f "${TEMP_BACKUP_FILE}"
        log "INFO" "Removed incomplete backup file: ${TEMP_BACKUP_FILE}"
    fi
    
    # Send failure notification
    send_notifications "FAILED" "Backup process failed at line ${error_line}"
    
    exit 1
}

# Set error trap
trap 'cleanup_on_error ${LINENO}' ERR

################################################################################
# Main Backup Process
################################################################################

main() {
    log "INFO" "========================================"
    log "INFO" "Starting ${BACKUP_TYPE} database backup"
    log "INFO" "========================================"
    
    # Execute backup steps
    pre_backup_checks || exit 1
    create_dump || exit 1
    compress_backup || exit 1
    encrypt_backup || exit 1
    validate_backup || exit 1
    move_backup || exit 1
    create_checksum || true
    upload_to_s3 || true
    cleanup_old_backups || true
    
    # Display summary and send notifications
    display_summary
    send_notifications "SUCCESS" "Backup completed successfully"
    
    log "INFO" "Backup process completed successfully"
    return 0
}

# Run main function
main "$@"
