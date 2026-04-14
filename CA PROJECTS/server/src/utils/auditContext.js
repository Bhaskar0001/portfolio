const { AsyncLocalStorage } = require('async_hooks');

const auditStorage = new AsyncLocalStorage();

/**
 * Middleware to initialize the audit context for each request.
 */
const auditContextMiddleware = (req, res, next) => {
    const context = {
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('user-agent'),
        // These will be populated by auth middlewares
        userId: null,
        userEmail: null,
        tenantId: null,
        userType: null // 'staff' or 'client'
    };

    auditStorage.run(context, () => {
        next();
    });
};

/**
 * Get the current audit context.
 */
const getAuditContext = () => {
    return auditStorage.getStore();
};

/**
 * Update the current audit context with authenticated user info.
 */
const updateAuditContext = (userUpdate) => {
    const store = auditStorage.getStore();
    if (store) {
        Object.assign(store, userUpdate);
    }
};

module.exports = {
    auditContextMiddleware,
    getAuditContext,
    updateAuditContext
};
