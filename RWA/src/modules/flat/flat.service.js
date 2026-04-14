const Flat = require('./flat.model');
const ApiError = require('../../utils/ApiError');

const createFlat = async (flatData) => {
    const flat = await Flat.create(flatData);
    return flat;
};

const getFlats = async (filter) => {
    const flats = await Flat.find(filter).populate('owner', 'name email phone').populate('residents', 'name email phone');
    return flats;
};

const getFlatById = async (id) => {
    const flat = await Flat.findById(id).populate('owner residents', 'name email phone');
    if (!flat) {
        throw new ApiError(404, 'Flat not found');
    }
    return flat;
};

const updateFlat = async (id, updateData) => {
    const flat = await Flat.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true
    });
    if (!flat) {
        throw new ApiError(404, 'Flat not found');
    }
    return flat;
};

const assignResident = async (flatId, residentId) => {
    const flat = await Flat.findById(flatId);
    if (!flat) {
        throw new ApiError(404, 'Flat not found');
    }
    if (!flat.residents.includes(residentId)) {
        flat.residents.push(residentId);
        flat.isOccupied = true;
        await flat.save();
    }
    return flat;
};

const getMyParking = async (userId) => {
    const flat = await Flat.findOne({ residents: userId }).select('parkingSpots');
    return flat ? flat.parkingSpots : [];
};

const searchVehicle = async (vehicleNumber, societyId) => {
    const flat = await Flat.findOne({
        society: societyId,
        'parkingSpots.vehicleNumber': vehicleNumber.toUpperCase()
    }).populate('residents', 'name phone');

    if (!flat) return null;

    const resident = flat.residents[0] || { name: 'Owner', phone: 'Unknown' };
    return {
        residentName: resident.name,
        phone: resident.phone,
        flatInfo: `${flat.block}-${flat.flatNumber}`
    };
};

module.exports = {
    createFlat,
    getFlats,
    getFlatById,
    updateFlat,
    assignResident,
    getMyParking,
    searchVehicle
};
