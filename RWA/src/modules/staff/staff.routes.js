const express = require('express');
const router = express.Router();
const staffController = require('./staff.controller');
const { verifyJWT, authorizeRoles } = require('../../middleware/auth');

router.use(verifyJWT);

// Only Admin can add/update staff
router.post('/', authorizeRoles('ADMIN'), staffController.addStaff);
router.get('/', authorizeRoles('ADMIN', 'MANAGER'), staffController.getStaffList);
router.get('/:id', authorizeRoles('ADMIN', 'MANAGER'), staffController.getStaff);
router.put('/:id', authorizeRoles('ADMIN'), staffController.updateStaff);
router.post('/:id/attendance', authorizeRoles('ADMIN', 'MANAGER'), staffController.recordAttendance);

module.exports = router;
