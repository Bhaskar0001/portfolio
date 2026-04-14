const mongoose = require('mongoose');
const crypto = require('crypto');

const documentRequestSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    noticeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Notice', required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Secure token for client access (no login required)
    accessToken: {
        type: String,
        unique: true,
        default: () => crypto.randomBytes(32).toString('hex')
    },

    // What documents are requested
    requestedDocs: [{
        label: { type: String, required: true },           // e.g. "Bank Statement FY 2023-24"
        description: String,                               // Optional instructions
        required: { type: Boolean, default: true },
        uploadedFile: {                                     // Filled by client
            filename: String,
            originalName: String,
            mimeType: String,
            size: Number,
            uploadedAt: Date
        }
    }],

    // Message to the client
    message: String,

    // Status tracking
    status: {
        type: String,
        enum: ['Pending', 'PartiallyUploaded', 'Complete', 'Expired'],
        default: 'Pending'
    },

    // Expiry
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    },

    // Client details for the portal
    clientName: String,
    clientEmail: String,

    completedAt: Date,
}, {
    timestamps: true
});

// Auto-compute status from uploads
documentRequestSchema.methods.recalcStatus = function () {
    const total = this.requestedDocs.length;
    const uploaded = this.requestedDocs.filter(d => d.uploadedFile?.filename).length;
    const requiredUploaded = this.requestedDocs.filter(d => d.required && d.uploadedFile?.filename).length;
    const totalRequired = this.requestedDocs.filter(d => d.required).length;

    if (uploaded === total) {
        this.status = 'Complete';
        this.completedAt = new Date();
    } else if (uploaded > 0) {
        this.status = 'PartiallyUploaded';
    }

    return { total, uploaded, requiredUploaded, totalRequired };
};

documentRequestSchema.index({ accessToken: 1 });
documentRequestSchema.index({ tenantId: 1, status: 1 });
documentRequestSchema.index({ clientId: 1 });
documentRequestSchema.index({ noticeId: 1 });

module.exports = mongoose.model('DocumentRequest', documentRequestSchema);
