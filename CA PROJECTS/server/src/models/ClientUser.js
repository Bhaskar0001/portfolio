const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const refreshTokenSchema = new mongoose.Schema({
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    device: { type: String, default: 'unknown' },
    ip: { type: String },
    createdAt: { type: Date, default: Date.now },
}, { _id: true });

const clientUserSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true,
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        index: true,
    },
    phone: {
        type: String,
        trim: true,
    },
    password: {
        type: String,
        select: false,
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'invited', 'locked'],
        default: 'active',
    },
    lastLoginAt: Date,
    loginCount: { type: Number, default: 0 },
    refreshTokens: [refreshTokenSchema],
    otp: {
        code: String,
        expiresAt: Date,
    },
    notifications: {
        email: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: true },
    }
}, {
    timestamps: true,
});

// Compound index for uniqueness within a tenant
clientUserSchema.index({ tenantId: 1, email: 1 }, { unique: true });
clientUserSchema.index({ clientId: 1, status: 1 });

clientUserSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) return next();
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

clientUserSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
};

clientUserSchema.set('toJSON', {
    transform: (doc, ret) => {
        delete ret.password;
        delete ret.otp;
        delete ret.__v;
        return ret;
    },
});

const auditPlugin = require('../middleware/audit.middleware');
clientUserSchema.plugin(auditPlugin, { entityType: 'ClientUser' });

module.exports = mongoose.model('ClientUser', clientUserSchema);
