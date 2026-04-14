const mongoose = require('mongoose');
const auditPlugin = require('../middleware/audit.middleware');

const documentSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true,
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
    },
    noticeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Notice',
        index: true,
    },
    responseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Response',
    },
    category: {
        type: String,
        enum: ['NoticeOriginal', 'SupportingDoc', 'ResponseAttachment', 'Acknowledgement', 'KYC', 'Other'],
        default: 'Other',
    },
    verificationStatus: {
        type: String,
        enum: ['Unverified', 'Verified', 'Rejected', 'ManualReview'],
        default: 'Unverified',
    },
    verifiedAt: Date,
    verificationMetadata: { type: mongoose.Schema.Types.Mixed }, // Store OCR mismatch details here
    storageKey: {
        type: String,
        required: true,
    },
    storageBucket: {
        type: String,
        default: 'noticeradar',
    },
    originalName: {
        type: String,
        required: true,
        trim: true,
    },
    mimeType: {
        type: String,
        required: true,
    },
    sizeBytes: {
        type: Number,
        required: true,
    },
    sha256Hash: { type: String },
    uploadStatus: {
        type: String,
        enum: ['Pending', 'Completed', 'Failed'],
        default: 'Pending',
    },
    version: { type: Number, default: 1 },
    tags: [String],
    description: { type: String, maxlength: 500 },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'uploaderModel'
    },
    uploaderModel: {
        type: String,
        required: true,
        enum: ['User', 'ClientUser'],
        default: 'User'
    },
}, {
    timestamps: true,
});

documentSchema.index({ tenantId: 1, noticeId: 1 });
documentSchema.index({ tenantId: 1, clientId: 1 });
documentSchema.index({ tenantId: 1, responseId: 1 });
documentSchema.index({ tenantId: 1, category: 1 });

documentSchema.plugin(auditPlugin, { entityType: 'Document' });

module.exports = mongoose.model('Document', documentSchema);
