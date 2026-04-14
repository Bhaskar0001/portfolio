const { Complaint, SLA_DURATIONS } = require('./complaint.model');
const NotificationService = require('../notification/notification.service');
const ApiError = require('../../utils/ApiError');

const REOPEN_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours

const createComplaint = async (data, userId) => {
    const complaint = await Complaint.create({
        ...data,
        raisedBy: userId
    });

    // Notify Admin (Simplified)
    await NotificationService.create({
        userId: userId,
        society: data.society,
        title: 'New Complaint Raised',
        body: `Complaint: ${data.title}`,
        type: 'COMPLAINT',
        data: { complaintId: complaint._id }
    });

    return complaint;
};

const getComplaints = async (reqQuery) => {
    const { page = 1, limit = 10, society, status, category, priority } = reqQuery;
    const query = {};
    if (society) query.society = society;
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;

    const skip = (page - 1) * limit;

    const complaints = await Complaint.find(query)
        .populate('raisedBy', 'name email phone')
        .populate('assignedTo', 'name email phone')
        .populate('flat', 'flatNumber block')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

    const total = await Complaint.countDocuments(query);

    return {
        complaints,
        total,
        pages: Math.ceil(total / limit),
        currentPage: Number(page)
    };
};

const getMyComplaints = async (userId) => {
    return await Complaint.find({ raisedBy: userId })
        .populate('assignedTo', 'name phone')
        .sort({ createdAt: -1 });
};

const getComplaintById = async (id) => {
    const complaint = await Complaint.findById(id)
        .populate('raisedBy', 'name email phone')
        .populate('assignedTo', 'name email phone')
        .populate('flat', 'flatNumber block')
        .populate('comments.user', 'name role');
    if (!complaint) {
        throw new ApiError(404, 'Complaint not found');
    }
    return complaint;
};

const assignComplaint = async (complaintId, staffId) => {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
        throw new ApiError(404, 'Complaint not found');
    }
    complaint.assignedTo = staffId;
    if (complaint.status === 'OPEN' || complaint.status === 'REOPENED') {
        complaint.status = 'ASSIGNED';
    }
    await complaint.save();
    return complaint;
};

const updateStatus = async (complaintId, newStatus) => {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
        throw new ApiError(404, 'Complaint not found');
    }

    const validTransitions = {
        OPEN: ['ASSIGNED', 'IN_PROGRESS'],
        ASSIGNED: ['IN_PROGRESS', 'RESOLVED'],
        IN_PROGRESS: ['RESOLVED'],
        RESOLVED: ['CLOSED', 'REOPENED'],
        REOPENED: ['ASSIGNED', 'IN_PROGRESS'],
        CLOSED: []
    };

    if (!validTransitions[complaint.status]?.includes(newStatus)) {
        throw new ApiError(400, `Cannot transition from ${complaint.status} to ${newStatus}`);
    }

    // Special check for RESOLVED without proof - logic can be added here if needed
    // or handled in dedicated resolveWithProof function

    complaint.status = newStatus;

    if (newStatus === 'RESOLVED') {
        complaint.resolvedAt = new Date();
        complaint.slaBreached = complaint.resolvedAt > complaint.slaDeadline;
        complaint.actualResolutionTime = complaint.resolvedAt - complaint.createdAt;
    }

    await complaint.save();

    // Notify Resident
    await NotificationService.create({
        userId: complaint.raisedBy,
        society: complaint.society,
        title: 'Complaint Status Updated',
        body: `Your complaint is now: ${newStatus}`,
        type: 'COMPLAINT',
        data: { complaintId: complaint._id }
    });

    return complaint;
};

const resolveWithProof = async (complaintId, proofData, staffId) => {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) throw new ApiError(404, 'Complaint not found');

    // Authorization check (simplified for now)
    if (complaint.assignedTo?.toString() !== staffId.toString()) {
        throw new ApiError(403, 'You are not assigned to this complaint');
    }

    complaint.status = 'RESOLVED';
    complaint.resolutionProof = {
        url: proofData.url,
        timestamp: new Date(),
        location: proofData.location
    };
    complaint.resolvedAt = new Date();
    complaint.slaBreached = complaint.resolvedAt > complaint.slaDeadline;
    complaint.actualResolutionTime = complaint.resolvedAt - complaint.createdAt;

    await complaint.save();
    return complaint;
};

const addChatMessage = async (complaintId, userId, text, isStaff) => {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) throw new ApiError(404, 'Complaint not found');

    complaint.messages.push({
        sender: userId,
        text,
        isStaff,
        timestamp: new Date()
    });

    await complaint.save();
    return complaint;
};

const getStaffTasks = async (staffId) => {
    return await Complaint.find({ assignedTo: staffId, status: { $ne: 'CLOSED' } })
        .populate('raisedBy', 'name phone')
        .populate('flat', 'flatNumber block')
        .sort({ priority: -1, createdAt: 1 });
};

const addComment = async (complaintId, userId, message) => {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
        throw new ApiError(404, 'Complaint not found');
    }
    complaint.comments.push({ user: userId, message });
    await complaint.save();
    return complaint;
};

module.exports = {
    createComplaint,
    getComplaintById,
    assignComplaint,
    updateStatus,
    addComment,
    resolveWithProof,
    addChatMessage,
    getStaffTasks
};
