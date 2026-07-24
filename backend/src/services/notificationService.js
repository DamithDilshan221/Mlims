const { getPool } = require('../db/pools');
const { withTransaction } = require('../db/transaction');

async function generateNotifications() {
  const pool = getPool('admin');
  try {
    await withTransaction(pool, null, null, async (client) => {
      const q1 = await client.query(`
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
      `);

      const q2 = await client.query(`
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
      `);

      const q3 = await client.query(`
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
      `);

      const rows = [...q1.rows, ...q2.rows, ...q3.rows];

      if (rows.length > 0) {
        console.log(`[NotificationService] Generated ${rows.length} notification(s):`);
        for (const n of rows) {
          console.log(`  - User #${n.user_id}: ${n.subject}`);
        }
      } else {
        console.log('[NotificationService] No pending notifications to generate.');
      }
    });
  } catch (err) {
    console.error('[NotificationService] Error generating notifications:', err.message);
  }
}

function startNotificationScheduler(intervalMinutes = 60) {
  console.log(`[NotificationService] Scheduler started (interval: ${intervalMinutes} min).`);

  generateNotifications();

  const intervalMs = intervalMinutes * 60 * 1000;
  const intervalId = setInterval(generateNotifications, intervalMs);

  return intervalId;
}

module.exports = { generateNotifications, startNotificationScheduler };
