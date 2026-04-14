const { ForbiddenError } = require('../utils/errors');
const Tenant = require('../models/Tenant');

/**
 * IP Whitelisting Middleware
 * Secures the API by restricting access to known office IP addresses.
 * Bypassed if the whitelist is empty.
 */
const requireIpWhitelist = async (req, res, next) => {
    try {
        // Toggle via Environment Variable (Safe for Dev/Staging)
        if (process.env.ENABLE_IP_WHITELIST === 'false') {
            return next();
        }

        if (!req.tenantId) {
            return next(); // Skip if no tenant context (e.g., public routes)
        }

        const tenant = await Tenant.findById(req.tenantId).select('settings.security.ipWhitelist');
        
        if (!tenant || !tenant.settings || !tenant.settings.security) {
            return next();
        }

        const allowedIps = tenant.settings.security.ipWhitelist;
        
        // If whitelist is empty, allow all
        if (!allowedIps || allowedIps.length === 0) {
            return next();
        }

        // Get client IP (trust proxy must be enabled in app.js for real IP behind LB)
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        
        // Basic IPv4/IPv6 normalization for comparison
        const normalizedClientIp = clientIp.replace('::ffff:', '').split(',')[0].trim();

        if (!allowedIps.includes(normalizedClientIp)) {
            throw new ForbiddenError(`Access denied: IP address ${normalizedClientIp} is not whitelisted for this organization.`);
        }

        next();
    } catch (err) {
        next(err);
    }
};

module.exports = requireIpWhitelist;
