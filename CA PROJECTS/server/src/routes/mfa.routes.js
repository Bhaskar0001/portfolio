const express = require('express');
const router = express.Router();
const mfaController = require('../controllers/mfa.controller');
const { authenticate } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');
const { mfaLimiter } = require('../middleware/rateLimiter');

router.use(authenticate, tenantIsolation);

router.post('/setup', mfaLimiter, mfaController.setup);
router.post('/verify', mfaLimiter, mfaController.verifyAndEnable);
router.post('/disable', mfaLimiter, mfaController.disable);

module.exports = router;
