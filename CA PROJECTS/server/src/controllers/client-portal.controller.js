const ClientUser = require('../models/ClientUser');
const Notice = require('../models/Notice');
const Response = require('../models/Response');
const Document = require('../models/Document');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const emailService = require('../services/email.service');
const { BadRequestError, UnauthorizedError, NotFoundError } = require('../utils/errors');

module.exports = {
    // POST /api/client-portal/request-otp
    async requestOtp(req, res, next) {
        try {
            const { email } = req.body;
            if (!email) throw new BadRequestError('Email is required');

            const user = await ClientUser.findOne({ email, status: 'active' });
            if (!user) {
                // For security, don't reveal if user exists. 
                // But for this portal, usually we want to be helpful or just return success.
                return res.json({ success: true, message: 'If you have an account, an OTP has been sent.' });
            }

            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            user.otp = {
                code: otp,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 mins
            };
            await user.save();

            // Send OTP via Email
            await emailService.send({
                to: user.email,
                subject: `${otp} is your NoticeRadar Login OTP`,
                html: `
                    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
                        <h2 style="color: #2563eb;">NoticeRadar Client Portal</h2>
                        <p>Hello ${user.name},</p>
                        <p>Your one-time password (OTP) for logging into the client portal is:</p>
                        <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; color: #1e3a8a;">
                            ${otp}
                        </div>
                        <p>This code will expire in 10 minutes.</p>
                        <p>If you didn't request this, please ignore this email.</p>
                    </div>
                `
            });

            res.json({ success: true, message: 'OTP sent successfully' });
        } catch (err) {
            next(err);
        }
    },

    // POST /api/client-portal/verify-otp
    async verifyOtp(req, res, next) {
        try {
            const { email, otp } = req.body;
            if (!email || !otp) throw new BadRequestError('Email and OTP required');

            const user = await ClientUser.findOne({ email, status: 'active' });
            if (!user || !user.otp || user.otp.code !== otp || user.otp.expiresAt < new Date()) {
                throw new UnauthorizedError('Invalid or expired OTP');
            }

            // Clear OTP after success
            user.otp = undefined;
            user.lastLoginAt = new Date();
            user.loginCount = (user.loginCount || 0) + 1;
            await user.save();

            const tokens = await _issueClientTokens(user, req);

            res.json({
                success: true,
                data: {
                    ...tokens,
                    user: { id: user._id, name: user.name, email: user.email, clientId: user.clientId }
                }
            });
        } catch (err) {
            next(err);
        }
    },

    // POST /api/client-portal/login (Password fallback)
    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            if (!email || !password) throw new BadRequestError('Email and password required');

            const user = await ClientUser.findOne({ email, status: 'active' }).select('+password');
            if (!user) throw new UnauthorizedError('Invalid credentials');

            const isMatch = await user.comparePassword(password);
            if (!isMatch) throw new UnauthorizedError('Invalid credentials');

            user.lastLoginAt = new Date();
            user.loginCount = (user.loginCount || 0) + 1;
            await user.save();

            const tokens = await _issueClientTokens(user, req);

            res.json({
                success: true,
                data: {
                    ...tokens,
                    user: { id: user._id, name: user.name, email: user.email, clientId: user.clientId }
                }
            });
        } catch (err) {
            next(err);
        }
    },

    // GET /api/client-portal/me
    async getMe(req, res, next) {
        try {
            const user = await ClientUser.findById(req.clientUser.userId).populate('clientId', 'name pan entityType');
            res.json({ success: true, data: user });
        } catch (err) {
            next(err);
        }
    },

    // GET /api/client-portal/notices
    async getNotices(req, res, next) {
        try {
            // Only fetch notices belonging to this client
            const notices = await Notice.find({
                tenantId: req.clientUser.tenantId,
                clientId: req.clientUser.clientId
            })
            .select('-aiInsights') // Hide internal AI insights from client
            .sort({ createdAt: -1 });

            res.json({ success: true, data: notices });
        } catch (err) {
            next(err);
        }
    },

    // GET /api/client-portal/notices/:id
    async getNoticeById(req, res, next) {
        try {
            const notice = await Notice.findOne({
                _id: req.params.id,
                tenantId: req.clientUser.tenantId,
                clientId: req.clientUser.clientId
            })
            .populate('documents')
            .select('-aiInsights');

            if (!notice) throw new NotFoundError('Notice not found');

            // Find associated approved/filed responses
            const responses = await Response.find({ 
                noticeId: notice._id,
                status: { $in: ['Approved', 'Filed'] } 
            }).select('subject status version fileUrl filedAt createdAt');

            res.json({ 
                success: true, 
                data: {
                    ...notice.toObject(),
                    publicResponses: responses
                } 
            });
        } catch (err) {
            next(err);
        }
    },

    // POST /api/client-portal/notices/:id/documents
    async uploadDocument(req, res, next) {
        try {
            if (!req.file) throw new BadRequestError('No file uploaded');

            const notice = await Notice.findOne({
                _id: req.params.id,
                tenantId: req.clientUser.tenantId,
                clientId: req.clientUser.clientId
            });

            if (!notice) throw new NotFoundError('Notice not found');

            const doc = await Document.create({
                tenantId: req.clientUser.tenantId,
                clientId: req.clientUser.clientId,
                noticeId: notice._id,
                category: 'SupportingDoc',
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                sizeBytes: req.file.size,
                storageKey: req.file.filename,
                uploadedBy: req.clientUser.userId,
                uploaderModel: 'ClientUser'
            });

            // Update notice with document reference
            if (!notice.documents) notice.documents = [];
            notice.documents.push(doc._id);
            await notice.save();

            res.json({ success: true, data: doc });
        } catch (err) {
            next(err);
        }
    },

    // GET /api/client-portal/notices/:id/response/pdf
    async downloadResponsePdf(req, res, next) {
        try {
            const fs = require('fs');
            const path = require('path');

            const notice = await Notice.findOne({
                _id: req.params.id,
                tenantId: req.clientUser.tenantId,
                clientId: req.clientUser.clientId
            });

            if (!notice) throw new NotFoundError('Notice not found');

            // Find the latest approved/filed response
            const response = await Response.findOne({
                noticeId: notice._id,
                status: { $in: ['Approved', 'Filed'] }
            }).sort({ version: -1 }).populate('generatedPdfDocId');

            if (!response || !response.generatedPdfDocId) {
                throw new NotFoundError('Approved response PDF not found');
            }

            const doc = response.generatedPdfDocId;
            const filePath = path.join(__dirname, '../../uploads', doc.storageKey);

            if (!fs.existsSync(filePath)) {
                throw new NotFoundError('File not found on server');
            }

            // IP Sensitivity Check (Optional but recommended for high security)
            const currentIp = req.ip;
            // Record download in audit log with IP
            // (Audit logging will be added in Step 5, but we can do a basic check here if needed)

            res.download(filePath, doc.originalName);
        } catch (err) {
            next(err);
        }
    },

    // ── Helper & Session Methods ────────────────────────────

    // POST /api/client-portal/refresh
    async refresh(req, res, next) {
        try {
            const refreshToken = req.body.refreshToken;
            if (!refreshToken) throw new BadRequestError('Refresh token required');

            let decoded;
            try {
                decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
            } catch (err) {
                throw new UnauthorizedError('Invalid refresh token');
            }

            const user = await ClientUser.findById(decoded.userId).select('+refreshTokens');
            if (!user || user.status !== 'active') throw new UnauthorizedError('User not found or inactive');

            // Find and validate stored token
            let foundToken = null;
            for (const rt of user.refreshTokens) {
                const isMatch = await bcrypt.compare(refreshToken, rt.tokenHash);
                if (isMatch) {
                    foundToken = rt;
                    break;
                }
            }

            if (!foundToken || foundToken.expiresAt < new Date()) {
                if (foundToken) {
                    user.refreshTokens = user.refreshTokens.filter(rt => rt._id.toString() !== foundToken._id.toString());
                    await user.save();
                }
                throw new UnauthorizedError('Refresh token invalid or expired');
            }

            // Rotate tokens
            user.refreshTokens = user.refreshTokens.filter(rt => rt._id.toString() !== foundToken._id.toString());
            await user.save();

            const tokens = await _issueClientTokens(user, req);
            res.json({ success: true, data: tokens });
        } catch (err) {
            next(err);
        }
    },

    // POST /api/client-portal/logout
    async logout(req, res, next) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) return res.json({ success: true });

            const user = await ClientUser.findById(req.clientUser.userId).select('+refreshTokens');
            if (user) {
                const newTokens = [];
                for (const rt of user.refreshTokens) {
                    const isMatch = await bcrypt.compare(refreshToken, rt.tokenHash);
                    if (!isMatch) newTokens.push(rt);
                }
                user.refreshTokens = newTokens;
                await user.save();
            }

            res.json({ success: true, message: 'Logged out successfully' });
        } catch (err) {
            next(err);
        }
    }
};

/**
 * Issue access and refresh tokens for Client Users
 * Limits to 5 active sessions
 */
async function _issueClientTokens(user, req) {
    const accessToken = jwt.sign(
        { 
            userId: user._id, 
            email: user.email, 
            clientId: user.clientId, 
            tenantId: user.tenantId,
            type: 'client' 
        },
        env.JWT_ACCESS_SECRET,
        { expiresIn: env.JWT_ACCESS_EXPIRATION_MINUTES + 'm' }
    );

    const refreshToken = jwt.sign(
        { userId: user._id, type: 'client_refresh' },
        env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );

    // Hash and store
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const userWithTokens = await ClientUser.findById(user._id).select('+refreshTokens');

    // Limit to 5 sessions
    if (userWithTokens.refreshTokens.length >= 5) {
        userWithTokens.refreshTokens.shift();
    }

    userWithTokens.refreshTokens.push({
        tokenHash: refreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        device: req ? req.get('user-agent') : 'unknown',
        ip: req ? req.ip : 'unknown',
    });
    await userWithTokens.save();

    return { accessToken, refreshToken };
}
