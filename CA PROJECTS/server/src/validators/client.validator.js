const { z } = require('zod');

const contactSchema = z.object({
    name: z.string().max(200).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(20).optional(),
    designation: z.string().max(100).optional(),
});

const gstinSchema = z.object({
    gstin: z.string().min(15).max(15).regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format'),
    state: z.string().max(50).optional(),
    status: z.enum(['active', 'cancelled', 'suspended']).default('active'),
});

const createClientSchema = z.object({
    name: z.string().min(1).max(300),
    entityType: z.enum(['Individual', 'HUF', 'Firm', 'LLP', 'Company', 'Trust', 'AOP/BOI', 'Other']).default('Individual'),
    pan: z.string().max(10).regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format').optional().or(z.literal('')),
    tan: z.string().max(10).optional().or(z.literal('')),
    gstins: z.array(gstinSchema).optional().default([]),
    contacts: z.array(contactSchema).optional().default([]),
    address: z.object({
        line1: z.string().max(200).optional(),
        line2: z.string().max(200).optional(),
        city: z.string().max(100).optional(),
        state: z.string().max(100).optional(),
        pincode: z.string().max(10).optional(),
        country: z.string().max(100).default('India'),
    }).optional(),
    status: z.enum(['active', 'inactive']).default('active'),
    tags: z.array(z.string()).optional().default([]),
    notes: z.string().max(5000).optional(),
});

const updateClientSchema = createClientSchema.partial();

const clientQuerySchema = z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    status: z.enum(['active', 'inactive', '']).optional(),
    entityType: z.string().optional(),
    sort: z.string().optional(),
});

module.exports = { createClientSchema, updateClientSchema, clientQuerySchema };
