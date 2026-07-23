-- ============================================================================
-- MLIMS: V23 — Enhance court_role and other roles for Court Desk features
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- court_role: needs broader read access for Court & Legal Desk
-- ────────────────────────────────────────────────────────────────────────────
GRANT SELECT ON forensic_cases        TO court_role;
GRANT SELECT ON patients              TO court_role;
GRANT SELECT ON clinical_examinations TO court_role;
GRANT SELECT ON postmortem_examinations TO court_role;
GRANT SELECT ON court_summons         TO court_role;
GRANT SELECT ON staff                 TO court_role;
GRANT SELECT, INSERT, UPDATE ON court_summons TO court_role;
GRANT SELECT, INSERT, UPDATE ON court_receipts TO court_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO court_role;

-- ────────────────────────────────────────────────────────────────────────────
-- doctor_role: needs access to court_summons for trial views
-- ────────────────────────────────────────────────────────────────────────────
GRANT SELECT ON court_summons TO doctor_role;
GRANT SELECT ON court_receipts TO doctor_role;
GRANT SELECT ON court_summons TO police_role;

COMMIT;