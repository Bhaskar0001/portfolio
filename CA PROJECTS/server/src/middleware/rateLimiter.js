const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000, // Relaxed for dev
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
    },
});

// Stricter rate limiter for auth and MFA endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Increased for dev
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts, please try again in 15 minutes',
    },
});

// Extra strict limiter for MFA verification to prevent brute forcing
const mfaLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Increased for dev
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many MFA verification attempts. Please try again later.',
    },
});

module.exports = { apiLimiter, authLimiter, mfaLimiter };
