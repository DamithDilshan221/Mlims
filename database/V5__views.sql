-- ============================================================================
-- MLIMS — Medico-Legal Information Management System
-- 05_views.sql — Database Views
-- PostgreSQL 15+
--
-- Views serve two purposes here:
--   1. Security boundary: v_patient_public exposes only non-identifying
--      attributes, preventing accidental PII exposure to statistical roles.
--   2. Join simplification: v_audit_log_detailed pre-joins audit_logs with
--      users/staff so the Audit Log page doesn't need raw FK-only data.
--      This is the textbook "view simplifies a repeated join" case.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. v_patient_public — De-identified patient view for statistical roles
--
-- Exposes only non-identifying attributes suitable for aggregate analysis
-- (e.g., age/gender distributions, demographic studies). Roles that should
-- never see patient identity (auditor, court, police) can be granted
-- SELECT on this view instead of the patients table.
--
-- No PII columns (full_name, address, nic_passport_enc, nic_search_hash,
-- thumb_imprint) are included.
-- ============================================================================

CREATE OR REPLACE VIEW v_patient_public AS
SELECT
    patient_id,
    gender,
    age
FROM patients;

COMMENT ON VIEW v_patient_public IS
    'De-identified patient view for statistical roles. No PII columns exposed.';

-- ============================================================================
-- 2. v_patient_full — Full demographic view for authorized roles
--
-- Returns ALL patient columns INCLUDING the encrypted BYTEA columns.
-- Decryption happens at the APPLICATION layer in Phase 2 (Node.js with
-- the AES key sourced from an environment variable). This view never
-- returns plaintext PII — it returns ciphertext that must be decrypted
-- by authorized application code.
--
-- Authorized roles: admin_role, doctor_role, records_clerk_role.
-- ============================================================================

CREATE OR REPLACE VIEW v_patient_full AS
SELECT
    patient_id,
    full_name,
    dob,
    age,
    gender,
    address,
    nic_passport_enc,   -- AES-256-GCM ciphertext; decrypted at app layer
    nic_search_hash,    -- HMAC-SHA256 for equality lookups
    thumb_imprint
FROM patients;

COMMENT ON VIEW v_patient_full IS
    'Full patient demographics including encrypted PII. Decryption at app layer only.';

-- ============================================================================
-- 3. v_audit_log_detailed — Enriched audit trail for the Audit Log page
--
-- Textbook "view simplifies a repeated join" case: the Audit Log UI page
-- (page 18 in the wireframes) needs to display the acting user's username
-- and staff name alongside every log entry. Without this view, every query
-- would need to LEFT JOIN audit_logs → users → staff manually.
--
-- LEFT JOINs handle:
--   • Deleted users (audit_logs.user_id SET NULL on user deletion)
--   • System/anonymous actions (user_id is NULL)
--   • Users without staff profiles (e.g., auditors, admins)
-- ============================================================================

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

COMMENT ON VIEW v_audit_log_detailed IS
    'Audit trail enriched with username/staff info. Simplifies the Audit Log page query.';


-- ============================================================================
-- 4. DEFERRED GRANTS
--
-- These grants were deferred from 02_roles_grants_rls.sql because the
-- views must exist before they can be granted upon. The execution order
-- (01 → 02 → 03 → 04 → 05) guarantees the views are created first.
-- ============================================================================

-- auditor_role: read-only access to the enriched audit view
GRANT SELECT ON v_audit_log_detailed TO auditor_role;

-- v_patient_public: available to all roles for statistical use
GRANT SELECT ON v_patient_public TO
    admin_role, doctor_role, forensic_staff_role,
    police_role, court_role, records_clerk_role, auditor_role;

-- v_patient_full: only roles authorized to see full demographics
GRANT SELECT ON v_patient_full TO
    admin_role, doctor_role, records_clerk_role;

COMMIT;
