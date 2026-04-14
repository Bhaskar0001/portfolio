const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const env = require('../config/env');
const { UnauthorizedError, BadRequestError, NotFoundError, ConflictError } = require('../utils/errors');
const auditService = require('./audit.service');

const authService = {
    /**
     * Register a new tenant with an admin user
     */
    async register({ tenantName, tenantSlug, email, password, firstName, lastName }, req) {
        // Check if tenant slug already exists
        const existingTenant = await Tenant.findOne({ slug: tenantSlug });
        if (existingTenant) throw new ConflictError('Tenant slug already in use');

        // Check if email exists in any tenant
        const existingUser = await User.findOne({ email });
        if (existingUser) throw new ConflictError('Email already registered');

        // Create tenant
        const tenant = await Tenant.create({
            name: tenantName,
            slug: tenantSlug,
            status: 'active',
        });

        // Create admin user
        const user = await User.create({
            tenantId: tenant._id,
            email,
            passwordHash: password, // Will be hashed by pre-save hook
            firstName,
            lastName,
            roles: ['TenantAdmin'],
            status: 'active',
        });

        // Issue tokens
        const tokens = await this._issueTokens(user, req);

        await auditService.log({
            tenantId: tenant._id,
            actorId: user._id,
            actorEmail: email,
            action: 'AUTH_REGISTER',
            entityType: 'Tenant',
            entityId: tenant._id,
            metadata: { tenantName },
            req,
        });

        return {
            user: user.toJSON(),
            tenant: tenant.toJSON(),
            ...tokens,
        };
    },

    /**
     * Login with email and password
     */
    async login({ email, password }, req) {
        const user = await User.findOne({ email }).select('+passwordHash');
        if (!user) throw new UnauthorizedError('Invalid credentials');
        if (user.status !== 'active') throw new UnauthorizedError('Account is disabled');

        const isMatch = await user.comparePassword(password);
        if (!isMatch) throw new UnauthorizedError('Invalid credentials');

        // Update login stats
        user.lastLoginAt = new Date();
        user.loginCount = (user.loginCount || 0) + 1;
        await user.save();

        if (user.mfaEnabled) {
            return {
                mfaRequired: true,
                userId: user._id,
            };
        }

        const tokens = await this._issueTokens(user, req);

        await auditService.log({
            tenantId: user.tenantId,
            actorId: user._id,
            actorEmail: email,
            action: 'AUTH_LOGIN',
            entityType: 'User',
            entityId: user._id,
            req,
        });

        return {
            user: user.toJSON(),
            ...tokens,
        };
    },

    /**
     * Verify MFA and complete login
     */
    async verifyMfa({ userId, token }, req) {
        const speakeasy = require('speakeasy');
        const user = await User.findById(userId).select('+mfaSecret');
        if (!user || !user.mfaEnabled) throw new UnauthorizedError('MFA not enabled or user not found');

        const verified = speakeasy.totp.verify({
            secret: user.mfaSecret,
            encoding: 'base32',
            token,
        });

        if (!verified) throw new UnauthorizedError('Invalid verification code');

        const tokens = await this._issueTokens(user, req);

        await auditService.log({
            tenantId: user.tenantId,
            actorId: user._id,
            actorEmail: user.email,
            action: 'AUTH_LOGIN_MFA_SUCCESS',
            entityType: 'User',
            entityId: user._id,
            req,
        });

        return {
            user: user.toJSON(),
            ...tokens,
        };
    },

    /**
     * Refresh access token using refresh token
     */
    async refresh(refreshToken, req) {
        if (!refreshToken) throw new UnauthorizedError('Refresh token required');

        // Verify refresh token
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
        } catch (err) {
            throw new UnauthorizedError('Invalid refresh token');
        }

        const user = await User.findById(decoded.userId).select('+refreshTokens');
        if (!user) throw new UnauthorizedError('User not found');
        if (user.status !== 'active') throw new UnauthorizedError('Account disabled');

        // Find and validate the stored refresh token
        let foundToken = null;
        for (const rt of user.refreshTokens) {
            const isMatch = await bcrypt.compare(refreshToken, rt.tokenHash);
            if (isMatch) {
                foundToken = rt;
                break;
            }
        }

        if (!foundToken) throw new UnauthorizedError('Refresh token not recognized');
        if (foundToken.expiresAt < new Date()) {
            // Remove expired token
            user.refreshTokens = user.refreshTokens.filter(
                rt => rt._id.toString() !== foundToken._id.toString()
            );
            await user.save();
            throw new UnauthorizedError('Refresh token expired');
        }

        // Rotate: remove old, issue new
        user.refreshTokens = user.refreshTokens.filter(
            rt => rt._id.toString() !== foundToken._id.toString()
        );
        await user.save();

        const tokens = await this._issueTokens(user, req);

        await auditService.log({
            tenantId: user.tenantId,
            actorId: user._id,
            actorEmail: user.email,
            action: 'AUTH_REFRESH',
            entityType: 'User',
            entityId: user._id,
            req,
        });

        return tokens;
    },

    /**
     * Logout — invalidate refresh token
     */
    async logout(refreshToken, userId, req) {
        if (!refreshToken) return;

        const user = await User.findById(userId).select('+refreshTokens');
        if (!user) return;

        // Remove the specific refresh token
        const newTokens = [];
        for (const rt of user.refreshTokens) {
            const isMatch = await bcrypt.compare(refreshToken, rt.tokenHash);
            if (!isMatch) newTokens.push(rt);
        }
        user.refreshTokens = newTokens;
        await user.save();

        await auditService.log({
            tenantId: user.tenantId,
            actorId: user._id,
            actorEmail: user.email,
            action: 'AUTH_LOGOUT',
            entityType: 'User',
            entityId: user._id,
            req,
        });
    },

    /**
     * Get current user profile
     */
    async getMe(userId) {
        const user = await User.findById(userId).populate('tenantId', 'name slug');
        if (!user) throw new NotFoundError('User not found');
        return user.toJSON();
    },

    /**
     * Issue access and refresh tokens
     * @private
     */
    async _issueTokens(user, req) {
        const accessToken = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                roles: user.roles,
                tenantId: user.tenantId,
            },
            env.JWT_ACCESS_SECRET,
            { expiresIn: env.ACCESS_TOKEN_TTL }
        );

        const refreshToken = jwt.sign(
            { userId: user._id, tenantId: user.tenantId },
            env.JWT_REFRESH_SECRET,
            { expiresIn: env.REFRESH_TOKEN_TTL }
        );

        // Store hashed refresh token
        const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
        const userWithTokens = await User.findById(user._id).select('+refreshTokens');

        // Limit to 5 active sessions
        if (userWithTokens.refreshTokens.length >= 5) {
            userWithTokens.refreshTokens.shift(); // Remove oldest
        }

        userWithTokens.refreshTokens.push({
            tokenHash: refreshTokenHash,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7d
            device: req ? req.get('user-agent') : 'unknown',
            ip: req ? req.ip : 'unknown',
        });
        await userWithTokens.save();

        return { accessToken, refreshToken };
    },
};

module.exports = authService;
