const mongoose = require('mongoose');

const flatSchema = new mongoose.Schema({
    flatNumber: {
        type: String,
        required: [true, 'Flat number is required']
    },
    floor: {
        type: Number,
        required: [true, 'Floor number is required']
    },
    block: {
        type: String,
        required: [true, 'Block/Tower name is required']
    },
    society: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Society',
        required: true
    },
    type: {
        type: String,
        enum: ['1BHK', '2BHK', '3BHK', '4BHK', 'PENTHOUSE', 'STUDIO'],
        default: '2BHK'
    },
    area: {
        type: Number, // in square feet
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    residents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    isOccupied: {
        type: Boolean,
        default: false
    },
    parkingSpots: [{
        spotNumber: { type: String },
        vehicleNumber: { type: String }
    }]
}, {
    timestamps: true
});

// Compound index for uniqueness within a society block
flatSchema.index({ flatNumber: 1, block: 1, society: 1 }, { unique: true });
flatSchema.index({ society: 1, block: 1, flatNumber: 1 }, { unique: true });
flatSchema.index({ society: 1, isOccupied: 1 });

const Flat = mongoose.model('Flat', flatSchema);

module.exports = Flat;
