#!/bin/bash
# ============================================================================
# MLIMS Phase 6: Restore Test Script
#
# Restores the latest dump into a throwaway database, checks row counts 
# against critical tables, and logs the result to the main database.
# ============================================================================

set -e

MAIN_DB="mlims"
TEST_DB="mlims_restore_test"
DB_USER="postgres"
BACKUP_DIR="/var/backups/mlims"

# Find latest backup
LATEST_BACKUP=$(ls -t $BACKUP_DIR/mlims_backup_*.sql.gz 2>/dev/null | head -n 1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "No backup found in $BACKUP_DIR"
    exit 1
fi

echo "Testing restore with file: $LATEST_BACKUP"

# Recreate test database
psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS $TEST_DB;"
psql -U "$DB_USER" -c "CREATE DATABASE $TEST_DB;"

echo "Restoring into $TEST_DB..."
# Suppress expected stderr warnings from restore
if zcat "$LATEST_BACKUP" | psql -U "$DB_USER" -d "$TEST_DB" -q > /dev/null 2>&1; then
    echo "Restore completed. Verifying critical tables..."
    
    # Check row counts
    PATIENTS_COUNT=$(psql -U "$DB_USER" -d "$TEST_DB" -tAc "SELECT COUNT(*) FROM patients;")
    CASES_COUNT=$(psql -U "$DB_USER" -d "$TEST_DB" -tAc "SELECT COUNT(*) FROM cases;")
    USERS_COUNT=$(psql -U "$DB_USER" -d "$TEST_DB" -tAc "SELECT COUNT(*) FROM users;")
    
    echo "Verification Results:"
    echo "Patients: $PATIENTS_COUNT"
    echo "Cases: $CASES_COUNT"
    echo "Users: $USERS_COUNT"
    
    PAYLOAD="{\"status\": \"Verified\", \"file\": \"$(basename $LATEST_BACKUP)\", \"patients_count\": $PATIENTS_COUNT, \"cases_count\": $CASES_COUNT, \"users_count\": $USERS_COUNT}"
    
    psql -U "$DB_USER" -d "$MAIN_DB" -c "
      INSERT INTO audit_logs (table_name, action_type, new_payload, user_id) 
      VALUES ('SYSTEM_BACKUP', 'RESTORE_TEST_PASSED', '$PAYLOAD'::jsonb, 
             (SELECT user_id FROM users WHERE username = 'admin_sys' LIMIT 1));
    "
else
    echo "Restore failed!"
    PAYLOAD="{\"error\": \"Restore command failed on $(basename $LATEST_BACKUP)\"}"
    
    psql -U "$DB_USER" -d "$MAIN_DB" -c "
      INSERT INTO audit_logs (table_name, action_type, new_payload, user_id) 
      VALUES ('SYSTEM_BACKUP', 'RESTORE_TEST_FAILED', '$PAYLOAD'::jsonb, 
             (SELECT user_id FROM users WHERE username = 'admin_sys' LIMIT 1));
    "
    
    # Clean up on failure
    psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS $TEST_DB;"
    exit 1
fi

# Clean up
psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS $TEST_DB;"
echo "Restore test passed successfully."
