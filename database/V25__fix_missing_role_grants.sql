-- ============================================================================
-- MLIMS: V25 — Fix missing non-admin role SELECT grants across all tables
--
-- Many tables were missing SELECT grants for doctor, police, forensic_staff,
-- court, records_clerk, and auditor roles, causing 403 errors.
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- doctor_role: needs access to specimens, lab_requests, chain_of_custody,
--              digital_assets, staff, specimen_types
-- ────────────────────────────────────────────────────────────────────────────
GRANT SELECT ON specimens          TO doctor_role;
GRANT SELECT ON specimen_types     TO doctor_role;
GRANT SELECT ON lab_requests       TO doctor_role;
GRANT SELECT ON chain_of_custody   TO doctor_role;
GRANT SELECT ON digital_assets     TO doctor_role;
GRANT SELECT ON staff              TO doctor_role;

-- ────────────────────────────────────────────────────────────────────────────
-- police_role: broader read access for case viewing & dashboard
-- ────────────────────────────────────────────────────────────────────────────
GRANT SELECT ON clinical_examinations  TO police_role;
GRANT SELECT ON postmortem_examinations TO police_role;
GRANT SELECT ON medico_legal_reports   TO police_role;
GRANT SELECT ON court_receipts         TO police_role;
GRANT SELECT ON digital_assets         TO police_role;
GRANT SELECT ON specimens              TO police_role;
GRANT SELECT ON specimen_types         TO police_role;
GRANT SELECT ON lab_requests           TO police_role;
GRANT SELECT ON exam_injuries          TO police_role;
GRANT SELECT ON medical_referrals      TO police_role;
GRANT SELECT ON causes_of_death        TO police_role;
GRANT SELECT ON courts                 TO police_role;
GRANT SELECT ON chain_of_custody       TO police_role;

-- ────────────────────────────────────────────────────────────────────────────
-- forensic_staff_role: needs access to ALL clinical/postmortem/lab tables
-- ────────────────────────────────────────────────────────────────────────────
GRANT SELECT ON clinical_examinations  TO forensic_staff_role;
GRANT SELECT ON postmortem_examinations TO forensic_staff_role;
GRANT SELECT ON medico_legal_reports   TO forensic_staff_role;
GRANT SELECT ON court_receipts         TO forensic_staff_role;
GRANT SELECT ON court_summons          TO forensic_staff_role;
GRANT SELECT ON courts                 TO forensic_staff_role;
GRANT SELECT ON digital_assets         TO forensic_staff_role;
GRANT SELECT ON specimens              TO forensic_staff_role;
GRANT SELECT ON specimen_types         TO forensic_staff_role;
GRANT SELECT ON exam_injuries          TO forensic_staff_role;
GRANT SELECT ON medical_referrals      TO forensic_staff_role;
GRANT SELECT ON causes_of_death        TO forensic_staff_role;
GRANT SELECT ON chain_of_custody       TO forensic_staff_role;
GRANT SELECT ON staff                  TO forensic_staff_role;

-- ────────────────────────────────────────────────────────────────────────────
-- court_role: complete read access for court desk features
-- ────────────────────────────────────────────────────────────────────────────
GRANT SELECT ON medico_legal_reports   TO court_role;
GRANT SELECT ON patients               TO court_role;
GRANT SELECT ON specimens              TO court_role;
GRANT SELECT ON specimen_types         TO court_role;
GRANT SELECT ON lab_requests           TO court_role;
GRANT SELECT ON exam_injuries          TO court_role;
GRANT SELECT ON medical_referrals      TO court_role;
GRANT SELECT ON causes_of_death        TO court_role;
GRANT SELECT ON chain_of_custody       TO court_role;
GRANT SELECT ON digital_assets         TO court_role;
GRANT SELECT ON forensic_cases         TO court_role;

-- ────────────────────────────────────────────────────────────────────────────
-- records_clerk_role: read access for record keeping
-- ────────────────────────────────────────────────────────────────────────────
GRANT SELECT ON clinical_examinations  TO records_clerk_role;
GRANT SELECT ON postmortem_examinations TO records_clerk_role;
GRANT SELECT ON medico_legal_reports   TO records_clerk_role;
GRANT SELECT ON specimens              TO records_clerk_role;
GRANT SELECT ON specimen_types         TO records_clerk_role;
GRANT SELECT ON lab_requests           TO records_clerk_role;
GRANT SELECT ON exam_injuries          TO records_clerk_role;
GRANT SELECT ON medical_referrals      TO records_clerk_role;
GRANT SELECT ON causes_of_death        TO records_clerk_role;
GRANT SELECT ON chain_of_custody       TO records_clerk_role;
GRANT SELECT ON court_receipts         TO records_clerk_role;
GRANT SELECT ON court_summons          TO records_clerk_role;
GRANT SELECT ON forensic_cases         TO records_clerk_role;
GRANT SELECT ON patients               TO records_clerk_role;
GRANT SELECT ON staff                  TO records_clerk_role;

-- ────────────────────────────────────────────────────────────────────────────
-- auditor_role: complete read access for auditing
-- ────────────────────────────────────────────────────────────────────────────
GRANT SELECT ON clinical_examinations  TO auditor_role;
GRANT SELECT ON postmortem_examinations TO auditor_role;
GRANT SELECT ON medico_legal_reports   TO auditor_role;
GRANT SELECT ON court_receipts         TO auditor_role;
GRANT SELECT ON court_summons          TO auditor_role;
GRANT SELECT ON courts                 TO auditor_role;
GRANT SELECT ON specimens              TO auditor_role;
GRANT SELECT ON specimen_types         TO auditor_role;
GRANT SELECT ON lab_requests           TO auditor_role;
GRANT SELECT ON exam_injuries          TO auditor_role;
GRANT SELECT ON medical_referrals      TO auditor_role;
GRANT SELECT ON causes_of_death        TO auditor_role;
GRANT SELECT ON chain_of_custody       TO auditor_role;
GRANT SELECT ON digital_assets         TO auditor_role;
GRANT SELECT ON forensic_cases         TO auditor_role;
GRANT SELECT ON patients               TO auditor_role;
GRANT SELECT ON staff                  TO auditor_role;
GRANT SELECT ON police_stations        TO auditor_role;

-- ────────────────────────────────────────────────────────────────────────────
-- INSERT/UPDATE grants for forensic_staff_role on lab/specimen tables
-- ────────────────────────────────────────────────────────────────────────────
GRANT INSERT, UPDATE ON specimens      TO forensic_staff_role;
GRANT INSERT, UPDATE ON specimen_types TO forensic_staff_role;
GRANT UPDATE ON lab_requests           TO forensic_staff_role;
GRANT INSERT, UPDATE ON digital_assets TO forensic_staff_role;
GRANT INSERT, UPDATE ON chain_of_custody TO forensic_staff_role;

COMMIT;
