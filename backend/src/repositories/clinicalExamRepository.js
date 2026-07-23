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

const INSERT_COLS = [
  'case_id', 'doctor_id', 'exam_date', 'exam_time', 'ward', 'bht_no',
  'discharge_date', 'patient_consent', 'brief_history',
  'alcohol_influence', 'drug_influence', 'sexual_assault', 'authorization_type',
  'officer_name', 'officer_rank', 'officer_badge_no', 'mlef_serial_no', 'court_case_no',
  'referral_category',
  'identification_marks', 'thumb_impression_left', 'thumb_impression_right', 'medical_officer_notes',
  'investigations_notes', 'follow_up_notes',
  'has_doctor_copy', 'has_injury_photos', 'has_investigation_findings',
  'has_external_reports', 'has_court_summons', 'has_mlr_copy', 'has_certificate_of_receipt',
];

const INSERT_PARAMS = INSERT_COLS.map((_, i) => `$${i + 1}`).join(', ');

function toRow(data) {
  return [
    data.caseId, data.doctorId, data.examDate, data.examTime, data.ward, data.bhtNo,
    data.dischargeDate, data.patientConsent, data.briefHistory,
    data.alcoholInfluence, data.drugInfluence, data.sexualAssault, data.authorizationType,
    data.officerName, data.officerRank, data.officerBadgeNo, data.mlefSerialNo, data.courtCaseNo,
    data.referralCategory,
    data.identificationMarks, data.thumbImpressionLeft, data.thumbImpressionRight, data.medicalOfficerNotes,
    data.investigationsNotes, data.followUpNotes,
    data.hasDoctorCopy, data.hasInjuryPhotos, data.hasInvestigationFindings,
    data.hasExternalReports, data.hasCourtSummons, data.hasMlrCopy, data.hasCertificateOfReceipt,
  ];
}

async function create(client, data) {
  const { rows } = await client.query(
    `INSERT INTO clinical_examinations (${INSERT_COLS.join(', ')})
     VALUES (${INSERT_PARAMS})
     RETURNING *`,
    toRow(data)
  );
  return rows[0];
}

async function update(client, mlefId, data) {
  const keys = Object.keys(data).filter(k => {
    const col = k.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
    return INSERT_COLS.includes(col) && col !== 'case_id' && col !== 'doctor_id';
  });
  if (keys.length === 0) return (await getById(client, mlefId)) || null;
  const setClause = keys.map((k, i) => {
    const col = k.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
    return `${col} = $${i + 2}`;
  }).join(', ');
  const values = keys.map(k => data[k]);
  const { rows } = await client.query(
    `UPDATE clinical_examinations SET ${setClause} WHERE mlef_id = $1 RETURNING *`,
    [mlefId, ...values]
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
