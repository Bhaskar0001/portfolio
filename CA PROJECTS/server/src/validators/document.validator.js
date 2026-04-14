const { z } = require('zod');

const presignUploadSchema = z.object({
    noticeId: z.string().min(1, 'noticeId is required'),
    fileName: z.string().min(1, 'fileName is required').max(255),
    fileType: z.string().min(1, 'fileType is required'), // MIME type
    fileSize: z.number().positive().max(100 * 1024 * 1024, 'Max file size is 100 MB'),
    category: z.enum(['NoticeOriginal', 'SupportingDoc', 'ResponseAttachment', 'Acknowledgement', 'Other']).default('SupportingDoc'),
    description: z.string().max(500).optional(),
});

const documentQuerySchema = z.object({
    noticeId: z.string().optional(),
    category: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
});

module.exports = { presignUploadSchema, documentQuerySchema };
