const express = require('express');
const router = express.Router();
const amenityController = require('./amenity.controller');
const { verifyJWT, authorizeRoles } = require('../../middleware/auth');

router.use(verifyJWT);

router.get('/', amenityController.getAmenities);
router.post('/book', amenityController.createBooking);
router.get('/my-bookings', amenityController.getMyBookings);

// Admin only
router.post('/', authorizeRoles('ADMIN'), amenityController.createAmenity);

module.exports = router;
