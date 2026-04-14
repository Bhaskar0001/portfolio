const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
}, { _id: true });

const noticeSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true,
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: false, // Optional for initial background ingestion
        index: true,
    },
    ocrProcessed: { type: Boolean, default: false },
    department: {
        type: String,
        enum: ['IncomeTax', 'GST', 'TDS', 'CustomsDuty', 'Other'],
        required: true,
    },
    noticeType: {
        type: String,
        trim: true,
        maxlength: 200,
    },
    section: {
        type: String,
        trim: true,
        maxlength: 100,
    },
    assessmentYear: { type: String, trim: true },
    financialYear: { type: String, trim: true },
    din: { type: String, trim: true, uppercase: true },
    cpcRefNo: { type: String, trim: true },
    issueDate: { type: Date },
    receivedDate: { type: Date },
    dueDate: { type: Date, index: true },
    hearingDate: { type: Date },
    demandAmount: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['New', 'PendingOCR', 'Acknowledged', 'InProgress', 'ResponseDrafted', 'Filed', 'Closed', 'Escalated'],
        default: 'PendingOCR',
        index: true,
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        default: 'Medium',
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
    },
    watchers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    source: {
        type: String,
        enum: ['Manual', 'Email', 'Upload', 'OCR'],
        default: 'Manual',
    },
    extractedFields: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    ocrVerified: { type: Boolean, default: false },
    tags: [String],
    notes: { type: String, maxlength: 5000 },
    comments: [commentSchema],
    aiInsights: {
        summary: { type: String },
        actionPoints: [String],
        riskLevel: { type: String, enum: ['Low', 'Medium', 'High'] },
        documentsRequired: [String],
        sopSteps: [String],
        legalReferences: [String],
        source: { type: String, enum: ['openai', 'heuristic'], default: 'heuristic' },
        generatedAt: { type: Date }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    fileUrl: { type: String },
    reconciliationStatus: {
        type: String,
        enum: ['None', 'Matched', 'Discrepancy'],
        default: 'None',
    },
    ledgerMatch: {
        entryId: { type: String },
        amount: { type: Number },
        date: { type: Date },
        particulars: { type: String },
        remarks: { type: String },
    },
}, {
    timestamps: true,
});

const auditPlugin = require('../middleware/audit.middleware');

noticeSchema.index({ tenantId: 1, status: 1, dueDate: 1 });
noticeSchema.index({ tenantId: 1, clientId: 1, status: 1 });
noticeSchema.index({ tenantId: 1, assignedTo: 1 });
noticeSchema.index({ tenantId: 1, department: 1 });
noticeSchema.index({ tenantId: 1, din: 1 });

noticeSchema.plugin(auditPlugin, { entityType: 'Notice' });

module.exports = mongoose.model('Notice', noticeSchema);
