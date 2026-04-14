const Notice = require('../models/Notice');
const Client = require('../models/Client');
const User = require('../models/User');
const auditService = require('../services/audit.service');
const notificationService = require('../services/notification.service');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { NotFoundError } = require('../utils/errors');

const noticeController = {
    // GET /api/notices
    async list(req, res, next) {
        try {
            const { page, limit, skip, sort } = parsePagination(req.query);
            const filter = req.tenantFilter();

            // Apply filters
            if (req.query.status) {
                const statuses = req.query.status.split(',');
                filter.status = { $in: statuses };
            }
            if (req.query.priority) filter.priority = req.query.priority;
            if (req.query.department) filter.department = req.query.department;
            if (req.query.clientId) filter.clientId = req.query.clientId;
            if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
            if (req.query.dueDateFrom || req.query.dueDateTo) {
                filter.dueDate = {};
                if (req.query.dueDateFrom) filter.dueDate.$gte = new Date(req.query.dueDateFrom);
                if (req.query.dueDateTo) filter.dueDate.$lte = new Date(req.query.dueDateTo);
            }
            if (req.query.search) {
                filter.$or = [
                    { din: { $regex: req.query.search, $options: 'i' } },
                    { section: { $regex: req.query.search, $options: 'i' } },
                    { noticeType: { $regex: req.query.search, $options: 'i' } },
                    { cpcRefNo: { $regex: req.query.search, $options: 'i' } },
                ];
            }

            const [notices, total] = await Promise.all([
                Notice.find(filter)
                    .populate('clientId', 'name pan entityType')
                    .populate('assignedTo', 'firstName lastName email')
                    .sort(sort)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Notice.countDocuments(filter),
            ]);

            res.json({ success: true, ...paginatedResponse(notices, total, { page, limit }) });
        } catch (err) { next(err); }
    },

    // GET /api/notices/stats
    async stats(req, res, next) {
        try {
            const filter = req.tenantFilter();
            const [total, byStatus, overdue, dueThisWeek] = await Promise.all([
                Notice.countDocuments(filter),
                Notice.aggregate([
                    { $match: { tenantId: require('mongoose').Types.ObjectId.createFromHexString(req.tenantId.toString()) } },
                    { $group: { _id: '$status', count: { $sum: 1 } } },
                ]),
                Notice.countDocuments({ ...filter, dueDate: { $lt: new Date() }, status: { $nin: ['Filed', 'Closed'] } }),
                Notice.countDocuments({
                    ...filter,
                    dueDate: {
                        $gte: new Date(),
                        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    },
                    status: { $nin: ['Filed', 'Closed'] },
                }),
            ]);

            const statusCounts = {};
            byStatus.forEach(s => { statusCounts[s._id] = s.count; });

            res.json({
                success: true,
                data: {
                    total,
                    new: statusCounts['New'] || 0,
                    acknowledged: statusCounts['Acknowledged'] || 0,
                    inProgress: statusCounts['InProgress'] || 0,
                    responseDrafted: statusCounts['ResponseDrafted'] || 0,
                    filed: statusCounts['Filed'] || 0,
                    closed: statusCounts['Closed'] || 0,
                    escalated: statusCounts['Escalated'] || 0,
                    overdue,
                    dueThisWeek,
                },
            });
        } catch (err) { next(err); }
    },

    // GET /api/notices/:id
    async getById(req, res, next) {
        try {
            const notice = await Notice.findOne(req.tenantFilter({ _id: req.params.id }))
                .populate('clientId', 'name pan entityType contacts')
                .populate('assignedTo', 'firstName lastName email')
                .populate('watchers', 'firstName lastName email')
                .populate('createdBy', 'firstName lastName email')
                .lean();
            if (!notice) throw new NotFoundError('Notice not found');

            res.json({ success: true, data: notice });
        } catch (err) { next(err); }
    },

    // POST /api/notices
    async create(req, res, next) {
        try {
            // Verify client belongs to tenant
            const client = await Client.findOne(req.tenantFilter({ _id: req.body.clientId }));
            if (!client) throw new NotFoundError('Client not found');

            const notice = await Notice.create(req.withTenant({
                ...req.body,
                createdBy: req.user.userId,
            }));

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'NOTICE_CREATE',
                entityType: 'Notice',
                entityId: notice._id,
                metadata: { department: notice.department, section: notice.section, din: notice.din, clientName: client.name },
                req,
            });

            res.status(201).json({ success: true, data: notice });
        } catch (err) { next(err); }
    },

    // PUT /api/notices/:id
    async update(req, res, next) {
        try {
            const notice = await Notice.findOneAndUpdate(
                req.tenantFilter({ _id: req.params.id }),
                { $set: req.body },
                { new: true, runValidators: true }
            );
            if (!notice) throw new NotFoundError('Notice not found');

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'NOTICE_UPDATE',
                entityType: 'Notice',
                entityId: notice._id,
                metadata: { changes: Object.keys(req.body) },
                req,
            });

            res.json({ success: true, data: notice });
        } catch (err) { next(err); }
    },

    // PATCH /api/notices/:id/assign
    async assign(req, res, next) {
        try {
            const notice = await Notice.findOneAndUpdate(
                req.tenantFilter({ _id: req.params.id }),
                { $set: { assignedTo: req.body.assignedTo } },
                { new: true }
            ).populate('assignedTo', 'firstName lastName email');
            if (!notice) throw new NotFoundError('Notice not found');

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'NOTICE_ASSIGN',
                entityType: 'Notice',
                entityId: notice._id,
                metadata: { assignedTo: req.body.assignedTo },
                req,
            });

            // Notify assignee
            if (req.body.assignedTo && req.body.assignedTo.toString() !== req.user.userId.toString()) {
                await notificationService.send({
                    tenantId: req.tenantId,
                    userId: req.body.assignedTo,
                    type: 'NOTICE_UPDATE',
                    title: 'New Notice Assigned',
                    message: `Notice ${notice.din || notice.section} has been assigned to you.`,
                    link: `/notices?id=${notice._id}`,
                    metadata: { noticeId: notice._id, din: notice.din }
                });
            }

            res.json({ success: true, data: notice });
        } catch (err) { next(err); }
    },

    // PATCH /api/notices/:id/status
    async changeStatus(req, res, next) {
        try {
            const oldNotice = await Notice.findOne(req.tenantFilter({ _id: req.params.id }));
            if (!oldNotice) throw new NotFoundError('Notice not found');

            oldNotice.status = req.body.status;
            await oldNotice.save();

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'NOTICE_STATUS_CHANGE',
                entityType: 'Notice',
                entityId: oldNotice._id,
                metadata: { from: oldNotice.status, to: req.body.status },
                req,
            });

            res.json({ success: true, data: oldNotice });
        } catch (err) { next(err); }
    },

    // PATCH /api/notices/:id/watchers
    async updateWatchers(req, res, next) {
        try {
            const notice = await Notice.findOneAndUpdate(
                req.tenantFilter({ _id: req.params.id }),
                { $set: { watchers: req.body.watchers } },
                { new: true }
            ).populate('watchers', 'firstName lastName email');
            if (!notice) throw new NotFoundError('Notice not found');

            res.json({ success: true, data: notice });
        } catch (err) { next(err); }
    },

    // POST /api/notices/sync
    async sync(req, res, next) {
        try {
            const { clientId } = req.body;
            const itdService = require('../services/itd.service');
            const Client = require('../models/Client');

            let results = [];
            if (clientId) {
                const client = await Client.findOne(req.tenantFilter({ _id: clientId }));
                if (!client) throw new NotFoundError('Client not found');

                const syncRes = await itdService.syncNotices(client.pan, {
                    tenantId: req.tenantId,
                    clientId: client._id
                });
                results.push({ clientId: client._id, clientName: client.name, ...syncRes });
            } else {
                // Bulk sync for all connected clients
                const clients = await Client.find(req.tenantFilter({
                    'itPortal.username': { $exists: true, $ne: '' },
                    status: 'active'
                }));

                for (const client of clients) {
                    try {
                        const syncRes = await itdService.syncNotices(client.pan, {
                            tenantId: req.tenantId,
                            clientId: client._id
                        });
                        results.push({ clientId: client._id, clientName: client.name, ...syncRes });
                    } catch (err) {
                        results.push({ clientId: client._id, clientName: client.name, success: false, message: err.message });
                    }
                }
            }

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'PORTAL_SYNC_TRIGGERED',
                entityType: 'Notice',
                metadata: {
                    manual: true,
                    clientCount: results.length,
                    noticesFound: results.reduce((sum, r) => sum + (r.count || 0), 0)
                },
                req,
            });

            res.json({
                success: true,
                message: results.length > 0 ? 'Portal synchronization complete.' : 'No clients configured for IT Portal sync.',
                data: results
            });
        } catch (err) { next(err); }
    },

    // GET /api/notices/settings
    async getSettings(req, res, next) {
        try {
            const user = await User.findById(req.user.userId).select('notifications').lean();
            if (!user) throw new NotFoundError('User not found');

            res.json({
                success: true,
                data: {
                    channels: {
                        email: user.notifications.email,
                        whatsapp: user.notifications.whatsapp,
                        sms: user.notifications.sms,
                        slack: user.notifications.slack || false
                    },
                    // Triggers could also be stored in the user model or tenant model
                    // For now, let's assume they are enabled if not explicitly disabled
                    triggers: {
                        newNotice: true,
                        deadlineProximity: true
                    }
                }
            });
        } catch (err) { next(err); }
    },

    // PUT /api/notices/settings
    async updateSettings(req, res, next) {
        try {
            const { channels } = req.body;

            await User.findByIdAndUpdate(req.user.userId, {
                $set: {
                    'notifications.email': channels.email,
                    'notifications.whatsapp': channels.whatsapp,
                    'notifications.sms': channels.sms
                }
            });

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'SETTINGS_UPDATE',
                entityType: 'User',
                metadata: req.body,
                req,
            });

            res.json({ success: true, message: 'Settings updated successfully' });
        } catch (err) { next(err); }
    },

    // GET /api/notices/:id/activities
    async getActivities(req, res, next) {
        try {
            const AuditLog = require('../models/AuditLog');
            const activities = await AuditLog.find({
                tenantId: req.tenantId,
                entityType: 'Notice',
                entityId: req.params.id
            }).sort({ createdAt: -1 });

            res.json({ success: true, data: activities });
        } catch (err) { next(err); }
    },

    // POST /api/notices/:id/comments
    async addComment(req, res, next) {
        try {
            const notice = await Notice.findOneAndUpdate(
                req.tenantFilter({ _id: req.params.id }),
                { $push: { comments: { userId: req.user.userId, text: req.body.text } } },
                { new: true }
            ).populate('comments.userId', 'firstName lastName email');
            if (!notice) throw new NotFoundError('Notice not found');

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'NOTICE_UPDATE',
                entityType: 'Notice',
                entityId: notice._id,
                metadata: { type: 'comment_added' },
                req,
            });

            // @Mention Detection
            const mentions = req.body.text.match(/@(\w+)/g);
            if (mentions) {
                const usernames = mentions.map(m => m.substring(1));
                // In this simplified system, we search by firstName or email for @mention
                const mentionedUsers = await User.find({
                    tenantId: req.tenantId,
                    _id: { $ne: req.user.userId },
                    $or: [
                        { email: { $in: usernames } },
                        { firstName: { $in: usernames } }
                    ]
                });

                for (const user of mentionedUsers) {
                    await notificationService.send({
                        tenantId: req.tenantId,
                        userId: user._id,
                        type: 'COMMENT_ADDED',
                        title: 'You were mentioned',
                        message: `${req.user.firstName} mentioned you: "${req.body.text.substring(0, 50)}..."`,
                        link: `/notices?id=${notice._id}`,
                        metadata: { noticeId: notice._id }
                    });
                }
            }

            res.json({ success: true, data: notice.comments });
        } catch (err) { next(err); }
    },

    // POST /api/notices/:id/analyze
    async analyze(req, res, next) {
        try {
            const aiService = require('../services/ai.service');
            const notice = await Notice.findOne(req.tenantFilter({ _id: req.params.id }))
                .populate('clientId', 'name pan entityType contacts');
            if (!notice) throw new NotFoundError('Notice not found');

            const insights = await aiService.analyzeNotice(notice, notice.clientId);

            // Save insights to the notice
            notice.aiInsights = insights;
            await notice.save();

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'NOTICE_UPDATE',
                entityType: 'Notice',
                entityId: notice._id,
                metadata: { type: 'ai_analysis', source: insights.source, riskLevel: insights.riskLevel },
                req,
            });

            res.json({ success: true, data: insights });
        } catch (err) { next(err); }
    },

    // POST /api/notices/:id/draft-ai
    async draftAI(req, res, next) {
        try {
            const aiService = require('../services/ai.service');
            const notice = await Notice.findOne(req.tenantFilter({ _id: req.params.id }))
                .populate('clientId', 'name pan entityType contacts');
            if (!notice) throw new NotFoundError('Notice not found');

            const draft = await aiService.generateResponseDraft(
                notice,
                notice.clientId,
                req.body.instructions || ''
            );

            // Also create a Response document so it appears in Response Studio
            const Response = require('../models/Response');
            const existingResponse = await Response.findOne({
                tenantId: req.tenantId,
                noticeId: notice._id,
                status: 'Draft'
            });

            if (existingResponse) {
                existingResponse.body = draft;
                existingResponse.subject = `AI-Generated Response — ${notice.section || notice.department} — ${notice.assessmentYear || ''}`;
                existingResponse.version += 1;
                await existingResponse.save();
            } else {
                await Response.create({
                    tenantId: req.tenantId,
                    noticeId: notice._id,
                    subject: `AI-Generated Response — ${notice.section || notice.department} — ${notice.assessmentYear || ''}`,
                    body: draft,
                    draftedBy: req.user.userId,
                    status: 'Draft',
                    version: 1,
                });
            }

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'RESPONSE_CREATE',
                entityType: 'Notice',
                entityId: notice._id,
                metadata: { method: 'AI_AGENT', draftLength: draft.length },
                req,
            });

            res.json({ success: true, data: { draft } });
        } catch (err) { next(err); }
    },

    // DELETE /api/notices/:id
    async delete(req, res, next) {
        try {
            const notice = await Notice.findOne({ _id: req.params.id, tenantId: req.tenantId });
            if (!notice) {
                throw new NotFoundError('Notice not found');
            }

            await notice.deleteOne();

            // Audit
            await auditService.log({
                userId: req.user._id,
                tenantId: req.tenantId,
                action: 'NOTICE:DELETE',
                resource: 'Notice',
                resourceId: notice._id,
                details: { title: notice.title, noticeNumber: notice.noticeNumber }
            });

            res.status(200).json({
                success: true,
                message: 'Notice deleted successfully'
            });
        } catch (err) {
            next(err);
        }
    }
};

module.exports = noticeController;

