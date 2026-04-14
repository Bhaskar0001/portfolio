const { Worker } = require('bullmq');
const { connection } = require('./queue');
const emailService = require('../services/email.service');
const logger = require('../utils/logger');

/**
 * Email Worker — Processes queued emails
 */
const startEmailWorker = () => {
    const worker = new Worker('email-send', async (job) => {
        const { type, to, userName, notices, stats } = job.data;

        switch (type) {
            case 'deadline-reminder':
                await emailService.sendDeadlineReminder({ to, userName, notices });
                break;
            case 'daily-summary':
                await emailService.sendDailySummary({ to, userName, stats });
                break;
            default:
                await emailService.send(job.data);
        }
    }, {
        connection,
        concurrency: 3,
        limiter: { max: 10, duration: 60000 }, // Max 10 emails per minute
    });

    worker.on('completed', (job) => {
        logger.info(`[EmailWorker] Sent: ${job.data.to}`);
    });

    worker.on('failed', (job, err) => {
        logger.error(`[EmailWorker] Failed: ${job?.data?.to} — ${err.message}`);
    });

    return worker;
};

module.exports = { startEmailWorker };
