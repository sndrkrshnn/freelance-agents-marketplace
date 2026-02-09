# Database Backup Documentation

## Overview

This document provides comprehensive information about the database backup system for the Freelance AI Marketplace. The backup system is designed to ensure data safety, support disaster recovery, and provide flexibility for different environments.

## Table of Contents

- [Backup Architecture](#backup-architecture)
- [Backup Scripts](#backup-scripts)
- [Manual Backups](#manual-backups)
- [Scheduled Backup](#scheduled-backup)
- [Restoring from Backup](#restoring-from-backup)
- [Backup Verification](#backup-verification)
- [Configuration](#configuration)
- [Disaster Recovery](#disaster-recovery)
- [Troubleshooting](#troubleshooting)

---

## Backup Architecture

### Backup Levels

The system supports three backup levels:

1. **Daily Backups** - Created every day, retained for 7 days
2. **Weekly Backups** - Created on Sundays, retained for 4 weeks
3. **Monthly Backups** - Created on the 1st of each month, retained for 12 months

### Backup Storage Structure

```
/var/backups/freelance-marketplace/
├── daily/          # Daily backups (7 days retention)
├── weekly/         # Weekly backups (4 weeks retention)
├── monthly/        # Monthly backups (12 months retention)
└── checksums/      # SHA256 checksums
```

### Backup Workflow

```
Database → pg_dump → Compression → Encryption (optional) → 
Validation → Local Storage → S3 Upload (optional) → Notification
```

### Features

- ✅ Full database dumps using `pg_dump`
- ✅ Gzip compression (configurable level 1-9)
- ✅ Timestamped filenames
- ✅ Back to local storage
- ✅ Optional AWS S3 upload
- ✅ Backup validation (integrity checks)
- ✅ Retention policy enforcement
- ✅ Automatic cleanup of old backups
- ✅ Email and webhook notifications
- ✅ Optional GPG encryption
- ✅ Test restore capability

---

## Backup Scripts

### Available Scripts

| Script | Purpose | Location |
|--------|---------|----------|
| `backup-config.sh` | Configuration management | `scripts/backup-config.sh` |
| `backup-db.sh` | Create database backups | `scripts/backup-db.sh` |
| `restore-db.sh` | Restore from backup | `scripts/restore-db.sh` |
| `verify-backup.sh` | Verify backup integrity | `scripts/verify-backup.sh` |
| `dev-backup.sh` | Quick dev backup/restore | `scripts/dev-backup.sh` |

All scripts must be executable:

```bash
chmod +x scripts/*.sh
```

---

## Manual Backups

### Creating a Manual Backup

Run the backup script:

```bash
./scripts/backup-db.sh
```

The script will:
1. Validate configuration and database connection
2. Create a full database dump
3. Compress the backup
4. Optionally encrypt the backup
5. Validate the backup integrity
6. Store the backup in the appropriate directory
7. Upload to S3 (if configured)
8. Send notifications

### Backup File Naming Convention

```
freelance_agents_db_YYYYMMDD_HHMMSS.sql.gz
freelance_agents_db_20240209_020000.sql.gz
```

For encrypted backups:
```
freelance_agents_db_20240209_020000.sql.gz.gpg
```

### Viewing Available Backups

```bash
# List all backups
ls -lh backups/daily/
ls -lh backups/weekly/
ls -lh backups/monthly/

# Or use restore script to list
./scripts/restore-db.sh --list
```

---

## Scheduled Backup

### Cron Schedule

Add a cron job for automated backups:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/freelance-agents-marketplace/scripts/backup-db.sh >> /var/log/freelance-backup.log 2>&1

# Add weekly verification at 3 AM on Sundays
0 3 * * 0 /path/to/freelance-agents-marketplace/scripts/verify-backup.sh --latest >> /var/log/freelance-verify.log 2>&1
```

### GitHub Actions Automated Backup

The project includes a GitHub Actions workflow for automated backups:

**Location:** `.github/workflows/database-backup.yml`

**Features:**
- Daily backups at 2 AM UTC
- Manual trigger available
- Artifact retention for 7 days
- Optional S3 upload
- Slack/Discord notifications

**Required GitHub Secrets:**

```yaml
DB_HOST: database hostname
DB_PORT: 5432
DB_NAME: database name
DB_USER: database user
DB_PASSWORD: database password
DATABASE_URL: full connection string

# Optional - for S3 uploads
AWS_S3_BUCKET: bucket name
AWS_ACCESS_KEY_ID: AWS access key
AWS_SECRET_ACCESS_KEY: AWS secret key
AWS_S3_REGION: AWS region

# Optional - for notifications
SLACK_WEBHOOK_URL: Slack incoming webhook URL
DISCORD_WEBHOOK_URL: Discord webhook URL
```

**Manual Trigger via GitHub UI:**

1. Go to Actions tab
2. Select "Database Backup" workflow
3. Click "Run workflow"
4. Select branch and options
5. Click "Run workflow"

---

## Restoring from Backup

### Before Restoring

**Important:**
- ⚠️ Restore operations are destructive - they overwrite existing data
- ⚠️ Always verify backup integrity before restoring
- ⚠️ Consider testing in a staging environment first
- ⚠️ The script creates a pre-restore backup by default

### Restore from Latest Backup

```bash
./scripts/restore-db.sh --list
# Copy the backup filename
./scripts/restore-db.sh -f backups/daily/freelance_agents_db_20240209_020000.sql.gz
```

### Restore from Specific Timestamp

```bash
./scripts/restore-db.sh --timestamp 20240209_020000
```

### Restore with Automatic Rollback

If the restore fails, automatically rollback to pre-restore state:

```bash
./scripts/restore-db.sh -f backup.sql.gz --rollback
```

### Restore to Different Database

```bash
./scripts/restore-db.sh -f backup.sql.gz -d test_db
```

### Restore Interactive Options

The restore script will:
1. Verify the backup file
2. Decrypt if needed (requires encryption key)
3. Show backup information
4. Create a pre-restore backup
5. Test restore to temporary database
6. Prompt for confirmation
7. Perform the restore
8. Verify the restored data

### Encrypted Backup Restore

For encrypted backups, ensure the encryption key is set:

```bash
export BACKUP_ENCRYPTION_KEY="your-encryption-key"
./scripts/restore-db.sh -f encrypted_backup.sql.gz.gpg
```

---

## Backup Verification

### Verify Single Backup File

```bash
./scripts/verify-backup.sh -f backups/daily/backup.sql.gz
```

### Verify Latest Backups

```bash
./scripts/verify-backup.sh --latest
```

### Verify All Backups

```bash
./scripts/verify-backup.sh --all
```

### Verify with Test Restore

Perform an actual test restore to verify backup usability:

```bash
./scripts/verify-backup.sh -f backup.sql.gz --test-restore
```

### Verification Checks

The verification script performs:
- ✅ File existence check
- ✅ File readability check
- ✅ File size validation
- ✅ Gzip integrity test
- ✅ GPG decryption test (if encrypted)
- ✅ SHA256 checksum verification
- ✅ Test restore to temporary database

### Verification Report

Verification results are saved to:

```
logs/verification_report_YYYYMMDD_HHMMSS.txt
```

Sample output:
```
================================================================================
                 DATABASE BACKUP VERIFICATION REPORT
================================================================================

SUMMARY
-------
Total Backups Verified: 10
Passed: 8
Failed: 1
Warnings: 1

FAILED BACKUPS (1)
  ✗ backups/daily/bad_backup.sql.gz: Gzip integrity check failed

WARNINGS (1)
  ⚠ backups/daily/small_backup.sql.gz: File size is small
```

---

## Configuration

### Environment Variables

All backup scripts source from the main configuration file. Configure in `backend/.env`:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=freelance_agents_db
DB_USER=postgres
DB_PASSWORD=your_password
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/freelance_agents_db

# Backup Configuration
BACKUP_DIR=/var/backups/freelance-marketplace
BACKUP_RETENTION_DAYS=7
BACKUP_RETENTION_WEEKS=4
BACKUP_RETENTION_MONTHS=12
BACKUP_SCHEDULE="0 2 * * *"

# Backup Options
BACKUP_ENCRYPT=false
BACKUP_ENCRYPTION_KEY=
BACKUP_VERIFY=true
COMPRESSION_LEVEL=6
PARALLEL_JOBS=4

# AWS S3 Configuration (Optional)
AWS_S3_BUCKET=my-backup-bucket
AWS_S3_PREFIX=database-backups/
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Notifications
ALERT_EMAIL=admin@example.com
ALERT_EMAIL_FROM=backups@freelance-marketplace.com

# Slack/Discord Webhooks
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

### Directory Permissions

Ensure backup directories have proper permissions:

```bash
# Create backup directories
sudo mkdir -p /var/backups/freelance-marketplace/{daily,weekly,monthly}

# Set ownership
sudo chown -R postgres:postgres /var/backups/freelance-marketplace

# Set permissions
sudo chmod -R 750 /var/backups/freelance-marketplace
```

---

## Disaster Recovery

### Backup Strategy

Follow the 3-2-1 backup rule:

1. **3 copies** of your data (production, on-site backup, off-site backup)
2. **2 different storage media** (local disk + S3/cloud)
3. **1 off-site copy** (S3, another server, etc.)

### Disaster Recovery Procedure

#### Step 1: Assess the Situation

1. Identify the scope and nature of data loss
2. Determine the point in time to restore from
3. Check all available backup sources

#### Step 2: Prepare Recovery Environment

```bash
# Set up a recovery server (staging)
# Ensure PostgreSQL is installed and running
# Configure connection to the recovery server

# Export database password
export PGPASSWORD="your_password"
```

#### Step 3: Verify Available Backups

```bash
# List all available backups
./scripts/restore-db.sh --list

# Verify backup integrity
./scripts/verify-backup.sh --latest
```

#### Step 4: Select and Verify Backup

Choose the appropriate backup based on recency and integrity:

```bash
# Verify the selected backup before restoring
./scripts/verify-backup.sh -f backups/daily/selected_backup.sql.gz --test-restore
```

#### Step 5: Perform Restore

```bash
# Restore with rollback enabled
./scripts/restore-db.sh -f backups/daily/selected_backup.sql.gz --rollback
```

#### Step 6: Verify Restored Data

```bash
# Connect to the restored database
psql -h localhost -p 5432 -U postgres -d freelance_agents_db

# Check critical tables
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM jobs;
SELECT COUNT(*) FROM bids;
```

#### Step 7: Validate Application

1. Start the application
2. Run smoke tests
3. Verify key functionality
4. Check data integrity

#### Step 8: Switch to Production

Once validated:
1. Put application in maintenance mode
2. Point application to recovered database
3. Take application out of maintenance mode
4. Monitor for issues

### Off-Site Backup Considerations

For critical production environments:

1. **Cross-Region Replication**: Configure S3 bucket replication to another region
2. **Multiple Cloud Providers**: Store backups across AWS, Azure, or GCP
3. **Physical Backups**: Periodic backups to physical media stored off-site
4. **Tape Backup**: For long-term archival (optional)

---

## Development Backup Script

For quick development workflow, use the simplified dev backup script:

### Quick Backup (Uncompressed)

```bash
# Create a quick backup
./scripts/dev-backup.sh backup

# Create a named backup
./scripts/dev-backup.sh backup -n before-feature-x

# Restore latest backup
./scripts/dev-backup.sh restore

# Restore specific file
./scripts/dev-backup.sh restore -f dev_backup_feature_x.sql

# List all backups
./scripts/dev-backup.sh list

# Clean old backups (keep last 5)
./scripts/dev-backup.sh clean
```

### Dev Backup Features

- ⚡ Fast - no compression for quick operations
- 🔓 Uncompressed - easy to inspect and modify
- 📦 Simple - one-command backup/restore
- 🔗 Latest link - always points to latest backup

---

## Troubleshooting

### Common Issues

#### Issue: Permission Denied

**Error:**
```
Permission denied: /var/backups/freelance-marketplace/
```

**Solution:**
```bash
sudo chown -R postgres:postgres /var/backups/freelance-marketplace
sudo chmod -R 750 /var/backups/freelance-marketplace
```

#### Issue: Connection Refused

**Error:**
```
psql: could not connect to server: Connection refused
```

**Solution:**
1. Check PostgreSQL is running: `systemctl status postgresql`
2. Check connection settings in `.env`
3. Verify firewall rules allow connection

#### Issue: Disk Space Full

**Error:**
```
No space left on device
```

**Solution:**
```bash
# Check disk space
df -h

# Clean old backups manually
find /var/backups/freelance-marketplace -name "*.sql.gz*" -mtime +30 -delete

# Or reduce retention policy
BACKUP_RETENTION_DAYS=3
```

#### Issue: GPG Decryption Failed

**Error:**
```
gpg: decryption failed: Bad session key
```

**Solution:**
1. Verify encryption key is correct
2. Check `BACKUP_ENCRYPTION_KEY` environment variable
3. Export the key: `export BACKUP_ENCRYPTION_KEY="your-key"`

#### Issue: Backup Size Too Large

**Cause:** Old backups not cleaned up or retention policy too high

**Solution:**
```bash
# Manually clean old backups
find backups/daily/ -name "*.sql.gz*" -mtime +7 -delete
find backups/weekly/ -name "*.sql.gz*" -mtime +28 -delete
find backups/monthly/ -name "*.sql.gz*" -mtime +365 -delete

# Adjust retention in .env
BACKUP_RETENTION_DAYS=5
```

#### Issue: Restore Takes Too Long

**Cause:** Large database, slow disk, or network issues

**Solution:**
```bash
# Increase parallel jobs for restore
export PARALLEL_JOBS=8

# Use --no-acl --no-owner flags for faster restore
psql ... < backup.sql
```

### Getting Help

For issues not covered here:

1. Check logs: `tail -f logs/backup.log`
2. Enable debug logging: `LOG_LEVEL=DEBUG`
3. Review verification reports
4. Check PostgreSQL logs

### Log Files

- Backup logs: `logs/backup.log`
- Restore logs: `logs/restore_*.log`
- Verification reports: `logs/verification_report_*.txt`

---

## Best Practices

### Backup Best Practices

1. **Daily Verification**: Run verification script daily
   ```bash
   0 3 * * * /path/to/scripts/verify-backup.sh --latest
   ```

2. **Test Restores**: Perform a test restore monthly
3. **Monitor Disk Space**: Set up alerts for low disk space
4. **Store Off-Site**: Use S3 or similar for off-site backup
5. **Encrypt Backups**: Enable encryption for sensitive data
6. **Document Retention**: Keep backup retention policy documented
7. **Regular Reviews**: Review backup configuration quarterly

### Security Best Practices

1. **Protect Encryption Keys**: Store encryption keys securely (e.g., AWS KMS)
2. **Limit Access**: Only allow necessary users to access backups
3. **Use HTTPS**: Always use HTTPS for cloud transfers
4. **Secure S3**: Enable S3 bucket policies and encryption
5. **Audit Access**: Log and audit backup access
6. **Separate Credentials**: Use separate credentials for backup operations

### Monitoring

Set up monitoring for:

- Backup job success/failure
- Disk space usage
- Backup file sizes
- Restore test results
- S3 upload success
- Notification delivery

---

## Quick Reference

### Essential Commands

```bash
# Create backup
./scripts/backup-db.sh

# List backups
./scripts/restore-db.sh --list

# Restore backup
./scripts/restore-db.sh -f backups/daily/backup.sql.gz

# Verify backup
./scripts/verify-backup.sh -f backup.sql.gz

# Dev workflow
./scripts/dev-backup.sh backup    # Quick backup
./scripts/dev-backup.sh restore   # Quick restore
./scripts/dev-backup.sh list      # List dev backups
```

### Key Files

| File | Purpose |
|------|---------|
| `scripts/backup-config.sh` | Configuration source |
| `scripts/backup-db.sh` | Main backup script |
| `scripts/restore-db.sh` | Restore script |
| `scripts/verify-backup.sh` | Verification script |
| `scripts/dev-backup.sh` | Development script |
| `.github/workflows/database-backup.yml` | CI/CD workflow |
| `backend/.env` | Environment configuration |

---

## Support

For questions or issues related to the backup system:

1. Check this documentation first
2. Review log files for error messages
3. Check PostgreSQL documentation for pg_dump/pg_restore
4. Open an issue on GitHub repository

---

**Last Updated:** 2024-02-09  
**Version:** 1.0.0
