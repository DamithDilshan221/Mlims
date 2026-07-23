// ============================================================================
// MLIMS — Audit Repository
//
// Uses the v_audit_log_detailed view created in Phase 1 to fetch audit
// logs with pre-joined user and staff names.
// ============================================================================

/**
 * List audit logs with pagination.
 * Optionally filter by user_id or date range, leveraging the index on
 * (user_id, changed_at) from Phase 1.
 */
async function listPaginated(client, { userId, table, action, startDate, endDate, limit = 50, offset = 0 } = {}) {
  let sql = `SELECT * FROM v_audit_log_detailed WHERE 1=1`;
  const params = [];
  let idx = 1;

  if (userId) {
    sql += ` AND user_id = $${idx++}`;
    params.push(userId);
  }
  if (table) {
    sql += ` AND table_name ILIKE $${idx++}`;
    params.push(`%${table}%`);
  }
  if (action) {
    sql += ` AND action_type = $${idx++}`;
    params.push(action);
  }
  if (startDate) {
    sql += ` AND changed_at >= $${idx++}`;
    params.push(startDate);
  }
  if (endDate) {
    sql += ` AND changed_at <= $${idx++}`;
    params.push(endDate);
  }

  sql += ` ORDER BY changed_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(limit, offset);

  const { rows } = await client.query(sql, params);
  return rows;
}

module.exports = { listPaginated };
