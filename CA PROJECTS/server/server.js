require('dotenv').config();

const createApp = require('./src/app');
const connectDB = require('./src/config/db');
const env = require('./src/config/env');
const logger = require('./src/utils/logger');

const start = async () => {
    try {
        // Connect to MongoDB Atlas
        await connectDB(env.MONGO_URI);

        // Create Express app
        const app = createApp();
        const port = parseInt(env.PORT, 10);

        app.listen(port, () => {
            logger.info(`🚀 NoticeRadar API running on port ${port} [${env.NODE_ENV}]`);
            logger.info(`   Health: http://localhost:${port}/health`);
            logger.info(`   Ready:  http://localhost:${port}/ready`);
        });

        // Start BullMQ workers (non-blocking)
        if (env.ENABLE_BACKGROUND_JOBS === 'true') {
            try {
                const { scheduleDeadlineChecks } = require('./src/jobs/queue');
                const { startDeadlineWorker } = require('./src/jobs/deadline.worker');
                const { startEmailWorker } = require('./src/jobs/email.worker');
                const { startNotificationWorker } = require('./src/jobs/notification.worker');
                const { startDocumentWorker } = require('./src/jobs/document.worker');
                const { startOcrWorker } = require('./src/jobs/ocr.worker');

                startDeadlineWorker();
                startEmailWorker();
                startNotificationWorker();
                startDocumentWorker();
                startOcrWorker();
                await scheduleDeadlineChecks();

                // Start Email Ingestion (IMAP)
                const emailInbound = require('./src/services/email.service');
                emailInbound.start();

                logger.info('📋 BullMQ workers started (deadline, email, notification, document, ocr)');
                logger.info('📬 Email Ingestion service active');
            } catch (err) {
                logger.warn('BullMQ workers failed to start (Redis may be unavailable):', err.message);
                logger.warn('Server will continue without background jobs');
            }
        } else {
            logger.info('⚠️  Background jobs (Redis/BullMQ) and Email Inbound are DISABLED (ENABLE_BACKGROUND_JOBS=false)');
            logger.info('   Core API functionality remains active.');
        }
    } catch (err) {
        logger.error('Failed to start server:', err);
        process.exit(1);
    }
};

// Graceful shutdown
const shutdown = async (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    const mongoose = require('mongoose');
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');

    // Close BullMQ connections
    try {
        const { connection } = require('./src/jobs/queue');
        await connection.quit();
        logger.info('Redis connection closed');
    } catch (err) {
        // Ignore — Redis may not have been connected
    }

    process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Rejection:', err);
});
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
});

start();
