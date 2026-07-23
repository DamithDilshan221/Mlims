// ============================================================================
// MLIMS — Search Routes
// ============================================================================

const express = require('express');
const authenticate = require('../middleware/authenticate');
const { validateQuery } = require('../middleware/validate');
const { getPool } = require('../db/pools');
const { withTransaction } = require('../db/transaction');
const { computeSearchHash, decrypt } = require('../utils/encryption');
const { z } = require('zod');
const { sanitizedString } = require('../validators/commonSchemas');

const router = express.Router();
router.use(authenticate);

const searchQuerySchema = z.object({
  q: sanitizedString.min(3),
  type: z.enum(['case', 'patient', 'specimen']),
});

/**
 * GET /search
 * Unified search endpoint routing to different entities based on type.
 * Access control is delegated to the role's database pool.
 */
router.get('/', validateQuery(searchQuerySchema), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    const { q, type } = req.query;

    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      let results = [];

      if (type === 'case') {
        const { rows } = await client.query(
          `SELECT case_id, case_number, status, case_type 
           FROM forensic_cases 
           WHERE case_number ILIKE $1`,
          [`%${q}%`]
        );
        results = rows;
      } 
      else if (type === 'patient') {
        const nicHash = computeSearchHash(q);
        
        const view = ['auditor', 'police', 'court'].includes(req.user.role_name) 
          ? 'v_patient_public' 
          : 'v_patient_full';
          
        let { rows } = await client.query(
          `SELECT * FROM ${view} WHERE nic_search_hash = $1`,
          [nicHash]
        );
        
        // Fallback to name search when NIC hash finds nothing (full view only)
        if (rows.length === 0 && view === 'v_patient_full') {
          const { rows: nameRows } = await client.query(
            `SELECT * FROM ${view} WHERE full_name ILIKE $1`,
            [`%${q}%`]
          );
          rows = nameRows;
        }
        
        results = rows.map(p => {
          if (p.nic_passport_enc) {
            p.nic_passport = decrypt(p.nic_passport_enc);
            delete p.nic_passport_enc;
          }
          return p;
        });
      } 
      else if (type === 'specimen') {
        const { rows } = await client.query(
          `SELECT specimen_id, barcode_id, current_location 
           FROM specimens 
           WHERE barcode_id ILIKE $1`,
          [`%${q}%`]
        );
        results = rows;
      }

      res.json(results);
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
