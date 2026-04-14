const express = require('express');
const router = express.Router();
const billingController = require('./billing.controller');
const { verifyJWT, authorizeRoles } = require('../../middleware/auth');

router.use(verifyJWT);

// Config
router.post('/config', authorizeRoles('ADMIN'), billingController.setConfig);
router.get('/config/:societyId', authorizeRoles('ADMIN'), billingController.getConfig);

// Bills
router.post('/generate', authorizeRoles('ADMIN'), billingController.generateBills);
router.get('/bills', authorizeRoles('ADMIN'), billingController.getBills);
router.get('/bills/overdue', authorizeRoles('ADMIN'), billingController.getOverdueBills);
router.get('/bills/:id', authorizeRoles('ADMIN', 'RESIDENT'), billingController.getBill);
router.get('/bills/:id/download', authorizeRoles('ADMIN', 'RESIDENT'), billingController.downloadInvoice);
router.post('/bills/:id/pay', authorizeRoles('ADMIN'), billingController.recordPayment);

module.exports = router;
