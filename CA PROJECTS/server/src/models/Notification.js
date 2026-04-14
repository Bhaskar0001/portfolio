const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: [
            'OVERDUE', 'DEADLINE_CRITICAL', 'DEADLINE_WARNING',
            'ASSIGNMENT', 'STATUS_CHANGE', 'REVIEW_REQUEST',
            'APPROVAL', 'REJECTION', 'SYSTEM',
        ],
        required: true,
    },
    title: { type: String, required: true, maxlength: 300 },
    message: { type: String, maxlength: 2000 },
    link: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false },
    readAt: { type: Date },
}, {
    timestamps: true,
});

notificationSchema.index({ tenantId: 1, userId: 1, read: 1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // TTL 90 days

module.exports = mongoose.model('Notification', notificationSchema);
