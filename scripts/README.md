# Backup Scripts - Quick Start Guide

This directory contains the database backup system for the Freelance AI Marketplace.

## 🔧 Setup

### 1. Make Scripts Executable

```bash
chmod +x scripts/*.sh
```

### 2. Configure Environment

Edit `backend/.env` and add the backup configuration:

```bash
# Database Backup Configuration
BACKUP_DIR=/var/backups/freelance-marketplace
BACKUP_RETENTION_DAYS=7
BACKUP_RETENTION_WEEKS=4
BACKUP_RETENTION_MONTHS=12

# AWS S3 Backup (Optional)
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Notifications (Optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

### 3. Create Backup Directory

```bash
sudo mkdir -p /var/backups/freelance-marketplace/{daily,weekly,monthly}
sudo chown -R postgres:postgres /var/backups/freelance-marketplace
sudo chmod -R 750 /var/backups/freelance-marketplace
```

## 📝 Quick Commands

### Create a Manual Backup

```bash
./scripts/backup-db.sh
```

### Restore from Backup

```bash
# List available backups
./scripts/restore-db.sh --list

# Restore specific backup
./scripts/restore-db.sh -f backups/daily/freelance_agents_db_20240209_020000.sql.gz

# Restore with automatic rollback on failure
./scripts/restore-db.sh -f backup.sql.gz --rollback
```

### Verify Backup Integrity

```bash
# Verify all backups
./scripts/verify-backup.sh --all

# Verify latest backups
./scripts/verify-backup.sh --latest

# Verify specific backup with test restore
./scripts/verify-backup.sh -f backup.sql.gz --test-restore
```

### Development Quick Backup

```bash
# Quick backup (uncompressed, fast)
./scripts/dev-backup.sh backup

# Quick restore
./scripts/dev-backup.sh restore

# List dev backups
./scripts/dev-backup.sh list
```

## 📅 Scheduling Backups

### Using Cron

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/freelance-agents-marketplace/scripts/backup-db.sh >> /var/log/backup.log 2>&1
```

### Using GitHub Actions

The backup system includes GitHub Actions automation. Configure the following secrets in your repository:

- `DB_HOST` - Database host
- `DB_PORT` - Database port (default: 5432)
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `AWS_S3_BUCKET` - S3 bucket name (optional)
- `AWS_ACCESS_KEY_ID` - AWS access key (optional)
- `AWS_SECRET_ACCESS_KEY` - AWS secret key (optional)
- `SLACK_WEBHOOK_URL` - Slack webhook (optional)

The workflow runs daily at 2 AM UTC automatically.

## 🧪 Testing

Run the unit tests:

```bash
./tests/scripts/backup_tests.sh

# With verbose output
./tests/scripts/backup_tests.sh -v

# Stop on first failure
./tests/scripts/backup_tests.sh -s
```

## 📚 Documentation

For comprehensive documentation, see: [docs/backup.md](../docs/backup.md)

## 🚨 Important Notes

1. **⚠️ Destructive Operations**: Restore operations overwrite existing data
2. **🔒 Security**: Store encryption keys securely, never in the repository
3. **📦 Testing**: Always test restore procedures in a staging environment first
4. **💾 Off-Site**: Enable S3 or other off-site backup for disaster recovery
5. **✅ Verification**: Regularly verify backup integrity

## 🆘 Troubleshooting

### Permission Denied

```bash
sudo chown -R postgres:postgres /var/backups/freelance-marketplace
```

### Cannot Connect to Database

Check PostgreSQL is running and connection settings in `.env`.

### Disk Space Issues

```bash
# Clean old backups manually
find backups/daily/ -name "*.sql.gz*" -mtime +7 -delete
```

For more troubleshooting tips, see the full documentation.

## 📞 Support

- Documentation: [docs/backup.md](../docs/backup.md)
- Issues: [GitHub Issues](https://github.com/your-org/freelance-agents-marketplace/issues)
