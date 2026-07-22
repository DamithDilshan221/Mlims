// ============================================================================
// MLIMS — Specimen & Custody Zod Schemas
// ============================================================================

const { z } = require('zod');
const { sanitizedString } = require('./commonSchemas');

const specimenSchema = z.object({
  caseId: z.number().positive(),
  specimenTypeId: z.number().positive(),
  barcodeId: z.string().min(1).max(50),
  quantity: sanitizedString.max(50).optional().nullable(),
  collectionDate: z.string().datetime({ offset: true }).optional().nullable(), // Allow ISO8601 with tz
  currentLocation: sanitizedString.max(150).optional().nullable(),
});

const specimenUpdateSchema = z.object({
  quantity: sanitizedString.max(50).optional().nullable(),
  currentLocation: sanitizedString.max(150).optional().nullable(),
});

const custodyTransferSchema = z.object({
  transferredTo: sanitizedString.min(1).max(150),
  purpose: sanitizedString.optional().nullable(),
  receiptUri: z.string().max(255).optional().nullable(),
});

module.exports = {
  specimenSchema,
  specimenUpdateSchema,
  custodyTransferSchema,
};
