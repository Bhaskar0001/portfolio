const { connection } = require('../jobs/queue'); // Reuse ioredis connection
const logger = require('../utils/logger');

/**
 * Service to handle access token blacklisting using Redis
 */
const tokenService = {
    /**
     * Blacklist a token until it expires
     * @param {string} token - The access token to blacklist
     * @param {number} expiresInSec - Number of seconds until the token expires
     */
    async blacklistToken(token, expiresInSec) {
        if (!token || expiresInSec <= 0) return;

        try {
            const key = `blacklist:${token}`;
            await connection.set(key, '1', 'EX', expiresInSec);
            logger.debug(`Token blacklisted for ${expiresInSec}s`);
        } catch (err) {
            logger.error('Failed to blacklist token:', err);
        }
    },

    /**
     * Check if a token is blacklisted
     * @param {string} token 
     * @returns {Promise<boolean>}
     */
    async isBlacklisted(token) {
        if (!token) return false;

        try {
            const key = `blacklist:${token}`;
            const result = await connection.get(key);
            return result === '1';
        } catch (err) {
            logger.error('Failed to check token blacklist:', err);
            return false;
        }
    }
};

module.exports = tokenService;
