const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');
const requireIpWhitelist = require('../middleware/ipWhitelist');
const { requirePerm } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const { createUserSchema, updateUserSchema, resetPasswordSchema } = require('../validators/user.validator');

// Secure all admin routes with IP whitelisting
router.use(authenticate, tenantIsolation, requireIpWhitelist);

// Admin stats
router.get('/stats', requirePerm('ADMIN:USERS'), adminController.stats);

// User management
router.get('/users', requirePerm('ADMIN:USERS'), adminController.listUsers);
router.get('/users/:id', requirePerm('ADMIN:USERS'), adminController.getUser);
router.post('/users', requirePerm('ADMIN:USERS'), validate(createUserSchema), adminController.createUser);
router.put('/users/:id', requirePerm('ADMIN:USERS'), validate(updateUserSchema), adminController.updateUser);
router.post('/users/:id/reset-password', requirePerm('ADMIN:USERS'), validate(resetPasswordSchema), adminController.resetPassword);
router.delete('/users/:id', requirePerm('ADMIN:USERS'), adminController.disableUser);

// Audit logs
router.get('/audit-logs', requirePerm('ADMIN:AUDIT'), adminController.listAuditLogs);

// Tenant Settings
router.get('/settings', requirePerm('ADMIN:SETTINGS'), adminController.getSettings);
router.put('/settings', requirePerm('ADMIN:SETTINGS'), adminController.updateSettings);

module.exports = router;
