const { Amenity, Booking } = require('./amenity.model');
const catchAsync = require('../../utils/catchAsync');
const ApiError = require('../../utils/ApiError');

const getAmenities = catchAsync(async (req, res) => {
    const amenities = await Amenity.find({ society: req.user.society, isActive: true });
    res.json({ success: true, data: amenities });
});

const createAmenity = catchAsync(async (req, res) => {
    const amenity = await Amenity.create({
        ...req.body,
        society: req.user.society
    });
    res.status(201).json({ success: true, data: amenity });
});

const createBooking = catchAsync(async (req, res) => {
    const { amenityId, startTime, endTime } = req.body;

    // Check overlapping bookings
    const overlap = await Booking.findOne({
        amenity: amenityId,
        status: 'CONFIRMED',
        $or: [
            { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
        ]
    });

    if (overlap) {
        throw new ApiError(400, 'Amenity is already booked for this time slot');
    }

    const booking = await Booking.create({
        amenity: amenityId,
        user: req.user._id,
        society: req.user.society,
        startTime,
        endTime,
        status: 'CONFIRMED'
    });

    res.status(201).json({ success: true, data: booking });
});

const getMyBookings = catchAsync(async (req, res) => {
    const bookings = await Booking.find({ user: req.user._id }).populate('amenity');
    res.json({ success: true, data: bookings });
});

module.exports = {
    getAmenities,
    createAmenity,
    createBooking,
    getMyBookings
};
