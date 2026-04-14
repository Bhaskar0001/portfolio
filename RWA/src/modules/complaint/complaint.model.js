const mongoose = require('mongoose');

// SLA durations in milliseconds
const SLA_DURATIONS = {
    URGENT: 4 * 60 * 60 * 1000,        // 4 hours
    HIGH: 24 * 60 * 60 * 1000,          // 24 hours
    MEDIUM: 48 * 60 * 60 * 1000,        // 48 hours
    LOW: 7 * 24 * 60 * 60 * 1000        // 7 days
};

const commentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    isStaff: { type: Boolean, default: false }
});

const complaintSchema = new mongoose.Schema({
    society: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Society',
        required: true
    },
    flat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Flat'
    },
    raisedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    title: {
        type: String,
        required: [true, 'Complaint title is required'],
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        maxlength: 2000
    },
    category: {
        type: String,
        enum: ['PLUMBING', 'ELECTRICAL', 'CIVIL', 'PARKING', 'NOISE', 'SECURITY', 'CLEANING', 'OTHER'],
        required: true
    },
    priority: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
        default: 'MEDIUM'
    },
    status: {
        type: String,
        enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED'],
        default: 'OPEN'
    },
    slaDeadline: {
        type: Date
    },
    resolvedAt: {
        type: Date,
        default: null
    },
    slaBreached: {
        type: Boolean,
        default: false
    },
    comments: [commentSchema],
    messages: [messageSchema],
    resolutionProof: {
        url: { type: String },
        timestamp: { type: Date },
        location: { type: String } // Optional: for geo-tagging proof
    },
    actualResolutionTime: { type: Number }, // In milliseconds
    attachments: [{
        url: { type: String },
        type: { type: String }
    }]
}, {
    timestamps: true
});

// Auto-set SLA deadline on creation
complaintSchema.pre('save', function (next) {
    if (this.isNew && this.priority) {
        this.slaDeadline = new Date(Date.now() + SLA_DURATIONS[this.priority]);
    }
    next();
});

complaintSchema.index({ society: 1, status: 1 });
complaintSchema.index({ raisedBy: 1 });
complaintSchema.index({ assignedTo: 1 });

complaintSchema.index({ society: 1, status: 1 });
complaintSchema.index({ society: 1, category: 1 });
complaintSchema.index({ raisedBy: 1 });
complaintSchema.index({ assignedTo: 1 });

const Complaint = mongoose.model('Complaint', complaintSchema);

module.exports = { Complaint, SLA_DURATIONS };
