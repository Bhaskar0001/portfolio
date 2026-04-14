const { z } = require('zod');

const createResponseSchema = z.object({
    noticeId: z.string().min(1, 'Notice is required'),
    subject: z.string().max(500).optional().default(''),
    body: z.string().min(1, 'Response body is required'),
    letterhead: z.object({
        firmName: z.string().max(300).optional(),
        firmAddress: z.string().max(500).optional(),
        firmPhone: z.string().max(20).optional(),
        firmEmail: z.string().email().optional().or(z.literal('')),
        firmGSTIN: z.string().max(15).optional().or(z.literal('')),
    }).optional(),
    attachments: z.array(z.string()).optional().default([]), // Document IDs
});

const updateResponseSchema = z.object({
    subject: z.string().max(500).optional(),
    body: z.string().optional(),
    letterhead: z.object({
        firmName: z.string().max(300).optional(),
        firmAddress: z.string().max(500).optional(),
        firmPhone: z.string().max(20).optional(),
        firmEmail: z.string().email().optional().or(z.literal('')),
        firmGSTIN: z.string().max(15).optional().or(z.literal('')),
    }).optional(),
    attachments: z.array(z.string()).optional(),
});

const reviewerCommentSchema = z.object({
    comment: z.string().min(1, 'Comment is required').max(5000),
});

const markFiledSchema = z.object({
    filedDate: z.string().optional(),
    acknowledgementNo: z.string().max(100).optional(),
    filingMode: z.enum(['Online', 'Physical', 'Email', 'Other']).default('Online'),
    notes: z.string().max(2000).optional(),
});

module.exports = {
    createResponseSchema,
    updateResponseSchema,
    reviewerCommentSchema,
    markFiledSchema,
};
