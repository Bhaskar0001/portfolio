const express = require('express');
const router = express.Router();
const NotificationService = require('./notification.service');
const { protect } = require('../../middleware/auth');

router.get('/', protect, async (req, res) => {
    try {
        const notifications = await NotificationService.getUserNotifications(req.user._id, req.query);
        const unreadCount = await NotificationService.getUnreadCount(req.user._id);
        res.json({ success: true, count: notifications.length, unreadCount, data: notifications });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

router.patch('/:id/read', protect, async (req, res) => {
    try {
        const notification = await NotificationService.markAsRead(req.params.id, req.user._id);
        res.json({ success: true, data: notification });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

module.exports = router;
