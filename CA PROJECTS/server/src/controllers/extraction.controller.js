const ocrService = require('../services/ocr.service');
const Client = require('../models/Client');
const path = require('path');
const fs = require('fs');

const extractionController = {
    /**
     * POST /api/notices/quick-scan
     * Processes an uploaded file and returns extracted data
     */
    async quickScan(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No file uploaded' });
            }

            const filePath = req.file.path;
            const mimeType = req.file.mimetype;

            // 1. Run OCR
            const text = await ocrService.extractText(filePath, mimeType);

            // 2. Parse Fields
            const extractedData = await ocrService.parseNoticeFields(text);

            // 3. Try to Identify Client by PAN
            if (extractedData.pan) {
                const client = await Client.findOne({
                    tenantId: req.tenantId,
                    pan: extractedData.pan
                }).select('_id name pan').lean();

                if (client) {
                    extractedData.clientId = client._id;
                    extractedData.clientName = client.name;
                }
            }

            // Cleanup: Optionally delete the file if not needed yet, 
            // but usually, it's already in 'uploads/' and will be moved to S3 later.
            // We'll leave it for now so the UI can use the same file for the final save.

            res.json({
                success: true,
                data: {
                    ...extractedData,
                    originalFilename: req.file.originalname,
                    tempPath: req.file.filename // Send filename so UI can reference it during final save
                }
            });
        } catch (error) {
            console.error('Quick Scan Error:', error);
            next(error);
        }
    }
};

module.exports = extractionController;
