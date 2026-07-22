// ============================================================================
// MLIMS — Report Repository
//
// SQL queries for medico_legal_reports and court_receipts.
// Court receipt issuance uses sp_issue_court_receipt.
// ============================================================================

// ── Medico-Legal Reports ───────────────────────────────────────────────────

async function getMLRById(client, mlrId) {
  const { rows } = await client.query(
    `SELECT mlr.*, c.court_name, ce.case_id
     FROM   medico_legal_reports mlr
     JOIN   courts c ON mlr.court_id = c.court_id
     JOIN   clinical_examinations ce ON mlr.mlef_id = ce.mlef_id
     WHERE  mlr.mlr_id = $1`,
    [mlrId]
  );
  return rows[0] || null;
}

async function getMLRByExamId(client, mlefId) {
  const { rows } = await client.query(
    `SELECT mlr.*, c.court_name
     FROM   medico_legal_reports mlr
     JOIN   courts c ON mlr.court_id = c.court_id
     WHERE  mlr.mlef_id = $1`,
    [mlefId]
  );
  return rows[0] || null;
}

async function listMLRs(client, limit = 50, offset = 0) {
  const { rows } = await client.query(
    `SELECT mlr.*, c.court_name, ce.case_id, fc.case_number
     FROM   medico_legal_reports mlr
     JOIN   courts c ON mlr.court_id = c.court_id
     JOIN   clinical_examinations ce ON mlr.mlef_id = ce.mlef_id
     JOIN   forensic_cases fc ON ce.case_id = fc.case_id
     ORDER BY mlr.issue_date DESC
     LIMIT  $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

async function createMLR(client, data) {
  const { rows } = await client.query(
    `INSERT INTO medico_legal_reports
       (mlef_id, court_id, court_case_no, serial_no, trial_date, issue_date,
        final_opinion, is_grievous_311)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.mlefId, data.courtId, data.courtCaseNo, data.serialNo,
      data.trialDate, data.issueDate, data.finalOpinion,
      data.isGrievous311 || false,
    ]
  );
  return rows[0];
}

async function updateMLR(client, mlrId, data) {
  const { rows } = await client.query(
    `UPDATE medico_legal_reports
     SET    court_id = COALESCE($2, court_id),
            court_case_no = COALESCE($3, court_case_no),
            trial_date = COALESCE($4, trial_date),
            issue_date = COALESCE($5, issue_date),
            final_opinion = COALESCE($6, final_opinion),
            is_grievous_311 = COALESCE($7, is_grievous_311)
     WHERE  mlr_id = $1
     RETURNING *`,
    [mlrId, data.courtId, data.courtCaseNo, data.trialDate, data.issueDate, data.finalOpinion, data.isGrievous311]
  );
  return rows[0] || null;
}

// ── Court Receipts ─────────────────────────────────────────────────────────

async function getReceiptById(client, receiptId) {
  const { rows } = await client.query(
    `SELECT cr.*, c.court_name
     FROM   court_receipts cr
     JOIN   courts c ON cr.court_id = c.court_id
     WHERE  cr.receipt_id = $1`,
    [receiptId]
  );
  return rows[0] || null;
}

async function listReceipts(client, limit = 50, offset = 0) {
  const { rows } = await client.query(
    `SELECT cr.*, c.court_name
     FROM   court_receipts cr
     JOIN   courts c ON cr.court_id = c.court_id
     ORDER BY cr.received_date DESC
     LIMIT  $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

/**
 * Issue a court receipt via Phase 1 stored procedure.
 * sp_issue_court_receipt: validates XOR (mlr_id/pmr_id), then inserts.
 *
 * SQL: SELECT * FROM sp_issue_court_receipt($1, $2, $3, $4, $5)
 */
async function issueCourtReceipt(client, courtId, mlrId, pmrId, trialDate, registrarSign) {
  const { rows } = await client.query(
    `SELECT * FROM sp_issue_court_receipt($1, $2, $3, $4, $5)`,
    [courtId, mlrId || null, pmrId || null, trialDate || null, registrarSign || null]
  );
  return rows[0];
}

module.exports = {
  getMLRById, getMLRByExamId, listMLRs, createMLR, updateMLR,
  getReceiptById, listReceipts, issueCourtReceipt,
};
