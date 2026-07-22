// ============================================================================
// MLIMS — Case Zod Schemas
// ============================================================================

const { z } = require('zod');
const { sanitizedString, paginationQuery } = require('./commonSchemas');

const caseQuerySchema = paginationQuery.extend({
  caseType: z.enum(['clinical', 'postmortem']).optional(),
  status: z.enum(['registered', 'under_investigation', 'pending_report', 'completed', 'closed']).optional(),
});

const registerCaseSchema = z.object({
  patientId: z.number().positive(),
  stationId: z.number().positive(),
  caseType: z.enum(['clinical', 'postmortem']),
  incidentDate: z.string().date(),
  incidentLocation: sanitizedString.min(1).max(255),
});

const updateCaseSchema = z.object({
  incidentDate: z.string().date().optional(),
  incidentLocation: sanitizedString.min(1).max(255).optional(),
  status: z.enum(['registered', 'under_investigation', 'pending_report', 'completed', 'closed']).optional(),
});

module.exports = { caseQuerySchema, registerCaseSchema, updateCaseSchema };
