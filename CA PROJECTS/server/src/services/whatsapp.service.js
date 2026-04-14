const axios = require('axios');
const logger = require('../utils/logger');

/**
 * WhatsApp Business API Service (Meta Graph API)
 */
class WhatsappService {
    constructor() {
        this.apiUrl = process.env.WHATSAPP_API_URL;
        this.token = process.env.WHATSAPP_API_TOKEN;
        this.templates = {
            docRequest: process.env.WHATSAPP_TEMPLATE_DOC_REQUEST || 'document_request_v1',
            deadlineAlert: process.env.WHATSAPP_TEMPLATE_DEADLINE || 'deadline_alert_v1'
        };
    }

    /**
     * Send a template-based WhatsApp message
     * @param {string} to - Recipient phone number with country code (e.g., 919876543210)
     * @param {string} templateName - Template name registered in Meta Dashboard
     * @param {Array} components - Values for template variables
     */
    async sendTemplate(to, templateName, components = []) {
        try {
            if (!this.apiUrl || !this.token) {
                logger.warn(`WhatsApp API not configured. Mocking delivery to ${to} using template: ${templateName}`);
                return { success: true, mock: true, id: `WABA_MOCK_${Date.now()}` };
            }

            const payload = {
                messaging_product: 'whatsapp',
                to: to.replace(/\D/g, ''), // Ensure numeric only
                type: 'template',
                template: {
                    name: templateName,
                    language: { code: 'en_US' },
                    components: [
                        {
                            type: 'body',
                            parameters: components.map(val => ({ type: 'text', text: String(val) }))
                        }
                    ]
                }
            };

            const response = await axios.post(this.apiUrl, payload, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            logger.info(`WhatsApp sent successfully to ${to}. Message ID: ${response.data.messages?.[0]?.id}`);
            return { success: true, id: response.data.messages?.[0]?.id };

        } catch (err) {
            const errorMsg = err.response?.data?.error?.message || err.message;
            logger.error(`WhatsApp Delivery Error to ${to}: ${errorMsg}`);
            return { success: false, error: errorMsg };
        }
    }

    /**
     * Send Document Request Notification
     */
    async sendDocumentRequest(to, clientName, noticeType, portalLink) {
        // Variables: {{1}} = Client Name, {{2}} = Notice Type, {{3}} = Secure Link
        return this.sendTemplate(to, this.templates.docRequest, [clientName, noticeType, portalLink]);
    }

    /**
     * Send Deadline Critical Alert
     */
    async sendDeadlineAlert(to, noticeRef, dueDate, riskLevel) {
        // Variables: {{1}} = Notice Ref, {{2}} = Due Date, {{3}} = Risk Level
        return this.sendTemplate(to, this.templates.deadlineAlert, [noticeRef, dueDate, riskLevel]);
    }
}

module.exports = new WhatsappService();
