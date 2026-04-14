const express = require('express');
const router = express.Router();
const dashboardService = require('./dashboard.service');
const cache = require('../../middleware/cache');
const { protect, authorize } = require('../../middleware/auth');

router.use(protect);
router.use(authorize('ADMIN'));

router.get('/summary', cache(300), async (req, res) => {
    try {
        const stats = await dashboardService.getSummary(req.user.society);
        res.json({ success: true, data: stats });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

router.get('/trend', cache(600), async (req, res) => {
    try {
        const trend = await dashboardService.getBillingTrend(req.user.society);
        res.json({ success: true, data: trend });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

module.exports = router;
