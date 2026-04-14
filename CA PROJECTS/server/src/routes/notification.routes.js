const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');

router.use(authenticate, tenantIsolation);

router.get('/', notificationController.list);
router.get('/unread-count', notificationController.unreadCount);
router.patch('/:id/read', notificationController.markRead);
router.post('/read-all', notificationController.markAllRead);

module.exports = router;
