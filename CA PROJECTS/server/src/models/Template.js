const mongoose = require('mongoose');

const checklistItemSchema = new mongoose.Schema({
    label: { type: String, required: true },
    description: { type: String },
    required: { type: Boolean, default: false },
}, { _id: true });

const templateSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
    },
    department: {
        type: String,
        enum: ['IncomeTax', 'GST', 'TDS', 'CustomsDuty', 'Other', 'General'],
        default: 'General'
    },
    noticeType: { type: String, trim: true },
    section: { type: String, trim: true },
    subject: { type: String, trim: true, maxlength: 500 },
    bodyHtml: { type: String, default: '' },
    placeholders: [{ type: String }], // e.g. ["clientName", "noticeDate"]
    checklistItems: [checklistItemSchema],
    isDefault: { type: Boolean, default: false },
    status: {
        type: String,
        enum: ['active', 'archived'],
        default: 'active',
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
}, {
    timestamps: true,
});

templateSchema.index({ tenantId: 1, department: 1 });
templateSchema.index({ tenantId: 1, isDefault: 1 });
templateSchema.index({ name: 'text', subject: 'text' });

module.exports = mongoose.model('Template', templateSchema);
