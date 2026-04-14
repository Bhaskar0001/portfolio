const Staff = require('./staff.model');
const ApiError = require('../../utils/ApiError');

const addStaff = async (staffData) => {
    const existing = await Staff.findOne({ user: staffData.user, society: staffData.society });
    if (existing) {
        throw new ApiError(400, 'User is already a staff member in this society');
    }
    return await Staff.create(staffData);
};

const getStaffList = async (societyId, filter = {}) => {
    return await Staff.find({ society: societyId, isActive: true, ...filter })
        .populate('user', 'name email phone');
};

const getStaffById = async (id) => {
    const staff = await Staff.findById(id).populate('user', 'name email phone');
    if (!staff) {
        throw new ApiError(404, 'Staff member not found');
    }
    return staff;
};

const recordAttendance = async (staffId, attendanceData) => {
    const staff = await Staff.findById(staffId);
    if (!staff) {
        throw new ApiError(404, 'Staff member not found');
    }

    // Check if attendance already recorded for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const exists = staff.attendance.find(a => {
        const d = new Date(a.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
    });

    if (exists) {
        Object.assign(exists, attendanceData);
    } else {
        staff.attendance.push({ ...attendanceData, date: new Date() });
    }

    await staff.save();
    return staff;
};

const updateStaff = async (id, updateData) => {
    return await Staff.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
};

module.exports = {
    addStaff,
    getStaffList,
    getStaffById,
    recordAttendance,
    updateStaff
};
