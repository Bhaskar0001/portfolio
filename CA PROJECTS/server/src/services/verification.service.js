const Document = require('../models/Document');
const Client = require('../models/Client');
const ocrService = require('./ocr.service');
const auditService = require('./audit.service');
const fs = require('fs');

class VerificationService {
    /**
     * Verify a KYC document against a client record
     * @param {string} documentId - The database ID of the document
     * @param {string} localFilePath - Path to the temporarily downloaded file from storage
     */
    async verifyKycDocument(documentId, localFilePath) {
        const doc = await Document.findById(documentId);
        if (!doc || doc.category !== 'KYC') return;

        const client = await Client.findById(doc.clientId);
        if (!client) return;

        try {
            // 1. Extract text and parse fields
            const text = await ocrService.extractText(localFilePath, doc.mimeType);
            const extractedData = await ocrService.parseNoticeFields(text); // Re-using parseNoticeFields as it's general purpose

            const verificationMetadata = {
                extractedPan: extractedData.pan,
                expectedPan: client.pan,
                timestamp: new Date()
            };

            // 2. Compare Data (Primary ID is PAN)
            if (extractedData.pan && extractedData.pan.toUpperCase() === client.pan.toUpperCase()) {
                doc.verificationStatus = 'Verified';
                doc.verifiedAt = new Date();

                // Update client status if this is the definitive verification
                client.kycStatus = 'Verified';
                await client.save();
            } else {
                doc.verificationStatus = 'Rejected';
                verificationMetadata.reason = extractedData.pan ? 'PAN Mismatch' : 'PAN not found in document';
            }

            doc.verificationMetadata = verificationMetadata;
            await doc.save();

            await auditService.log({
                tenantId: doc.tenantId,
                actorId: doc.uploadedBy,
                action: 'KYC_VERIFICATION_COMPLETE',
                entityType: 'Document',
                entityId: doc._id,
                metadata: { status: doc.verificationStatus, reason: verificationMetadata.reason }
            });

            return doc.verificationStatus;
        } catch (err) {
            console.error('KYC Verification Error:', err.message);
            doc.verificationStatus = 'Failed';
            await doc.save();
            throw err;
        }
    }
}

module.exports = new VerificationService();
