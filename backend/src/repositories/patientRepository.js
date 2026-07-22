// ============================================================================
// MLIMS — Patient Repository
//
// SQL queries for the patients table. Uses v_patient_full for read
// operations (returns encrypted BYTEA — decryption at app layer).
// Encryption/decryption of NIC is handled by the route, not here.
// ============================================================================

/**
 * Get patient by ID via v_patient_full (includes encrypted PII).
 *
 * SQL: SELECT * FROM v_patient_full WHERE patient_id = $1
 */
async function getById(client, patientId) {
  const { rows } = await client.query(
    `SELECT * FROM v_patient_full WHERE patient_id = $1`,
    [patientId]
  );
  return rows[0] || null;
}

/**
 * Get patient by NIC search hash (HMAC lookup without full-table decrypt).
 *
 * SQL: SELECT * FROM v_patient_full WHERE nic_search_hash = $1
 */
async function getByNicHash(client, nicHash) {
  const { rows } = await client.query(
    `SELECT * FROM v_patient_full WHERE nic_search_hash = $1`,
    [nicHash]
  );
  return rows[0] || null;
}

/**
 * List all patients (paginated). Uses v_patient_full.
 */
async function listAll(client, limit = 50, offset = 0) {
  const { rows } = await client.query(
    `SELECT * FROM v_patient_full ORDER BY patient_id LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

/**
 * List patients with de-identified view (for statistical roles).
 *
 * SQL: SELECT * FROM v_patient_public ORDER BY patient_id
 */
async function listPublic(client, limit = 50, offset = 0) {
  const { rows } = await client.query(
    `SELECT * FROM v_patient_public ORDER BY patient_id LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

/**
 * Create a new patient.
 *
 * SQL: INSERT INTO patients (full_name, dob, gender, address,
 *        nic_passport_enc, nic_search_hash, thumb_imprint)
 *      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
 */
async function create(client, { fullName, dob, gender, address, nicPassportEnc, nicSearchHash, thumbImprint }) {
  const { rows } = await client.query(
    `INSERT INTO patients (full_name, dob, gender, address, nic_passport_enc, nic_search_hash, thumb_imprint)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING patient_id, full_name, dob, age, gender, address, nic_search_hash`,
    [fullName, dob, gender, address, nicPassportEnc, nicSearchHash, thumbImprint || null]
  );
  return rows[0];
}

/**
 * Update a patient.
 */
async function update(client, patientId, { fullName, dob, gender, address, nicPassportEnc, nicSearchHash }) {
  const { rows } = await client.query(
    `UPDATE patients
     SET    full_name = COALESCE($2, full_name),
            dob = COALESCE($3, dob),
            gender = COALESCE($4, gender),
            address = COALESCE($5, address),
            nic_passport_enc = COALESCE($6, nic_passport_enc),
            nic_search_hash = COALESCE($7, nic_search_hash)
     WHERE  patient_id = $1
     RETURNING patient_id, full_name, dob, age, gender, address, nic_search_hash`,
    [patientId, fullName, dob, gender, address, nicPassportEnc, nicSearchHash]
  );
  return rows[0] || null;
}

module.exports = { getById, getByNicHash, listAll, listPublic, create, update };
