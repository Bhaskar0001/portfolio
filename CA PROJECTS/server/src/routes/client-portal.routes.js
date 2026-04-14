const express = require('express');
const router = express.Router();
const clientPortalController = require('../controllers/client-portal.controller');
const { authenticateClient } = require('../middleware/clientAuth');
const { authLimiter, mfaLimiter } = require('../middleware/rateLimiter');
const upload = require('../config/multer');

// Public routes (Login & OTP) - Rate Limited
router.post('/login', authLimiter, clientPortalController.login);
router.post('/request-otp', authLimiter, clientPortalController.requestOtp);
router.post('/verify-otp', mfaLimiter, clientPortalController.verifyOtp);
router.post('/refresh', authLimiter, clientPortalController.refresh);

// Protected routes (Dashboard & Data)
router.use(authenticateClient);

router.get('/me', clientPortalController.getMe);
router.get('/notices', clientPortalController.getNotices);
router.get('/notices/:id', clientPortalController.getNoticeById);
router.post('/notices/:id/documents', upload.single('file'), clientPortalController.uploadDocument); // For file uploads
router.get('/notices/:id/response/pdf', clientPortalController.downloadResponsePdf);
router.post('/logout', clientPortalController.logout);

module.exports = router;
