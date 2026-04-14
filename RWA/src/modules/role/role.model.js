const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    society: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Society',
        required: true
    },
    permissions: [{
        type: String,
        enum: [
            'dashboard.view',
            'society.manage',
            'flat.view', 'flat.manage',
            'resident.view', 'resident.manage',
            'billing.view', 'billing.manage',
            'complaint.view', 'complaint.manage', 'complaint.resolve',
            'notice.manage',
            'staff.manage',
            'amenity.manage',
            'visitor.view', 'visitor.manage',
            'settings.view', 'settings.manage'
        ]
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Ensure unique role names per society
roleSchema.index({ name: 1, society: 1 }, { unique: true });

module.exports = mongoose.model('Role', roleSchema);
