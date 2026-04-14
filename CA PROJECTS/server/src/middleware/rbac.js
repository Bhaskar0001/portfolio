const { ForbiddenError } = require('../utils/errors');
const { hasPermission } = require('../utils/permissions');

/**
 * RBAC Middleware Factory
 * @param {string} permission - Required permission, e.g. 'NOTICE:WRITE'
 */
const requirePerm = (permission) => {
    return (req, res, next) => {
        if (!req.user || !req.user.roles) {
            return next(new ForbiddenError('Authentication required'));
        }

        if (!hasPermission(req.user.roles, permission)) {
            return next(new ForbiddenError(`Insufficient permissions: ${permission} required`));
        }

        next();
    };
};

/**
 * Require any of the specified roles
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.roles) {
            return next(new ForbiddenError('Authentication required'));
        }

        const hasRole = req.user.roles.some(role => roles.includes(role));
        if (!hasRole) {
            return next(new ForbiddenError(`Required role: ${roles.join(' or ')}`));
        }

        next();
    };
};

module.exports = { requirePerm, requireRole };
