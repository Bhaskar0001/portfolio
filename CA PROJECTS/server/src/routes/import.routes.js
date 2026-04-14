const express = require('express');
const router = express.Router();
const importController = require('../controllers/import.controller');
const upload = require('../config/multer');
const { authenticate } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');
const { requirePerm } = require('../middleware/rbac');

// All routes require auth + tenant
router.use(authenticate, tenantIsolation);

/**
 * POST /api/import/ledger
 * CA uploads a Tally/ERP ledger for automated reconciliation
 */
router.post('/ledger', 
    requirePerm('NOTICE:WRITE'), 
    upload.single('ledgerFile'), 
    importController.importLedger
);

module.exports = router;
