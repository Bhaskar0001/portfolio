const mongoose = require('mongoose');

const amenitySchema = new mongoose.Schema({
    society: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Society',
        required: true
    },
    name: {
        type: String,
        required: [true, 'Amenity name is required'],
        trim: true
    },
    description: String,
    capacity: {
        type: Number,
        default: 0 // 0 means no limit
    },
    bookingPrice: {
        type: Number,
        default: 0
    },
    isBookable: {
        type: Boolean,
        default: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    openingTime: {
        type: String, // "06:00"
        default: "00:00"
    },
    closingTime: {
        type: String, // "22:00"
        default: "23:59"
    },
    allowedRoles: {
        type: [String],
        default: ['RESIDENT']
    }
}, {
    timestamps: true
});

const bookingSchema = new mongoose.Schema({
    amenity: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Amenity',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    society: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Society',
        required: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
        default: 'CONFIRMED'
    },
    paymentStatus: {
        type: String,
        enum: ['PENDING', 'PAID', 'REFUNDED'],
        default: 'PENDING'
    },
    amount: Number
}, {
    timestamps: true
});

// Avoid double booking at the same time
bookingSchema.index({ amenity: 1, startTime: 1, endTime: 1, status: 1 });

const Amenity = mongoose.model('Amenity', amenitySchema);
const Booking = mongoose.model('Booking', bookingSchema);

module.exports = { Amenity, Booking };
