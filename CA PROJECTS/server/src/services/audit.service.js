const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

/**
 * Audit Service — logs all significant actions
 */
const auditService = {
    /**
     * Create an audit log entry
     * @param {Object} params
     * @param {string} params.tenantId
     * @param {string} params.actorId
     * @param {string} params.actorEmail
     * @param {string} params.action - Action enum value
     * @param {string} params.entityType
     * @param {string} params.entityId
     * @param {Object} params.metadata - Additional context
     * @param {Object} params.req - Express request (for IP, UA)
     */
    async log({ tenantId, actorId, actorEmail, action, entityType, entityId, metadata, req }) {
        try {
            const { getAuditContext } = require('../utils/auditContext');
            const context = getAuditContext() || {};

            const entry = await AuditLog.create({
                tenantId: tenantId || context.tenantId,
                actorId: actorId || context.userId,
                actorEmail: actorEmail || context.userEmail,
                action,
                entityType,
                entityId,
                metadata: metadata || {},
                ipAddress: req ? (req.ip || req.connection?.remoteAddress) : context.ip,
                userAgent: req ? req.get('user-agent') : context.userAgent,
            });

            logger.debug(`Audit: ${action} on ${entityType}:${entityId} by ${actorEmail}`);
            return entry;
        } catch (err) {
            // Audit logging should never crash the app
            logger.error('Audit log error:', err.message);
        }
    },
};

module.exports = auditService;
