const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../modules/auth/user.model');
const Role = require('../modules/role/role.model');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

const verifyJWT = catchAsync(async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies?.accessToken;

    if (!token) {
        throw new ApiError(401, 'Unauthorized request');
    }

    try {
        const decodedToken = jwt.verify(token, config.jwt.secret);
        const user = await User.findById(decodedToken.id).populate('roleId');

        if (!user) {
            throw new ApiError(401, 'Invalid access token');
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || 'Invalid access token');
    }
});

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            throw new ApiError(403, `Role: ${req.user.role} is not allowed to access this resource`);
        }
        next();
    };
};

/**
 * Granular Permission Middleware
 * Always allows ADMIN
 * Otherwise checks if req.user.roleId (Role model) contains the required permission
 */
const authorizePermission = (permission) => {
    return (req, res, next) => {
        if (req.user.role === 'ADMIN') return next();

        if (!req.user.roleId) {
            throw new ApiError(403, 'Access Denied: No role assigned');
        }

        if (!req.user.roleId.permissions.includes(permission)) {
            throw new ApiError(403, `Access Denied: Missing permission [${permission}]`);
        }

        next();
    };
};

module.exports = {
    verifyJWT,
    authorizeRoles,
    authorizePermission
};
