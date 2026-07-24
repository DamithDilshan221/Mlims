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
  let sql = `
    SELECT 
      al.log_id,
      al.user_id,
      u.username,
      al.table_name,
      al.record_id,
      al.action_type,
      al.changed_at,
      al.old_payload,
      al.new_payload
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.user_id
    WHERE 1=1
  `;
  const params = [];
  let idx = 1;

  if (userId) {
    sql += ` AND al.user_id = $${idx++}`;
    params.push(userId);
  }
  if (table) {
    sql += ` AND al.table_name ILIKE $${idx++}`;
    params.push(`%${table}%`);
  }
  if (action) {
    sql += ` AND al.action_type = $${idx++}`;
    params.push(action);
  }
  if (startDate) {
    sql += ` AND al.changed_at >= $${idx++}`;
    params.push(startDate);
  }
  if (endDate) {
    sql += ` AND al.changed_at <= $${idx++}`;
    params.push(endDate);
  }

  sql += ` ORDER BY al.changed_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(limit, offset);

  const { rows } = await client.query(sql, params);
  return rows;
}

module.exports = { listPaginated };
