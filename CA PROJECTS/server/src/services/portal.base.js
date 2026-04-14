const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Base class for portal integrations (Income Tax, GSTN, TRACES)
 * Provides common session handling and error management.
 */
class PortalIntegration {
    constructor(name) {
        this.name = name;
    }

    /**
     * Placeholder for authentication logic (Portals usually require CAPTCHA or OTP)
     * This is where the CA/Client creds are used.
     */
    async login(creds) {
        logger.info(`[${this.name}] Initiating login...`);
        // System is designed to handle session cookies or tokens
        throw new Error('Method not implemented');
    }

    /**
     * Fetch notices for a specific client/PAN
     */
    async fetchNotices(pan) {
        throw new Error('Method not implemented');
    }

    /**
     * Download a specific notice document
     */
    async downloadDocument(docId) {
        throw new Error('Method not implemented');
    }
}

module.exports = PortalIntegration;
