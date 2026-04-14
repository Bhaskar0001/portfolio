const { z } = require('zod');

const createNoticeSchema = z.object({
    clientId: z.string().min(1, 'Client is required'),
    department: z.enum(['IncomeTax', 'GST', 'TDS', 'CustomsDuty', 'Other']),
    noticeType: z.string().max(200).optional(),
    section: z.string().max(100).optional(),
    assessmentYear: z.string().max(20).optional(),
    financialYear: z.string().max(20).optional(),
    din: z.string().max(50).optional(),
    cpcRefNo: z.string().max(50).optional(),
    issueDate: z.string().optional(),
    receivedDate: z.string().optional(),
    dueDate: z.string().optional(),
    hearingDate: z.string().optional(),
    demandAmount: z.number().min(0).optional().default(0),
    status: z.enum(['New', 'Acknowledged', 'InProgress', 'ResponseDrafted', 'Filed', 'Closed', 'Escalated']).default('New'),
    priority: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
    assignedTo: z.string().optional(),
    watchers: z.array(z.string()).optional().default([]),
    source: z.enum(['Manual', 'Email', 'Upload', 'OCR']).default('Manual'),
    tags: z.array(z.string()).optional().default([]),
    notes: z.string().max(5000).optional(),
});

const updateNoticeSchema = createNoticeSchema.partial();

const noticeQuerySchema = z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    department: z.string().optional(),
    clientId: z.string().optional(),
    assignedTo: z.string().optional(),
    dueDateFrom: z.string().optional(),
    dueDateTo: z.string().optional(),
    sort: z.string().optional(),
});

const assignNoticeSchema = z.object({
    assignedTo: z.string().min(1, 'Assignee is required'),
});

const statusChangeSchema = z.object({
    status: z.enum(['New', 'Acknowledged', 'InProgress', 'ResponseDrafted', 'Filed', 'Closed', 'Escalated']),
});

module.exports = { createNoticeSchema, updateNoticeSchema, noticeQuerySchema, assignNoticeSchema, statusChangeSchema };
