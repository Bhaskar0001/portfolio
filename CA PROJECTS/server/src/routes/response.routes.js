const express = require('express');
const router = express.Router();
const responseController = require('../controllers/response.controller');
const { authenticate } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');
const requireIpWhitelist = require('../middleware/ipWhitelist');
const { requirePerm, requireRole } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const {
    createResponseSchema,
    updateResponseSchema,
    reviewerCommentSchema,
    markFiledSchema,
} = require('../validators/response.validator');

// Secure all response routes with IP whitelisting
router.use(authenticate, tenantIsolation, requireIpWhitelist);

// CRUD
router.get('/', requirePerm('RESPONSE:READ'), responseController.list);
router.get('/:id', requirePerm('RESPONSE:READ'), responseController.getById);
router.post('/', requirePerm('RESPONSE:WRITE'), validate(createResponseSchema), responseController.create);
router.patch('/:id', requirePerm('RESPONSE:WRITE'), validate(updateResponseSchema), responseController.update);
router.post('/ai-draft', requirePerm('RESPONSE:WRITE'), responseController.generateAiDraft);

// Workflow
router.post('/:id/submit-review', requirePerm('RESPONSE:WRITE'), responseController.submitForReview);
router.post('/:id/reviewer-comment', requirePerm('RESPONSE:REVIEW'), validate(reviewerCommentSchema), responseController.addReviewerComment);
router.post('/:id/approve', requirePerm('RESPONSE:REVIEW'), responseController.approve);
router.post('/:id/reject', requirePerm('RESPONSE:REVIEW'), responseController.reject);

// PDF + Filing
router.post('/:id/generate-pdf', requirePerm('RESPONSE:READ'), responseController.generatePdf);
router.post('/:id/mark-filed', requirePerm('RESPONSE:WRITE'), validate(markFiledSchema), responseController.markFiled);

// Destructive Actions locked to high-privilege roles
router.delete('/:id', requireRole('Partner', 'TenantAdmin'), responseController.delete);

module.exports = router;
