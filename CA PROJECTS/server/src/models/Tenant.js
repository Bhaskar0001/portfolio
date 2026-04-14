const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    domain: {
        type: String,
        trim: true,
    },
    plan: {
        type: String,
        enum: ['free', 'starter', 'professional', 'enterprise'],
        default: 'professional',
    },
    status: {
        type: String,
        enum: ['active', 'suspended', 'trial'],
        default: 'active',
    },
    settings: {
        defaultCurrency: { type: String, default: 'INR' },
        timezone: { type: String, default: 'Asia/Kolkata' },
        fiscalYearStart: { type: String, default: 'April' },
        notificationDefaults: {
            reminderDays: { type: [Number], default: [7, 3, 1, 0] },
            escalationHours: { type: Number, default: 24 },
        },
        branding: {
            firmName: String,
            logoUrl: String,
            primaryColor: { type: String, default: '#2563EB' },
        },
        security: {
            ipWhitelist: { type: [String], default: [] },
            requireMfa: { type: Boolean, default: false },
        },
    },
    maxUsers: { type: Number, default: 50 },
    maxStorage: { type: Number, default: 10737418240 }, // 10GB in bytes
}, {
    timestamps: true,
});

tenantSchema.index({ status: 1 });

module.exports = mongoose.model('Tenant', tenantSchema);
