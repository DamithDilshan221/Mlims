-- ============================================================================
-- MLIMS: V15 — Add assigned medical officer to forensic cases
-- Allows police/clerk to assign a doctor during case registration.
-- The assigned doctor is then linked when the MLEF is created.
-- ============================================================================

BEGIN;

ALTER TABLE forensic_cases
ADD COLUMN assigned_doctor_id INT REFERENCES staff(staff_id) ON DELETE SET NULL;

COMMENT ON COLUMN forensic_cases.assigned_doctor_id IS
    'Medical officer assigned to this case during registration. Used to pre-link MLEF/PMR creation.';

CREATE INDEX idx_forensic_cases_assigned_doctor
    ON forensic_cases (assigned_doctor_id);

GRANT UPDATE(assigned_doctor_id) ON forensic_cases TO admin_role, records_clerk_role, police_role, doctor_role;

-- Update sp_register_case to accept assigned doctor
CREATE OR REPLACE FUNCTION sp_register_case(
    p_patient_id          INT,
    p_station_id          INT,
    p_case_type           VARCHAR,
    p_incident_date       DATE,
    p_incident_location   VARCHAR,
    p_referral_source_id  INT DEFAULT NULL,
    p_assigned_doctor_id  INT DEFAULT NULL,
    OUT p_case_id         INT
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_case_number VARCHAR(30);
    v_date_part   VARCHAR(8);
    v_seq         INT;
BEGIN
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

    IF p_assigned_doctor_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM staff WHERE staff_id = p_assigned_doctor_id) THEN
        RAISE EXCEPTION 'Doctor ID % does not exist.', p_assigned_doctor_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF p_case_type NOT IN ('clinical', 'postmortem') THEN
        RAISE EXCEPTION 'Invalid case_type "%". Must be "clinical" or "postmortem".', p_case_type
            USING ERRCODE = 'check_violation';
    END IF;

    v_date_part := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

    SELECT COALESCE(MAX(
        SUBSTRING(case_number FROM 'CASE-' || v_date_part || '-(\d+)')::INT
    ), 0) + 1
    INTO v_seq
    FROM forensic_cases
    WHERE case_number LIKE 'CASE-' || v_date_part || '-%';

    v_case_number := 'CASE-' || v_date_part || '-' || LPAD(v_seq::TEXT, 4, '0');

    INSERT INTO forensic_cases (
        patient_id, station_id, case_number, case_type,
        incident_date, incident_location, status, referral_source_id, assigned_doctor_id
    ) VALUES (
        p_patient_id, p_station_id, v_case_number, p_case_type,
        p_incident_date, p_incident_location, 'registered', p_referral_source_id, p_assigned_doctor_id
    )
    RETURNING case_id INTO p_case_id;
END;
$$;

COMMENT ON FUNCTION sp_register_case(INT, INT, VARCHAR, DATE, VARCHAR, INT, INT) IS
    'Atomic case registration: validates patient/station/referral/doctor, generates case_number, inserts row.';

GRANT EXECUTE ON FUNCTION sp_register_case(INT, INT, VARCHAR, DATE, VARCHAR, INT, INT) TO admin_role, records_clerk_role, police_role;

COMMIT;
