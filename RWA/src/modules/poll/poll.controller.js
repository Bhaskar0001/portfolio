const Poll = require('./poll.model');
const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');

// SERVICE
const pollService = {
    createPoll: async (data, userId) => {
        return await Poll.create({ ...data, creator: userId });
    },
    getPolls: async (societyId) => {
        return await Poll.find({ society: societyId }).sort({ createdAt: -1 });
    },
    vote: async (pollId, userId, optionIndex) => {
        const poll = await Poll.findById(pollId);
        if (!poll) throw new ApiError(404, 'Poll not found');
        if (new Date() > poll.expiresAt) throw new ApiError(400, 'Poll has expired');

        const alreadyVoted = poll.voters.some(v => v.user.toString() === userId.toString());
        if (alreadyVoted) throw new ApiError(400, 'You have already voted');

        poll.options[optionIndex].votes += 1;
        poll.voters.push({ user: userId, optionIndex });
        await poll.save();
        return poll;
    }
};

// CONTROLLER
const createPoll = catchAsync(async (req, res) => {
    const poll = await pollService.createPoll(req.body, req.user._id);
    res.status(201).json(new ApiResponse(201, poll, 'Poll created'));
});

const getPolls = catchAsync(async (req, res) => {
    const polls = await pollService.getPolls(req.user.society);
    res.status(200).json(new ApiResponse(200, polls, 'Polls fetched'));
});

const vote = catchAsync(async (req, res) => {
    const poll = await pollService.vote(req.params.id, req.user._id, req.body.optionIndex);
    res.status(200).json(new ApiResponse(200, poll, 'Vote cast successfully'));
});

module.exports = { createPoll, getPolls, vote, pollService };
