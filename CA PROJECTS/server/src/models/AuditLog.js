const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true,
    },
    actorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    actorEmail: {
        type: String,
    },
    action: {
        type: String,
        required: true,
        enum: [
            'AUTH_LOGIN', 'AUTH_LOGOUT', 'AUTH_REFRESH', 'AUTH_SSO_LOGIN', 'AUTH_REGISTER',
            'USER_CREATE', 'USER_UPDATE', 'USER_DISABLE',
            'TENANT_CREATE', 'TENANT_UPDATE',
            'CLIENT_CREATE', 'CLIENT_UPDATE', 'CLIENT_DELETE',
            'CLIENT_CREATED', 'CLIENT_UPDATED', 'CLIENT_DELETED',
            'NOTICE_CREATE', 'NOTICE_UPDATE', 'NOTICE_ASSIGN',
            'NOTICE_CREATED', 'NOTICE_UPDATED', 'NOTICE_DELETED',
            'NOTICE_STATUS_CHANGE', 'NOTICE_DELETE',
            'DOC_UPLOAD', 'DOC_DOWNLOAD', 'DOC_DELETE',
            'RESPONSE_CREATE', 'RESPONSE_UPDATE', 'RESPONSE_SUBMIT_REVIEW',
            'RESPONSE_REVIEWER_COMMENT', 'RESPONSE_APPROVE', 'RESPONSE_REJECT',
            'RESPONSE_GENERATE_PDF', 'RESPONSE_GENERATE_PACKET', 'RESPONSE_FILED',
            'TEMPLATE_CREATE', 'TEMPLATE_UPDATE',
            'USER_CREATED', 'USER_UPDATED', 'USER_DELETED',
            'SETTINGS_UPDATE',
        ],
        index: true,
    },
    entityType: {
        type: String,
        enum: ['User', 'Tenant', 'Client', 'Notice', 'Document', 'Response', 'Template', 'Settings'],
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    ipAddress: { type: String },
    userAgent: { type: String },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
}, {
    timestamps: false, // We only want createdAt, not updatedAt (immutable)
    // Prevent updates and deletes at the schema level
});

// Make immutable — disable save on existing docs
auditLogSchema.pre('findOneAndUpdate', function () {
    throw new Error('AuditLogs are immutable and cannot be updated');
});

auditLogSchema.pre('findOneAndDelete', function () {
    throw new Error('AuditLogs are immutable and cannot be deleted');
});

auditLogSchema.index({ tenantId: 1, createdAt: -1 });
auditLogSchema.index({ tenantId: 1, action: 1 });
auditLogSchema.index({ tenantId: 1, entityType: 1, entityId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
