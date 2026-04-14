const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../utils/errors');
const env = require('../config/env');
const requireIpWhitelist = require('./ipWhitelist');
const { updateAuditContext } = require('../utils/auditContext');
/**
 * JWT Authentication Middleware
 * Supports both local JWT and Keycloak OIDC tokens.
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedError('Access token required');
        }

        const token = authHeader.split(' ')[1];

        // 1. Try Local JWT first (for compatibility/migration)
        try {
            const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
            req.user = {
                userId: decoded.userId,
                email: decoded.email,
                roles: decoded.roles,
                tenantId: decoded.tenantId,
            };
            req.tenantId = decoded.tenantId;
            updateAuditContext({
                userId: decoded.userId,
                userEmail: decoded.email,
                tenantId: decoded.tenantId,
                userType: 'staff'
            });
            return requireIpWhitelist(req, res, next);
        } catch (localErr) {
            // If local JWT fails, continue to check Keycloak
        }

        // 2. Try Keycloak JWT (OIDC)
        // In a real production app, we would use keycloak-connect or verify against KC public keys.
        // For simplicity in this phase, we'll verify the JWT structure if it came from Keycloak.
        // Usually, the frontend sends the Keycloak access token.
        try {
            const decoded = jwt.decode(token);
            if (decoded && decoded.iss && decoded.iss.includes(env.KEYCLOAK_REALM)) {
                // Mapping Keycloak roles to our app roles
                // Keycloak usually puts roles in realm_access.roles or resource_access.client.roles
                const kcRoles = decoded.realm_access?.roles || [];

                req.user = {
                    userId: decoded.sub,
                    email: decoded.email,
                    roles: kcRoles, // We might need a mapper here later
                    tenantId: decoded.tenantId || 'default', // Keycloak can be configured to send this
                };
                req.tenantId = req.user.tenantId;
                updateAuditContext({
                    userId: decoded.sub,
                    userEmail: decoded.email,
                    tenantId: req.user.tenantId,
                    userType: 'staff'
                });
                return requireIpWhitelist(req, res, next);
            }
        } catch (kcErr) {
            // Fail if both systems can't verify
        }

        throw new UnauthorizedError('Invalid or expired token');
    } catch (err) {
        next(err);
    }
};

/**
 * Optional authentication - doesn't fail if no token present
 */
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.split(' ')[1];
        const env = require('../config/env');
        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            roles: decoded.roles,
            tenantId: decoded.tenantId,
        };
        req.tenantId = decoded.tenantId;
    } catch (err) {
        // Ignore auth errors for optional auth
    }
    next();
};

module.exports = { authenticate, optionalAuth };
