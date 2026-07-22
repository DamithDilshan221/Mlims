// ============================================================================
// MLIMS — Common Zod Schemas
// ============================================================================

const { z } = require('zod');


// Reusable schema for free-text strings
const sanitizedString = z.string();

// Pagination query parameters
const paginationQuery = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

// Generic ID parameter
const idParam = z.object({
  id: z.coerce.number().positive(),
});

module.exports = {
  sanitizedString,
  paginationQuery,
  idParam,
};
