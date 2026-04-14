const { PDFDocument, rgb, degrees } = require('pdf-lib');
const logger = require('../utils/logger');

class WatermarkService {
    /**
     * Add a diagonal text watermark to all pages of a PDF
     * @param {Buffer} pdfBuffer - Original PDF buffer
     * @param {string} text - Watermark text (e.g., "CONFIDENTIAL - CA OFFICE")
     * @returns {Promise<Buffer>} - Watermarked PDF buffer
     */
    async applyTextWatermark(pdfBuffer, text = 'DRAFT - NOT FOR FILING') {
        try {
            const pdfDoc = await PDFDocument.load(pdfBuffer);
            const pages = pdfDoc.getPages();
            
            for (const page of pages) {
                const { width, height } = page.getSize();
                const fontSize = 50;
                
                // Draw watermark diagonally across the center
                page.drawText(text, {
                    x: width / 2 - (text.length * fontSize * 0.25), // Approximate centering
                    y: height / 2 - (fontSize / 2),
                    size: fontSize,
                    color: rgb(0.8, 0.3, 0.3), // Light reddish for visibility
                    opacity: 0.2,
                    rotate: degrees(45),
                });
            }

            const watermarkedPdfBytes = await pdfDoc.save();
            return Buffer.from(watermarkedPdfBytes);
        } catch (error) {
            logger.error(`[Watermark] Failed to apply watermark: ${error.message}`);
            return pdfBuffer;
        }
    }

    /**
     * Generate a personalized watermark string
     */
    generateWatermarkText(user, tenant) {
        const timestamp = new Date().toISOString().split('T')[0];
        return `NoticeRadar | ${tenant?.name || 'Secure'} | ${user?.email || 'Authorized User'} | ${timestamp}`;
    }
}

module.exports = new WatermarkService();
