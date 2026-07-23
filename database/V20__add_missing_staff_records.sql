-- ============================================================================
-- MLIMS: V20 — Add missing staff records for auto-created demo users
-- The setup_db.js creates 'admin', 'doctor', 'forensic', 'police', 'court',
-- 'clerk' users but does not create corresponding staff records. Without a
-- staff record, the JWT payload has staff_id=null, causing:
--   • RLS on clinical_examinations to block INSERT/UPDATE (42501)
--   • Audit triggers to lack staff attribution
-- ============================================================================

BEGIN;

-- Insert staff records for auto-created users that don't have one yet
INSERT INTO staff (user_id, first_name, last_name, designation, slmc_reg_no)
SELECT u.user_id, 'Demo', 'Doctor', 'Judicial Medical Officer', 'SLMC-DEMO-001'
FROM   users u
WHERE  u.role_id = (SELECT role_id FROM roles WHERE role_name = 'doctor')
  AND  u.user_id NOT IN (SELECT user_id FROM staff WHERE user_id IS NOT NULL)
  AND  NOT EXISTS (SELECT 1 FROM staff s WHERE s.user_id = u.user_id);

INSERT INTO staff (user_id, first_name, last_name, designation, slmc_reg_no)
SELECT u.user_id, 'Demo', 'Forensic', 'Senior Lab Technician', 'SLMC-DEMO-002'
FROM   users u
WHERE  u.role_id = (SELECT role_id FROM roles WHERE role_name = 'forensic_staff')
  AND  NOT EXISTS (SELECT 1 FROM staff s WHERE s.user_id = u.user_id);

INSERT INTO staff (user_id, first_name, last_name, designation, slmc_reg_no)
SELECT u.user_id, 'Demo', 'Admin', 'System Administrator', NULL
FROM   users u
WHERE  u.role_id = (SELECT role_id FROM roles WHERE role_name = 'admin')
  AND  u.user_id NOT IN (1)
  AND  NOT EXISTS (SELECT 1 FROM staff s WHERE s.user_id = u.user_id);

INSERT INTO staff (user_id, first_name, last_name, designation, slmc_reg_no)
SELECT u.user_id, 'Demo', 'Clerk', 'Records Clerk', 'SLMC-DEMO-003'
FROM   users u
WHERE  u.role_id = (SELECT role_id FROM roles WHERE role_name = 'records_clerk')
  AND  NOT EXISTS (SELECT 1 FROM staff s WHERE s.user_id = u.user_id);

COMMIT;