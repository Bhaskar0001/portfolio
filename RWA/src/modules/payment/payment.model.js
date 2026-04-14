const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    billId: { type: mongoose.Schema.Types.ObjectId, ref: 'Billing', required: true },
    society: { type: mongoose.Schema.Types.ObjectId, ref: 'Society', required: true },
    flat: { type: mongoose.Schema.Types.ObjectId, ref: 'Flat', required: true },
    resident: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident', required: true },
    txnId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    status: {
        type: String,
        enum: ['INITIATED', 'SUCCESS', 'FAILED', 'CANCELLED'],
        default: 'INITIATED'
    },
    payuResponse: { type: Object },
    hash: { type: String },
    errorMessage: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
