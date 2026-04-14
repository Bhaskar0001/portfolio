const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { registerValidator, loginValidator } = require('./auth.validator');
const { verifyJWT } = require('../../middleware/auth');

router.post('/register', registerValidator, authController.register);
router.post('/login', loginValidator, authController.login);
router.post('/refresh-token', authController.refreshAccessToken);

// Protected routes
router.post('/logout', verifyJWT, authController.logout);
router.get('/me', verifyJWT, authController.getMe);

module.exports = router;
