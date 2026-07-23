// ============================================================================
// MLIMS — Clinical Examination Zod Schemas
// ============================================================================

const { z } = require('zod');
const { sanitizedString } = require('./commonSchemas');

const clinicalExamSchema = z.object({
  caseId: z.number().positive(),
  examDate: z.string().date(),
  examTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Format HH:MM or HH:MM:SS"),
  ward: sanitizedString.max(100).optional().nullable(),
  bhtNo: sanitizedString.max(50).optional().nullable(),
  dischargeDate: z.string().date().optional().nullable(),
  patientConsent: z.boolean(),
  briefHistory: sanitizedString.optional().nullable(),
  alcoholInfluence: sanitizedString.max(100).optional().nullable(),
  drugInfluence: sanitizedString.max(100).optional().nullable(),
  sexualAssault: z.boolean(),
  authorizationType: z.enum(['hospital_police', 'police_station', 'request_letter', 'court_order']).optional().nullable(),
});

const clinicalExamUpdateSchema = clinicalExamSchema.omit({ caseId: true }).partial();

const medicalReferralSchema = z.object({
  mlefId: z.number().positive(),
  specialty: sanitizedString.min(1).max(100),
  referralDate: z.string().date(),
  reviewNotes: sanitizedString.optional().nullable(),
});

const medicalReferralUpdateSchema = medicalReferralSchema.omit({ mlefId: true }).partial();

// ── Exam Injuries (Shared by clinical and postmortem) ──────────────────────

const examInjurySchema = z.object({
  mlefId: z.number().positive().optional(),
  pmrId: z.number().positive().optional(),
  injuryTypeId: z.number().positive(),
  weaponTypeId: z.number().positive().optional().nullable(),
  bodyPart: sanitizedString.min(1).max(100),
  sizeAndShape: sanitizedString.min(1).max(150),
  categoryOfHurt: sanitizedString.max(100).optional().nullable(),
  endangersLife: z.boolean().optional(),
}).refine(data => (data.mlefId && !data.pmrId) || (!data.mlefId && data.pmrId), {
  message: "Exactly one of mlefId or pmrId must be provided (XOR constraint).",
  path: ["mlefId", "pmrId"]
});

const examInjuryUpdateSchema = z.object({
  injuryTypeId: z.number().positive().optional(),
  weaponTypeId: z.number().positive().optional().nullable(),
  bodyPart: sanitizedString.min(1).max(100).optional(),
  sizeAndShape: sanitizedString.min(1).max(150).optional(),
  categoryOfHurt: sanitizedString.max(100).optional().nullable(),
  endangersLife: z.boolean().optional(),
});

module.exports = {
  clinicalExamSchema,
  clinicalExamUpdateSchema,
  medicalReferralSchema,
  medicalReferralUpdateSchema,
  examInjurySchema,
  examInjuryUpdateSchema,
};
