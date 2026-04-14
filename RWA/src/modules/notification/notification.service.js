const Notification = require('./notification.model');

class NotificationService {
    async create(data) {
        const notification = await Notification.create(data);

        // Emit via Socket.io (to be implemented)
        // Send via Firebase (to be implemented)

        return notification;
    }

    async getUserNotifications(userId, query = {}) {
        const { page = 1, limit = 20 } = query;
        return await Notification.find({ userId })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
    }

    async markAsRead(notificationId, userId) {
        return await Notification.findOneAndUpdate(
            { _id: notificationId, userId },
            { isRead: true },
            { new: true }
        );
    }

    async getUnreadCount(userId) {
        return await Notification.countDocuments({ userId, isRead: false });
    }
}

module.exports = new NotificationService();
