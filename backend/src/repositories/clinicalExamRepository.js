// ============================================================================
// MLIMS — Clinical Examination Repository
//
// SQL queries for clinical_examinations and medical_referrals.
// RLS on clinical_examinations means doctor_role users only see their own
// rows — the database enforces this, not the application.
// ============================================================================

async function getById(client, mlefId) {
  const { rows } = await client.query(
    `SELECT ce.*, s.first_name || ' ' || s.last_name AS doctor_name,
            fn_has_police_copy(ce.mlef_id) AS police_copy_issued
     FROM   clinical_examinations ce
     JOIN   staff s ON ce.doctor_id = s.staff_id
     WHERE  ce.mlef_id = $1`,
    [mlefId]
  );
  return rows[0] || null;
}

async function getByCaseId(client, caseId) {
  const { rows } = await client.query(
    `SELECT ce.*, s.first_name || ' ' || s.last_name AS doctor_name,
            fn_has_police_copy(ce.mlef_id) AS police_copy_issued
     FROM   clinical_examinations ce
     JOIN   staff s ON ce.doctor_id = s.staff_id
     WHERE  ce.case_id = $1`,
    [caseId]
  );
  return rows[0] || null;
}

/**
 * List clinical examinations. RLS scopes doctor_role to their own rows.
 */
async function listAll(client, limit = 50, offset = 0) {
  const { rows } = await client.query(
    `SELECT ce.*, s.first_name || ' ' || s.last_name AS doctor_name,
            fc.case_number,
            fn_has_police_copy(ce.mlef_id) AS police_copy_issued
     FROM   clinical_examinations ce
     JOIN   staff s ON ce.doctor_id = s.staff_id
     JOIN   forensic_cases fc ON ce.case_id = fc.case_id
     ORDER BY ce.exam_date DESC
     LIMIT  $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

async function create(client, data) {
  const { rows } = await client.query(
    `INSERT INTO clinical_examinations
       (case_id, doctor_id, exam_date, exam_time, ward, bht_no,
        discharge_date, patient_consent, brief_history,
        alcohol_influence, drug_influence, sexual_assault)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      data.caseId, data.doctorId, data.examDate, data.examTime,
      data.ward, data.bhtNo, data.dischargeDate, data.patientConsent,
      data.briefHistory, data.alcoholInfluence, data.drugInfluence,
      data.sexualAssault,
    ]
  );
  return rows[0];
}

async function update(client, mlefId, data) {
  const { rows } = await client.query(
    `UPDATE clinical_examinations
     SET    exam_date = COALESCE($2, exam_date),
            exam_time = COALESCE($3, exam_time),
            ward = COALESCE($4, ward),
            bht_no = COALESCE($5, bht_no),
            discharge_date = COALESCE($6, discharge_date),
            patient_consent = COALESCE($7, patient_consent),
            brief_history = COALESCE($8, brief_history),
            alcohol_influence = COALESCE($9, alcohol_influence),
            drug_influence = COALESCE($10, drug_influence),
            sexual_assault = COALESCE($11, sexual_assault)
     WHERE  mlef_id = $1
     RETURNING *`,
    [
      mlefId, data.examDate, data.examTime, data.ward, data.bhtNo,
      data.dischargeDate, data.patientConsent, data.briefHistory,
      data.alcoholInfluence, data.drugInfluence, data.sexualAssault,
    ]
  );
  return rows[0] || null;
}

// ── Medical Referrals ──────────────────────────────────────────────────────

async function getReferralsByExamId(client, mlefId) {
  const { rows } = await client.query(
    `SELECT * FROM medical_referrals WHERE mlef_id = $1 ORDER BY referral_date`,
    [mlefId]
  );
  return rows;
}

async function createReferral(client, { mlefId, specialty, referralDate, reviewNotes }) {
  const { rows } = await client.query(
    `INSERT INTO medical_referrals (mlef_id, specialty, referral_date, review_notes)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [mlefId, specialty, referralDate, reviewNotes]
  );
  return rows[0];
}

async function updateReferral(client, referralId, { specialty, referralDate, reviewNotes }) {
  const { rows } = await client.query(
    `UPDATE medical_referrals
     SET    specialty = COALESCE($2, specialty),
            referral_date = COALESCE($3, referral_date),
            review_notes = COALESCE($4, review_notes)
     WHERE  referral_id = $1
     RETURNING *`,
    [referralId, specialty, referralDate, reviewNotes]
  );
  return rows[0] || null;
}

async function issuePoliceCopy(client, mlefId, userId) {
  // Using the convention of tracking state via audit_logs
  await client.query(
    `INSERT INTO audit_logs (user_id, table_name, record_id, action_type, new_payload)
     VALUES ($1, 'clinical_examinations', $2, 'POLICE_COPY', '{"status": "Issued"}')`,
    [userId, mlefId]
  );
}

module.exports = {
  getById, getByCaseId, listAll, create, update,
  getReferralsByExamId, createReferral, updateReferral, issuePoliceCopy,
};
