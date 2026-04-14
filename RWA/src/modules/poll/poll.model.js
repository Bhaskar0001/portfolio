const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
    society: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Society',
        required: true
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    question: {
        type: String,
        required: true,
        trim: true
    },
    options: [{
        text: { type: String, required: true },
        votes: { type: Number, default: 0 }
    }],
    voters: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        optionIndex: { type: Number },
        votedAt: { type: Date, default: Date.now }
    }],
    expiresAt: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    category: {
        type: String,
        enum: ['MAINTENANCE', 'EVENTS', 'RULES', 'FACILITIES', 'OTHER'],
        default: 'OTHER'
    }
}, {
    timestamps: true
});

// Index for performance
pollSchema.index({ society: 1, isActive: 1 });
pollSchema.index({ expiresAt: 1 });

const Poll = mongoose.model('Poll', pollSchema);

module.exports = Poll;
