const Notification = require('../models/Notification');
const User = require('../models/User');
const logger = require('../utils/logger');
const emailService = require('./email.service');
const whatsappService = require('./whatsapp.service');

class NotificationService {
    /**
     * Send a notification to a specific user
     * @param {Object} params 
     * @param {string} params.tenantId
     * @param {string} params.userId
     * @param {string} params.type - Enum from Notification model
     * @param {string} params.title
     * @param {string} params.message
     * @param {string} [params.link]
     * @param {Object} [params.metadata]
     * @param {boolean} [params.sendEmail=false]
     */
    async send({ tenantId, userId, type, title, message, link, metadata, sendEmail = false }) {
        try {
            // 1. Create In-App Notification
            const notification = await Notification.create({
                tenantId,
                userId,
                type,
                title,
                message,
                link,
                metadata: metadata || {}
            });

            logger.info(`Notification created: ${title} for User: ${userId}`);

            // 2. Optional: Send Email/WhatsApp based on User Preferences
            if (sendEmail || type === 'DEADLINE_CRITICAL') {
                const user = await User.findById(userId);
                if (user) {
                    // Email
                    if (sendEmail || user.notifications.email) {
                        logger.info(`Email dispatch requested for: ${title}`);
                        // emailService.sendNotificationEmail(user.email, title, message, link);
                    }

                    // WhatsApp
                    if (user.notifications.whatsapp && user.phone) {
                        logger.info(`WhatsApp dispatch requested for: ${title}`);
                        if (type === 'DEADLINE_CRITICAL' || type === 'REMINDER') {
                            await whatsappService.sendDeadlineAlert(
                                user.phone, 
                                metadata?.noticeRef || 'Notice', 
                                metadata?.dueDate || 'N/A', 
                                metadata?.riskLevel || 'High'
                            );
                        }
                    }
                }
            }

            return notification;
        } catch (err) {
            logger.error('Failed to send notification:', err);
            throw err;
        }
    }

    /**
     * Notify all users in a tenant (e.g. System Wide alert)
     */
    async broadcastToTenant(tenantId, params) {
        // Implementation for broadcasting...
    }
}

module.exports = new NotificationService();
