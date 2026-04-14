const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

const errorHandler = (err, req, res, next) => {
    let error = err;

    if (!(error instanceof ApiError)) {
        const statusCode = error.statusCode || (error instanceof mongoose.Error ? 400 : 500);
        const message = error.message || "Internal Server Error";
        error = new ApiError(statusCode, message, false, err.stack);
    }

    if (error.statusCode >= 400) {
        console.error(`[Error] ${req.method} ${req.url}: ${error.message}`, error.errors);
    }

    const response = {
        success: false,
        message: error.message,
        errors: error.errors || [],
        ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {})
    };

    res.status(error.statusCode).json(response);
};

module.exports = errorHandler;
