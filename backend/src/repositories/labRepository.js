// ============================================================================
// MLIMS — Lab Repository
//
// SQL queries for lab_requests and lab_results.
// Result finalization uses sp_finalize_lab_result — the Phase 1 stored
// procedure that inserts the result and flips request status atomically.
// ============================================================================

// ── Lab Requests ───────────────────────────────────────────────────────────

async function getRequestById(client, requestId) {
  const { rows } = await client.query(
    `SELECT lr.*, sp.barcode_id, st.name AS specimen_type_name
     FROM   lab_requests lr
     JOIN   specimens sp ON lr.specimen_id = sp.specimen_id
     JOIN   specimen_types st ON sp.specimen_type_id = st.specimen_type_id
     WHERE  lr.request_id = $1`,
    [requestId]
  );
  return rows[0] || null;
}

/**
 * List lab requests, filterable by status.
 * Leverages idx_lab_requests_status for the Lab/Toxicology page.
 */
async function listRequests(client, { status, limit = 50, offset = 0 } = {}) {
  let sql = `
    SELECT lr.*, sp.barcode_id, st.name AS specimen_type_name
    FROM   lab_requests lr
    JOIN   specimens sp ON lr.specimen_id = sp.specimen_id
    JOIN   specimen_types st ON sp.specimen_type_id = st.specimen_type_id
    WHERE  1=1`;
  const params = [];
  let idx = 1;

  if (status) {
    sql += ` AND lr.status = $${idx++}`;
    params.push(status);
  }

  sql += ` ORDER BY lr.request_id DESC LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(limit, offset);

  const { rows } = await client.query(sql, params);
  return rows;
}

async function createRequest(client, { specimenId, requestType, requestDate, govtAnalystRef, clinicalNotes }) {
  const { rows } = await client.query(
    `INSERT INTO lab_requests (specimen_id, request_type, request_date, govt_analyst_ref, clinical_notes, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING *`,
    [specimenId, requestType, requestDate, govtAnalystRef, clinicalNotes]
  );
  return rows[0];
}

async function updateRequestStatus(client, requestId, status) {
  const { rows } = await client.query(
    `UPDATE lab_requests SET status = $2 WHERE request_id = $1 RETURNING *`,
    [requestId, status]
  );
  return rows[0] || null;
}

// ── Lab Results ────────────────────────────────────────────────────────────

async function getResultByRequestId(client, requestId) {
  const { rows } = await client.query(
    `SELECT * FROM lab_results WHERE request_id = $1`,
    [requestId]
  );
  return rows[0] || null;
}

async function listResults(client, limit = 50, offset = 0) {
  const { rows } = await client.query(
    `SELECT lr.*, lreq.request_type, lreq.specimen_id, sp.barcode_id
     FROM   lab_results lr
     JOIN   lab_requests lreq ON lr.request_id = lreq.request_id
     JOIN   specimens sp ON lreq.specimen_id = sp.specimen_id
     ORDER BY lr.result_id DESC
     LIMIT  $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

/**
 * Finalize a lab result via Phase 1 stored procedure.
 * sp_finalize_lab_result: inserts result + flips request status to 'completed'.
 *
 * SQL: SELECT * FROM sp_finalize_lab_result($1, $2, $3, $4)
 */
async function finalizeResult(client, requestId, findings, diagnosis, documentUri) {
  const { rows } = await client.query(
    `SELECT * FROM sp_finalize_lab_result($1, $2, $3, $4)`,
    [requestId, findings, diagnosis, documentUri || null]
  );
  return rows[0];
}

module.exports = {
  getRequestById, listRequests, createRequest, updateRequestStatus,
  getResultByRequestId, listResults, finalizeResult,
};
