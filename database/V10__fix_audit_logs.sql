-- ============================================================================
-- MLIMS Phase 6/7: Audit Logs Schema Fix
--
-- The Phase 1 schema restricted action_type to VARCHAR(10) and only allowed
-- 'INSERT', 'UPDATE', 'DELETE'. Phase 2 and 6 introduced app-level audit 
-- events (LOGIN_SUCCESS, BACKUP_COMPLETED, etc.) which exceed this limit 
-- and violate the constraint.
-- ============================================================================

-- We must drop the view that depends on the column before we can alter it
DROP VIEW IF EXISTS v_audit_log_detailed;

-- Expand the column size to accommodate longer action strings
ALTER TABLE audit_logs ALTER COLUMN action_type TYPE VARCHAR(50);

-- Drop the restrictive CHECK constraint dynamically (since it was unnamed in V1)
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'audit_logs'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%action_type%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE audit_logs DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

-- Recreate the view we dropped
CREATE OR REPLACE VIEW v_audit_log_detailed AS
SELECT
    al.log_id,
    al.user_id,
    u.username,
    COALESCE(s.first_name || ' ' || s.last_name, '(no staff profile)') AS staff_name,
    s.designation,
    al.table_name,
    al.record_id,
    al.action_type,
    al.changed_at,
    al.old_payload,
    al.new_payload
FROM      audit_logs al
LEFT JOIN users u  ON al.user_id = u.user_id
LEFT JOIN staff s  ON u.user_id  = s.user_id;

-- Re-grant access to the auditor_role
GRANT SELECT ON v_audit_log_detailed TO auditor_role;
