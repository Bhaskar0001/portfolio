const { Amenity, Booking } = require('./amenity.model');
const ApiError = require('../../utils/ApiError');

const createAmenity = async (data) => {
    return await Amenity.create(data);
};

const getAmenities = async (societyId) => {
    return await Amenity.find({ society: societyId, isActive: true });
};

const createBooking = async (bookingData) => {
    const { amenity: amenityId, startTime, endTime } = bookingData;

    const amenity = await Amenity.findById(amenityId);
    if (!amenity || !amenity.isActive) {
        throw new ApiError(404, 'Amenity not found or inactive');
    }

    // Conflict detection
    const conflict = await Booking.findOne({
        amenity: amenityId,
        status: 'CONFIRMED',
        $or: [
            { startTime: { $lt: endTime, $gte: startTime } },
            { endTime: { $gt: startTime, $lte: endTime } }
        ]
    });

    if (conflict) {
        throw new ApiError(400, 'This slot is already booked');
    }

    const booking = await Booking.create({
        ...bookingData,
        amount: amenity.bookingPrice
    });
    return booking;
};

const getUserBookings = async (userId) => {
    return await Booking.find({ user: userId })
        .populate('amenity', 'name')
        .sort({ startTime: -1 });
};

const cancelBooking = async (bookingId, userId) => {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
        throw new ApiError(404, 'Booking not found');
    }
    if (booking.user.toString() !== userId.toString()) {
        throw new ApiError(403, 'Unauthorized to cancel this booking');
    }

    booking.status = 'CANCELLED';
    await booking.save();
    return booking;
};

module.exports = {
    createAmenity,
    getAmenities,
    createBooking,
    getUserBookings,
    cancelBooking
};
