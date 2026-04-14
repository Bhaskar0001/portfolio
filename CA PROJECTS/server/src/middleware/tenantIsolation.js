/**
 * Tenant Isolation Middleware
 *
 * Ensures all queries are scoped to the current user's tenantId.
 * Provides helper methods for tenant-scoped DB operations.
 */
const { ForbiddenError } = require('../utils/errors');

const tenantIsolation = (req, res, next) => {
    if (!req.tenantId) {
        return next(new ForbiddenError('Tenant context required'));
    }

    // Helper: build a tenant-scoped filter
    req.tenantFilter = (additionalFilter = {}) => ({
        tenantId: req.tenantId,
        ...additionalFilter,
    });

    // Helper: add tenantId to a document before saving
    req.withTenant = (data) => ({
        ...data,
        tenantId: req.tenantId,
    });

    // SuperAdmin can optionally access other tenants
    if (req.user && req.user.roles.includes('SuperAdmin') && req.query._tenantId) {
        req.tenantId = req.query._tenantId;
    }

    next();
};

module.exports = tenantIsolation;
