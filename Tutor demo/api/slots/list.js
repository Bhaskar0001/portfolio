import dbConnect from '../../lib/mongodb.js';
import Slot from '../../models/Slot.js';
import User from '../../models/User.js';
import Booking from '../../models/Booking.js';
import { authenticate, authorize } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Auth check
    const decoded = authenticate(req);
    authorize(decoded, 'sales');

    await dbConnect();

    // Query parameters for filtering
    const { date, tutorId } = req.query;
    
    const filter = {};
    if (date) filter.date = date;
    if (tutorId) filter.tutorId = tutorId;

    // Fetch all slots and populate tutor name
    const slots = await Slot.find(filter)
      .populate('tutorId', 'name')
      .sort({ date: 1, startTime: 1 });

    // Fetch bookings for these slots to attach 'bookedBy' and 'salesId' details
    const slotIds = slots.map(s => s._id);
    const bookings = await Booking.find({ slotId: { $in: slotIds } })
      .populate('salesId', 'name');

    const bookingMap = {};
    bookings.forEach(b => {
      bookingMap[b.slotId.toString()] = {
        bookedBy: b.bookedBy,
        salesName: b.salesId ? b.salesId.name : null,
        clientName: b.clientName
      };
    });

    const enrichedSlots = slots.map(s => {
      const sObj = s.toObject();
      if (sObj.status === 'booked' && bookingMap[sObj._id.toString()]) {
        sObj.bookingInfo = bookingMap[sObj._id.toString()];
      }
      return sObj;
    });

    res.status(200).json({
      success: true,
      slots: enrichedSlots
    });
  } catch (error) {
    if (error.message.includes('authorization') || error.message.includes('token')) {
      return res.status(401).json({ message: error.message });
    }
    if (error.message.includes('Forbidden')) {
      return res.status(403).json({ message: error.message });
    }
    console.error('List Available Slots Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
