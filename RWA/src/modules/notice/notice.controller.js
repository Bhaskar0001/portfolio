const noticeService = require('./notice.service');
const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');

const createNotice = catchAsync(async (req, res) => {
    const notice = await noticeService.createNotice(req.body, req.user._id);
    res.status(201).json(new ApiResponse(201, notice, 'Notice created successfully'));
});

const getNotices = catchAsync(async (req, res) => {
    const notices = await noticeService.getNotices(req.query.society, req.query);
    res.status(200).json(new ApiResponse(200, notices, 'Notices fetched'));
});

const getNotice = catchAsync(async (req, res) => {
    const notice = await noticeService.getNoticeById(req.params.id);
    res.status(200).json(new ApiResponse(200, notice, 'Notice details fetched'));
});

const updateNotice = catchAsync(async (req, res) => {
    const notice = await noticeService.updateNotice(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, notice, 'Notice updated successfully'));
});

const deleteNotice = catchAsync(async (req, res) => {
    await noticeService.deleteNotice(req.params.id);
    res.status(200).json(new ApiResponse(200, null, 'Notice deleted successfully'));
});

module.exports = {
    createNotice,
    getNotices,
    getNotice,
    updateNotice,
    deleteNotice
};
