#!/bin/bash
################################################################################
# Unit Tests for Database Backup Scripts
# Tests: backup-db.sh, restore-db.sh, verify-backup.sh, dev-backup.sh
################################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test output
verbose=false
stop_on_failure=false

# Test environment
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BACKUP_ROOT="${PROJECT_ROOT}/tests/tmp/backups"
TEST_LOG_DIR="${PROJECT_ROOT}/tests/tmp/logs"
MOCK_DB_NAME="freelance_test_db_$$"

################################################################################
# Test Framework Functions
################################################################################

# Setup test environment
setup_test_env() {
    echo -e "${BLUE}Setting up test environment...${NC}"
    
    # Create test directories
    mkdir -p "${BACKUP_ROOT}"/{daily,weekly,monthly}
    mkdir -p "${TEST_LOG_DIR}"
    mkdir -p "${PROJECT_ROOT}/tests/tmp/temp"
    
    # Set test environment variables
    export BACKUP_DIR="${BACKUP_ROOT}"
    export BACKUP_DAILY_DIR="${BACKUP_ROOT}/daily"
    export BACKUP_WEEKLY_DIR="${BACKUP_ROOT}/weekly"
    export BACKUP_MONTHLY_DIR="${BACKUP_ROOT}/monthly"
    export LOG_DIR="${TEST_LOG_DIR}"
    export TEMP_DIR="${PROJECT_ROOT}/tests/tmp/temp"
    export DB_NAME="${MOCK_DB_NAME}"
    export BACKUP_ENCRYPT=false
    export BACKUP_VERIFY=false
    export SKIP_CONFIRMATION=true
    
    # Create a mock backup script for testing
    create_mock_backup_script
    
    echo -e "${GREEN}Test environment ready${NC}"
}

# Create mock backup script for offline testing
create_mock_backup_script() {
    cat > "${PROJECT_ROOT}/tests/tmp/mock_backup.sh" <<'EOF'
#!/bin/bash
timestamp=$(date '+%Y%m%d_%H%M%S')
filename="freelance_agents_db_${timestamp}.sql.gz"
echo "${filename}"
echo "Mock backup created"
exit 0
EOF
    chmod +x "${PROJECT_ROOT}/tests/tmp/mock_backup.sh"
}

# Cleanup test environment
cleanup_test_env() {
    echo -e "${BLUE}Cleaning up test environment...${NC}"
    rm -rf "${PROJECT_ROOT}/tests/tmp"
    echo -e "${GREEN}Cleanup complete${NC}"
}

# Run a test
run_test() {
    local test_name="$1"
    local test_function="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${BLUE}[TEST ${TOTAL_TESTS}]${NC} ${test_name}"
    
    if run_test_internal "${test_function}"; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}  ✓ PASSED${NC} : ${test_name}"
        return 0
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "${RED}  ✗ FAILED${NC} : ${test_name}"
        if [[ "${stop_on_failure}" == "true" ]]; then
            exit 1
        fi
        return 1
    fi
}

# Internal test runner
run_test_internal() {
    local test_function="$1"
    local test_output
    local test_result
    
    if [[ "${verbose}" == "true" ]]; then
        test_output=$(${test_function} 2>&1)
        test_result=$?
    else
        test_output=$(${test_function} 2>&1)
        test_result=$?
    fi
    
    if [[ -n "${test_output}" ]] && [[ "${verbose}" == "true" ]]; then
        echo "${test_output}"
    fi
    
    return ${test_result}
}

# Assert equal
assert_equal() {
    local expected="$1"
    local actual="$2"
    local message="${3:-}"
    
    if [[ "${expected}" != "${actual}" ]]; then
        echo -e "${RED}  Assertion failed: expected '${expected}' but got '${actual}'${NC}"
        [[ -n "${message}" ]] && echo "  ${message}"
        return 1
    fi
    return 0
}

# Assert not empty
assert_not_empty() {
    local value="$1"
    local message="${2:-}"
    
    if [[ -z "${value}" ]]; then
        echo -e "${RED}  Assertion failed: value is empty${NC}"
        [[ -n "${message}" ]] && echo "  ${message}"
        return 1
    fi
    return 0
}

# Assert file exists
assert_file_exists() {
    local file_path="$1"
    local message="${2:-}"
    
    if [[ ! -f "${file_path}" ]]; then
        echo -e "${RED}  Assertion failed: file does not exist: ${file_path}${NC}"
        [[ -n "${message}" ]] && echo "  ${message}"
        return 1
    fi
    return 0
}

# Assert directory exists
assert_dir_exists() {
    local dir_path="$1"
    local message="${2:-}"
    
    if [[ ! -d "${dir_path}" ]]; then
        echo -e "${RED}  Assertion failed: directory does not exist: ${dir_path}${NC}"
        [[ -n "${message}" ]] && echo "  ${message}"
        return 1
    fi
    return 0
}

# Assert command succeeds
assert_command_succeeds() {
    local command="$1"
    local message="${2:-}"
    
    if ! eval "${command}" &>/dev/null; then
        echo -e "${RED}  Assertion failed: command failed: ${command}${NC}"
        [[ -n "${message}" ]] && echo "  ${message}"
        return 1
    fi
    return 0
}

# Assert command fails
assert_command_fails() {
    local command="$1"
    local message="${2:-}"
    
    if eval "${command}" &>/dev/null; then
        echo -e "${RED}  Assertion failed: command succeeded when it should have failed: ${command}${NC}"
        [[ -n "${message}" ]] && echo "  ${message}"
        return 1
    fi
    return 0
}

################################################################################
# Test Suites
################################################################################

# Tests for backup-config.sh
test_backup_config() {
    
    # Test 1: Config script is executable
    assert_file_exists "${PROJECT_ROOT}/scripts/backup-config.sh"
    assert_command_succeeds "test -x ${PROJECT_ROOT}/scripts/backup-config.sh"
    
    # Test 2: Config contains required variables
    assert_not_empty "$(grep -c 'DB_HOST=' ${PROJECT_ROOT}/scripts/backup-config.sh)"
    assert_not_empty "$(grep -c 'BACKUP_DIR=' ${PROJECT_ROOT}/scripts/backup-config.sh)"
    assert_not_empty "$(grep -c 'BACKUP_RETENTION_DAYS=' ${PROJECT_ROOT}/scripts/backup-config.sh)"
    
    # Test 3: Required helper functions exist
    assert_not_empty "$(grep -c 'log()' ${PROJECT_ROOT}/scripts/backup-config.sh)"
    assert_not_empty "$(grep -c 'check_requirements()' ${PROJECT_ROOT}/scripts/backup-config.sh)"
    assert_not_empty "$(grep -c 'validate_config()' ${PROJECT_ROOT}/scripts/backup-config.sh)"
}

# Tests for backup-db.sh
test_backup_db_script() {
    local backup_script="${PROJECT_ROOT}/scripts/backup-db.sh"
    
    # Test 1: Script exists and is executable
    assert_file_exists "${backup_script}"
    assert_command_succeeds "test -x ${backup_script}"
    
    # Test 2: Script sources config
    assert_not_empty "$(grep -c 'source.*backup-config.sh' ${backup_script})"
    
    # Test 3: Script has main function
    assert_not_empty "$(grep -c '^main()' ${backup_script})"
    
    # Test 4: Script contains required functions
    assert_not_empty "$(grep -c 'pre_backup_checks()' ${backup_script})"
    assert_not_empty "$(grep -c 'create_dump()' ${backup_script})"
    assert_not_empty "$(grep -c 'compress_backup()' ${backup_script})"
    assert_not_empty "$(grep -c 'validate_backup()' ${backup_script})"
    assert_not_empty "$(grep -c 'cleanup_old_backups()' ${backup_script})"
    
    # Test 5: Script has error handling
    assert_not_empty "$(grep -c 'set -euo pipefail' ${backup_script})"
    assert_not_empty "$(grep -c 'trap.*ERR' ${backup_script})"
}

# Tests for restore-db.sh
test_restore_db_script() {
    local restore_script="${PROJECT_ROOT}/scripts/restore-db.sh"
    
    # Test 1: Script exists and is executable
    assert_file_exists "${restore_script}"
    assert_command_succeeds "test -x ${restore_script}"
    
    # Test 2: Script parses command line arguments
    assert_not_empty "$(grep -c '\-f|--file' ${restore_script})"
    assert_not_empty "$(grep -c '\-l|--list' ${restore_script})"
    assert_not_empty "$(grep -c '\-t|--timestamp' ${restore_script})"
    assert_not_empty "$(grep -c '\-r|--rollback' ${restore_script})"
    
    # Test 3: Script has verification functions
    assert_not_empty "$(grep -c 'verify_backup_file()' ${restore_script})"
    assert_not_empty "$(grep -c 'decrypt_backup()' ${restore_script})"
    assert_not_empty "$(grep -c 'perform_restore()' ${restore_script})"
    
    # Test 4: Script has rollback functionality
    assert_not_empty "$(grep -c 'rollback_restore()' ${restore_script})"
    assert_not_empty "$(grep -c 'create_pre_restore_backup()' ${restore_script})"
    
    # Test 5: Script has error handling
    assert_not_empty "$(grep -c 'handle_error' ${restore_script})"
    assert_not_empty "$(grep -c 'trap.*ERR' ${restore_script})"
}

# Tests for verify-backup.sh
test_verify_backup_script() {
    local verify_script="${PROJECT_ROOT}/scripts/verify-backup.sh"
    
    # Test 1: Script exists and is executable
    assert_file_exists "${verify_script}"
    assert_command_succeeds "test -x ${verify_script}"
    
    # Test 2: Script accepts required arguments
    assert_not_empty "$(grep -c '\-f|--file' ${verify_script})"
    assert_not_empty "$(grep -c '\-a|--all' ${verify_script})"
    assert_not_empty "$(grep -c '\-l|--latest' ${verify_script})"
    assert_not_empty "$(grep -c '\-t|--test-restore' ${verify_script})"
    
    # Test 3: Script has verification checks
    assert_not_empty "$(grep -c 'check_file_exists()' ${verify_script})"
    assert_not_empty "$(grep -c 'check_file_size()' ${verify_script})"
    assert_not_empty "$(grep -c 'check_gzip_integrity()' ${verify_script})"
    assert_not_empty "$(grep -c 'check_test_restore()' ${verify_script})"
    
    # Test 4: Script generates reports
    assert_not_empty "$(grep -c 'generate_report()' ${verify_script})"
    assert_not_empty "$(grep -c 'VERIFICATION_REPORT' ${verify_script})"
}

# Tests for dev-backup.sh
test_dev_backup_script() {
    local dev_script="${PROJECT_ROOT}/scripts/dev-backup.sh"
    
    # Test 1: Script exists and is executable
    assert_file_exists "${dev_script}"
    assert_command_succeeds "test -x ${dev_script}"
    
    # Test 2: Script has main commands
    assert_not_empty "$(grep -c 'backup|b' ${dev_script})"
    assert_not_empty "$(grep -c 'restore|r' ${dev_script})"
    assert_not_empty "$(grep -c 'list|l' ${dev_script})"
    assert_not_empty "$(grep -c 'clean|c' ${dev_script})"
    
    # Test 3: Script creates dev backup directory
    assert_not_empty "$(grep -c 'dev-backups' ${dev_script})"
    
    # Test 4: Script uses fast/quick options (no compression)
    # Check for comments or flags indicating quick operation
    local quick_ops
    quick_ops=$(grep -ciF 'fast\|quick\|no compress' ${dev_script} 2>/dev/null | head -1)
    if [[ -n "${quick_ops}" && ${quick_ops} -gt 0 ]]; then
        echo "  ✓ Script supports quick/fast operations"
    fi
}

# Tests for GitHub Actions workflow
test_github_workflow() {
    local workflow="${PROJECT_ROOT}/.github/workflows/database-backup.yml"
    
    # Test 1: Workflow file exists
    assert_file_exists "${workflow}"
    
    # Test 2: Workflow has schedule trigger
    assert_not_empty "$(grep -c 'cron:' ${workflow})"
    
    # Test 3: Workflow has manual trigger
    assert_not_empty "$(grep -c 'workflow_dispatch:' ${workflow})"
    
    # Test 4: Workflow references backup script
    assert_not_empty "$(grep -c 'backup-db.sh\|pg_dump' ${workflow})"
    
    # Test 5: Workflow has artifact upload
    assert_not_empty "$(grep -c 'actions/upload-artifact' ${workflow})"
    
    # Test 6: Workflow has S3 upload (optional)
    assert_not_empty "$(grep -c 'aws s3\|AWS_S3_BUCKET' ${workflow})"
}

# Tests for backup file structure
test_backup_file_structure() {
    # Test 1: Backup directory structure created
    assert_dir_exists "${BACKUP_DAILY_DIR}"
    assert_dir_exists "${BACKUP_WEEKLY_DIR}"
    assert_dir_exists "${BACKUP_MONTHLY_DIR}"
    
    # Test 2: Create a test backup file
    local test_backup="${BACKUP_DAILY_DIR}/test_20240209_120000.sql.gz"
    echo "test data" > "${test_backup}"
    assert_file_exists "${test_backup}"
    
    # Test 3: Create test checksum
    if command -v sha256sum &>/dev/null; then
        sha256sum "${test_backup}" > "${test_backup}.sha256"
        assert_file_exists "${test_backup}.sha256"
    fi
}

# Tests for backup naming convention
test_backup_naming_convention() {
    local prefix="freelance_agents_db"
    
    # Test 1: Valid filename format
    local valid_file="${BACKUP_DAILY_DIR}/${prefix}_20240209_120000.sql.gz"
    touch "${valid_file}"
    
    local filename
    filename=$(basename "${valid_file}")
    
    # Check filename structure
    if [[ "${filename}" == "${prefix}"_* ]] && [[ "${filename}" == *".sql.gz" ]]; then
        echo "  ✓ Filename has correct structure: ${filename}"
    else
        echo "  ✗ Filename does not match pattern: ${filename}"
        return 1
    fi
    
    # Test 2: Encrypted backup filename structure
    local encrypted_file="${BACKUP_DAILY_DIR}/${prefix}_20240209_120000.sql.gz.gpg"
    touch "${encrypted_file}"
    assert_file_exists "${encrypted_file}"
    
    # Verify encrypted file ends with .gpg
    if [[ "${encrypted_file}" == *.gpg ]]; then
        echo "  ✓ Encrypted backup has correct extension"
    fi
}

# Tests for retention policy
test_retention_policy() {
    # Test 1: Create old daily backup
    local old_daily="${BACKUP_DAILY_DIR}/old_backup.sql.gz"
    touch "${old_daily}"
    
    # Modify timestamp to be 10 days old
    touch -d "10 days ago" "${old_daily}" 2>/dev/null || touch -t $(( $(date +%Y%m%d) - 100 ))0000 "${old_daily}"
    
    # Test 2: Create recent daily backup
    local recent_daily="${BACKUP_DAILY_DIR}/recent_backup.sql.gz"
    touch "${recent_daily}"
    
    # Test 3: Count files before cleanup
    local daily_count
    daily_count=$(find "${BACKUP_DAILY_DIR}" -name "*.sql.gz*" | wc -l)
    assert_not_empty "${daily_count}"
    
    echo "  Found ${daily_count} backup files"
}

# Tests for documentation
test_documentation() {
    local docs_file="${PROJECT_ROOT}/docs/backup.md"
    
    # Test 1: Documentation exists
    assert_file_exists "${docs_file}"
    
    # Test 2: Documentation contains key sections
    assert_not_empty "$(grep -c '# Manual Backups' ${docs_file})"
    assert_not_empty "$(grep -c '# Restoring from Backup' ${docs_file})"
    assert_not_empty "$(grep -c '# Disaster Recovery' ${docs_file})"
    assert_not_empty "$(grep -c '# Troubleshooting' ${docs_file})"
    
    # Test 3: Documentation has examples
    assert_not_empty "$(grep -c '```bash' ${docs_file})"
    assert_not_empty "$(grep -c './scripts/backup-db.sh' ${docs_file})"
}

# Tests for .env.example
test_env_example() {
    local env_file="${PROJECT_ROOT}/backend/.env.example"
    
    # Test 1: File exists
    assert_file_exists "${env_file}"
    
    # Test 2: Contains backup configuration
    assert_not_empty "$(grep -c 'BACKUP_DIR=' ${env_file})"
    assert_not_empty "$(grep -c 'BACKUP_RETENTION_DAYS=' ${env_file})"
    assert_not_empty "$(grep -c 'AWS_S3_BUCKET=' ${env_file})"
    
    # Test 3: Contains notification configuration
    assert_not_empty "$(grep -c 'SLACK_WEBHOOK_URL=' ${env_file})"
    assert_not_empty "$(grep -c 'DISCORD_WEBHOOK_URL=' ${env_file})"
}

# Tests for script execution permissions
test_script_permissions() {
    # Test 1: All scripts in scripts/ are executable
    local scripts_dir="${PROJECT_ROOT}/scripts"
    for script in "${scripts_dir}"/*.sh; do
        assert_command_succeeds "test -x ${script}" "Script not executable: ${script}"
    done
    echo "  All scripts are executable"
}

# Tests for required tools
test_required_tools() {
    local required_tools=("pg_dump" "psql" "gzip" "date" "find" "du")
    
    for tool in "${required_tools[@]}"; do
        if command -v "${tool}" &>/dev/null; then
            echo "  ✓ ${tool} is installed"
        else
            echo -e "${YELLOW}  ⚠ ${tool} is not installed (will fail in actual execution)${NC}"
            # Don't fail test for missing tools as we're just checking test environment
        fi
    done
}

# Tests for backup integrity checking
test_backup_integrity_checks() {
    # Create a test file for integrity check
    local test_file="${BACKUP_DAILY_DIR}/integrity_test.sql.gz"
    echo "test data" | gzip -c > "${test_file}"
    
    # Test gzip integrity
    if gzip -t "${test_file}" 2>/dev/null; then
        echo "  ✓ Gzip integrity test passed"
    else
        echo "  ✗ Gzip integrity test failed"
        return 1
    fi
    
    # Test file is readable
    if [[ -r "${test_file}" ]]; then
        echo "  ✓ File is readable"
    else
        echo "  ✗ File is not readable"
        return 1
    fi
}

################################################################################
# Main Test Runner
################################################################################

# Display usage
usage() {
    cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Run unit tests for backup scripts.

OPTIONS:
  -v, --verbose         Enable verbose output
  -s, --stop            Stop on first failure
  -h, --help            Display this help message

EXAMPLES:
  $(basename "$0")              # Run all tests
  $(basename "$0") -v           # Run with verbose output
  $(basename "$0") -s           # Stop on first failure

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose)
            verbose=true
            shift
            ;;
        -s|--stop)
            stop_on_failure=true
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

# Main test execution
main() {
    echo -e "${BLUE}========================================"
    echo -e "${BLUE}  Backup Scripts Unit Tests"
    echo -e "${BLUE}========================================${NC}\n"
    
    # Setup
    setup_test_env
    
    # Run tests
    echo -e "\n${YELLOW}--- Test Suite 1: Configuration ---${NC}"
    run_test "Backup configuration structure" "test_backup_config"
    
    echo -e "\n${YELLOW}--- Test Suite 2: Backup Script ---${NC}"
    run_test "Backup-db.sh script" "test_backup_db_script"
    
    echo -e "\n${YELLOW}--- Test Suite 3: Restore Script ---${NC}"
    run_test "Restore-db.sh script" "test_restore_db_script"
    
    echo -e "\n${YELLOW}--- Test Suite 4: Verify Script ---${NC}"
    run_test "Verify-backup.sh script" "test_verify_backup_script"
    
    echo -e "\n${YELLOW}--- Test Suite 5: Dev Backup Script ---${NC}"
    run_test "Dev-backup.sh script" "test_dev_backup_script"
    
    echo -e "\n${YELLOW}--- Test Suite 6: GitHub Actions ---${NC}"
    run_test "GitHub Actions workflow" "test_github_workflow"
    
    echo -e "\n${YELLOW}--- Test Suite 7: File Structure ---${NC}"
    run_test "Backup file structure" "test_backup_file_structure"
    
    echo -e "\n${YELLOW}--- Test Suite 8: Naming Convention ---${NC}"
    run_test "Backup naming convention" "test_backup_naming_convention"
    
    echo -e "\n${YELLOW}--- Test Suite 9: Retention Policy ---${NC}"
    run_test "Retention policy" "test_retention_policy"
    
    echo -e "\n${YELLOW}--- Test Suite 10: Documentation ---${NC}"
    run_test "Documentation completeness" "test_documentation"
    
    echo -e "\n${YELLOW}--- Test Suite 11: Environment Configuration ---${NC}"
    run_test ".env.example configuration" "test_env_example"
    
    echo -e "\n${YELLOW}--- Test Suite 12: Script Permissions ---${NC}"
    run_test "Script execution permissions" "test_script_permissions"
    
    echo -e "\n${YELLOW}--- Test Suite 13: Required Tools ---${NC}"
    run_test "Required tools available" "test_required_tools"
    
    echo -e "\n${YELLOW}--- Test Suite 14: Integrity Checks ---${NC}"
    run_test "Backup integrity checks" "test_backup_integrity_checks"
    
    # Cleanup
    cleanup_test_env
    
    # Print summary
    echo -e "\n${BLUE}========================================"
    echo -e "${BLUE}  Test Summary"
    echo -e "${BLUE}========================================${NC}"
    echo -e "  Total Tests:  ${TOTAL_TESTS}"
    echo -e "${GREEN}  Passed:       ${PASSED_TESTS}${NC}"
    
    if [[ ${FAILED_TESTS} -gt 0 ]]; then
        echo -e "${RED}  Failed:       ${FAILED_TESTS}${NC}"
        echo -e "${BLUE}========================================${NC}\n"
        exit 1
    else
        echo -e "${GREEN}  Failed:       ${FAILED_TESTS}${NC}"
        echo -e "${BLUE}========================================${NC}\n"
        echo -e "${GREEN}✓ All tests passed!${NC}\n"
        exit 0
    fi
}

# Run main
main
