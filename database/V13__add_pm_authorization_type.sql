-- ============================================================================
-- MLIMS Phase 6: V13 Add PM Authorization Type
-- ============================================================================

ALTER TABLE postmortem_examinations
ADD COLUMN authorization_type VARCHAR(50) 
CHECK (authorization_type IN ('police_inquest', 'magistrate_court_order'));

COMMENT ON COLUMN postmortem_examinations.authorization_type IS 
    'Categorizes which pathway applies to the postmortem order.';
