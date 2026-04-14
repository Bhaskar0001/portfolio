const complaintService = require('./complaint.service');
const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');

const emitToSociety = (req, event, data) => {
    const io = req.app.get('io');
    if (io && data.society) {
        io.to(`society:${data.society}`).emit(event, data);
    }
};

const createComplaint = catchAsync(async (req, res) => {
    const complaint = await complaintService.createComplaint(req.body, req.user._id);
    emitToSociety(req, 'complaint:new', complaint);
    res.status(201).json(new ApiResponse(201, complaint, 'Complaint raised successfully'));
});

const getComplaints = catchAsync(async (req, res) => {
    const complaints = await complaintService.getComplaints(req.query);
    res.status(200).json(new ApiResponse(200, complaints, 'Complaints fetched'));
});

const getMyComplaints = catchAsync(async (req, res) => {
    const complaints = await complaintService.getMyComplaints(req.user._id);
    res.status(200).json(new ApiResponse(200, complaints, 'Your complaints fetched'));
});

const getComplaint = catchAsync(async (req, res) => {
    const complaint = await complaintService.getComplaintById(req.params.id);
    res.status(200).json(new ApiResponse(200, complaint, 'Complaint details fetched'));
});

const assignComplaint = catchAsync(async (req, res) => {
    const complaint = await complaintService.assignComplaint(req.params.id, req.body.staffId);
    emitToSociety(req, 'complaint:update', complaint);
    res.status(200).json(new ApiResponse(200, complaint, 'Complaint assigned'));
});

const updateStatus = catchAsync(async (req, res) => {
    const complaint = await complaintService.updateStatus(req.params.id, req.body.status);
    emitToSociety(req, 'complaint:update', complaint);
    res.status(200).json(new ApiResponse(200, complaint, 'Status updated'));
});

const addComment = catchAsync(async (req, res) => {
    const complaint = await complaintService.addComment(req.params.id, req.user._id, req.body.message);
    emitToSociety(req, 'complaint:comment', complaint);
    res.status(200).json(new ApiResponse(200, complaint, 'Comment added'));
});

const resolveWithProof = catchAsync(async (req, res) => {
    const complaint = await complaintService.resolveWithProof(req.params.id, req.body.proof, req.user._id);
    emitToSociety(req, 'complaint:update', complaint);
    res.status(200).json(new ApiResponse(200, complaint, 'Complaint resolved with proof'));
});

const addChatMessage = catchAsync(async (req, res) => {
    const isStaff = req.user.role === 'STAFF';
    const complaint = await complaintService.addChatMessage(req.params.id, req.user._id, req.body.text, isStaff);
    emitToSociety(req, 'complaint:message', complaint);
    res.status(200).json(new ApiResponse(200, complaint, 'Message sent'));
});

const getStaffTasks = catchAsync(async (req, res) => {
    const tasks = await complaintService.getStaffTasks(req.user._id);
    res.status(200).json(new ApiResponse(200, tasks, 'Assigned tasks fetched'));
});

module.exports = {
    createComplaint,
    getComplaints,
    getMyComplaints,
    getComplaint,
    assignComplaint,
    updateStatus,
    addComment,
    resolveWithProof,
    addChatMessage,
    getStaffTasks
};
