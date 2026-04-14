const logger = require('../utils/logger');
const axios = require('axios');

/**
 * Meta Reach SMS Service (Skeleton/Mock for production readiness)
 * In a real environment, this would call Meta/WhatsApp/SMS APIs.
 */
class SmsService {
    constructor() {
        this.apiKey = process.env.META_SMS_API_KEY;
        this.baseUrl = 'https://api.metareach.com/v1'; // Simulated
    }

    /**
     * Send SMS notification
     * @param {string} to - Full phone number with country code
     * @param {string} message - Message text
     * @returns {Promise<Object>}
     */
    async sendSms(to, message) {
        try {
            logger.info(`Sending SMS to ${to}: ${message.substring(0, 50)}...`);

            if (!this.apiKey) {
                logger.warn('SMS API Key missing. Skipping real delivery.');
                return { success: true, id: 'MOCK_ID_' + Date.now() };
            }

            // Simulated API call
            // await axios.post(`${this.baseUrl}/send`, {
            //     to,
            //     text: message,
            //     type: 'SMS'
            // }, { headers: { 'Authorization': `Bearer ${this.apiKey}` } });

            return { success: true, id: 'SMS_' + Math.random().toString(36).substr(2, 9) };
        } catch (err) {
            logger.error(`SMS Delivery Error to ${to}:`, err.message);
            return { success: false, error: err.message };
        }
    }

    /**
     * Send due date reminder
     */
    async sendReminder(client, notice) {
        const message = `NoticeRadar Reminder: Notice for ${client.name} (PAN: ${client.pan}) is due on ${notice.dueDate}. Action required.`;
        return this.sendSms(client.phone || client.contacts?.[0]?.phone, message);
    }
}

module.exports = new SmsService();
