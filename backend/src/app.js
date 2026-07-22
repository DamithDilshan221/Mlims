// ============================================================================
// MLIMS — Express App Assembly
// ============================================================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { globalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const caseRoutes = require('./routes/cases');
const clinicalExamRoutes = require('./routes/clinicalExaminations');
const postmortemExamRoutes = require('./routes/postmortemExaminations');
const examInjuryRoutes = require('./routes/examInjuries');
const specimenRoutes = require('./routes/specimens');
const labWorkRoutes = require('./routes/labWork');
const reportRoutes = require('./routes/reports');
const digitalAssetRoutes = require('./routes/digitalAssets');
const adminRoutes = require('./routes/admin');
const auditLogRoutes = require('./routes/auditLog');
const searchRoutes = require('./routes/search');
const lookupRoutes = require('./routes/lookups');
const statsRoutes = require('./routes/statistics');

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────

app.use(helmet()); // Security headers
app.use(cors({ origin: true, credentials: true })); // Configure strictly in production
app.use(express.json());
app.use(cookieParser());
app.use(globalLimiter);

// ── Routes ─────────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/clinical-examinations', clinicalExamRoutes);
app.use('/api/postmortem-examinations', postmortemExamRoutes);
app.use('/api/exam-injuries', examInjuryRoutes);
app.use('/api/specimens', specimenRoutes);
app.use('/api/lab-requests', labWorkRoutes); // Handled inside labWork router
app.use('/api/reports', reportRoutes);
app.use('/api/digital-assets', digitalAssetRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', auditLogRoutes); // Contains /audit-log and /notifications
app.use('/api/search', searchRoutes);
app.use('/api/lookups', lookupRoutes);
app.use('/api/statistics', statsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
