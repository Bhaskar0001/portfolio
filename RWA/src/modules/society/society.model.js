const mongoose = require('mongoose');

const societySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Society name is required'],
        trim: true
    },
    address: {
        type: String,
        required: [true, 'Society address is required']
    },
    city: {
        type: String,
        required: [true, 'City is required']
    },
    state: {
        type: String,
        required: [true, 'State is required']
    },
    pincode: {
        type: String,
        required: [true, 'Pincode is required']
    },
    registrationNumber: {
        type: String,
        unique: true
    },
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    blocks: [{
        name: { type: String, required: true },
        totalFloors: { type: Number, default: 0 }
    }],
    theme: {
        primaryColor: { type: String, default: '#007bff' },
        secondaryColor: { type: String, default: '#6c757d' },
        logo: { type: String } // URL to Cloudinary/S3
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

const Society = mongoose.model('Society', societySchema);

module.exports = Society;
