const express = require('express');
const router = express.Router();
const portalController = require('../controllers/portal.controller');
const upload = require('../config/multer');
const { authenticate } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');
const { requirePerm } = require('../middleware/rbac');

// ── Public routes (client-facing, no auth) ──────────────
router.get('/portal/:token', portalController.getPortal);
router.post('/portal/:token/upload/:docIndex', upload.single('file'), portalController.uploadDocument);

// ── Authenticated routes (CA-facing) ────────────────────
router.use(authenticate, tenantIsolation);
router.get('/', requirePerm('NOTICE:READ'), portalController.list);
router.get('/:id', requirePerm('NOTICE:READ'), portalController.getById);
router.post('/', requirePerm('NOTICE:WRITE'), portalController.create);

module.exports = router;
