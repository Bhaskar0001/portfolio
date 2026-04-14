const Resident = require('./resident.model');
const Flat = require('../flat/flat.model');
const ApiError = require('../../utils/ApiError');

const createResident = async (data) => {
    // Check for duplicate vehicle plates in the same society
    if (data.vehicles && data.vehicles.length > 0) {
        for (const vehicle of data.vehicles) {
            const existing = await Resident.findOne({
                society: data.society,
                isActive: true,
                'vehicles.number': vehicle.number
            });
            if (existing) {
                throw new ApiError(400, `Vehicle ${vehicle.number} is already registered in this society`);
            }
        }
    }

    const resident = await Resident.create(data);

    // Auto-link to Flat
    await Flat.findByIdAndUpdate(data.flat, {
        $addToSet: { residents: data.user },
        isOccupied: true
    });

    return resident;
};

const getResidents = async (reqQuery) => {
    const { page = 1, limit = 10, society, ...remainingFilter } = reqQuery;
    const query = { isActive: true, ...remainingFilter };
    if (society) query.society = society;

    const skip = (page - 1) * limit;

    const residents = await Resident.find(query)
        .populate('user', 'name email phone role')
        .populate('flat', 'flatNumber block floor')
        .populate('society', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

    const total = await Resident.countDocuments(query);

    return {
        residents,
        total,
        pages: Math.ceil(total / limit),
        currentPage: Number(page)
    };
};

const getResidentById = async (id) => {
    const resident = await Resident.findById(id)
        .populate('user', 'name email phone role')
        .populate('flat', 'flatNumber block floor type area')
        .populate('society', 'name address');
    if (!resident) {
        throw new ApiError(404, 'Resident not found');
    }
    return resident;
};

const updateResident = async (id, updateData) => {
    const resident = await Resident.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true
    });
    if (!resident) {
        throw new ApiError(404, 'Resident not found');
    }
    return resident;
};

const moveOut = async (id) => {
    const resident = await Resident.findById(id);
    if (!resident) {
        throw new ApiError(404, 'Resident not found');
    }
    if (!resident.isActive) {
        throw new ApiError(400, 'Resident is already moved out');
    }

    resident.moveOutDate = new Date();
    resident.isActive = false;
    await resident.save();

    // Remove from flat
    const flat = await Flat.findById(resident.flat);
    if (flat) {
        flat.residents = flat.residents.filter(
            r => r.toString() !== resident.user.toString()
        );
        flat.isOccupied = flat.residents.length > 0;
        await flat.save();
    }

    return resident;
};

const addVehicle = async (residentId, vehicleData) => {
    const resident = await Resident.findById(residentId);
    if (!resident) {
        throw new ApiError(404, 'Resident not found');
    }

    // Check duplicate plate in society
    const duplicate = await Resident.findOne({
        society: resident.society,
        isActive: true,
        'vehicles.number': vehicleData.number.toUpperCase()
    });
    if (duplicate) {
        throw new ApiError(400, `Vehicle ${vehicleData.number} is already registered in this society`);
    }

    resident.vehicles.push(vehicleData);
    await resident.save();
    return resident;
};

const removeVehicle = async (residentId, vehicleId) => {
    const resident = await Resident.findById(residentId);
    if (!resident) {
        throw new ApiError(404, 'Resident not found');
    }
    resident.vehicles = resident.vehicles.filter(
        v => v._id.toString() !== vehicleId
    );
    await resident.save();
    return resident;
};

module.exports = {
    createResident,
    getResidents,
    getResidentById,
    updateResident,
    moveOut,
    addVehicle,
    removeVehicle
};
