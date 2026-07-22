// ============================================================================
// MLIMS — Report Zod Schemas
// ============================================================================

const { z } = require('zod');
const { sanitizedString } = require('./commonSchemas');

const mlrSchema = z.object({
  mlefId: z.number().positive(),
  courtId: z.number().positive(),
  courtCaseNo: sanitizedString.max(100).optional().nullable(),
  serialNo: sanitizedString.max(50).optional().nullable(),
  trialDate: z.string().date().optional().nullable(),
  issueDate: z.string().date(),
  finalOpinion: sanitizedString.optional().nullable(),
  isGrievous311: z.boolean().optional(),
});

const mlrUpdateSchema = mlrSchema.omit({ mlefId: true }).partial();

const courtReceiptSchema = z.object({
  courtId: z.number().positive(),
  mlrId: z.number().positive().optional(),
  pmrId: z.number().positive().optional(),
  trialDate: z.string().date().optional().nullable(),
  registrarSign: sanitizedString.max(150).optional().nullable(),
}).refine(data => (data.mlrId && !data.pmrId) || (!data.mlrId && data.pmrId), {
  message: "Exactly one of mlrId or pmrId must be provided (XOR constraint).",
  path: ["mlrId", "pmrId"]
});

module.exports = { mlrSchema, mlrUpdateSchema, courtReceiptSchema };
