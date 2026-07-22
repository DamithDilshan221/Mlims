// ============================================================================
// MLIMS — Specimen Repository
//
// SQL queries for the specimens table.
// ============================================================================

async function getById(client, specimenId) {
  const { rows } = await client.query(
    `SELECT sp.*, st.name AS specimen_type_name, fc.case_number
     FROM   specimens sp
     JOIN   specimen_types st ON sp.specimen_type_id = st.specimen_type_id
     JOIN   forensic_cases fc ON sp.case_id = fc.case_id
     WHERE  sp.specimen_id = $1`,
    [specimenId]
  );
  return rows[0] || null;
}

async function getByCaseId(client, caseId) {
  const { rows } = await client.query(
    `SELECT sp.*, st.name AS specimen_type_name
     FROM   specimens sp
     JOIN   specimen_types st ON sp.specimen_type_id = st.specimen_type_id
     WHERE  sp.case_id = $1
     ORDER BY sp.collection_date`,
    [caseId]
  );
  return rows;
}

async function getByBarcode(client, barcodeId) {
  const { rows } = await client.query(
    `SELECT sp.*, st.name AS specimen_type_name, fc.case_number
     FROM   specimens sp
     JOIN   specimen_types st ON sp.specimen_type_id = st.specimen_type_id
     JOIN   forensic_cases fc ON sp.case_id = fc.case_id
     WHERE  sp.barcode_id = $1`,
    [barcodeId]
  );
  return rows[0] || null;
}

async function listAll(client, limit = 50, offset = 0) {
  const { rows } = await client.query(
    `SELECT sp.*, st.name AS specimen_type_name, fc.case_number
     FROM   specimens sp
     JOIN   specimen_types st ON sp.specimen_type_id = st.specimen_type_id
     JOIN   forensic_cases fc ON sp.case_id = fc.case_id
     ORDER BY sp.specimen_id DESC
     LIMIT  $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

async function create(client, { caseId, specimenTypeId, barcodeId, quantity, collectionDate, currentLocation }) {
  const { rows } = await client.query(
    `INSERT INTO specimens (case_id, specimen_type_id, barcode_id, quantity, collection_date, current_location)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [caseId, specimenTypeId, barcodeId, quantity, collectionDate, currentLocation]
  );
  return rows[0];
}

async function update(client, specimenId, { quantity, currentLocation }) {
  const { rows } = await client.query(
    `UPDATE specimens
     SET    quantity = COALESCE($2, quantity),
            current_location = COALESCE($3, current_location)
     WHERE  specimen_id = $1
     RETURNING *`,
    [specimenId, quantity, currentLocation]
  );
  return rows[0] || null;
}

module.exports = { getById, getByCaseId, getByBarcode, listAll, create, update };
