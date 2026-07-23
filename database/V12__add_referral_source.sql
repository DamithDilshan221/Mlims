-- ============================================================================
-- MLIMS Phase 6: V12 Add Referral Source
-- ============================================================================

CREATE TABLE referral_sources (
    source_id SERIAL PRIMARY KEY,
    source_name VARCHAR(100) UNIQUE NOT NULL,
    source_type VARCHAR(50)
);

COMMENT ON TABLE referral_sources IS 'Lookup table for channels through which cases reach the police/hospital.';

INSERT INTO referral_sources (source_name, source_type) VALUES 
    ('Ward', 'Internal'), 
    ('Direct', 'External'), 
    ('AG Office/Human Rights', 'External');

ALTER TABLE forensic_cases
ADD COLUMN referral_source_id INT REFERENCES referral_sources(source_id) ON DELETE RESTRICT;

GRANT SELECT ON referral_sources TO admin_role, doctor_role, records_clerk_role, police_role, auditor_role, court_role;

-- Replace sp_register_case to accept p_referral_source_id
CREATE OR REPLACE FUNCTION sp_register_case(
    p_patient_id        INT,
    p_station_id        INT,
    p_case_type         VARCHAR,
    p_incident_date     DATE,
    p_incident_location VARCHAR,
    p_referral_source_id INT,
    OUT p_case_id       INT
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_case_number VARCHAR(30);
    v_date_part   VARCHAR(8);
    v_seq         INT;
BEGIN
    -- ── Validation ──────────────────────────────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM patients WHERE patient_id = p_patient_id) THEN
        RAISE EXCEPTION 'Patient ID % does not exist.', p_patient_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM police_stations WHERE station_id = p_station_id) THEN
        RAISE EXCEPTION 'Police station ID % does not exist.', p_station_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF p_referral_source_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM referral_sources WHERE source_id = p_referral_source_id) THEN
        RAISE EXCEPTION 'Referral source ID % does not exist.', p_referral_source_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF p_case_type NOT IN ('clinical', 'postmortem') THEN
        RAISE EXCEPTION 'Invalid case_type "%". Must be "clinical" or "postmortem".', p_case_type
            USING ERRCODE = 'check_violation';
    END IF;

    -- ── Case number generation ──────────────────────────────────────────
    v_date_part := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

    SELECT COALESCE(MAX(
        SUBSTRING(case_number FROM 'CASE-' || v_date_part || '-(\d+)')::INT
    ), 0) + 1
    INTO v_seq
    FROM forensic_cases
    WHERE case_number LIKE 'CASE-' || v_date_part || '-%';

    v_case_number := 'CASE-' || v_date_part || '-' || LPAD(v_seq::TEXT, 4, '0');

    -- ── Insert ──────────────────────────────────────────────────────────
    INSERT INTO forensic_cases (
        patient_id, station_id, case_number, case_type,
        incident_date, incident_location, status, referral_source_id
    ) VALUES (
        p_patient_id, p_station_id, v_case_number, p_case_type,
        p_incident_date, p_incident_location, 'registered', p_referral_source_id
    )
    RETURNING case_id INTO p_case_id;
END;
$$;

COMMENT ON FUNCTION sp_register_case(INT, INT, VARCHAR, DATE, VARCHAR, INT) IS
    'Atomic case registration: validates patient/station/referral, generates case_number, inserts row.';
