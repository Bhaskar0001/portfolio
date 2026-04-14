const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');
const { BadRequestError, UnauthorizedError } = require('../utils/errors');
const auditService = require('../services/audit.service');

const mfaController = {
    /**
     * Step 1: Generate MFA secret and QR Code
     */
    async setup(req, res, next) {
        try {
            const user = await User.findById(req.user.userId);
            if (user.mfaEnabled) {
                throw new BadRequestError('MFA is already enabled');
            }

            const secret = speakeasy.generateSecret({
                name: `NoticeRadar:${user.email}`,
            });

            // Temporarily store secret (not enabled yet)
            user.mfaSecret = secret.base32;
            await user.save();

            const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

            res.json({
                success: true,
                data: {
                    qrCode: qrCodeUrl,
                    secret: secret.base32,
                },
            });
        } catch (err) { next(err); }
    },

    /**
     * Step 2: Verify and Enable MFA
     */
    async verifyAndEnable(req, res, next) {
        try {
            const { token } = req.body;
            if (!token) throw new BadRequestError('Verification token is required');

            const user = await User.findById(req.user.userId).select('+mfaSecret');
            
            const verified = speakeasy.totp.verify({
                secret: user.mfaSecret,
                encoding: 'base32',
                token,
            });

            if (!verified) {
                throw new UnauthorizedError('Invalid verification code');
            }

            user.mfaEnabled = true;
            await user.save();

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'MFA_ENABLED',
                entityType: 'User',
                entityId: user._id,
                req,
            });

            res.json({ success: true, message: 'MFA enabled successfully' });
        } catch (err) { next(err); }
    },

    /**
     * Disable MFA
     */
    async disable(req, res, next) {
        try {
            const { token } = req.body;
            const user = await User.findById(req.user.userId).select('+mfaSecret');

            if (user.mfaEnabled) {
                if (!token) throw new BadRequestError('Verification token required to disable MFA');
                const verified = speakeasy.totp.verify({
                    secret: user.mfaSecret,
                    encoding: 'base32',
                    token,
                });
                if (!verified) throw new UnauthorizedError('Invalid verification code');
            }

            user.mfaEnabled = false;
            user.mfaSecret = undefined;
            await user.save();

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'MFA_DISABLED',
                entityType: 'User',
                entityId: user._id,
                req,
            });

            res.json({ success: true, message: 'MFA disabled' });
        } catch (err) { next(err); }
    }
};

module.exports = mfaController;
