const Notice = require('./notice.model');
const NotificationService = require('../notification/notification.service');
const ApiError = require('../../utils/ApiError');

const createNotice = async (noticeData, userId) => {
    const notice = await Notice.create({
        ...noticeData,
        author: userId
    });

    // Notify All in Society (Simplified for now)
    await NotificationService.create({
        userId: userId, // Placeholder for broadcast
        society: noticeData.society,
        title: 'New Notice Posted',
        body: noticeData.title,
        type: 'NOTICE',
        data: { noticeId: notice._id }
    });

    return notice;
};

const getNotices = async (societyId) => {
    return await Notice.find({ society: societyId }).sort({ createdAt: -1 });
};

const deleteNotice = async (noticeId) => {
    return await Notice.findByIdAndDelete(noticeId);
};

module.exports = {
    createNotice,
    getNotices,
    deleteNotice
};
