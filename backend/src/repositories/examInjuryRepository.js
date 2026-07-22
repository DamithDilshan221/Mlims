// ============================================================================
// MLIMS — Exam Injury Repository
//
// SQL queries for the exam_injuries junction table. The XOR CHECK constraint
// (mlef_id XOR pmr_id) is enforced at the database level — the app
// validates it too for a friendly error message before hitting the DB.
// ============================================================================

async function getByExamId(client, { mlefId, pmrId }) {
  if (mlefId) {
    const { rows } = await client.query(
      `SELECT ei.*, it.name AS injury_name, wt.name AS weapon_name
       FROM   exam_injuries ei
       JOIN   injury_types it ON ei.injury_type_id = it.injury_type_id
       LEFT JOIN weapon_types wt ON ei.weapon_type_id = wt.weapon_type_id
       WHERE  ei.mlef_id = $1
       ORDER BY ei.exam_injury_id`,
      [mlefId]
    );
    return rows;
  }
  const { rows } = await client.query(
    `SELECT ei.*, it.name AS injury_name, wt.name AS weapon_name
     FROM   exam_injuries ei
     JOIN   injury_types it ON ei.injury_type_id = it.injury_type_id
     LEFT JOIN weapon_types wt ON ei.weapon_type_id = wt.weapon_type_id
     WHERE  ei.pmr_id = $1
     ORDER BY ei.exam_injury_id`,
    [pmrId]
  );
  return rows;
}

async function create(client, data) {
  const { rows } = await client.query(
    `INSERT INTO exam_injuries
       (mlef_id, pmr_id, injury_type_id, weapon_type_id,
        body_part, size_and_shape, category_of_hurt, endangers_life)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.mlefId || null, data.pmrId || null,
      data.injuryTypeId, data.weaponTypeId || null,
      data.bodyPart, data.sizeAndShape, data.categoryOfHurt,
      data.endangersLife || false,
    ]
  );
  return rows[0];
}

async function update(client, examInjuryId, data) {
  const { rows } = await client.query(
    `UPDATE exam_injuries
     SET    injury_type_id = COALESCE($2, injury_type_id),
            weapon_type_id = COALESCE($3, weapon_type_id),
            body_part = COALESCE($4, body_part),
            size_and_shape = COALESCE($5, size_and_shape),
            category_of_hurt = COALESCE($6, category_of_hurt),
            endangers_life = COALESCE($7, endangers_life)
     WHERE  exam_injury_id = $1
     RETURNING *`,
    [
      examInjuryId, data.injuryTypeId, data.weaponTypeId,
      data.bodyPart, data.sizeAndShape, data.categoryOfHurt,
      data.endangersLife,
    ]
  );
  return rows[0] || null;
}

async function remove(client, examInjuryId) {
  const { rowCount } = await client.query(
    `DELETE FROM exam_injuries WHERE exam_injury_id = $1`,
    [examInjuryId]
  );
  return rowCount > 0;
}

module.exports = { getByExamId, create, update, remove };
