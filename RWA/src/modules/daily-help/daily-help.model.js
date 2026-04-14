const mongoose = require('mongoose');

const dailyHelpSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    category: { type: String, required: true }, // Maid, Driver, Cook, Nanny
    idNumber: { type: String, required: true }, // Aadhar, etc.
    society: { type: mongoose.Schema.Types.ObjectId, ref: 'Society', required: true },
    residents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Residents they serve
    status: { type: String, enum: ['IN', 'OUT'], default: 'OUT' },
    lastEntry: { type: Date },
    lastExit: { type: Date },
    avatar: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('DailyHelp', dailyHelpSchema);
