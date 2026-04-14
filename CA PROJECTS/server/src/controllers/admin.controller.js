const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const auditService = require('../services/audit.service');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { NotFoundError, BadRequestError } = require('../utils/errors');

const adminController = {
    // GET /api/admin/users
    async listUsers(req, res, next) {
        try {
            const { page, limit, skip, sort } = parsePagination(req.query);
            const filter = req.tenantFilter();

            if (req.query.search) {
                const q = req.query.search;
                filter.$or = [
                    { firstName: { $regex: q, $options: 'i' } },
                    { lastName: { $regex: q, $options: 'i' } },
                    { email: { $regex: q, $options: 'i' } },
                ];
            }
            if (req.query.role) filter.roles = req.query.role;
            if (req.query.status) filter.status = req.query.status;

            const [users, total] = await Promise.all([
                User.find(filter).sort(sort || { createdAt: -1 }).skip(skip).limit(limit).lean(),
                User.countDocuments(filter),
            ]);

            res.json({ success: true, ...paginatedResponse(users, total, { page, limit }) });
        } catch (err) { next(err); }
    },

    // GET /api/admin/users/:id
    async getUser(req, res, next) {
        try {
            const user = await User.findOne(req.tenantFilter({ _id: req.params.id })).lean();
            if (!user) throw new NotFoundError('User not found');
            res.json({ success: true, data: user });
        } catch (err) { next(err); }
    },

    // POST /api/admin/users
    async createUser(req, res, next) {
        try {
            const { email, firstName, lastName, password, roles, phone, designation } = req.body;

            // Check if email already exists in tenant
            const existing = await User.findOne(req.tenantFilter({ email }));
            if (existing) throw new BadRequestError('Email already registered in this organization');

            const user = await User.create(req.withTenant({
                email,
                firstName,
                lastName,
                passwordHash: password, // Will be hashed by pre-save hook
                roles,
                phone: phone || '',
                designation: designation || '',
                status: 'active',
            }));

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'USER_CREATE',
                entityType: 'User',
                entityId: user._id,
                metadata: { email, roles },
                req,
            });

            const userObj = user.toJSON();
            res.status(201).json({ success: true, data: userObj, message: 'User created successfully' });
        } catch (err) { next(err); }
    },

    // PUT /api/admin/users/:id
    async updateUser(req, res, next) {
        try {
            const user = await User.findOne(req.tenantFilter({ _id: req.params.id }));
            if (!user) throw new NotFoundError('User not found');

            // Prevent demoting yourself
            if (user._id.toString() === req.user.userId && req.body.roles) {
                const hadAdmin = user.roles.includes('TenantAdmin');
                const hasAdmin = req.body.roles.includes('TenantAdmin');
                if (hadAdmin && !hasAdmin) {
                    throw new BadRequestError('Cannot remove your own admin privileges');
                }
            }

            const allowed = ['firstName', 'lastName', 'roles', 'phone', 'designation', 'status', 'notifications'];
            for (const key of allowed) {
                if (req.body[key] !== undefined) user[key] = req.body[key];
            }

            await user.save();

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'USER_UPDATE',
                entityType: 'User',
                entityId: user._id,
                metadata: { changes: Object.keys(req.body) },
                req,
            });

            res.json({ success: true, data: user.toJSON(), message: 'User updated' });
        } catch (err) { next(err); }
    },

    // POST /api/admin/users/:id/reset-password
    async resetPassword(req, res, next) {
        try {
            const user = await User.findOne(req.tenantFilter({ _id: req.params.id }));
            if (!user) throw new NotFoundError('User not found');

            user.passwordHash = req.body.newPassword; // Hashed by pre-save hook
            user.refreshTokens = []; // Invalidate all sessions
            await user.save();

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'USER_PASSWORD_RESET',
                entityType: 'User',
                entityId: user._id,
                req,
            });

            res.json({ success: true, message: 'Password reset successfully' });
        } catch (err) { next(err); }
    },

    // DELETE /api/admin/users/:id (soft disable)
    async disableUser(req, res, next) {
        try {
            const user = await User.findOne(req.tenantFilter({ _id: req.params.id }));
            if (!user) throw new NotFoundError('User not found');

            if (user._id.toString() === req.user.userId) {
                throw new BadRequestError('Cannot disable your own account');
            }

            user.status = 'disabled';
            user.refreshTokens = [];
            await user.save();

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'USER_DISABLE',
                entityType: 'User',
                entityId: user._id,
                req,
            });

            res.json({ success: true, message: 'User disabled' });
        } catch (err) { next(err); }
    },

    // GET /api/admin/stats — admin dashboard stats
    async stats(req, res, next) {
        try {
            const filter = req.tenantFilter();
            const [totalUsers, activeUsers, roles] = await Promise.all([
                User.countDocuments(filter),
                User.countDocuments({ ...filter, status: 'active' }),
                User.aggregate([
                    { $match: { tenantId: req.tenantFilter().tenantId } },
                    { $unwind: '$roles' },
                    { $group: { _id: '$roles', count: { $sum: 1 } } },
                ]),
            ]);

            const roleMap = {};
            for (const r of roles) roleMap[r._id] = r.count;

            res.json({
                success: true,
                data: {
                    totalUsers,
                    activeUsers,
                    disabledUsers: totalUsers - activeUsers,
                    roleBreakdown: roleMap,
                },
            });
        } catch (err) { next(err); }
    },

    // GET /api/admin/audit-logs
    async listAuditLogs(req, res, next) {
        try {
            const { page, limit, skip, sort } = parsePagination(req.query);
            const filter = req.tenantFilter();

            // Filters
            if (req.query.actorEmail) filter.actorEmail = { $regex: req.query.actorEmail, $options: 'i' };
            if (req.query.action) filter.action = req.query.action;
            if (req.query.entityType) filter.entityType = req.query.entityType;
            if (req.query.entityId) filter.entityId = req.query.entityId;
            
            if (req.query.startDate || req.query.endDate) {
                filter.createdAt = {};
                if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate);
                if (req.query.endDate) filter.createdAt.$lte = new Date(req.query.endDate);
            }

            const [logs, total] = await Promise.all([
                AuditLog.find(filter)
                    .sort(sort || { createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                AuditLog.countDocuments(filter),
            ]);

            res.json({ success: true, ...paginatedResponse(logs, total, { page, limit }) });
        } catch (err) { next(err); }
    },
    // GET /api/admin/settings
    async getSettings(req, res, next) {
        try {
            const Tenant = require('../models/Tenant');
            const tenant = await Tenant.findById(req.tenantId).lean();
            if (!tenant) throw new NotFoundError('Tenant not found');
            res.json({ success: true, data: tenant.settings || {} });
        } catch (err) { next(err); }
    },

    // PUT /api/admin/settings
    async updateSettings(req, res, next) {
        try {
            const Tenant = require('../models/Tenant');
            const tenant = await Tenant.findById(req.tenantId);
            if (!tenant) throw new NotFoundError('Tenant not found');

            const { branding, security, defaultCurrency, timezone, notificationDefaults } = req.body;
            if (!tenant.settings) tenant.settings = {};
            
            if (branding !== undefined) tenant.settings.branding = { ...tenant.settings.branding, ...branding };
            if (security !== undefined) tenant.settings.security = { ...tenant.settings.security, ...security };
            if (defaultCurrency !== undefined) tenant.settings.defaultCurrency = defaultCurrency;
            if (timezone !== undefined) tenant.settings.timezone = timezone;
            if (notificationDefaults !== undefined) tenant.settings.notificationDefaults = { ...tenant.settings.notificationDefaults, ...notificationDefaults };

            await tenant.save();

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'TENANT_SETTINGS_UPDATE',
                entityType: 'Tenant',
                entityId: tenant._id,
                metadata: { changes: Object.keys(req.body) },
                req,
            });

            res.json({ success: true, data: tenant.settings, message: 'Settings updated successfully' });
        } catch (err) { next(err); }
    },
};

module.exports = adminController;
