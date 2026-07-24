-- Run this in pgAdmin or psql to fix the NotificationService ambiguous column error!
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
