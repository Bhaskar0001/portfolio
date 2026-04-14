const Role = require('./role.model');
const ApiError = require('../../utils/ApiError');

const createRole = async (data) => {
    return await Role.create(data);
};

const getSocietyRoles = async (societyId) => {
    return await Role.find({ society: societyId });
};

const updateRole = async (roleId, data) => {
    const role = await Role.findByIdAndUpdate(roleId, data, { new: true });
    if (!role) throw new ApiError(404, 'Role not found');
    return role;
};

const deleteRole = async (roleId) => {
    return await Role.findByIdAndDelete(roleId);
};

module.exports = {
    createRole,
    getSocietyRoles,
    updateRole,
    deleteRole
};
