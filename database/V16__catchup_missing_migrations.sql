-- ============================================================================
-- MLIMS: V16 — Catch-up migration for V12, V13, V14, V15
-- These migrations were missing from a prior database setup run.
-- Uses IF NOT EXISTS / IF NOT NULL patterns throughout so this is idempotent.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Referral Sources table (from V12)
-- ============================================================================

CREATE TABLE IF NOT EXISTS referral_sources (
    source_id SERIAL PRIMARY KEY,
    source_name VARCHAR(100) UNIQUE NOT NULL,
    source_type VARCHAR(50)
);

COMMENT ON TABLE referral_sources IS 'Lookup table for channels through which cases reach the police/hospital.';

INSERT INTO referral_sources (source_name, source_type) VALUES
    ('Ward', 'Internal'),
    ('Direct', 'External'),
    ('AG Office/Human Rights', 'External'),
    ('Hospital Death - ISD', 'Postmortem'),
    ('Outside Death - Police', 'Postmortem'),
    ('High-Profile Magistrate', 'Postmortem')
ON CONFLICT (source_name) DO NOTHING;

-- ============================================================================
-- 2. Add referral_source_id to forensic_cases (from V12)
-- ============================================================================

ALTER TABLE forensic_cases
ADD COLUMN IF NOT EXISTS referral_source_id INT REFERENCES referral_sources(source_id) ON DELETE RESTRICT;

-- ============================================================================
-- 3. Postmortem authorization_type (from V13__add_pm_authorization_type.sql)
-- ============================================================================

ALTER TABLE postmortem_examinations
ADD COLUMN IF NOT EXISTS authorization_type VARCHAR(50)
CHECK (authorization_type IN (
    'hospital_police', 'police_station', 'request_letter', 'court_order'
));

-- ============================================================================
-- 4. Police copy helper function (from V13__police_copy_function.sql)
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_has_police_copy(p_mlef_id INT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM audit_logs
        WHERE table_name = 'clinical_examinations'
          AND action_type = 'POLICE_COPY'
          AND record_id = p_mlef_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION fn_has_police_copy(INT) TO doctor_role, admin_role, records_clerk_role, auditor_role;

-- ============================================================================
-- 5. Clinical authorization_type (from V14)
-- ============================================================================

ALTER TABLE clinical_examinations
ADD COLUMN IF NOT EXISTS authorization_type VARCHAR(50)
CHECK (authorization_type IN (
    'hospital_police', 'police_station', 'request_letter', 'court_order'
));

COMMENT ON COLUMN clinical_examinations.authorization_type IS
    'Clinical authorization pathway: hospital_police, police_station, request_letter, or court_order.';

-- ============================================================================
-- 6. Court Summons table (from V14)
-- ============================================================================

CREATE TABLE IF NOT EXISTS court_summons (
    summons_id      SERIAL       PRIMARY KEY,
    case_id         INT          NOT NULL
                                REFERENCES forensic_cases(case_id)
                                ON DELETE RESTRICT,
    court_id        INT          NOT NULL
                                REFERENCES courts(court_id)
                                ON DELETE RESTRICT,
    issue_date      DATE         NOT NULL DEFAULT CURRENT_DATE,
    appearance_date DATE,
    response_status VARCHAR(20)  NOT NULL DEFAULT 'pending'
                                CHECK (response_status IN (
                                    'pending', 'served', 'responded',
                                    'complied', 'dismissed'
                                )),
    document_uri    TEXT,
    notes           TEXT,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE court_summons IS
    'Court summons records linked to forensic cases for tracking legal appearances.';

CREATE INDEX IF NOT EXISTS idx_court_summons_case
    ON court_summons (case_id);

-- ============================================================================
-- 7. Notifications.created_at (from V14)
-- ============================================================================

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();

-- ============================================================================
-- 8. PM Registry View (from V14)
-- ============================================================================

CREATE OR REPLACE VIEW v_pm_registry AS
SELECT
    fc.case_id,
    fc.case_number,
    fc.incident_date,
    fc.incident_location,
    ps.station_name,
    ps.area AS station_area,
    pe.pmr_id,
    pe.inquest_no,
    pe.authorization_type,
    pe.ordered_by,
    pe.date_of_pm,
    pe.time_of_pm,
    pe.date_of_death,
    pe.place_of_death,
    pe.manner_of_death,
    cod.cod_id,
    cod.immediate_cause,
    cod.antecedent_cause,
    cod.contributory,
    cod.under_investigation,
    di.identifier_name AS deceased_identifier,
    cr.receipt_id,
    cr.received_date AS court_receipt_date,
    s.first_name || ' ' || s.last_name AS doctor_name
FROM forensic_cases fc
JOIN police_stations ps ON fc.station_id = ps.station_id
JOIN postmortem_examinations pe ON fc.case_id = pe.case_id
JOIN staff s ON pe.doctor_id = s.staff_id
LEFT JOIN causes_of_death cod ON pe.pmr_id = cod.pmr_id
LEFT JOIN LATERAL (
    SELECT identifier_name FROM deceased_identifications
    WHERE pmr_id = pe.pmr_id ORDER BY identification_id LIMIT 1
) di ON TRUE
LEFT JOIN court_receipts cr ON cr.pmr_id = pe.pmr_id
WHERE fc.case_type = 'postmortem'
ORDER BY pe.date_of_pm DESC;

-- ============================================================================
-- 9. Notification auto-generation function (from V14)
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_generate_pending_notifications()
RETURNS TABLE (notification_id INT, user_id INT, subject VARCHAR, message TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    -- a) Pending court dates (trial_date within next 7 days)
    RETURN QUERY
    WITH pending_court AS (
        SELECT mlr.mlr_id, mlr.trial_date, ce.doctor_id, fc.case_number
        FROM medico_legal_reports mlr
        JOIN clinical_examinations ce ON mlr.mlef_id = ce.mlef_id
        JOIN forensic_cases fc ON ce.case_id = fc.case_id
        WHERE mlr.trial_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
          AND NOT EXISTS (
              SELECT 1 FROM notifications n
              WHERE n.user_id = ce.doctor_id
                AND n.subject = 'Pending Court Date'
                AND n.message LIKE '%' || fc.case_number || '%'
                AND n.created_at > CURRENT_DATE - INTERVAL '1 day'
          )
    )
    INSERT INTO notifications (user_id, subject, message, due_date)
    SELECT
        s.user_id,
        'Pending Court Date',
        'Case ' || pc.case_number || ' has a court date on ' || pc.trial_date::TEXT || '. Please prepare the report.',
        pc.trial_date
    FROM pending_court pc
    JOIN staff s ON pc.doctor_id = s.staff_id
    WHERE s.user_id IS NOT NULL
    RETURNING notifications.notification_id, notifications.user_id, notifications.subject, notifications.message;

    -- b) Unissued MLRs (clinical exam created > 14 days ago with no MLR)
    RETURN QUERY
    WITH unissued_mlr AS (
        SELECT ce.mlef_id, ce.doctor_id, ce.exam_date, fc.case_number
        FROM clinical_examinations ce
        JOIN forensic_cases fc ON ce.case_id = fc.case_id
        WHERE ce.exam_date < CURRENT_DATE - INTERVAL '14 days'
          AND NOT EXISTS (
              SELECT 1 FROM medico_legal_reports mlr WHERE mlr.mlef_id = ce.mlef_id
          )
          AND NOT EXISTS (
              SELECT 1 FROM notifications n
              WHERE n.user_id = (SELECT user_id FROM staff WHERE staff_id = ce.doctor_id)
                AND n.subject = 'Unissued MLEF Report'
                AND n.message LIKE '%' || fc.case_number || '%'
                AND n.created_at > CURRENT_DATE - INTERVAL '7 days'
          )
    )
    INSERT INTO notifications (user_id, subject, message)
    SELECT
        s.user_id,
        'Unissued MLEF Report',
        'MLEF for case ' || um.case_number || ' was created on ' || um.exam_date::TEXT || ' but no MLR has been issued yet.'
    FROM unissued_mlr um
    JOIN staff s ON um.doctor_id = s.staff_id
    WHERE s.user_id IS NOT NULL
    RETURNING notifications.notification_id, notifications.user_id, notifications.subject, notifications.message;

    -- c) Unissued Causes of Death (PM created > 14 days ago with no COD)
    RETURN QUERY
    WITH unissued_cod AS (
        SELECT pe.pmr_id, pe.doctor_id, pe.date_of_pm, fc.case_number
        FROM postmortem_examinations pe
        JOIN forensic_cases fc ON pe.case_id = fc.case_id
        WHERE pe.date_of_pm < CURRENT_DATE - INTERVAL '14 days'
          AND NOT EXISTS (
              SELECT 1 FROM causes_of_death cod WHERE cod.pmr_id = pe.pmr_id
          )
          AND NOT EXISTS (
              SELECT 1 FROM notifications n
              WHERE n.user_id = (SELECT user_id FROM staff WHERE staff_id = pe.doctor_id)
                AND n.subject = 'Unissued Cause of Death'
                AND n.message LIKE '%' || fc.case_number || '%'
                AND n.created_at > CURRENT_DATE - INTERVAL '7 days'
          )
    )
    INSERT INTO notifications (user_id, subject, message)
    SELECT
        s.user_id,
        'Unissued Cause of Death',
        'Postmortem for case ' || uc.case_number || ' was performed on ' || uc.date_of_pm::TEXT || ' but no Cause of Death has been recorded yet.'
    FROM unissued_cod uc
    JOIN staff s ON uc.doctor_id = s.staff_id
    WHERE s.user_id IS NOT NULL
    RETURNING notifications.notification_id, notifications.user_id, notifications.subject, notifications.message;
END;
$$;

-- ============================================================================
-- 10. Add assigned_doctor_id to forensic_cases (from V15)
-- ============================================================================

ALTER TABLE forensic_cases
ADD COLUMN IF NOT EXISTS assigned_doctor_id INT REFERENCES staff(staff_id) ON DELETE SET NULL;

COMMENT ON COLUMN forensic_cases.assigned_doctor_id IS
    'Medical officer assigned to this case during registration. Used to pre-link MLEF/PMR creation.';

CREATE INDEX IF NOT EXISTS idx_forensic_cases_assigned_doctor
    ON forensic_cases (assigned_doctor_id);

-- ============================================================================
-- 11. GRANTs for referral_sources
-- ============================================================================

GRANT SELECT ON referral_sources TO
    admin_role, doctor_role, forensic_staff_role,
    records_clerk_role, police_role, auditor_role, court_role;

GRANT INSERT, UPDATE ON referral_sources TO admin_role;
GRANT USAGE, SELECT ON referral_sources_source_id_seq TO admin_role;

-- ============================================================================
-- 12. GRANTs for court_summons
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON court_summons TO admin_role, court_role;
GRANT SELECT ON court_summons TO doctor_role, police_role, records_clerk_role, auditor_role;
GRANT USAGE ON SEQUENCE court_summons_summons_id_seq TO admin_role, court_role;

-- ============================================================================
-- 13. GRANTs for clinical_examinations.authorization_type
-- ============================================================================

GRANT INSERT(authorization_type), UPDATE(authorization_type) ON clinical_examinations TO doctor_role, admin_role;

-- ============================================================================
-- 14. GRANTs for views and functions
-- ============================================================================

GRANT SELECT ON v_pm_registry TO admin_role, doctor_role, police_role, court_role, records_clerk_role, auditor_role;
GRANT SELECT ON v_audit_log_detailed, audit_logs TO admin_role, auditor_role;
GRANT EXECUTE ON FUNCTION fn_generate_pending_notifications() TO admin_role;

-- ============================================================================
-- 15. GRANTs for forensic_cases.assigned_doctor_id (from V15)
-- ============================================================================

GRANT UPDATE(assigned_doctor_id) ON forensic_cases TO admin_role, records_clerk_role, police_role, doctor_role;

-- ============================================================================
-- 16. Update sp_register_case to accept all 7 params (from V15)
-- ============================================================================

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

GRANT EXECUTE ON FUNCTION sp_register_case(INT, INT, VARCHAR, DATE, VARCHAR, INT, INT) TO admin_role, records_clerk_role, police_role;

COMMIT;
