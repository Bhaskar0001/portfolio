const { z } = require('zod');

const createUserSchema = z.object({
    email: z.string().email(),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
    roles: z.array(z.enum(['Client', 'Staff', 'Reviewer', 'Partner', 'TenantAdmin'])).min(1),
    phone: z.string().max(20).optional(),
    designation: z.string().max(100).optional(),
});

const updateUserSchema = z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    roles: z.array(z.enum(['Client', 'Staff', 'Reviewer', 'Partner', 'TenantAdmin'])).optional(),
    phone: z.string().max(20).optional(),
    designation: z.string().max(100).optional(),
    status: z.enum(['active', 'disabled']).optional(),
    notifications: z.object({
        email: z.boolean().optional(),
        inApp: z.boolean().optional(),
        sms: z.boolean().optional(),
    }).optional(),
});

const resetPasswordSchema = z.object({
    newPassword: z.string().min(8).max(128),
});

module.exports = { createUserSchema, updateUserSchema, resetPasswordSchema };
