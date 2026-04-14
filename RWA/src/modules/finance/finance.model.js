const mongoose = require('mongoose');

const financeSchema = new mongoose.Schema({
    society: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Society',
        required: true
    },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    totalIncome: { type: Number, default: 0 },
    totalExpense: { type: Number, default: 0 },
    categories: [{
        name: { type: String, required: true }, // e.g., Electricity, Water, Staff Salary
        amount: { type: Number, required: true },
        type: { type: String, enum: ['INCOME', 'EXPENSE'], required: true }
    }],
    reportUrl: { type: String }, // Link to audited PDF
    status: {
        type: String,
        enum: ['DRAFT', 'PUBLISHED'],
        default: 'DRAFT'
    }
}, {
    timestamps: true
});

financeSchema.index({ society: 1, year: 1, month: 1 }, { unique: true });

const Finance = mongoose.model('Finance', financeSchema);

module.exports = Finance;
