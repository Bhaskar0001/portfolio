const { Worker } = require('bullmq');
const { connection, queueEmail, queueNotification } = require('./queue');
const Notice = require('../models/Notice');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

/**
 * Deadline Check Worker
 * Scans all active notices for upcoming/overdue deadlines
 */
const startDeadlineWorker = () => {
    const worker = new Worker('deadline-check', async (job) => {
        logger.info(`[DeadlineWorker] Processing: ${job.name}`);

        if (job.name === 'check-deadlines') {
            await checkDeadlines();
        } else if (job.name === 'daily-summary') {
            await sendDailySummaries();
        }
    }, {
        connection,
        concurrency: 1,
        limiter: { max: 1, duration: 60000 }, // Max 1 job per minute
    });

    worker.on('completed', (job) => {
        logger.info(`[DeadlineWorker] Completed: ${job.name}`);
    });

    worker.on('failed', (job, err) => {
        logger.error(`[DeadlineWorker] Failed: ${job?.name} — ${err.message}`);
    });

    return worker;
};

/**
 * Check for overdue and upcoming deadlines
 */
async function checkDeadlines() {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Find notices that are due within 7 days or overdue
    const urgentNotices = await Notice.find({
        status: { $nin: ['Filed', 'Closed'] },
        dueDate: { $lte: sevenDaysFromNow },
    })
        .populate('clientId', 'name pan')
        .populate('assignedTo', 'firstName lastName email')
        .lean();

    if (urgentNotices.length === 0) {
        logger.info('[DeadlineWorker] No urgent notices found');
        return;
    }

    // Group by assigned user
    const byUser = {};
    for (const notice of urgentNotices) {
        const userId = notice.assignedTo?._id?.toString() || 'unassigned';
        if (!byUser[userId]) {
            byUser[userId] = {
                user: notice.assignedTo,
                notices: [],
            };
        }

        const daysLeft = Math.ceil((new Date(notice.dueDate) - now) / (1000 * 60 * 60 * 24));
        byUser[userId].notices.push({
            noticeId: notice._id.toString(),
            clientName: notice.clientId?.name || 'Unknown',
            department: notice.department,
            section: notice.section || '',
            dueDate: new Date(notice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            daysLeft,
            isOverdue: daysLeft < 0,
            priority: notice.priority,
        });

        // Create in-app notification (now with metadata for multi-channel templates)
        await queueNotification({
            tenantId: notice.tenantId.toString(),
            userId: notice.assignedTo?._id?.toString(),
            type: daysLeft < 0 ? 'OVERDUE' : daysLeft <= 3 ? 'DEADLINE_CRITICAL' : 'DEADLINE_WARNING',
            title: daysLeft < 0
                ? `OVERDUE: ${notice.clientId?.name} — ${notice.department} ${notice.section || ''}`
                : `Due in ${daysLeft} days: ${notice.clientId?.name} — ${notice.department}`,
            message: `Notice for ${notice.clientId?.name} (${notice.department} ${notice.section || ''}) is ${daysLeft < 0 ? Math.abs(daysLeft) + ' days overdue' : 'due in ' + daysLeft + ' days'}.`,
            link: `/notices/${notice._id}`,
            noticeId: notice._id.toString(),
            metadata: { 
                noticeRef: notice.din || 'Notice',
                dueDate: new Date(notice.dueDate).toLocaleDateString('en-IN'),
                riskLevel: notice.riskLevel || 'High'
            }
        });
    }

    // Send emails to assigned users
    for (const [userId, data] of Object.entries(byUser)) {
        if (userId === 'unassigned' || !data.user?.email) continue;

        await queueEmail({
            type: 'deadline-reminder',
            to: data.user.email,
            userName: `${data.user.firstName} ${data.user.lastName}`,
            notices: data.notices,
        });
    }

    logger.info(`[DeadlineWorker] Processed ${urgentNotices.length} urgent notices for ${Object.keys(byUser).length} users`);
}

/**
 * Send daily summary to all Partner/Admin users
 */
async function sendDailySummaries() {
    const tenants = await Tenant.find({ status: 'active' }).lean();

    for (const tenant of tenants) {
        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        // Aggregate stats per tenant
        const [totalActive, overdue, dueThisWeek, filed] = await Promise.all([
            Notice.countDocuments({ tenantId: tenant._id, status: { $nin: ['Filed', 'Closed'] } }),
            Notice.countDocuments({ tenantId: tenant._id, status: { $nin: ['Filed', 'Closed'] }, dueDate: { $lt: now } }),
            Notice.countDocuments({ tenantId: tenant._id, status: { $nin: ['Filed', 'Closed'] }, dueDate: { $gte: now, $lte: weekFromNow } }),
            Notice.countDocuments({ tenantId: tenant._id, status: 'Filed' }),
        ]);

        const stats = { total: totalActive, overdue, dueThisWeek, filed };

        // Send to Partners and Admins
        const recipients = await User.find({
            tenantId: tenant._id,
            roles: { $in: ['Partner', 'TenantAdmin'] },
            status: 'active',
        }).lean();

        for (const user of recipients) {
            await queueEmail({
                type: 'daily-summary',
                to: user.email,
                userName: user.firstName,
                stats,
            });
        }
    }

    logger.info('[DeadlineWorker] Daily summaries queued');
}

module.exports = { startDeadlineWorker };
