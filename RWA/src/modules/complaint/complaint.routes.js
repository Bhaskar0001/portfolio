const express = require('express');
const router = express.Router();
const complaintController = require('./complaint.controller');
const { verifyJWT, authorizeRoles } = require('../../middleware/auth');

router.use(verifyJWT);

// Resident Routes
router.post('/', authorizeRoles('RESIDENT'), complaintController.createComplaint);
router.get('/my', authorizeRoles('RESIDENT'), complaintController.getMyComplaints);

// Staff Routes
router.get('/staff/tasks', authorizeRoles('STAFF'), complaintController.getStaffTasks);
router.patch('/:id/resolve-proof', authorizeRoles('STAFF'), complaintController.resolveWithProof);

// Shared/Admin Routes
router.get('/', authorizeRoles('ADMIN', 'STAFF'), complaintController.getComplaints);
router.get('/:id', complaintController.getComplaint);
router.patch('/:id/assign', authorizeRoles('ADMIN'), complaintController.assignComplaint);
router.patch('/:id/status', authorizeRoles('ADMIN', 'STAFF'), complaintController.updateStatus);
router.post('/:id/comments', complaintController.addComment);
router.post('/:id/messages', authorizeRoles('RESIDENT', 'STAFF', 'ADMIN'), complaintController.addChatMessage);

module.exports = router;
