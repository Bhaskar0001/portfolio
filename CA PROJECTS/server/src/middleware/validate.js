const { BadRequestError } = require('../utils/errors');

/**
 * Zod validation middleware factory
 * @param {import('zod').ZodSchema} schema
 * @param {'body'|'query'|'params'} source
 */
const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        try {
            const result = schema.parse(req[source]);
            req[source] = result; // Use sanitized data
            next();
        } catch (err) {
            if (err.name === 'ZodError') {
                return res.status(400).json({
                    success: false,
                    code: 'VALIDATION_ERROR',
                    message: 'Validation failed',
                    errors: err.errors.map(e => ({
                        field: e.path.join('.'),
                        message: e.message,
                    })),
                });
            }
            next(err);
        }
    };
};

module.exports = validate;
