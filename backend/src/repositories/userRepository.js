// ============================================================================
// MLIMS — User Repository
//
// SQL queries for the users table. Used by the auth route for login,
// and by the admin route for user management.
// Never returns password_hash in list/get operations.
// ============================================================================

/**
 * Get a user by username (for login — includes password_hash for bcrypt.compare).
 * Also joins to roles and staff to populate JWT payload fields.
 *
 * SQL: SELECT u.*, r.role_name, s.staff_id FROM users u
 *      JOIN roles r ON u.role_id = r.role_id
 *      LEFT JOIN staff s ON u.user_id = s.user_id
 *      WHERE u.username = $1
 */
async function getByUsername(client, username) {
  const { rows } = await client.query(
    `SELECT u.user_id, u.role_id, u.username, u.password_hash,
            u.is_active, u.last_login,
            r.role_name,
            s.staff_id
     FROM   users u
     JOIN   roles r ON u.role_id = r.role_id
     LEFT JOIN staff s ON u.user_id = s.user_id
     WHERE  u.username = $1`,
    [username]
  );
  return rows[0] || null;
}

/**
 * Get a user by ID (without password_hash).
 */
async function getById(client, userId) {
  const { rows } = await client.query(
    `SELECT u.user_id, u.role_id, u.username, u.is_active, u.last_login,
            r.role_name,
            s.staff_id, s.first_name, s.last_name, s.designation
     FROM   users u
     JOIN   roles r ON u.role_id = r.role_id
     LEFT JOIN staff s ON u.user_id = s.user_id
     WHERE  u.user_id = $1`,
    [userId]
  );
  return rows[0] || null;
}

/**
 * Update last_login timestamp on successful authentication.
 */
async function updateLastLogin(client, userId) {
  await client.query(
    `UPDATE users SET last_login = NOW() WHERE user_id = $1`,
    [userId]
  );
}

/**
 * Log an authentication event to audit_logs.
 * Used for login success, failure, and account lockout tracking.
 *
 * SQL: INSERT INTO audit_logs (user_id, table_name, record_id, action_type, changed_at, new_payload)
 */
async function logAuthEvent(client, userId, actionType, payload) {
  await client.query(
    `INSERT INTO audit_logs (user_id, table_name, record_id, action_type, changed_at, new_payload)
     VALUES ($1, 'users', $2, $3, NOW(), $4)`,
    [userId, userId, actionType, JSON.stringify(payload)]
  );
}

/**
 * Count failed login attempts within the lockout window (15 minutes).
 *
 * SQL: SELECT COUNT(*) FROM audit_logs
 *      WHERE table_name = 'users' AND record_id = $1
 *      AND action_type = 'LOGIN_FAILED'
 *      AND changed_at > NOW() - INTERVAL '15 minutes'
 */
async function countRecentFailures(client, userId) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::INT AS fail_count
     FROM   audit_logs
     WHERE  table_name = 'users'
       AND  record_id = $1
       AND  action_type = 'LOGIN_FAILED'
       AND  changed_at > NOW() - INTERVAL '15 minutes'`,
    [userId]
  );
  return rows[0].fail_count;
}

/**
 * Lock a user account (set is_active = false).
 */
async function lockAccount(client, userId) {
  await client.query(
    `UPDATE users SET is_active = FALSE WHERE user_id = $1`,
    [userId]
  );
}

/**
 * Deactivate a user via the Phase 1 stored procedure.
 * sp_deactivate_user: sets is_active=false + notifies admins, transactionally.
 *
 * SQL: SELECT sp_deactivate_user($1)
 */
async function deactivateUser(client, userId) {
  await client.query(`SELECT sp_deactivate_user($1)`, [userId]);
}

/**
 * List all users (paginated, without password_hash).
 */
async function listAll(client, limit = 50, offset = 0) {
  const { rows } = await client.query(
    `SELECT u.user_id, u.role_id, u.username, u.is_active, u.last_login,
            r.role_name,
            s.staff_id, s.first_name, s.last_name, s.designation
     FROM   users u
     JOIN   roles r ON u.role_id = r.role_id
     LEFT JOIN staff s ON u.user_id = s.user_id
     ORDER BY u.user_id
     LIMIT  $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

/**
 * Create a new user.
 */
async function create(client, { roleId, username, passwordHash }) {
  const { rows } = await client.query(
    `INSERT INTO users (role_id, username, password_hash, is_active)
     VALUES ($1, $2, $3, TRUE)
     RETURNING user_id, role_id, username, is_active, last_login`,
    [roleId, username, passwordHash]
  );
  return rows[0];
}

/**
 * Update a user's role or active status.
 */
async function update(client, userId, { roleId, isActive }) {
  const { rows } = await client.query(
    `UPDATE users
     SET    role_id = COALESCE($2, role_id),
            is_active = COALESCE($3, is_active)
     WHERE  user_id = $1
     RETURNING user_id, role_id, username, is_active, last_login`,
    [userId, roleId, isActive]
  );
  return rows[0] || null;
}

module.exports = {
  getByUsername,
  getById,
  updateLastLogin,
  logAuthEvent,
  countRecentFailures,
  lockAccount,
  deactivateUser,
  listAll,
  create,
  update,
};
