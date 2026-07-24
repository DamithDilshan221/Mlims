-- ============================================================================
-- MLIMS: V31 Grant patient full view to police
--
-- Allows police officers to view the patient profile after registering them.
-- ============================================================================

GRANT SELECT ON v_patient_full TO police_role;
