// ============================================================================
// MLIMS — Staff Repository
//
// SQL queries for the staff table. 
// Staff records are 1:1 with users.
// ============================================================================

async function getById(client, staffId) {
  const { rows } = await client.query(
    `SELECT * FROM staff WHERE staff_id = $1`,
    [staffId]
  );
  return rows[0] || null;
}

async function getByUserId(client, userId) {
  const { rows } = await client.query(
    `SELECT * FROM staff WHERE user_id = $1`,
    [userId]
  );
  return rows[0] || null;
}

async function listAll(client, limit = 50, offset = 0) {
  const { rows } = await client.query(
    `SELECT * FROM staff ORDER BY staff_id LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

async function create(client, data) {
  const { rows } = await client.query(
    `INSERT INTO staff (user_id, first_name, last_name, designation, contact_no, slmc_reg_no)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [data.userId, data.firstName, data.lastName, data.designation, data.contactNo, data.slmcRegNo]
  );
  return rows[0];
}

async function update(client, staffId, data) {
  const { rows } = await client.query(
    `UPDATE staff
     SET    first_name = COALESCE($2, first_name),
            last_name = COALESCE($3, last_name),
            designation = COALESCE($4, designation),
            contact_no = COALESCE($5, contact_no),
            slmc_reg_no = COALESCE($6, slmc_reg_no)
     WHERE  staff_id = $1
     RETURNING *`,
    [staffId, data.firstName, data.lastName, data.designation, data.contactNo, data.slmcRegNo]
  );
  return rows[0] || null;
}

module.exports = { getById, getByUserId, listAll, create, update };
