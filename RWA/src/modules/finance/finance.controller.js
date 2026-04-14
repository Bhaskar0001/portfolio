const Finance = require('./finance.model');
const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');

// SERVICE
const financeService = {
    getReports: async (societyId) => {
        return await Finance.find({ society: societyId, status: 'PUBLISHED' }).sort({ year: -1, month: -1 });
    },
    publishReport: async (data) => {
        return await Finance.findOneAndUpdate(
            { society: data.society, month: data.month, year: data.year },
            { ...data, status: 'PUBLISHED' },
            { upsert: true, new: true }
        );
    }
};

// CONTROLLER
const getReports = catchAsync(async (req, res) => {
    const reports = await financeService.getReports(req.user.society);
    res.status(200).json(new ApiResponse(200, reports, 'Financial reports fetched'));
});

const publishReport = catchAsync(async (req, res) => {
    const report = await financeService.publishReport({ ...req.body, society: req.user.society });
    res.status(201).json(new ApiResponse(201, report, 'Financial report published'));
});

module.exports = { getReports, publishReport, financeService };
