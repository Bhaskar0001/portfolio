const Notification = require('../models/Notification');
const { parsePagination, paginatedResponse } = require('../utils/pagination');

const notificationController = {
    // GET /api/notifications — list user's notifications
    async list(req, res, next) {
        try {
            const { page, limit, skip } = parsePagination(req.query);
            const filter = req.tenantFilter({ userId: req.user.userId });
            if (req.query.read === 'false') filter.read = false;
            if (req.query.read === 'true') filter.read = true;

            const [notifications, total, unreadCount] = await Promise.all([
                Notification.find(filter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Notification.countDocuments(filter),
                Notification.countDocuments(req.tenantFilter({ userId: req.user.userId, read: false })),
            ]);

            res.json({
                success: true,
                unreadCount,
                ...paginatedResponse(notifications, total, { page, limit }),
            });
        } catch (err) { next(err); }
    },

    // PATCH /api/notifications/:id/read — mark as read
    async markRead(req, res, next) {
        try {
            await Notification.findOneAndUpdate(
                req.tenantFilter({ _id: req.params.id, userId: req.user.userId }),
                { read: true, readAt: new Date() }
            );
            res.json({ success: true });
        } catch (err) { next(err); }
    },

    // POST /api/notifications/read-all — mark all as read
    async markAllRead(req, res, next) {
        try {
            await Notification.updateMany(
                req.tenantFilter({ userId: req.user.userId, read: false }),
                { read: true, readAt: new Date() }
            );
            res.json({ success: true });
        } catch (err) { next(err); }
    },

    // GET /api/notifications/unread-count
    async unreadCount(req, res, next) {
        try {
            const count = await Notification.countDocuments(
                req.tenantFilter({ userId: req.user.userId, read: false })
            );
            res.json({ success: true, data: { unreadCount: count } });
        } catch (err) { next(err); }
    },
};

module.exports = notificationController;
