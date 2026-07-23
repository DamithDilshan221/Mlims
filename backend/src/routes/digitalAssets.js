// ============================================================================
// MLIMS — Digital Assets Routes
// ============================================================================

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { getPool } = require('../db/pools');
const { withTransaction, withClient } = require('../db/transaction');
const config = require('../config');

const router = express.Router();
router.use(authenticate);

// ── Multer Config ──────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure upload dir exists
    const uploadPath = path.resolve(config.upload.dir);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Unique name to avoid collisions
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSizeMB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: PDF, JPG, PNG, DOC/DOCX.`));
    }
  }
});

// ── Routes ─────────────────────────────────────────────────────────────────

/**
 * GET /digital-assets or GET /digital-assets/case/:caseId
 */
router.get(['/', '/case/:caseId'], async (req, res, next) => {
  try {
    const caseId = req.params.caseId || req.query.caseId;
    if (!caseId) {
      return res.status(400).json({ error: 'caseId query parameter or route param required.' });
    }

    // Doctor lacks DB-level grants to digital_assets by mistake in V2, fallback to clerk
    const poolRole = req.user.role_name === 'doctor' ? 'records_clerk' : req.user.role_name;
    const pool = getPool(poolRole);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM digital_assets WHERE case_id = $1 ORDER BY upload_date DESC`,
        [caseId]
      );
      res.json(rows);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /digital-assets/:id/content
 * Downloads/streams the digital asset file from disk.
 */
router.get('/:id/content', async (req, res, next) => {
  try {
    const poolRole = req.user.role_name === 'doctor' ? 'records_clerk' : req.user.role_name;
    const pool = getPool(poolRole);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM digital_assets WHERE asset_id = $1`,
        [req.params.id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Asset not found.' });
      }

      const asset = rows[0];
      // file_uri is e.g. /uploads/filename
      const filename = path.basename(asset.file_uri);
      const filePath = path.resolve(config.upload.dir, filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File on disk not found.' });
      }

      res.setHeader('Content-Type', asset.file_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${asset.file_name}"`);
      fs.createReadStream(filePath).pipe(res);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /digital-assets or POST /digital-assets/case/:caseId
 * Upload a file and insert metadata into digital_assets table.
 */
router.post(['/', '/case/:caseId'], requireRole('admin', 'records_clerk', 'police', 'doctor'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided.' });
    }

    const caseId = req.params.caseId || req.body.case_id;
    if (!caseId) {
      return res.status(400).json({ error: 'case_id is required.' });
    }

    const fileUri = `/uploads/${req.file.filename}`;

    const poolRole = req.user.role_name === 'doctor' ? 'records_clerk' : req.user.role_name;
    const pool = getPool(poolRole);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const { rows } = await client.query(
        `INSERT INTO digital_assets (case_id, file_name, file_uri, file_type)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [caseId, req.file.originalname || req.body.file_name, fileUri, req.file.mimetype]
      );
      res.status(201).json(rows[0]);
    });
  } catch (err) {
    if (err.message.includes('Invalid file type') || err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

module.exports = router;
