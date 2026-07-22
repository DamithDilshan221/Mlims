// ============================================================================
// MLIMS — Zod Validation Middleware
//
// Generic middleware factory that validates req.body (or req.query/req.params)
// against a Zod schema. Rejects with 400 and a structured error list if
// validation fails.
// ============================================================================

/**
 * Returns middleware that validates req.body against the given Zod schema.
 * On failure: 400 with { error: 'Validation failed', details: [...] }.
 *
 * @param {import('zod').ZodSchema} schema
 * @returns {Function} Express middleware
 */
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed.',
        details: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    // Replace req.body with the parsed (and transformed) data
    req.body = result.data;
    next();
  };
}

/**
 * Validates req.query against the given Zod schema.
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed.',
        details: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    req.query = result.data;
    next();
  };
}

/**
 * Validates req.params against the given Zod schema.
 */
function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed.',
        details: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    req.params = result.data;
    next();
  };
}

module.exports = { validateBody, validateQuery, validateParams };
