-- ============================================================================
-- MLIMS Phase 7: Court & Police Patient Access (V16)
--
-- Grants the court and police roles access to view full patient PII.
-- ============================================================================

GRANT SELECT ON v_patient_full TO police_role;
GRANT SELECT ON v_patient_full TO court_role;
