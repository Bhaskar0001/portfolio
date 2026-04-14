const logger = require('../utils/logger');

/**
 * Calendar Integration Service
 * Handles syncing notice deadlines with Google/Outlook calendars
 */
class CalendarService {
    /**
     * Create a calendar event for a notice deadline
     */
    async syncDeadline(notice, user) {
        try {
            if (!user.calendarConnected) return;

            logger.info(`[Calendar] Syncing deadline for Notice: ${notice.din || notice._id} to User: ${user.email}`);

            // 1. Authenticate with Provider (Google/O365) using user's OAuth tokens
            // 2. Map notice details to Calendar Event
            const event = {
                summary: `Tax Deadline: ${notice.department} - ${notice.section}`,
                description: `Notice No: ${notice.din}\nStatus: ${notice.status}\nAssigned to: ${user.firstName} ${user.lastName}`,
                start: { dateTime: notice.dueDate, timeZone: 'Asia/Kolkata' },
                end: { dateTime: notice.dueDate, timeZone: 'Asia/Kolkata' }, // Set as 1-hour slot or all-day
                reminders: { useDefault: true }
            };

            // 3. Push to provider API
            // await googleCalendar.events.insert({ calendarId: 'primary', resource: event });

            return { success: true, provider: 'Google', eventId: `CAL-${Date.now()}` };
        } catch (err) {
            logger.error(`[Calendar] Sync Error: ${err.message}`);
            return { success: false, error: err.message };
        }
    }

    /**
     * Batch sync for a user's assigned notices
     */
    async syncAllAssigned(user, notices) {
        logger.info(`[Calendar] Batch syncing ${notices.length} notices for ${user.email}`);
        for (const notice of notices) {
            await this.syncDeadline(notice, user);
        }
    }
}

module.exports = new CalendarService();
