const { Worker } = require('bullmq');
const { connection } = require('./queue');
const ocrService = require('../services/ocr.service');
const Notice = require('../models/Notice');
const Client = require('../models/Client');
const logger = require('../utils/logger');
const auditService = require('../services/audit.service');

/**
 * OCR Worker
 * Processes background tasks for text extraction and notice field parsing
 */
const startOcrWorker = () => {
    const worker = new Worker('ocr-extraction', async (job) => {
        const { type, payload } = job.data;
        logger.info(`Processing OCR job ${job.id} (type: ${type})`);

        try {
            if (type === 'extract-fields') {
                const { filePath, mimeType, noticeId, tenantId, userId } = payload;

                // 1. Run OCR
                const text = await ocrService.extractText(filePath, mimeType);

                // 2. Parse Fields
                const extractedFields = await ocrService.parseNoticeFields(text);

                // 3. Update Notice
                const notice = await Notice.findById(noticeId);
                if (notice) {
                    // Update notice with extracted fields if they are missing
                    if (!notice.din && extractedFields.noticeNumber) notice.din = extractedFields.noticeNumber;
                    if (!notice.section && extractedFields.section) notice.section = extractedFields.section;
                    if (!notice.assessmentYear && extractedFields.assessmentYear) notice.assessmentYear = extractedFields.assessmentYear;

                    // If category is General, update it to extracted category
                    if (notice.department === 'General' && extractedFields.category) {
                        notice.department = extractedFields.category;
                    }

                    // Auto-link client if PAN is found and notice doesn't have a clientId
                    if (!notice.clientId && extractedFields.pan) {
                        const client = await Client.findOne({ tenantId, pan: extractedFields.pan }).select('_id');
                        if (client) {
                            notice.clientId = client._id;
                        }
                    }

                    notice.ocrProcessed = true;
                    notice.status = 'New'; // Move from 'PendingOCR' to 'New' if we had such state
                    await notice.save();

                    await auditService.log({
                        tenantId,
                        actorId: userId || 'SYSTEM',
                        action: 'NOTICE_OCR_COMPLETE',
                        entityType: 'Notice',
                        entityId: notice._id,
                        metadata: { extractedFields },
                    });
                }
            }
        } catch (error) {
            logger.error(`OCR Job ${job.id} failed:`, error);
            throw error;
        }
    }, { connection });

    worker.on('completed', (job) => {
        logger.info(`OCR Job ${job.id} completed successfully`);
    });

    worker.on('failed', (job, err) => {
        logger.error(`OCR Job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);
    });

    return worker;
};

module.exports = { startOcrWorker };
