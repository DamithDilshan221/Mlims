// ============================================================================
// MLIMS — Postmortem Examination Repository
//
// SQL queries for postmortem_examinations, causes_of_death, and
// deceased_identifications. RLS on postmortem_examinations scopes
// doctor_role to their own rows.
// ============================================================================

async function getById(client, pmrId) {
  const { rows } = await client.query(
    `SELECT pe.*, s.first_name || ' ' || s.last_name AS doctor_name
     FROM   postmortem_examinations pe
     JOIN   staff s ON pe.doctor_id = s.staff_id
     WHERE  pe.pmr_id = $1`,
    [pmrId]
  );
  return rows[0] || null;
}

async function getByCaseId(client, caseId) {
  const { rows } = await client.query(
    `SELECT pe.*, s.first_name || ' ' || s.last_name AS doctor_name
     FROM   postmortem_examinations pe
     JOIN   staff s ON pe.doctor_id = s.staff_id
     WHERE  pe.case_id = $1`,
    [caseId]
  );
  return rows[0] || null;
}

async function listAll(client, limit = 50, offset = 0) {
  const { rows } = await client.query(
    `SELECT pe.*, s.first_name || ' ' || s.last_name AS doctor_name,
            fc.case_number
     FROM   postmortem_examinations pe
     JOIN   staff s ON pe.doctor_id = s.staff_id
     JOIN   forensic_cases fc ON pe.case_id = fc.case_id
     ORDER BY pe.date_of_pm DESC
     LIMIT  $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

async function create(client, data) {
  const { rows } = await client.query(
    `INSERT INTO postmortem_examinations
       (case_id, doctor_id, authorization_type, inquest_no, ordered_by, date_of_pm, time_of_pm,
        date_of_death, place_of_death, manner_of_death,
        rigor_mortis, hypostasis, putrefaction, anatomical_notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      data.caseId, data.doctorId, data.authorizationType, data.inquestNo, data.orderedBy,
      data.dateOfPm, data.timeOfPm, data.dateOfDeath, data.placeOfDeath,
      data.mannerOfDeath, data.rigorMortis, data.hypostasis,
      data.putrefaction, data.anatomicalNotes ? JSON.stringify(data.anatomicalNotes) : null,
    ]
  );
  return rows[0];
}

async function update(client, pmrId, data) {
  const { rows } = await client.query(
    `UPDATE postmortem_examinations
     SET    authorization_type = COALESCE($2, authorization_type),
            inquest_no = COALESCE($3, inquest_no),
            ordered_by = COALESCE($4, ordered_by),
            date_of_pm = COALESCE($5, date_of_pm),
            time_of_pm = COALESCE($6, time_of_pm),
            date_of_death = COALESCE($7, date_of_death),
            place_of_death = COALESCE($8, place_of_death),
            manner_of_death = COALESCE($9, manner_of_death),
            rigor_mortis = COALESCE($10, rigor_mortis),
            hypostasis = COALESCE($11, hypostasis),
            putrefaction = COALESCE($12, putrefaction),
            anatomical_notes = COALESCE($13, anatomical_notes)
     WHERE  pmr_id = $1
     RETURNING *`,
    [
      pmrId, data.authorizationType, data.inquestNo, data.orderedBy, data.dateOfPm, data.timeOfPm,
      data.dateOfDeath, data.placeOfDeath, data.mannerOfDeath,
      data.rigorMortis, data.hypostasis, data.putrefaction,
      data.anatomicalNotes ? JSON.stringify(data.anatomicalNotes) : undefined,
    ]
  );
  return rows[0] || null;
}

// ── Causes of Death ────────────────────────────────────────────────────────

async function getCauseOfDeath(client, pmrId) {
  const { rows } = await client.query(
    `SELECT * FROM causes_of_death WHERE pmr_id = $1`,
    [pmrId]
  );
  return rows[0] || null;
}

async function createCauseOfDeath(client, { pmrId, immediateCause, antecedentCause, contributory, underInvestigation }) {
  const { rows } = await client.query(
    `INSERT INTO causes_of_death (pmr_id, immediate_cause, antecedent_cause, contributory, under_investigation)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [pmrId, immediateCause, antecedentCause, contributory, underInvestigation || false]
  );
  return rows[0];
}

async function updateCauseOfDeath(client, codId, data) {
  const { rows } = await client.query(
    `UPDATE causes_of_death
     SET    immediate_cause = COALESCE($2, immediate_cause),
            antecedent_cause = COALESCE($3, antecedent_cause),
            contributory = COALESCE($4, contributory),
            under_investigation = COALESCE($5, under_investigation)
     WHERE  cod_id = $1
     RETURNING *`,
    [codId, data.immediateCause, data.antecedentCause, data.contributory, data.underInvestigation]
  );
  return rows[0] || null;
}

// ── Deceased Identifications ───────────────────────────────────────────────

async function getDeceasedIdentifications(client, pmrId) {
  const { rows } = await client.query(
    `SELECT * FROM deceased_identifications WHERE pmr_id = $1 ORDER BY identification_id`,
    [pmrId]
  );
  return rows;
}

async function createDeceasedIdentification(client, { pmrId, identifierName, identifierAddress, relationship, nicEnc, nicSearchHash }) {
  const { rows } = await client.query(
    `INSERT INTO deceased_identifications
       (pmr_id, identifier_name, identifier_address, relationship, nic_enc, nic_search_hash)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [pmrId, identifierName, identifierAddress, relationship, nicEnc, nicSearchHash]
  );
  return rows[0];
}

module.exports = {
  getById, getByCaseId, listAll, create, update,
  getCauseOfDeath, createCauseOfDeath, updateCauseOfDeath,
  getDeceasedIdentifications, createDeceasedIdentification,
};
