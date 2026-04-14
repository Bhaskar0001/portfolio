const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// GET /health — liveness check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'ok',
        service: 'noticeradar-api',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// GET /ready — readiness check (includes DB)
router.get('/ready', async (req, res) => {
    const checks = {
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    };

    const allReady = Object.values(checks).every(v => v === 'connected');

    res.status(allReady ? 200 : 503).json({
        success: allReady,
        status: allReady ? 'ready' : 'not_ready',
        checks,
        timestamp: new Date().toISOString(),
    });
});

module.exports = router;
