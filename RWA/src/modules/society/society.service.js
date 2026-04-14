const Society = require('./society.model');
const ApiError = require('../../utils/ApiError');

const createSociety = async (societyData, userId) => {
    const society = await Society.create({
        ...societyData,
        admin: userId
    });
    return society;
};

const getSocietyById = async (id) => {
    const society = await Society.findById(id).populate('admin', 'name email phone');
    if (!society) {
        throw new ApiError(404, 'Society not found');
    }
    return society;
};

const updateSociety = async (id, updateData) => {
    const society = await Society.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true
    });
    if (!society) {
        throw new ApiError(404, 'Society not found');
    }
    return society;
};

const addBlock = async (id, blockData) => {
    const society = await Society.findById(id);
    if (!society) {
        throw new ApiError(404, 'Society not found');
    }
    society.blocks.push(blockData);
    await society.save();
    return society;
};

module.exports = {
    createSociety,
    getSocietyById,
    updateSociety,
    addBlock
};
