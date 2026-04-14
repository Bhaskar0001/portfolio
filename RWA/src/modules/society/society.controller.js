const societyService = require('./society.service');
const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');

const createSociety = catchAsync(async (req, res) => {
    const society = await societyService.createSociety(req.body, req.user._id);
    res.status(201).json(new ApiResponse(201, society, 'Society created successfully'));
});

const getSociety = catchAsync(async (req, res) => {
    const society = await societyService.getSocietyById(req.params.id);
    res.status(200).json(new ApiResponse(200, society, 'Society details fetched'));
});

const updateSociety = catchAsync(async (req, res) => {
    const society = await societyService.updateSociety(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, society, 'Society updated successfully'));
});

const addBlock = catchAsync(async (req, res) => {
    const society = await societyService.addBlock(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, society, 'Block added successfully'));
});

module.exports = {
    createSociety,
    getSociety,
    updateSociety,
    addBlock
};
