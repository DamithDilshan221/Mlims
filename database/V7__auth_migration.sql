-- ============================================================================
-- MLIMS — Medico-Legal Information Management System
-- 07_auth_migration.sql — Widen audit_logs.action_type for login auditing
-- PostgreSQL 15+
--
-- Phase 1 restricted action_type to ('INSERT','UPDATE','DELETE') — the
-- standard DML operations logged by fn_audit_trigger(). Phase 2's login
-- lockout feature needs to log authentication events to audit_logs as well
-- (instead of inventing a new table), so we widen the CHECK to include:
--   • LOGIN_SUCCESS  — successful authentication
--   • LOGIN_FAILED   — failed password check
--   • ACCOUNT_LOCKED — automatic lockout after 5 failures in 15 min
--
-- Run this AFTER 01–06 and BEFORE starting the Phase 2 backend.
-- ============================================================================

BEGIN;

ALTER TABLE audit_logs
    DROP CONSTRAINT IF EXISTS audit_logs_action_type_check;

ALTER TABLE audit_logs
    ADD CONSTRAINT audit_logs_action_type_check
    CHECK (action_type IN (
        'INSERT', 'UPDATE', 'DELETE',
        'LOGIN_SUCCESS', 'LOGIN_FAILED', 'ACCOUNT_LOCKED'
    ));

COMMIT;
