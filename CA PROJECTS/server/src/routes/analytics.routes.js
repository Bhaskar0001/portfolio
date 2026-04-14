const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticate } = require('../middleware/auth');

router.get('/dashboard', authenticate, analyticsController.getDashboardStats);

module.exports = router;
