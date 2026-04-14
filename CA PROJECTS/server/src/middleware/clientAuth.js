const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../utils/errors');
const env = require('../config/env');

/**
 * JWT Authentication Middleware for Client Portal
 */
const authenticateClient = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedError('Access token required for Client Portal');
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
        
        if (decoded.type !== 'client') {
            throw new UnauthorizedError('Invalid token type for Client Portal');
        }

        req.clientUser = {
            userId: decoded.userId, // ClientUser _id
            clientId: decoded.clientId,
            tenantId: decoded.tenantId,
        };
        req.tenantId = decoded.tenantId;
        
        const { updateAuditContext } = require('../utils/auditContext');
        updateAuditContext({
            userId: decoded.userId,
            tenantId: decoded.tenantId,
            userType: 'client'
        });
        
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
             next(new UnauthorizedError('Token expired'));
        } else {
             next(new UnauthorizedError('Invalid token'));
        }
    }
};

module.exports = { authenticateClient };
