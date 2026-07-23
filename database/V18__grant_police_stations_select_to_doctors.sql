-- ============================================================================
-- MLIMS: V18 — Grant SELECT on police_stations to remaining roles
--
-- doctor_role, forensic_staff_role, and court_role lack SELECT on
-- police_stations. This causes "permission denied" errors when:
--   • CaseListPage joins police_stations (GET /cases)
--   • Any other view/query references the station name
--
-- police_role and records_clerk_role already have this grant from V2.
-- admin_role gets it via GRANT ALL PRIVILEGES ON ALL TABLES (V2).
-- ============================================================================

BEGIN;

GRANT SELECT ON police_stations TO doctor_role;
GRANT SELECT ON police_stations TO forensic_staff_role;
GRANT SELECT ON police_stations TO court_role;
GRANT SELECT ON police_stations TO auditor_role;

COMMIT;
