const express = require('express');
const router = express.Router();
const documentController = require('../controllers/document.controller');
const { authenticate } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');
const { requirePerm } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const { presignUploadSchema, documentQuerySchema } = require('../validators/document.validator');

router.use(authenticate, tenantIsolation);

router.get('/', requirePerm('DOCUMENT:READ'), documentController.list);
router.post('/bundle', requirePerm('DOCUMENT:UPLOAD'), documentController.bundle);
router.post('/presign', requirePerm('DOCUMENT:UPLOAD'), validate(presignUploadSchema), documentController.presignUpload);
router.post('/:id/complete', requirePerm('DOCUMENT:UPLOAD'), documentController.completeUpload);
router.post('/:id/verify', requirePerm('DOCUMENT:UPLOAD'), documentController.verify);
router.get('/:id/download', requirePerm('DOCUMENT:READ'), documentController.getDownloadUrl);
router.get('/:id/secure-download', requirePerm('DOCUMENT:READ'), documentController.getSecureDownload);
router.delete('/:id', requirePerm('DOCUMENT:DELETE'), documentController.remove);

module.exports = router;
