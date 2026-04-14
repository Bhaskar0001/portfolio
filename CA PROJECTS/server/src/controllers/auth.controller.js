const authService = require('../services/auth.service');
const User = require('../models/User');

const authController = {
    async register(req, res, next) {
        try {
            const result = await authService.register(req.body, req);
            res.status(201).json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    },

    async login(req, res, next) {
        try {
            const result = await authService.login(req.body, req);

            if (result.mfaRequired) {
                return res.json({
                    success: true,
                    data: { mfaRequired: true, userId: result.userId },
                });
            }

            // Set refresh token as HTTP-only cookie
            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000,
                path: '/api/auth',
            });

            res.json({
                success: true,
                data: {
                    user: result.user,
                    accessToken: result.accessToken,
                    refreshToken: result.refreshToken,
                },
            });
        } catch (err) { next(err); }
    },

    async verifyMfa(req, res, next) {
        try {
            const result = await authService.verifyMfa(req.body, req);

            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000,
                path: '/api/auth',
            });

            res.json({
                success: true,
                data: {
                    user: result.user,
                    accessToken: result.accessToken,
                    refreshToken: result.refreshToken,
                },
            });
        } catch (err) { next(err); }
    },

    async refresh(req, res, next) {
        try {
            const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
            const tokens = await authService.refresh(refreshToken, req);

            res.cookie('refreshToken', tokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000,
                path: '/api/auth',
            });

            res.json({
                success: true,
                data: tokens,
            });
        } catch (err) {
            next(err);
        }
    },

    async logout(req, res, next) {
        try {
            const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
            await authService.logout(refreshToken, req.user.userId, req);

            res.clearCookie('refreshToken', { path: '/api/auth' });
            res.json({ success: true, message: 'Logged out successfully' });
        } catch (err) {
            next(err);
        }
    },

    async me(req, res, next) {
        try {
            const user = await authService.getMe(req.user.userId);
            res.json({ success: true, data: user });
        } catch (err) {
            next(err);
        }
    },

    async getTeam(req, res, next) {
        try {
            const users = await User.find({ tenantId: req.tenantId })
                .select('firstName lastName email roles')
                .lean();
            res.json({ success: true, data: users });
        } catch (err) {
            next(err);
        }
    },
};

module.exports = authController;
