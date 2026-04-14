const visitorService = require('./visitor.service');
const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');

const emitToSociety = (req, event, data) => {
    const io = req.app.get('io');
    if (io && data.society) {
        io.to(`society:${data.society}`).emit(event, data);
    }
};

const registerVisitor = catchAsync(async (req, res) => {
    const visitor = await visitorService.registerVisitor(req.body, req.user._id);
    emitToSociety(req, 'visitor:new', visitor);
    res.status(201).json(new ApiResponse(201, visitor, 'Visitor pre-registered'));
});

const checkIn = catchAsync(async (req, res) => {
    const visitor = await visitorService.checkIn(req.params.id);
    emitToSociety(req, 'visitor:arrived', visitor);
    res.status(200).json(new ApiResponse(200, visitor, 'Visitor checked in'));
});

const checkOut = catchAsync(async (req, res) => {
    const visitor = await visitorService.checkOut(req.params.id);
    emitToSociety(req, 'visitor:left', visitor);
    res.status(200).json(new ApiResponse(200, visitor, 'Visitor checked out'));
});

const getActiveVisitors = catchAsync(async (req, res) => {
    const visitors = await visitorService.getActiveVisitors(req.query.society);
    res.status(200).json(new ApiResponse(200, visitors, 'Active visitors fetched'));
});

module.exports = {
    registerVisitor,
    checkIn,
    checkOut,
    getActiveVisitors
};
