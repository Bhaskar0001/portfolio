const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const logger = require('../utils/logger');

// Redis connection for BullMQ
const shouldConnect = process.env.ENABLE_BACKGROUND_JOBS !== 'false';
let connection = null;
let deadlineQueue = null;
let emailQueue = null;
let notificationQueue = null;
let documentQueue = null;
let ocrQueue = null;

if (shouldConnect) {
    connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: null, // Required by BullMQ
        enableReadyCheck: false,
    });

    connection.on('error', (err) => {
        logger.error('BullMQ Redis connection error:', err.message);
    });

    // ── Queues ──────────────────────────────────────────────
    deadlineQueue = new Queue('deadline-check', { connection });
    emailQueue = new Queue('email-send', { connection });
    notificationQueue = new Queue('notification', { connection });
    documentQueue = new Queue('document', { connection });
    ocrQueue = new Queue('ocr-extraction', { connection });
}

/**
 * Schedule recurring deadline checks
 * Runs every 30 minutes
 */
const scheduleDeadlineChecks = async () => {
    if (!deadlineQueue) {
        logger.warn('Skipping scheduleDeadlineChecks because deadlineQueue is not initialized.');
        return;
    }
    // Remove existing repeatable jobs first
    const repeatableJobs = await deadlineQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
        await deadlineQueue.removeRepeatableByKey(job.key);
    }

    // Add repeatable job: every 30 minutes
    await deadlineQueue.add(
        'check-deadlines',
        { type: 'scheduled' },
        {
            repeat: { every: 30 * 60 * 1000 }, // 30 minutes
            removeOnComplete: 100,
            removeOnFail: 50,
        }
    );

    // Add daily summary job: every day at 8 AM
    await deadlineQueue.add(
        'daily-summary',
        { type: 'daily-summary' },
        {
            repeat: { pattern: '0 8 * * *' }, // 8 AM daily
            removeOnComplete: 30,
            removeOnFail: 10,
        }
    );

    logger.info('Deadline check jobs scheduled');
};

/**
 * Add an email to the queue
 */
const queueEmail = async (emailData) => {
    if (!emailQueue) {
        logger.warn('Skipping email queuing because emailQueue is not initialized.');
        return null;
    }
    return emailQueue.add('send-email', emailData, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
    });
};

/**
 * Add a notification to the queue
 */
const queueNotification = async (notificationData) => {
    if (!notificationQueue) {
        logger.warn('Skipping notification queuing because notificationQueue is not initialized.');
        return null;
    }
    return notificationQueue.add('create-notification', notificationData, {
        attempts: 2,
        removeOnComplete: 100,
    });
};

/**
 * Add a document generation job to the queue (PDF/ZIP)
 */
const queueDocument = async (docData) => {
    if (!documentQueue) {
        logger.warn('Skipping document queuing because documentQueue is not initialized.');
        return null;
    }
    return documentQueue.add('generate-document', docData, {
        attempts: 3,
        removeOnComplete: 100,
    });
};

/**
 * Add an OCR task to the queue
 */
const queueOcr = async (ocrData) => {
    if (!ocrQueue) {
        logger.warn('Skipping OCR queuing because ocrQueue is not initialized.');
        return null;
    }
    return ocrQueue.add('extract-fields', ocrData, {
        attempts: 2,
        removeOnComplete: 50,
    });
};

module.exports = {
    connection,
    deadlineQueue,
    emailQueue,
    notificationQueue,
    documentQueue,
    scheduleDeadlineChecks,
    queueEmail,
    queueNotification,
    queueDocument,
    queueOcr,
};
