const { Worker } = require('bullmq');
const { connection } = require('./queue');
const Notification = require('../models/Notification');
const notificationService = require('../services/notification.service');
const logger = require('../utils/logger');

/**
 * Notification Worker — Dispatches multi-channel notifications
 */
const startNotificationWorker = () => {
    const worker = new Worker('notification', async (job) => {
        const { tenantId, userId, type, title, message, link, noticeId, metadata } = job.data;

        // Skip if no user assigned
        if (!userId) return;

        // Avoid duplicate notifications (same notice + type within 24h)
        const existing = await Notification.findOne({
            tenantId,
            userId,
            'metadata.noticeId': noticeId,
            type,
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        });

        if (existing) {
            logger.debug(`[NotificationWorker] Skipping duplicate: ${type} for ${noticeId}`);
            return;
        }

        // Use the notification service for multi-channel dispatch
        await notificationService.send({
            tenantId,
            userId,
            type,
            title,
            message,
            link,
            metadata: { ...metadata, noticeId }
        });

    }, {
        connection,
        concurrency: 5,
    });

    worker.on('failed', (job, err) => {
        logger.error(`[NotificationWorker] Failed: ${err.message}`);
    });

    return worker;
};

module.exports = { startNotificationWorker };
