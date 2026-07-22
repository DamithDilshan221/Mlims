// ============================================================================
// MLIMS — Auth Zod Schemas
// ============================================================================

const { z } = require('zod');

const loginSchema = z.object({
  username: z.string().min(3).max(100),
  password: z.string().min(1, "Password is required"), // Don't restrict max too much for login
});

// For admin creating a new user
const createUserSchema = z.object({
  roleId: z.number().positive(),
  username: z.string().min(3).max(100),
  password: z.string().min(8).max(100),
});

module.exports = { loginSchema, createUserSchema };
