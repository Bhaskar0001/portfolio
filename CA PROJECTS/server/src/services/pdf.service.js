const puppeteer = require('puppeteer');
const logger = require('../utils/logger');
const env = require('../config/env');

class PdfService {
    /**
     * Generate PDF from HTML
     * @param {string} html - The HTML content to render
     * @param {object} options - Puppeteer pdf options
     */
    async generateFromHtml(html, options = {}) {
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                executablePath: env.PUPPETEER_EXECUTABLE_PATH || null
            });

            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });

            const pdfBuffer = await page.pdf({
                format: 'A4',
                margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
                printBackground: true,
                ...options
            });

            return pdfBuffer;
        } catch (error) {
            logger.error('PDF Generation Error:', error);
            throw error;
        } finally {
            if (browser) await browser.close();
        }
    }
}

module.exports = new PdfService();
