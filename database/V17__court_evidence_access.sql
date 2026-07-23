-- ============================================================================
-- MLIMS Phase 7: Court Evidence Access (V17)
--
-- Grants the court role access to view evidence, specimens, and cases.
-- ============================================================================

GRANT SELECT ON forensic_cases TO court_role;
GRANT SELECT ON specimens TO court_role;
GRANT SELECT ON specimen_types TO court_role;
GRANT SELECT ON chain_of_custody TO court_role;
