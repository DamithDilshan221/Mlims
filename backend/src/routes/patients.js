// ============================================================================
// MLIMS — Patient Routes
// ============================================================================

const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { validateBody, validateQuery, validateParams } = require('../middleware/validate');
const { paginationQuery, idParam } = require('../validators/commonSchemas');
const { patientSchema, patientUpdateSchema } = require('../validators/patientSchemas');
const { getPool } = require('../db/pools');
const { withTransaction, withClient } = require('../db/transaction');
const repo = require('../repositories/patientRepository');
const { encrypt, decrypt, computeSearchHash } = require('../utils/encryption');

const router = express.Router();

router.use(authenticate);

/**
 * GET /patients
 * List patients. 
 * 'auditor', 'police', 'court' get the public de-identified view.
 * 'admin', 'records_clerk', 'doctor' get the full view (and decrypt PII).
 */
router.get('/', validateQuery(paginationQuery), async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    const pool = getPool(req.user.role_name);

    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      // If role is statistical, use listPublic
      if (['auditor'].includes(req.user.role_name)) {
        const patients = await repo.listPublic(client, limit, offset);
        return res.json(patients);
      }

      // Otherwise full view, decrypt NIC before returning
      const patients = await repo.listAll(client, limit, offset);
      const decrypted = patients.map(p => ({
        ...p,
        nic_passport: decrypt(p.nic_passport_enc),
        nic_passport_enc: undefined, // Don't send ciphertext to client
      }));
      res.json(decrypted);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /patients/:id
 */
router.get('/:id', validateParams(idParam), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const patient = await repo.getById(client, req.params.id);
      if (!patient) return res.status(404).json({ error: 'Patient not found' });
      
      // Decrypt if it has the column
      if (patient.nic_passport_enc) {
        patient.nic_passport = decrypt(patient.nic_passport_enc);
        delete patient.nic_passport_enc;
      }
      res.json(patient);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /patients
 * Create patient (admin, records_clerk, police).
 * Police can register a missing patient as part of case intake; doctors remain read-only.
 */
router.post('/', requireRole('admin', 'records_clerk', 'police'), validateBody(patientSchema), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    const data = req.body;
    
    // Encrypt and hash PII at application layer
    const nicPassportEnc = data.nicPassport ? encrypt(data.nicPassport) : null;
    const nicSearchHash = data.nicPassport ? computeSearchHash(data.nicPassport) : null;
    
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const patient = await repo.create(client, {
        fullName: data.fullName,
        dob: data.dob,
        gender: data.gender,
        address: data.address,
        nicPassportEnc,
        nicSearchHash,
      });
      res.status(201).json(patient);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /patients/:id
 */
router.patch('/:id', requireRole('admin', 'records_clerk'), validateParams(idParam), validateBody(patientUpdateSchema), async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    const data = req.body;
    
    let nicPassportEnc, nicSearchHash;
    if (data.nicPassport !== undefined) {
      nicPassportEnc = data.nicPassport ? encrypt(data.nicPassport) : null;
      nicSearchHash = data.nicPassport ? computeSearchHash(data.nicPassport) : null;
    }
    
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const patient = await repo.update(client, req.params.id, {
        fullName: data.fullName,
        dob: data.dob,
        gender: data.gender,
        address: data.address,
        nicPassportEnc,
        nicSearchHash,
      });
      if (!patient) return res.status(404).json({ error: 'Patient not found' });
      res.json(patient);
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
