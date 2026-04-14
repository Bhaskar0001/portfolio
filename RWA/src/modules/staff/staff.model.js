const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
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
    category: {
        type: String,
        enum: ['GUARD', 'ELECTRICIAN', 'PLUMBER', 'CLEANER', 'GARDENER', 'MANAGER', 'OTHER'],
        required: true
    },
    skills: [String],
    experience: String,
    joiningDate: {
        type: Date,
        default: Date.now
    },
    leavingDate: {
        type: Date,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    workTiming: {
        start: String, // "09:00"
        end: String    // "18:00"
    },
    attendance: [{
        date: { type: Date, required: true },
        status: { type: String, enum: ['PRESENT', 'ABSENT', 'LEAVE'], required: true },
        checkIn: Date,
        checkOut: Date
    }]
}, {
    timestamps: true
});

staffSchema.index({ society: 1, category: 1, isActive: 1 });

const Staff = mongoose.model('Staff', staffSchema);

module.exports = Staff;
