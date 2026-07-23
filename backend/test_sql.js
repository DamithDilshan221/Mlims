const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://demo_doctor:1234@localhost:5432/mlims' });

async function run() {
  try {
    const { rows } = await pool.query(`
      SELECT ce.*, s.first_name || ' ' || s.last_name AS doctor_name,
            fn_has_police_copy(ce.mlef_id) AS police_copy_issued,
            (
               SELECT json_build_object(
                 'mlr_id', mlr.mlr_id,
                 'court_id', mlr.court_id,
                 'court_case_no', mlr.court_case_no,
                 'serial_no', mlr.serial_no,
                 'final_opinion', mlr.final_opinion,
                 'is_grievous_311', mlr.is_grievous_311,
                 'issue_date', mlr.issue_date
               )
               FROM medico_legal_reports mlr WHERE mlr.mlef_id = ce.mlef_id
            ) AS mlr,
            (SELECT issue_date FROM medico_legal_reports mlr WHERE mlr.mlef_id = ce.mlef_id) AS report_issue_date,
            (
               SELECT cr.receipt_id 
               FROM court_receipts cr 
               JOIN medico_legal_reports mlr ON cr.mlr_id = mlr.mlr_id 
               WHERE mlr.mlef_id = ce.mlef_id
            ) AS receipt_id
      FROM   clinical_examinations ce
      JOIN   staff s ON ce.doctor_id = s.staff_id
      WHERE  ce.mlef_id = $1
    `, [1]);
    console.log('SUCCESS', rows.length);
  } catch(e) {
    console.error('SQL ERROR:', e.message);
  } finally {
    pool.end();
  }
}
run();
