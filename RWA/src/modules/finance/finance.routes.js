const express = require('express');
const router = express.Router();
const financeController = require('./finance.controller');
const { verifyJWT, authorizeRoles } = require('../../middleware/auth');

router.use(verifyJWT);

router.get('/reports', financeController.getReports);
router.post('/publish', authorizeRoles('ADMIN'), financeController.publishReport);

module.exports = router;
