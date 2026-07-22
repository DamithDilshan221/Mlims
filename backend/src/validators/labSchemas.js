// ============================================================================
// MLIMS — Lab Zod Schemas
// ============================================================================

const { z } = require('zod');
const { sanitizedString, paginationQuery } = require('./commonSchemas');

const labRequestQuerySchema = paginationQuery.extend({
  status: z.enum(['pending', 'in_progress', 'completed', 'rejected']).optional(),
});

const labRequestSchema = z.object({
  specimenId: z.number().positive(),
  requestType: sanitizedString.min(1).max(100),
  requestDate: z.string().date(),
  govtAnalystRef: sanitizedString.max(100).optional().nullable(),
  clinicalNotes: sanitizedString.optional().nullable(),
});

const labRequestStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'rejected']),
});

const labResultFinalizeSchema = z.object({
  findings: sanitizedString.optional().nullable(),
  diagnosis: sanitizedString.optional().nullable(),
  documentUri: z.string().max(255).optional().nullable(),
});

module.exports = {
  labRequestQuerySchema,
  labRequestSchema,
  labRequestStatusSchema,
  labResultFinalizeSchema,
};
