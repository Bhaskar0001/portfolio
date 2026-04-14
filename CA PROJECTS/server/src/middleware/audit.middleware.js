const auditService = require('../services/audit.service');
const { getAuditContext } = require('../utils/auditContext');
const logger = require('../utils/logger');

/**
 * Mongoose Plugin for Immutable Audit Logging
 * Tracks all changes (save, update, delete) to a document using centralized auditContext.
 */
const auditPlugin = (schema, options = {}) => {
    const { entityType } = options;

    // Post-save hook to log CREATED or UPDATED
    schema.post('save', async function(doc) {
        const context = getAuditContext();
        if (!context) return; // Skip if no request context (e.g. CLI scripts)

        const actionType = this.isNew ? 'CREATED' : 'UPDATED';
        const action = `${entityType.toUpperCase()}_${actionType}`;

        await auditService.log({
            tenantId: doc.tenantId,
            action,
            entityType,
            entityId: doc._id,
            metadata: {
                // For updates, we could include simplified diff here if needed
                isNew: this.isNew
            }
        });
    });

    // Post-remove hook
    schema.post('remove', async function(doc) {
        const context = getAuditContext();
        if (!context) return;

        await auditService.log({
            tenantId: doc.tenantId,
            action: `${entityType.toUpperCase()}_DELETED`,
            entityType,
            entityId: doc._id
        });
    });

    // Note: Query hooks (findOneAndUpdate) are harder because they don't 
    // always have the document instance. We'll handle them if they become common.
};

module.exports = auditPlugin;
