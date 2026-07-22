// ============================================================================
// MLIMS — Postmortem Examination Zod Schemas
// ============================================================================

const { z } = require('zod');
const { sanitizedString } = require('./commonSchemas');

const postmortemExamSchema = z.object({
  caseId: z.number().positive(),
  inquestNo: sanitizedString.max(50).optional().nullable(),
  orderedBy: sanitizedString.max(150).optional().nullable(),
  dateOfPm: z.string().date(),
  timeOfPm: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  dateOfDeath: z.string().date().optional().nullable(),
  placeOfDeath: sanitizedString.max(200).optional().nullable(),
  mannerOfDeath: sanitizedString.max(100).optional().nullable(),
  rigorMortis: sanitizedString.optional().nullable(),
  hypostasis: sanitizedString.optional().nullable(),
  putrefaction: sanitizedString.optional().nullable(),
  // anatomical_notes is JSONB in DB, we accept an object
  anatomicalNotes: z.record(z.string(), sanitizedString).optional().nullable(),
});

const postmortemExamUpdateSchema = postmortemExamSchema.omit({ caseId: true }).partial();

const causeOfDeathSchema = z.object({
  pmrId: z.number().positive(),
  immediateCause: sanitizedString.optional().nullable(),
  antecedentCause: sanitizedString.optional().nullable(),
  contributory: sanitizedString.optional().nullable(),
  underInvestigation: z.boolean().optional(),
});

const causeOfDeathUpdateSchema = causeOfDeathSchema.omit({ pmrId: true }).partial();

const deceasedIdentificationSchema = z.object({
  pmrId: z.number().positive(),
  identifierName: z.string().min(1).max(150),
  identifierAddress: sanitizedString.optional().nullable(),
  relationship: sanitizedString.max(50).optional().nullable(),
  nic: z.string().min(5).max(50).optional().nullable(),
});

module.exports = {
  postmortemExamSchema,
  postmortemExamUpdateSchema,
  causeOfDeathSchema,
  causeOfDeathUpdateSchema,
  deceasedIdentificationSchema,
};
