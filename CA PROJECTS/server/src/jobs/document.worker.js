const { Worker } = require('bullmq');
const { connection } = require('./queue');
const pdfService = require('../services/pdf.service');
const zipService = require('../services/zip.service');
const storageService = require('../services/storage.service');
const Response = require('../models/Response');
const Document = require('../models/Document');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

/**
 * Document Generation Worker
 * Handles HTML -> PDF and Bundling files into ZIP
 */
const startDocumentWorker = () => {
    const worker = new Worker('document-generation', async (job) => {
        logger.info(`[DocumentWorker] Processing: ${job.name} (type: ${job.data.type})`);

        const { type, payload } = job.data;

        if (type === 'GENERATE_RESPONSE_PDF') {
            await handleGenerateResponsePdf(payload);
        } else if (type === 'GENERATE_ZIP_PACKET') {
            await handleGenerateZipPacket(payload);
        }
    }, {
        connection,
        concurrency: 1, // PDF generation is memory intensive
    });

    worker.on('completed', (job) => {
        logger.info(`[DocumentWorker] Completed: ${job.name}`);
    });

    worker.on('failed', (job, err) => {
        logger.error(`[DocumentWorker] Failed: ${job?.name} — ${err.message}`);
    });

    return worker;
};

/**
 * Handle HTML -> PDF conversion for a response
 */
async function handleGenerateResponsePdf({ responseId, html, tenantId, watermark }) {
    try {
        const response = await Response.findById(responseId);
        if (!response) throw new Error('Response not found');

        let pdfBuffer = await pdfService.generateFromHtml(html);

        // Apply watermark if requested
        if (watermark) {
            const watermarkService = require('../services/watermark.service');
            pdfBuffer = await watermarkService.applyTextWatermark(pdfBuffer, watermark);
            logger.info(`[DocumentWorker] Applied watermark to response: ${responseId}`);
        }

        const fileName = `Response_v${response.version}_${responseId}${watermark ? '_DRAFT' : ''}.pdf`;
        const objectKey = `${tenantId}/responses/${responseId}_${Date.now()}${watermark ? '_draft' : ''}.pdf`;

        // 1. Upload to Storage
        await storageService.uploadBuffer(objectKey, pdfBuffer, 'application/pdf');

        // 2. Create Document record
        const doc = await Document.create({
            tenantId,
            noticeId: response.noticeId,
            responseId: response._id,
            category: 'ResponseAttachment',
            storageKey: objectKey,
            originalName: fileName,
            mimeType: 'application/pdf',
            sizeBytes: pdfBuffer.length,
            uploadedBy: response.draftedBy, // Link to original drafter
            uploadStatus: 'Completed',
            verificationStatus: 'Verified',
            description: watermark ? 'Watermarked Draft' : 'Final Approved Response'
        });

        // 3. Update Response record
        response.generatedPdfDocId = doc._id;
        await response.save();

        logger.info(`[DocumentWorker] PDF generated, uploaded, and linked: ${doc._id}`);
    } catch (err) {
        logger.error(`[DocumentWorker] PDF Error: ${err.message}`);
        throw err;
    }
}

/**
 * Handle bundling multiple documents into a ZIP
 */
async function handleGenerateZipPacket({ name, documentIds, tenantId, userId }) {
    try {
        const docs = await Document.find({ _id: { $in: documentIds }, tenantId });

        const zipFiles = [];
        for (const doc of docs) {
            const buffer = await storageService.getBuffer(doc.storageKey);
            zipFiles.push({
                name: doc.originalName,
                content: buffer
            });
        }

        const zipBuffer = await zipService.createZipBuffer(zipFiles);
        const objectKey = `${tenantId}/packets/${name}_${Date.now()}.zip`;

        await storageService.uploadBuffer(objectKey, zipBuffer, 'application/zip');

        // Create a Document record for the ZIP packet itself? 
        // Or notify the user. For now, assume we just want it in storage.

        logger.info(`[DocumentWorker] ZIP packet generated: ${objectKey}`);
    } catch (err) {
        logger.error(`[DocumentWorker] ZIP Error: ${err.message}`);
        throw err;
    }
}

module.exports = { startDocumentWorker };
