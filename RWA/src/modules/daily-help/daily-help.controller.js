const helpService = require('./daily-help.service');
const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');

const registerHelp = catchAsync(async (req, res) => {
    const help = await helpService.registerHelp({ ...req.body, society: req.user.society });
    res.status(201).json(new ApiResponse(201, help, 'Daily help registered'));
});

const getMyHelp = catchAsync(async (req, res) => {
    const helpList = await helpService.getHelpList(req.user.society, req.user._id);
    res.status(200).json(new ApiResponse(200, helpList, 'Help list fetched'));
});

const updateStatus = catchAsync(async (req, res) => {
    const help = await helpService.updateStatus(req.params.id, req.body.status);
    res.status(200).json(new ApiResponse(200, help, 'Status updated'));
});

module.exports = {
    registerHelp,
    getMyHelp,
    updateStatus
};
