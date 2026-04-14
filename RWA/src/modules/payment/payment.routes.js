const express = require('express');
const router = express.Router();
const PaymentService = require('./payment.service');
const { protect, authorize } = require('../../middleware/auth');

router.post('/initiate', protect, authorize('RESIDENT'), async (req, res) => {
    try {
        const { billId } = req.body;
        const result = await PaymentService.initiatePayment(billId, req.user._id);
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// PayU callbacks (must be public as PayU servers POST to these)
router.post('/success', async (req, res) => {
    try {
        const payment = await PaymentService.verifyResponse(req.body);
        // Redirect back to frontend
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing/my?status=success&txnId=${payment.txnId}`);
    } catch (err) {
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing/my?status=error&message=${err.message}`);
    }
});

router.post('/failure', async (req, res) => {
    try {
        const payment = await PaymentService.verifyResponse(req.body);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing/my?status=failed&txnId=${payment.txnId}`);
    } catch (err) {
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing/my?status=error&message=${err.message}`);
    }
});

router.get('/status/:txnId', protect, async (req, res) => {
    try {
        const payment = await Payment.findOne({ txnId: req.params.txnId });
        res.json({ success: true, data: payment });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

module.exports = router;
