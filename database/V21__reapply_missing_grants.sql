-- ============================================================================
-- MLIMS: V21 — Re-apply all missing role grants
--
-- The original V2 grants (and subsequent V17/V18/V19 grants) were never
-- persisted in the database. information_schema.role_table_grants shows
-- zero entries for any non-admin role. This migration re-applies ALL
-- grants from V2, V17, V18, and V19 to ensure every role has the correct
-- privileges.
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- doctor_role: clinical/postmortem workflow
-- ────────────────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON clinical_examinations  TO doctor_role;
GRANT SELECT, INSERT, UPDATE ON medical_referrals      TO doctor_role;
GRANT SELECT, INSERT, UPDATE ON medico_legal_reports   TO doctor_role;
GRANT SELECT, INSERT, UPDATE ON postmortem_examinations TO doctor_role;
GRANT SELECT, INSERT, UPDATE ON causes_of_death        TO doctor_role;
GRANT SELECT, INSERT, UPDATE ON deceased_identifications TO doctor_role;
GRANT SELECT, INSERT, UPDATE ON exam_injuries          TO doctor_role;
GRANT SELECT ON patients       TO doctor_role;
GRANT SELECT ON forensic_cases TO doctor_role;
GRANT SELECT (staff_id, user_id, first_name, last_name, designation,
              contact_no, slmc_reg_no) ON staff TO doctor_role;
GRANT SELECT ON injury_types   TO doctor_role;
GRANT SELECT ON weapon_types   TO doctor_role;
GRANT SELECT ON courts         TO doctor_role;
GRANT SELECT ON police_stations TO doctor_role;          -- V18
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO doctor_role;

-- ────────────────────────────────────────────────────────────────────────────
-- forensic_staff_role: evidence & lab workflow
-- ────────────────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON specimens         TO forensic_staff_role;
GRANT SELECT, INSERT, UPDATE ON chain_of_custody   TO forensic_staff_role;
GRANT SELECT, INSERT, UPDATE ON lab_requests       TO forensic_staff_role;
GRANT SELECT, INSERT, UPDATE ON lab_results        TO forensic_staff_role;
GRANT SELECT ON forensic_cases TO forensic_staff_role;
GRANT SELECT ON specimen_types TO forensic_staff_role;
GRANT SELECT ON patients       TO forensic_staff_role;
GRANT SELECT ON police_stations TO forensic_staff_role; -- V18
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO forensic_staff_role;

-- ────────────────────────────────────────────────────────────────────────────
-- police_role: case registration & evidence uploads
-- ────────────────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT ON forensic_cases  TO police_role;
GRANT SELECT, INSERT ON digital_assets  TO police_role;
GRANT SELECT         ON police_stations TO police_role;
GRANT SELECT         ON patients        TO police_role;
GRANT SELECT         ON staff           TO police_role; -- V17
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO police_role;

-- ────────────────────────────────────────────────────────────────────────────
-- court_role: read-only access to reports and receipts
-- ────────────────────────────────────────────────────────────────────────────
GRANT SELECT ON courts               TO court_role;
GRANT SELECT ON medico_legal_reports  TO court_role;
GRANT SELECT ON court_receipts       TO court_role;
GRANT SELECT ON police_stations      TO court_role;     -- V18

-- ────────────────────────────────────────────────────────────────────────────
-- records_clerk_role: patient & case administration
-- ────────────────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON patients       TO records_clerk_role;
GRANT SELECT, INSERT, UPDATE ON forensic_cases TO records_clerk_role;
GRANT SELECT, INSERT, UPDATE ON digital_assets TO records_clerk_role;
GRANT SELECT ON police_stations TO records_clerk_role;
GRANT SELECT ON courts          TO records_clerk_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO records_clerk_role;

-- ────────────────────────────────────────────────────────────────────────────
-- auditor_role: read-only on audit trail
-- ────────────────────────────────────────────────────────────────────────────
GRANT SELECT ON audit_logs       TO auditor_role;
GRANT SELECT ON police_stations  TO auditor_role;       -- V18

COMMIT;