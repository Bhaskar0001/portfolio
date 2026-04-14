const DailyHelp = require('./daily-help.model');

const registerHelp = async (data) => {
    const help = await DailyHelp.create(data);
    return help;
};

const getHelpList = async (societyId, residentId) => {
    // Return help associated with this resident OR general help available in society
    return await DailyHelp.find({
        society: societyId,
        $or: [
            { residents: residentId },
            { residents: { $size: 0 } } // General help
        ]
    });
};

const updateStatus = async (helpId, status) => {
    const update = { status };
    if (status === 'IN') update.lastEntry = new Date();
    else update.lastExit = new Date();

    return await DailyHelp.findByIdAndUpdate(helpId, update, { new: true });
};

module.exports = {
    registerHelp,
    getHelpList,
    updateStatus
};
