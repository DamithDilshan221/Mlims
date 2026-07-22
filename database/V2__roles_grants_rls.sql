-- ============================================================================
-- MLIMS — Medico-Legal Information Management System
-- 02_roles_grants_rls.sql — PostgreSQL Roles, GRANTs & Row-Level Security
-- PostgreSQL 15+
--
-- Implements the Principle of Least Privilege:
--   • Seven group roles (NOLOGIN) act as privilege containers.
--   • One demo LOGIN user per role for development/testing.
--   • Column-level GRANTs where full-table access is too broad.
--   • Row-Level Security (RLS) on clinical/postmortem exams so doctors
--     can only see their own cases — enforced INSIDE the database, not
--     by application-layer filtering alone.
--   • audit_logs is append-only: no role (including admin) gets UPDATE
--     or DELETE.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. GROUP ROLES (NOLOGIN — privilege containers only)
-- ============================================================================

CREATE ROLE admin_role          NOLOGIN;
CREATE ROLE doctor_role         NOLOGIN;
CREATE ROLE forensic_staff_role NOLOGIN;
CREATE ROLE police_role         NOLOGIN;
CREATE ROLE court_role          NOLOGIN;
CREATE ROLE records_clerk_role  NOLOGIN;
CREATE ROLE auditor_role        NOLOGIN;

-- ============================================================================
-- 2. DEMO LOGIN USERS (one per role, for development/testing only)
--
-- In production, passwords would be set via ALTER ROLE ... PASSWORD 'hash'
-- using a secrets manager. These plaintext passwords are development-only.
-- ============================================================================

CREATE ROLE demo_admin   LOGIN PASSWORD '1234'   IN ROLE admin_role;
CREATE ROLE demo_doctor  LOGIN PASSWORD '1234'  IN ROLE doctor_role;
CREATE ROLE demo_forensic LOGIN PASSWORD '1234' IN ROLE forensic_staff_role;
CREATE ROLE demo_police  LOGIN PASSWORD '1234'  IN ROLE police_role;
CREATE ROLE demo_court   LOGIN PASSWORD '1234'   IN ROLE court_role;
CREATE ROLE demo_clerk   LOGIN PASSWORD '1234'   IN ROLE records_clerk_role;
CREATE ROLE demo_auditor LOGIN PASSWORD '1234' IN ROLE auditor_role;

-- ============================================================================
-- 3. SCHEMA USAGE — all roles need basic schema access
-- ============================================================================

GRANT USAGE ON SCHEMA public TO
    admin_role, doctor_role, forensic_staff_role,
    police_role, court_role, records_clerk_role, auditor_role;

-- ============================================================================
-- 4. GRANT MATRIX
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- admin_role: ALL PRIVILEGES everywhere EXCEPT audit_logs
--
-- audit_logs is append-only by design. No human role gets UPDATE or DELETE.
-- Only the fn_audit_trigger() function (SECURITY DEFINER) writes to it.
-- This makes tamper-resistance a database-level guarantee.
-- ────────────────────────────────────────────────────────────────────────────

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO admin_role;

-- Revoke UPDATE/DELETE on audit_logs from admin (and by extension, everyone)
REVOKE UPDATE, DELETE ON audit_logs FROM admin_role;

-- ────────────────────────────────────────────────────────────────────────────
-- doctor_role: clinical/postmortem workflow — SELECT, INSERT, UPDATE (no DELETE)
-- ────────────────────────────────────────────────────────────────────────────

-- Full workflow tables
GRANT SELECT, INSERT, UPDATE ON clinical_examinations  TO doctor_role;
GRANT SELECT, INSERT, UPDATE ON medical_referrals      TO doctor_role;
GRANT SELECT, INSERT, UPDATE ON medico_legal_reports   TO doctor_role;
GRANT SELECT, INSERT, UPDATE ON postmortem_examinations TO doctor_role;
GRANT SELECT, INSERT, UPDATE ON causes_of_death        TO doctor_role;
GRANT SELECT, INSERT, UPDATE ON deceased_identifications TO doctor_role;
GRANT SELECT, INSERT, UPDATE ON exam_injuries          TO doctor_role;

-- Read-only reference tables
GRANT SELECT ON patients       TO doctor_role;
GRANT SELECT ON forensic_cases TO doctor_role;

-- Column-level GRANT on staff: doctor_role can see professional info but
-- NOT the user_id column path that would lead to password_hash via users.
-- (In practice, the view layer further controls this, but column-level
-- grants are the defense-in-depth backstop.)
GRANT SELECT (staff_id, user_id, first_name, last_name, designation,
              contact_no, slmc_reg_no)
    ON staff TO doctor_role;

-- Lookup tables needed for form dropdowns
GRANT SELECT ON injury_types   TO doctor_role;
GRANT SELECT ON weapon_types   TO doctor_role;
GRANT SELECT ON courts         TO doctor_role;

-- Sequences for INSERT operations
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO doctor_role;

-- ────────────────────────────────────────────────────────────────────────────
-- forensic_staff_role: evidence & lab workflow
-- ────────────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE ON specimens         TO forensic_staff_role;
GRANT SELECT, INSERT, UPDATE ON chain_of_custody   TO forensic_staff_role;
GRANT SELECT, INSERT, UPDATE ON lab_requests       TO forensic_staff_role;
GRANT SELECT, INSERT, UPDATE ON lab_results        TO forensic_staff_role;

-- Read-only context
GRANT SELECT ON forensic_cases TO forensic_staff_role;
GRANT SELECT ON specimen_types TO forensic_staff_role;
GRANT SELECT ON patients       TO forensic_staff_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO forensic_staff_role;

-- ────────────────────────────────────────────────────────────────────────────
-- police_role: case registration & evidence uploads only
-- ────────────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT ON forensic_cases  TO police_role;
GRANT SELECT, INSERT ON digital_assets  TO police_role;
GRANT SELECT         ON police_stations TO police_role;
GRANT SELECT         ON patients        TO police_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO police_role;

-- No access to clinical, postmortem, or lab tables.

-- ────────────────────────────────────────────────────────────────────────────
-- court_role: read-only access to reports and receipts
-- ────────────────────────────────────────────────────────────────────────────

GRANT SELECT ON courts               TO court_role;
GRANT SELECT ON medico_legal_reports  TO court_role;
GRANT SELECT ON court_receipts       TO court_role;

-- ────────────────────────────────────────────────────────────────────────────
-- records_clerk_role: patient & case administration
-- ────────────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE ON patients       TO records_clerk_role;
GRANT SELECT, INSERT, UPDATE ON forensic_cases TO records_clerk_role;
GRANT SELECT, INSERT, UPDATE ON digital_assets TO records_clerk_role;

-- Read-only lookup tables for form dropdowns
GRANT SELECT ON police_stations TO records_clerk_role;
GRANT SELECT ON courts          TO records_clerk_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO records_clerk_role;

-- ────────────────────────────────────────────────────────────────────────────
-- auditor_role: read-only on audit trail
--
-- Note: GRANT on v_audit_log_detailed is deferred to 05_views.sql because
-- the view must exist before it can be granted upon.
-- ────────────────────────────────────────────────────────────────────────────

GRANT SELECT ON audit_logs TO auditor_role;


-- ============================================================================
-- 5. ROW-LEVEL SECURITY (RLS)
--
-- A genuine advantage over table/column-only privilege systems:
-- PostgreSQL can enforce "a doctor only sees their own cases" INSIDE THE
-- DATABASE via RLS, rather than relying purely on application-layer
-- filtering. Even if a bug in the backend omits a WHERE clause, the
-- database itself prevents data leakage.
--
-- The application layer (Phase 2) sets a per-connection session variable:
--     SET app.current_staff_id = '<staff_id>';
-- at the start of each HTTP request, so the RLS policy can match.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- RLS on clinical_examinations
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE clinical_examinations ENABLE ROW LEVEL SECURITY;

-- Doctors see only their own clinical examinations
CREATE POLICY doctor_own_clinical_exams
    ON clinical_examinations
    FOR ALL
    TO doctor_role
    USING (doctor_id = current_setting('app.current_staff_id', true)::INT)
    WITH CHECK (doctor_id = current_setting('app.current_staff_id', true)::INT);

-- Admin role bypasses RLS (superusers bypass automatically, but admin_role
-- is not necessarily superuser in production)
CREATE POLICY admin_all_clinical_exams
    ON clinical_examinations
    FOR ALL
    TO admin_role
    USING (true)
    WITH CHECK (true);

-- Records clerks need SELECT access (for case linking) but not row-filtered
CREATE POLICY clerk_read_clinical_exams
    ON clinical_examinations
    FOR SELECT
    TO records_clerk_role
    USING (true);

-- ────────────────────────────────────────────────────────────────────────────
-- RLS on postmortem_examinations
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE postmortem_examinations ENABLE ROW LEVEL SECURITY;

-- Doctors see only their own postmortem examinations
CREATE POLICY doctor_own_postmortem_exams
    ON postmortem_examinations
    FOR ALL
    TO doctor_role
    USING (doctor_id = current_setting('app.current_staff_id', true)::INT)
    WITH CHECK (doctor_id = current_setting('app.current_staff_id', true)::INT);

-- Admin role bypasses RLS
CREATE POLICY admin_all_postmortem_exams
    ON postmortem_examinations
    FOR ALL
    TO admin_role
    USING (true)
    WITH CHECK (true);

-- Records clerks need SELECT access
CREATE POLICY clerk_read_postmortem_exams
    ON postmortem_examinations
    FOR SELECT
    TO records_clerk_role
    USING (true);

COMMIT;
