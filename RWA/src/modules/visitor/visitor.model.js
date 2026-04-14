const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
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
    host: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: [true, 'Visitor name is required'],
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Visitor phone is required']
    },
    purpose: {
        type: String,
        enum: ['PERSONAL', 'DELIVERY', 'MAINTENANCE', 'CAB', 'OTHER'],
        default: 'PERSONAL'
    },
    status: {
        type: String,
        enum: ['EXPECTED', 'ENTERED', 'EXITED', 'CANCELLED'],
        default: 'EXPECTED'
    },
    checkInTime: {
        type: Date,
        default: null
    },
    checkOutTime: {
        type: Date,
        default: null
    },
    vehicleNumber: String,
    expectedDate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

visitorSchema.index({ society: 1, status: 1 });
visitorSchema.index({ flat: 1, expectedDate: 1 });

visitorSchema.index({ society: 1, status: 1 });
visitorSchema.index({ society: 1, host: 1 });
visitorSchema.index({ society: 1, createdAt: -1 });

const Visitor = mongoose.model('Visitor', visitorSchema);

module.exports = Visitor;
