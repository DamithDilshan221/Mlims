// ============================================================================
// MLIMS — Chain of Custody Repository
//
// Custody transfers use sp_add_custody_transfer — the Phase 1 stored
// procedure that atomically appends a chain link and updates
// specimens.current_location. Past entries are NEVER edited.
// ============================================================================

/**
 * Get all custody chain entries for a specimen, chronologically.
 */
async function getBySpecimenId(client, specimenId) {
  const { rows } = await client.query(
    `SELECT coc.*, s.first_name || ' ' || s.last_name AS transferred_by_name
     FROM   chain_of_custody coc
     JOIN   staff s ON coc.transferred_by = s.staff_id
     WHERE  coc.specimen_id = $1
     ORDER BY coc.transfer_date ASC`,
    [specimenId]
  );
  return rows;
}

/**
 * Add a custody transfer via Phase 1 stored procedure.
 * sp_add_custody_transfer: appends chain link + updates specimen location.
 *
 * SQL: SELECT * FROM sp_add_custody_transfer($1, $2, $3, $4, $5)
 */
async function addTransfer(client, specimenId, transferredBy, transferredTo, purpose, receiptUri) {
  const { rows } = await client.query(
    `SELECT * FROM sp_add_custody_transfer($1, $2, $3, $4, $5)`,
    [specimenId, transferredBy, transferredTo, purpose, receiptUri || null]
  );
  return rows[0];
}

module.exports = { getBySpecimenId, addTransfer };
