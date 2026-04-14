const mongoose = require('mongoose');

const maintenanceChargeSchema = new mongoose.Schema({
    society: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Society',
        required: true,
        unique: true
    },
    charges: [{
        flatType: {
            type: String,
            enum: ['1BHK', '2BHK', '3BHK', '4BHK', 'PENTHOUSE', 'STUDIO'],
            required: true
        },
        amount: {
            type: Number,
            required: [true, 'Charge amount is required'],
            min: 0
        }
    }],
    dueDay: {
        type: Number,
        default: 10,
        min: 1,
        max: 28
    },
    lateFeePerDay: {
        type: Number,
        default: 50
    },
    gracePeriodDays: {
        type: Number,
        default: 5
    }
}, {
    timestamps: true
});

const MaintenanceCharge = mongoose.model('MaintenanceCharge', maintenanceChargeSchema);

// ─── Bill Schema ────────────────────────────────────────

const paymentEntrySchema = new mongoose.Schema({
    amount: { type: Number, required: true },
    method: {
        type: String,
        enum: ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE'],
        required: true
    },
    transactionId: { type: String },
    paidAt: { type: Date, default: Date.now },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: true });

const billSchema = new mongoose.Schema({
    society: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Society',
        required: true
    },
    flat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Flat',
        required: true
    },
    resident: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resident'
    },
    billNumber: {
        type: String,
        required: true,
        unique: true
    },
    month: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    year: {
        type: Number,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    lateFee: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        required: true
    },
    paidAmount: {
        type: Number,
        default: 0
    },
    balance: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE'],
        default: 'PENDING'
    },
    dueDate: {
        type: Date,
        required: true
    },
    paidDate: {
        type: Date,
        default: null
    },
    payments: [paymentEntrySchema]
}, {
    timestamps: true
});

// Prevent duplicate bills for same flat+month+year
billSchema.index({ flat: 1, month: 1, year: 1 }, { unique: true });
billSchema.index({ society: 1, status: 1 });

const Bill = mongoose.model('Bill', billSchema);

module.exports = { MaintenanceCharge, Bill };
