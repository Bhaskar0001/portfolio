const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    society: { type: mongoose.Schema.Types.ObjectId, ref: 'Society', required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    type: {
        type: String,
        enum: ['BILLING', 'COMPLAINT', 'NOTICE', 'VISITOR', 'SYSTEM'],
        required: true
    },
    data: { type: Object },
    isRead: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
