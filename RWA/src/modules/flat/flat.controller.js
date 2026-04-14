const flatService = require('./flat.service');
const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');

const createFlat = catchAsync(async (req, res) => {
    const flat = await flatService.createFlat(req.body);
    res.status(201).json(new ApiResponse(201, flat, 'Flat created successfully'));
});

const getFlats = catchAsync(async (req, res) => {
    const flats = await flatService.getFlats(req.query);
    res.status(200).json(new ApiResponse(200, flats, 'Flats fetched successfully'));
});

const getFlat = catchAsync(async (req, res) => {
    const flat = await flatService.getFlatById(req.params.id);
    res.status(200).json(new ApiResponse(200, flat, 'Flat details fetched'));
});

const updateFlat = catchAsync(async (req, res) => {
    const flat = await flatService.updateFlat(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, flat, 'Flat updated successfully'));
});

const assignResident = catchAsync(async (req, res) => {
    const { residentId } = req.body;
    const flat = await flatService.assignResident(req.params.id, residentId);
    res.status(200).json(new ApiResponse(200, flat, 'Resident assigned successfully'));
});

const getMyParking = catchAsync(async (req, res) => {
    const parking = await flatService.getMyParking(req.user._id);
    res.status(200).json(new ApiResponse(200, parking, 'Parking fetched'));
});

const searchVehicle = catchAsync(async (req, res) => {
    const info = await flatService.searchVehicle(req.query.number, req.user.society);
    if (!info) {
        return res.status(404).json(new ApiResponse(404, null, 'Vehicle not found'));
    }
    res.status(200).json(new ApiResponse(200, info, 'Vehicle info fetched'));
});

module.exports = {
    createFlat,
    getFlats,
    getFlat,
    updateFlat,
    assignResident,
    getMyParking,
    searchVehicle
};
