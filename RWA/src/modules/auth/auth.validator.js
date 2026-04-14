const { body } = require('express-validator');
const { validationResult } = require('express-validator');
const ApiError = require('../../utils/ApiError');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next();
    }
    const extractedErrors = [];
    errors.array().map(err => extractedErrors.push({ [err.path]: err.msg }));

    throw new ApiError(422, "Validation Failed", extractedErrors);
};

const registerValidator = [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Invalid email format'),
    body('phone').isLength({ min: 10, max: 10 }).withMessage('Phone must be 10 digits'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validate
];

const loginValidator = [
    body('loginId').notEmpty().withMessage('Email or phone is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
];

module.exports = {
    registerValidator,
    loginValidator
};
