-- ============================================================================
-- MLIMS: V26 — Grant INSERT on patients to police_role
--
-- Police officers need the ability to register a patient if the patient
-- does not exist yet when they are creating a new case.
-- ============================================================================

BEGIN;

GRANT INSERT ON patients TO police_role;

COMMIT;
