const mongoose = require('mongoose');

const residentSchema = new mongoose.Schema({
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
    flat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Flat',
        required: true
    },
    type: {
        type: String,
        enum: ['OWNER', 'TENANT'],
        required: [true, 'Resident type (OWNER/TENANT) is required']
    },
    moveInDate: {
        type: Date,
        default: Date.now
    },
    moveOutDate: {
        type: Date,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    familyMembers: [{
        name: { type: String, required: true },
        relation: {
            type: String,
            enum: ['SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER'],
            required: true
        },
        phone: { type: String },
        age: { type: Number }
    }],
    vehicles: [{
        type: {
            type: String,
            enum: ['CAR', 'BIKE', 'SCOOTER', 'OTHER'],
            required: true
        },
        number: {
            type: String,
            required: [true, 'Vehicle registration number is required'],
            uppercase: true
        },
        make: { type: String },
        parkingSlot: { type: String }
    }],
    emergencyContact: {
        name: { type: String },
        phone: { type: String },
        relation: { type: String }
    },
    documents: [{
        type: {
            type: String,
            enum: ['AADHAAR', 'PAN', 'RENTAL_AGREEMENT', 'SALE_DEED', 'OTHER']
        },
        url: { type: String }
    }]
}, {
    timestamps: true
});

// Index for fast lookup
residentSchema.index({ society: 1, isActive: 1 });
residentSchema.index({ flat: 1 });

residentSchema.index({ society: 1, user: 1 }, { unique: true });
residentSchema.index({ society: 1, type: 1, isActive: 1 });
residentSchema.index({ society: 1, flat: 1 });

const Resident = mongoose.model('Resident', residentSchema);

module.exports = Resident;
