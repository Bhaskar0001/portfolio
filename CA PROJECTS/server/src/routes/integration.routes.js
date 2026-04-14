const express = require('express');
const router = express.Router();
const integrationController = require('../controllers/integration.controller');
const { authenticate } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');
const { requirePerm } = require('../middleware/rbac');

router.use(authenticate, tenantIsolation);

router.post('/itd/sync', requirePerm('CLIENT:WRITE'), integrationController.syncItd);
router.post('/gstn/sync', requirePerm('CLIENT:WRITE'), integrationController.syncGstn);
router.get('/verify-pan/:pan', requirePerm('CLIENT:READ'), integrationController.verifyPan);

module.exports = router;
