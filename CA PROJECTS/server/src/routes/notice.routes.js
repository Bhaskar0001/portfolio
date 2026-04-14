const express = require('express');
const router = express.Router();
const noticeController = require('../controllers/notice.controller');
const extractionController = require('../controllers/extraction.controller');
const upload = require('../config/multer');
const { requirePerm, requireRole } = require('../middleware/rbac');
const { authenticate } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');
const requireIpWhitelist = require('../middleware/ipWhitelist');
const validate = require('../middleware/validate');
const { createNoticeSchema, updateNoticeSchema, assignNoticeSchema, statusChangeSchema } = require('../validators/notice.validator');

// Secure all notice routes with IP whitelisting
router.use(authenticate, tenantIsolation, requireIpWhitelist);

router.get('/', requirePerm('NOTICE:READ'), noticeController.list);
router.get('/stats', requirePerm('NOTICE:READ'), noticeController.stats);
router.post('/quick-scan', requirePerm('NOTICE:WRITE'), upload.single('noticeFile'), extractionController.quickScan);
router.post('/sync', requirePerm('NOTICE:WRITE'), noticeController.sync);
router.get('/settings', requirePerm('NOTICE:READ'), noticeController.getSettings);
router.put('/settings', requirePerm('NOTICE:WRITE'), noticeController.updateSettings);

router.get('/:id', requirePerm('NOTICE:READ'), noticeController.getById);
router.post('/', requirePerm('NOTICE:WRITE'), validate(createNoticeSchema), noticeController.create);
router.put('/:id', requirePerm('NOTICE:WRITE'), validate(updateNoticeSchema), noticeController.update);
router.patch('/:id/assign', requirePerm('NOTICE:ASSIGN'), validate(assignNoticeSchema), noticeController.assign);
router.patch('/:id/status', requirePerm('NOTICE:WRITE'), validate(statusChangeSchema), noticeController.changeStatus);
router.patch('/:id/watchers', requirePerm('NOTICE:WRITE'), noticeController.updateWatchers);

router.get('/:id/activities', requirePerm('NOTICE:READ'), noticeController.getActivities);
router.post('/:id/comments', requirePerm('NOTICE:WRITE'), noticeController.addComment);
router.post('/:id/analyze', requirePerm('NOTICE:WRITE'), noticeController.analyze);
router.post('/:id/draft-ai', requirePerm('NOTICE:WRITE'), noticeController.draftAI);

// Destructive Actions locked to high-privilege roles
router.delete('/:id', requireRole('Partner', 'TenantAdmin'), noticeController.delete);

module.exports = router;
