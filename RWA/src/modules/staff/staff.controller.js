const staffService = require('./staff.service');
const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');

const addStaff = catchAsync(async (req, res) => {
    const staff = await staffService.addStaff(req.body);
    res.status(201).json(new ApiResponse(201, staff, 'Staff member added successfully'));
});

const getStaffList = catchAsync(async (req, res) => {
    const staff = await staffService.getStaffList(req.query.society, req.query);
    res.status(200).json(new ApiResponse(200, staff, 'Staff list fetched'));
});

const getStaff = catchAsync(async (req, res) => {
    const staff = await staffService.getStaffById(req.params.id);
    res.status(200).json(new ApiResponse(200, staff, 'Staff details fetched'));
});

const recordAttendance = catchAsync(async (req, res) => {
    const staff = await staffService.recordAttendance(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, staff, 'Attendance recorded successfully'));
});

const updateStaff = catchAsync(async (req, res) => {
    const staff = await staffService.updateStaff(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, staff, 'Staff updated successfully'));
});

module.exports = {
    addStaff,
    getStaffList,
    getStaff,
    recordAttendance,
    updateStaff
};
