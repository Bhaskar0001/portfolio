const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    name: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    designation: { type: String, trim: true },
}, { _id: true });

const gstinSchema = new mongoose.Schema({
    gstin: { type: String, required: true, trim: true, uppercase: true },
    state: { type: String, trim: true },
    status: { type: String, enum: ['active', 'cancelled', 'suspended'], default: 'active' },
}, { _id: true });

const clientSchema = new mongoose.Schema({
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
        maxlength: 300,
    },
    entityType: {
        type: String,
        enum: ['Individual', 'HUF', 'Firm', 'LLP', 'Company', 'Trust', 'AOP/BOI', 'Other'],
        default: 'Individual',
    },
    pan: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: 10,
    },
    tan: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: 10,
    },
    gstins: [gstinSchema],
    contacts: [contactSchema],
    address: {
        line1: String,
        line2: String,
        city: String,
        state: String,
        pincode: String,
        country: { type: String, default: 'India' },
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
    },
    itPortal: {
        username: { type: String, trim: true },
        password: { type: String }, // Stored encrypted
        lastSync: { type: Date },
        status: { 
            type: String, 
            enum: ['Connected', 'Invalid Credentials', 'Pending', 'Disconnected'], 
            default: 'Disconnected' 
        }
    },
    kycStatus: {
        type: String,
        enum: ['Pending', 'Verified', 'Rejected'],
        default: 'Pending',
    },
    tags: [String],
    notes: String,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
}, {
    timestamps: true,
});

clientSchema.index({ tenantId: 1, pan: 1 });
clientSchema.index({ tenantId: 1, name: 'text' });
clientSchema.index({ tenantId: 1, status: 1 });

const auditPlugin = require('../middleware/audit.middleware');

clientSchema.plugin(auditPlugin, { entityType: 'Client' });

module.exports = mongoose.model('Client', clientSchema);
