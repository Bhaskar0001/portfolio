const mongoose = require('mongoose');
const auditPlugin = require('../middleware/audit.middleware');

const reviewerCommentSchema = new mongoose.Schema({
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    comment: { type: String, required: true, maxlength: 5000 },
    createdAt: { type: Date, default: Date.now },
}, { _id: true });

const linkedDocSchema = new mongoose.Schema({
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    label: { type: String, trim: true },
    paragraphRef: { type: String, trim: true },
}, { _id: true });

const letterheadSchema = new mongoose.Schema({
    firmName: { type: String, maxlength: 300 },
    firmAddress: { type: String, maxlength: 500 },
    firmPhone: { type: String, maxlength: 20 },
    firmEmail: { type: String, maxlength: 100 },
    firmGSTIN: { type: String, maxlength: 15 },
}, { _id: false });

const filingDetailsSchema = new mongoose.Schema({
    filedDate: { type: Date },
    acknowledgementNo: { type: String, maxlength: 100 },
    filingMode: { type: String, enum: ['Online', 'Physical', 'Email', 'Other'], default: 'Online' },
    notes: { type: String, maxlength: 2000 },
}, { _id: false });

const responseSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true,
    },
    noticeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Notice',
        required: true,
        index: true,
    },
    version: {
        type: Number,
        default: 1,
    },
    status: {
        type: String,
        enum: ['Draft', 'InReview', 'RevisionRequested', 'Approved', 'Filed', 'Closed'],
        default: 'Draft',
        index: true,
    },

    // Content
    subject: { type: String, maxlength: 500, default: '' },
    body: { type: String, default: '' },
    letterhead: letterheadSchema,
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],

    // Review workflow
    draftedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    submittedAt: { type: Date },
    approvedAt: { type: Date },
    reviewerComments: [reviewerCommentSchema],

    // Linked documents
    linkedDocuments: [linkedDocSchema],

    // Generated artifacts
    generatedPdfDocId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    packetZipDocId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    acknowledgementDocId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },

    // Filing
    filedAt: { type: Date },
    filingDetails: filingDetailsSchema,
    templateUsed: { type: mongoose.Schema.Types.ObjectId, ref: 'Template' },
}, {
    timestamps: true,
});

responseSchema.index({ tenantId: 1, noticeId: 1 });
responseSchema.index({ tenantId: 1, status: 1 });

responseSchema.plugin(auditPlugin, { entityType: 'Response' });

module.exports = mongoose.model('Response', responseSchema);
