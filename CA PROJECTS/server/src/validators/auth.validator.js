const { z } = require('zod');

const registerSchema = z.object({
    tenantName: z.string().min(2).max(200),
    tenantSlug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
    email: z.string().email(),
    password: z.string().min(8).max(100),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

const refreshSchema = z.object({
    refreshToken: z.string().min(1),
});

module.exports = { registerSchema, loginSchema, refreshSchema };
