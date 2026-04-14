const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide your name'],
        trim: true,
        maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Please provide your email'],
        unique: true,
        lowercase: true,
        match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'Please provide a valid email']
    },
    phone: {
        type: String,
        required: [true, 'Please provide your phone number'],
        unique: true,
        match: [/^\d{10}$/, 'Please provide a valid 10-digit phone number']
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false // Don't return password by default
    },
    role: {
        type: String,
        enum: ['ADMIN', 'RESIDENT', 'SECURITY', 'STAFF'],
        default: 'RESIDENT'
    },
    society: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Society'
    },
    roleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role'
    },
    flat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Flat'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    refreshToken: {
        type: String,
        select: false
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
});

// Instance method to check password
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Instance method to generate Access Token
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        { id: this._id, role: this.role },
        config.jwt.secret,
        { expiresIn: config.jwt.expire }
    );
};

// Instance method to generate Refresh Token
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        { id: this._id },
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshExpire }
    );
};

const User = mongoose.model('User', userSchema);

module.exports = User;
