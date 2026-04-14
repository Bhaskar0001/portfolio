const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
    society: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Society',
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: [true, 'Notice title is required'],
        trim: true,
        maxlength: 200
    },
    content: {
        type: String,
        required: [true, 'Notice content is required'],
        maxlength: 5000
    },
    category: {
        type: String,
        enum: ['GENERAL', 'MAINTENANCE', 'EVENT', 'SECURITY', 'URGENT'],
        default: 'GENERAL'
    },
    priority: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH'],
        default: 'LOW'
    },
    expiresAt: {
        type: Date,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    attachments: [{
        url: { type: String },
        name: { type: String }
    }]
}, {
    timestamps: true
});

noticeSchema.index({ society: 1, isActive: 1, createdAt: -1 });
noticeSchema.index({ society: 1, createdAt: -1 });

const Notice = mongoose.model('Notice', noticeSchema);

module.exports = Notice;
