const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../modules/auth/user.model');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

/**
 * Protect Middleware
 * Verifies JWT from Header or Cookie
 */
const protect = catchAsync(async (req, res, next) => {
    let token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies?.accessToken;

    if (!token) {
        throw new ApiError(401, 'No token provided, authorization denied');
    }

    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            throw new ApiError(401, 'User not found with this token');
        }

        req.user = user;
        next();
    } catch (err) {
        throw new ApiError(401, 'Token is not valid');
    }
});

/**
 * Authorize roles
 * @param  {...string} roles 
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            throw new ApiError(403, `User role [${req.user.role}] is not authorized to access this resource`);
        }
        next();
    };
};

/**
 * Granular Permission Middleware
 */
const authorizePermission = (permission) => {
    return (req, res, next) => {
        if (req.user.role === 'ADMIN') return next();

        if (!req.user.permissions?.includes(permission)) {
            throw new ApiError(403, `Access Denied: Missing permission [${permission}]`);
        }

        next();
    };
};

module.exports = {
    protect,
    authorize,
    authorizeRoles: authorize, // Alias for older route files
    authorizePermission,
    verifyJWT: protect // Alias for older route files
};
