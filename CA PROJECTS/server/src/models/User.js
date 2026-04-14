const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const refreshTokenSchema = new mongoose.Schema({
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    device: { type: String, default: 'unknown' },
    ip: { type: String },
    createdAt: { type: Date, default: Date.now },
}, { _id: true });

const userSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true,
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        maxlength: 255,
    },
    passwordHash: {
        type: String,
        select: false, // Don't include in queries by default
    },
    firstName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
    },
    roles: [{
        type: String,
        enum: ['Client', 'Staff', 'Reviewer', 'Partner', 'TenantAdmin', 'SuperAdmin'],
        default: 'Staff',
    }],
    status: {
        type: String,
        enum: ['active', 'invited', 'disabled'],
        default: 'active',
    },
    phone: { type: String, trim: true },
    avatar: { type: String },
    designation: { type: String, trim: true },

    // SSO
    ssoProvider: { type: String }, // 'keycloak'
    ssoId: { type: String }, // External ID from Keycloak

    // Auth
    refreshTokens: [refreshTokenSchema],
    lastLoginAt: { type: Date },
    loginCount: { type: Number, default: 0 },
    mfaSecret: { type: String, select: false },
    mfaEnabled: { type: Boolean, default: false },

    // Notification preferences
    notifications: {
        email: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        whatsapp: { type: Boolean, default: true },
    },
}, {
    timestamps: true,
});

// Compound unique: one email per tenant
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });
userSchema.index({ tenantId: 1, status: 1 });
userSchema.index({ tenantId: 1, roles: 1 });

// Hash password before save
userSchema.pre('save', async function (next) {
    if (!this.isModified('passwordHash') || !this.passwordHash) return next();
    try {
        this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
        next();
    } catch (err) {
        next(err);
    }
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.passwordHash) return false;
    return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Virtual for full name
userSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

// Ensure virtuals are included in JSON
userSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.refreshTokens;
        delete ret.__v;
        return ret;
    },
});

const auditPlugin = require('../middleware/audit.middleware');

userSchema.plugin(auditPlugin, { entityType: 'User' });

module.exports = mongoose.model('User', userSchema);
