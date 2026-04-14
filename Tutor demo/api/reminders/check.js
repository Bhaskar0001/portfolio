import dbConnect from '../../lib/mongodb.js';
import Booking from '../../models/Booking.js';
import User from '../../models/User.js';
import Slot from '../../models/Slot.js';
import whatsapp from '../../lib/whatsapp.js';

/**
 * API to trigger reminder checks.
 * Usually called by a Cron job every 5-10 minutes.
 * Secured by CRON_SECRET.
 */
export default async function handler(req, res) {
  // 1. Basic security check
  const { key } = req.query;
  if (key !== process.env.CRON_SECRET) {
    return res.status(401).json({ message: 'Unauthorized: Invalid cron key' });
  }

  try {
    await dbConnect();

    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    // 2. Find confirmed bookings within the next hour that haven't had a reminder sent
    const upcomingBookings = await Booking.find({
      scheduledTime: { $gt: now, $lte: oneHourFromNow },
      status: 'confirmed',
      reminderSent: false
    }).populate('tutorId').populate('slotId');

    const results = {
      found: upcomingBookings.length,
      sent: 0,
      failed: 0,
      errors: []
    };

    // 3. Process each booking
    console.log(`[Reminders] Found ${upcomingBookings.length} bookings requiring check.`);

    for (const booking of upcomingBookings) {
      const tutor = booking.tutorId;
      
      try {
        if (!tutor.phoneNumber) {
          throw new Error(`Tutor ${tutor.name} (ID: ${tutor._id}) has no phone number defined.`);
        }

        const scheduledDate = new Date(booking.scheduledTime);
        const timeStr = scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Premium formatted message
        const message = `👋 Hello ${tutor.name},\n\n🔔 *Demo Reminder*\n📅 *Today* at *${timeStr}*\n👤 *Client:* ${booking.clientName}\n\nPlease be ready 5 minutes early. Good luck! 🚀`;

        const whatsappRes = await whatsapp.sendWhatsAppMessage(tutor.phoneNumber, message);

        if (whatsappRes.success) {
          booking.reminderSent = true;
          await booking.save();
          results.sent++;
          console.log(`[Reminders] Successfully sent to ${tutor.phoneNumber} (${tutor.name})`);
        } else {
          throw new Error(whatsappRes.error || 'Unknown Twilio error');
        }
      } catch (err) {
        results.failed++;
        const errMsg = `Failed for ${tutor.name}: ${err.message}`;
        results.errors.push(errMsg);
        console.error(`[Reminders] ${errMsg}`);
      }
    }

    res.status(200).json({ 
      success: true, 
      message: `Processed ${results.found} bookings. Sent: ${results.sent}, Failed: ${results.failed}`,
      results 
    });

  } catch (error) {
    console.error('[Reminders] Critical Process Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error processing reminders' });
  }
}
