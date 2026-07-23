// ============================================================================
// MLIMS — Case Repository
//
// SQL queries for forensic_cases. Case creation uses the Phase 1 stored
// procedure sp_register_case for atomic case_number generation.
// ============================================================================

/**
 * Get case by ID with patient and station context.
 *
 * SQL: SELECT fc.*, p.full_name, ps.station_name
 *      FROM forensic_cases fc
 *      JOIN patients p ON fc.patient_id = p.patient_id
 *      JOIN police_stations ps ON fc.station_id = ps.station_id
 *      WHERE fc.case_id = $1
 */
async function getById(client, caseId) {
  const { rows } = await client.query(
    `SELECT fc.*, p.full_name AS patient_name, ps.station_name,
            s.first_name || ' ' || s.last_name AS assigned_doctor_name
     FROM   forensic_cases fc
     JOIN   patients p ON fc.patient_id = p.patient_id
     JOIN   police_stations ps ON fc.station_id = ps.station_id
     LEFT JOIN staff s ON fc.assigned_doctor_id = s.staff_id
     WHERE  fc.case_id = $1`,
    [caseId]
  );
  return rows[0] || null;
}

/**
 * List cases with pagination and optional filters.
 * Leverages the composite index idx_cases_type_status.
 */
async function listAll(client, { caseType, status, patientId, limit = 50, offset = 0 } = {}) {
  let sql = `
    SELECT fc.*, p.full_name AS patient_name, ps.station_name
    FROM   forensic_cases fc
    JOIN   patients p ON fc.patient_id = p.patient_id
    JOIN   police_stations ps ON fc.station_id = ps.station_id
    WHERE  1=1`;
  const params = [];
  let idx = 1;

  if (caseType) {
    sql += ` AND fc.case_type = $${idx++}`;
    params.push(caseType);
  }
  if (status) {
    sql += ` AND fc.status = $${idx++}`;
    params.push(status);
  }
  if (patientId) {
    sql += ` AND fc.patient_id = $${idx++}`;
    params.push(patientId);
  }

  sql += ` ORDER BY fc.case_id DESC LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(limit, offset);

  const { rows } = await client.query(sql, params);
  return rows;
}

/**
 * Register a new case via Phase 1 stored procedure.
 * sp_register_case validates patient/station, generates case_number, inserts row.
 *
 * SQL: SELECT * FROM sp_register_case($1, $2, $3, $4, $5)
 */
async function registerCase(client, patientId, stationId, caseType, incidentDate, incidentLocation, referralSourceId = null, doctorId = null) {
  const { rows } = await client.query(
    `SELECT * FROM sp_register_case($1, $2, $3, $4, $5, $6, $7)`,
    [patientId, stationId, caseType, incidentDate, incidentLocation, referralSourceId, doctorId]
  );
  return rows[0]; // { p_case_id }
}

/**
 * Update case status.
 */
async function updateStatus(client, caseId, status) {
  const { rows } = await client.query(
    `UPDATE forensic_cases SET status = $2 WHERE case_id = $1
     RETURNING *`,
    [caseId, status]
  );
  return rows[0] || null;
}

/**
 * Update case details (incident info).
 */
async function update(client, caseId, { incidentDate, incidentLocation, status }) {
  const { rows } = await client.query(
    `UPDATE forensic_cases
     SET    incident_date = COALESCE($2, incident_date),
            incident_location = COALESCE($3, incident_location),
            status = COALESCE($4, status)
     WHERE  case_id = $1
     RETURNING *`,
    [caseId, incidentDate, incidentLocation, status]
  );
  return rows[0] || null;
}

/**
 * Get a full case timeline aggregating all related records.
 * Used by GET /cases/:id/timeline.
 */
async function getTimeline(client, caseId) {
  // Fetch the case itself
  const caseResult = await getById(client, caseId);
  if (!caseResult) return null;

  // Clinical examination (0 or 1)
  const { rows: clinicalRows } = await client.query(
    `SELECT ce.*, s.first_name || ' ' || s.last_name AS doctor_name
     FROM clinical_examinations ce
     JOIN staff s ON ce.doctor_id = s.staff_id
     WHERE ce.case_id = $1`,
    [caseId]
  );

  // Postmortem examination (0 or 1)
  const { rows: pmRows } = await client.query(
    `SELECT pe.*, s.first_name || ' ' || s.last_name AS doctor_name
     FROM postmortem_examinations pe
     JOIN staff s ON pe.doctor_id = s.staff_id
     WHERE pe.case_id = $1`,
    [caseId]
  );

  // Specimens
  const { rows: specimens } = await client.query(
    `SELECT sp.*, st.name AS specimen_type_name
     FROM specimens sp
     JOIN specimen_types st ON sp.specimen_type_id = st.specimen_type_id
     WHERE sp.case_id = $1
     ORDER BY sp.collection_date`,
    [caseId]
  );

  // Medico-legal reports (via clinical exam)
  const { rows: mlrRows } = await client.query(
    `SELECT mlr.*, c.court_name
     FROM medico_legal_reports mlr
     JOIN courts c ON mlr.court_id = c.court_id
     JOIN clinical_examinations ce ON mlr.mlef_id = ce.mlef_id
     WHERE ce.case_id = $1`,
    [caseId]
  );

  // Court receipts (via MLR or postmortem)
  const { rows: receiptRows } = await client.query(
    `SELECT cr.*, c.court_name
     FROM court_receipts cr
     JOIN courts c ON cr.court_id = c.court_id
     WHERE cr.mlr_id IN (
       SELECT mlr.mlr_id FROM medico_legal_reports mlr
       JOIN clinical_examinations ce ON mlr.mlef_id = ce.mlef_id
       WHERE ce.case_id = $1
     )
     OR cr.pmr_id IN (
       SELECT pe.pmr_id FROM postmortem_examinations pe
       WHERE pe.case_id = $1
     )`,
    [caseId]
  );

  return {
    case: caseResult,
    clinical_examination: clinicalRows[0] || null,
    postmortem_examination: pmRows[0] || null,
    specimens,
    medico_legal_reports: mlrRows,
    court_receipts: receiptRows,
  };
}

module.exports = { getById, listAll, registerCase, updateStatus, update, getTimeline };
