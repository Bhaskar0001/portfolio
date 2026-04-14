const residentService = require('./resident.service');
const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');

const createResident = catchAsync(async (req, res) => {
    const resident = await residentService.createResident(req.body);
    res.status(201).json(new ApiResponse(201, resident, 'Resident registered successfully'));
});

const getResidents = catchAsync(async (req, res) => {
    const residents = await residentService.getResidents(req.query);
    res.status(200).json(new ApiResponse(200, residents, 'Residents fetched'));
});

const getResident = catchAsync(async (req, res) => {
    const resident = await residentService.getResidentById(req.params.id);
    res.status(200).json(new ApiResponse(200, resident, 'Resident details fetched'));
});

const updateResident = catchAsync(async (req, res) => {
    const resident = await residentService.updateResident(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, resident, 'Resident updated'));
});

const moveOut = catchAsync(async (req, res) => {
    const resident = await residentService.moveOut(req.params.id);
    res.status(200).json(new ApiResponse(200, resident, 'Resident moved out successfully'));
});

const addVehicle = catchAsync(async (req, res) => {
    const resident = await residentService.addVehicle(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, resident, 'Vehicle added'));
});

const removeVehicle = catchAsync(async (req, res) => {
    const resident = await residentService.removeVehicle(req.params.id, req.params.vid);
    res.status(200).json(new ApiResponse(200, resident, 'Vehicle removed'));
});

module.exports = {
    createResident,
    getResidents,
    getResident,
    updateResident,
    moveOut,
    addVehicle,
    removeVehicle
};
