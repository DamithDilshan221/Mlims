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
 * GET /digital-assets/case/:caseId
 */
router.get('/case/:caseId', async (req, res, next) => {
  try {
    const pool = getPool(req.user.role_name);
    await withClient(pool, async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM digital_assets WHERE case_id = $1 ORDER BY upload_date DESC`,
        [req.params.caseId]
      );
      res.json(rows);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /digital-assets/case/:caseId
 * Upload a file and insert metadata.
 */
router.post('/case/:caseId', requireRole('admin', 'records_clerk', 'police', 'doctor'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided.' });
    }

    const caseId = req.params.caseId;
    // Relative URI for serving the file later
    const fileUri = `/uploads/${req.file.filename}`;

    const pool = getPool(req.user.role_name);
    await withTransaction(pool, req.user.user_id, req.user.staff_id, async (client) => {
      const { rows } = await client.query(
        `INSERT INTO digital_assets (case_id, file_name, file_uri, file_type)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [caseId, req.file.originalname, fileUri, req.file.mimetype]
      );
      res.status(201).json(rows[0]);
    });
  } catch (err) {
    // If multer throws an error (e.g., file too large), handle it cleanly
    if (err.message.includes('Invalid file type') || err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

module.exports = router;
