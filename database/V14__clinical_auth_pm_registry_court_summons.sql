-- ============================================================================
-- MLIMS Phase 6: V14 — Clinical Authorization, PM Registry, Court Summons,
--                   & Auto-Notification Function
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Clinical Authorization Type (GAP 2)
-- Mirrors V13's addition for postmortem, now for clinical examinations.
-- ============================================================================

ALTER TABLE clinical_examinations
ADD COLUMN authorization_type VARCHAR(50)
CHECK (authorization_type IN (
    'hospital_police',
    'police_station',
    'request_letter',
    'court_order'
));

COMMENT ON COLUMN clinical_examinations.authorization_type IS
    'Clinical authorization pathway: hospital_police, police_station, request_letter, or court_order.';

GRANT INSERT(authorization_type), UPDATE(authorization_type) ON clinical_examinations TO doctor_role, admin_role;

-- ============================================================================
-- 2. Court Summons Table (GAP 7)
-- Tracks court summons documents linked to forensic cases.
-- ============================================================================

CREATE TABLE court_summons (
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
                                    'pending',
                                    'served',
                                    'responded',
                                    'complied',
                                    'dismissed'
                                )),
    document_uri    TEXT,
    notes           TEXT,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE court_summons IS
    'Court summons records linked to forensic cases for tracking legal appearances.';

CREATE INDEX idx_court_summons_case
    ON court_summons (case_id);

GRANT SELECT, INSERT, UPDATE ON court_summons TO admin_role, court_role;
GRANT SELECT ON court_summons TO doctor_role, police_role, records_clerk_role, auditor_role;
GRANT USAGE ON SEQUENCE court_summons_summons_id_seq TO admin_role, court_role;

-- ============================================================================
-- 3. PM Registry View (GAP 3)
-- Consolidated view of postmortem cases for court/police distribution.
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

COMMENT ON VIEW v_pm_registry IS
    'Consolidated PM registry for court/police distribution.';

GRANT SELECT ON v_pm_registry TO admin_role, doctor_role, police_role, court_role, records_clerk_role, auditor_role;

-- ============================================================================
-- 4. Notification Auto-Generation Function (GAP 1)
-- Called by a scheduled job (node-cron in Phase 6) to generate
-- notifications for:
--   a) MLRs with trial_date in the next 7 days
--   b) Clinical examinations without an MLR issued within 14 days
--   c) Postmortem examinations without causes of death within 14 days
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
    RETURNING notification_id, user_id, subject, message;

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
    RETURNING notification_id, user_id, subject, message;

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
    RETURNING notification_id, user_id, subject, message;
END;
$$;

COMMENT ON FUNCTION fn_generate_pending_notifications() IS
    'Generates notifications for pending court dates, unissued MLRs, and unissued Causes of Death.';

GRANT EXECUTE ON FUNCTION fn_generate_pending_notifications() TO admin_role;

-- ============================================================================
-- 5. Expand Referral Sources (GAP 4)
-- Add postmortem-specific and more specific referral sources.
-- ============================================================================

INSERT INTO referral_sources (source_name, source_type) VALUES
    ('Hospital Death - ISD', 'Postmortem'),
    ('Outside Death - Police', 'Postmortem'),
    ('High-Profile Magistrate', 'Postmortem')
ON CONFLICT (source_name) DO NOTHING;

-- ============================================================================
-- 6. Fix: Add created_at column to notifications (missing from V1 schema)
-- ============================================================================

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();

COMMIT;
