async function listAll(client, limit = 50, offset = 0) {
  const { rows } = await client.query(
    `SELECT cs.*, c.court_name, fc.case_number, fc.case_type,
            p.full_name AS patient_name
     FROM   court_summons cs
     JOIN   courts c ON cs.court_id = c.court_id
     JOIN   forensic_cases fc ON cs.case_id = fc.case_id
     JOIN   patients p ON fc.patient_id = p.patient_id
     ORDER BY cs.issue_date DESC
     LIMIT  $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

async function listUpcoming(client, days = 30) {
  const { rows } = await client.query(
    `SELECT cs.*, c.court_name, fc.case_number, fc.case_type,
            p.full_name AS patient_name
     FROM   court_summons cs
     JOIN   courts c ON cs.court_id = c.court_id
     JOIN   forensic_cases fc ON cs.case_id = fc.case_id
     JOIN   patients p ON fc.patient_id = p.patient_id
     WHERE  cs.appearance_date IS NOT NULL
       AND  cs.appearance_date BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1 || ' days')::INTERVAL
     ORDER BY cs.appearance_date`,
    [days]
  );
  return rows;
}

async function listByCaseId(client, caseId) {
  const { rows } = await client.query(
    `SELECT cs.*, c.court_name
     FROM   court_summons cs
     JOIN   courts c ON cs.court_id = c.court_id
     WHERE  cs.case_id = $1
     ORDER BY cs.issue_date DESC`,
    [caseId]
  );
  return rows;
}

async function getById(client, summonsId) {
  const { rows } = await client.query(
    `SELECT cs.*, c.court_name, fc.case_number, fc.case_type
     FROM   court_summons cs
     JOIN   courts c ON cs.court_id = c.court_id
     JOIN   forensic_cases fc ON cs.case_id = fc.case_id
     WHERE  cs.summons_id = $1`,
    [summonsId]
  );
  return rows[0] || null;
}

async function create(client, data) {
  const { rows } = await client.query(
    `INSERT INTO court_summons
       (case_id, court_id, issue_date, appearance_date, response_status, document_uri, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      data.caseId, data.courtId, data.issueDate || new Date().toISOString().split('T')[0],
      data.appearanceDate || null, data.responseStatus || 'pending',
      data.documentUri || null, data.notes || null,
    ]
  );
  return rows[0];
}

async function update(client, summonsId, data) {
  const { rows } = await client.query(
    `UPDATE court_summons
     SET    court_id = COALESCE($2, court_id),
            issue_date = COALESCE($3, issue_date),
            appearance_date = COALESCE($4, appearance_date),
            response_status = COALESCE($5, response_status),
            document_uri = COALESCE($6, document_uri),
            notes = COALESCE($7, notes)
     WHERE  summons_id = $1
     RETURNING *`,
    [
      summonsId, data.courtId, data.issueDate, data.appearanceDate,
      data.responseStatus, data.documentUri, data.notes,
    ]
  );
  return rows[0] || null;
}

module.exports = { listAll, listUpcoming, listByCaseId, getById, create, update };
