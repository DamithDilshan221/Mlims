// ============================================================================
// MLIMS — Patient Zod Schemas
// ============================================================================

const { z } = require('zod');
const { sanitizedString } = require('./commonSchemas');

const patientSchema = z.object({
  fullName: z.string().min(1).max(200),
  dob: z.string().date().optional().nullable(),
  gender: z.enum(['M', 'F', 'X']).optional().nullable(),
  address: sanitizedString.max(1000).optional().nullable(),
  nicPassport: z.string().min(5).max(50).optional().nullable(),
});

const patientUpdateSchema = patientSchema.partial();

module.exports = { patientSchema, patientUpdateSchema };
