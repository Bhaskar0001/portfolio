const Visitor = require('./visitor.model');
const NotificationService = require('../notification/notification.service');
const ApiError = require('../../utils/ApiError');

const registerVisitor = async (data, hostId) => {
    return await Visitor.create({
        ...data,
        host: hostId,
        status: 'EXPECTED'
    });
};

const checkIn = async (visitorId) => {
    const visitor = await Visitor.findById(visitorId);
    if (!visitor) throw new ApiError(404, 'Visitor not found');

    visitor.status = 'ENTERED';
    visitor.checkInTime = new Date();
    await visitor.save();

    // Notify Host
    await NotificationService.create({
        userId: visitor.host,
        society: visitor.society,
        title: 'Visitor Arrived',
        body: `Your visitor ${visitor.name} has arrived.`,
        type: 'VISITOR',
        data: { visitorId: visitor._id }
    });

    return visitor;
};

const checkOut = async (visitorId) => {
    const visitor = await Visitor.findById(visitorId);
    if (!visitor || visitor.status !== 'ENTERED') {
        throw new ApiError(400, 'Visitor must be in ENTERED status to check out');
    }

    visitor.status = 'EXITED';
    visitor.checkOutTime = new Date();
    await visitor.save();
    return visitor;
};

const getActiveVisitors = async (societyId) => {
    return await Visitor.find({ society: societyId, status: 'ENTERED' })
        .populate('flat', 'flatNumber block')
        .populate('host', 'name phone');
};

const getVisitors = async (reqQuery) => {
    const { page = 1, limit = 10, society, status, type } = reqQuery;
    const query = {};
    if (society) query.society = society;
    if (status) query.status = status;
    if (type) query.type = type;

    const skip = (page - 1) * limit;

    const visitors = await Visitor.find(query)
        .populate('resident', 'user flat')
        .populate({
            path: 'resident',
            populate: [
                { path: 'user', select: 'name phone' },
                { path: 'flat', select: 'flatNumber block' }
            ]
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

    const total = await Visitor.countDocuments(query);

    return {
        visitors,
        total,
        pages: Math.ceil(total / limit),
        currentPage: Number(page)
    };
};

const getFlatVisitors = async (flatId) => {
    return await Visitor.find({ flat: flatId }).sort({ createdAt: -1 });
};

module.exports = {
    registerVisitor,
    checkIn,
    checkOut,
    getActiveVisitors,
    getVisitors,
    getFlatVisitors
};
