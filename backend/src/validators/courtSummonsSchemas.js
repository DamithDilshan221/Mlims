const { z } = require('zod');
const { sanitizedString } = require('./commonSchemas');

const courtSummonSchema = z.object({
  caseId: z.number().positive(),
  courtId: z.number().positive(),
  issueDate: z.string().date().optional(),
  appearanceDate: z.string().date().optional().nullable(),
  responseStatus: z.enum(['pending', 'served', 'responded', 'complied', 'dismissed']).optional(),
  documentUri: sanitizedString.optional().nullable(),
  notes: sanitizedString.optional().nullable(),
});

const courtSummonUpdateSchema = z.object({
  courtId: z.number().positive().optional(),
  issueDate: z.string().date().optional(),
  appearanceDate: z.string().date().optional().nullable(),
  responseStatus: z.enum(['pending', 'served', 'responded', 'complied', 'dismissed']).optional(),
  documentUri: sanitizedString.optional().nullable(),
  notes: sanitizedString.optional().nullable(),
});

module.exports = { courtSummonSchema, courtSummonUpdateSchema };
