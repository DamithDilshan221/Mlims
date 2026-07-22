#!/bin/bash
# ============================================================================
# MLIMS Phase 6: Automated Backup Script
#
# Runs pg_dump on a cron schedule, stores compressed dumps, and logs the
# success or failure to the audit_logs table for visibility in the Admin UI.
# ============================================================================

set -e

DB_NAME="mlims"
DB_USER="postgres"
BACKUP_DIR="/var/backups/mlims"
OFFSITE_DIR="/mnt/nfs_offsite/backups" # Note where offsite backups should be synced
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/mlims_backup_${DATE}.sql.gz"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

echo "Starting backup for database $DB_NAME..."

# Execute backup
if pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "Backup successful: $BACKUP_FILE ($FILE_SIZE)"
    
    # Log success to audit_logs
    PAYLOAD="{\"status\": \"Success\", \"file\": \"$BACKUP_FILE\", \"size\": \"$FILE_SIZE\"}"
    
    psql -U "$DB_USER" -d "$DB_NAME" -c "
      INSERT INTO audit_logs (table_name, action_type, new_payload, user_id) 
      VALUES ('SYSTEM_BACKUP', 'BACKUP_COMPLETED', '$PAYLOAD'::jsonb, 
             (SELECT user_id FROM users WHERE username = 'admin_sys' LIMIT 1));
    "
    
    # Optional: Sync to offsite
    # rsync -av "$BACKUP_FILE" "$OFFSITE_DIR/"
else
    echo "Backup failed!"
    
    # Log failure to audit_logs
    PAYLOAD="{\"error\": \"pg_dump failed\"}"
    
    psql -U "$DB_USER" -d "$DB_NAME" -c "
      INSERT INTO audit_logs (table_name, action_type, new_payload, user_id) 
      VALUES ('SYSTEM_BACKUP', 'BACKUP_FAILED', '$PAYLOAD'::jsonb, 
             (SELECT user_id FROM users WHERE username = 'admin_sys' LIMIT 1));
    "
    exit 1
fi

# Retention policy: Keep last 30 days
find "$BACKUP_DIR" -type f -name "mlims_backup_*.sql.gz" -mtime +30 -exec rm {} \;

echo "Backup process completed."
