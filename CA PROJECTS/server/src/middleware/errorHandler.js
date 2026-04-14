const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            success: false,
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            errors: messages,
        });
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(409).json({
            success: false,
            code: 'DUPLICATE_KEY',
            message: `Duplicate value for ${field}`,
        });
    }

    // Mongoose cast error
    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            code: 'INVALID_ID',
            message: `Invalid ${err.path}: ${err.value}`,
        });
    }

    // Zod validation error
    if (err.name === 'ZodError' || err.constructor.name === 'ZodError') {
        const errors = Array.isArray(err.errors)
            ? err.errors.map(e => ({
                field: e.path.join('.'),
                message: e.message,
            }))
            : [{ message: err.message }];

        res.status(400);
        return res.json({
            success: false,
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            errors,
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            code: 'INVALID_TOKEN',
            message: 'Invalid token',
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            code: 'TOKEN_EXPIRED',
            message: 'Token has expired',
        });
    }

    // Operational errors (AppError)
    if (err.isOperational) {
        return res.status(err.statusCode).json({
            success: false,
            code: err.code,
            message: err.message,
        });
    }

    // Log unexpected errors
    logger.error({
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    // Unknown errors
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : err.message,
    });
};

module.exports = errorHandler;
