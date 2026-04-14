import dbConnect from '../../lib/mongodb.js';
import Booking from '../../models/Booking.js';
import Slot from '../../models/Slot.js';
import User from '../../models/User.js';
import { authenticate } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Auth check
    const decoded = authenticate(req);
    
    await dbConnect();

    let query = {};
    if (decoded.role === 'tutor') {
      // Tutors see ALL bookings on their slots — both self-created and sales-created
      query = { tutorId: decoded.id };
    } else if (decoded.role === 'sales') {
      // Sales reps see only their own bookings
      query = { salesId: decoded.id };
    } else {
      return res.status(403).json({ message: 'Invalid role' });
    }

    // Fetch bookings and populate related info
    const bookings = await Booking.find(query)
      .populate('tutorId', 'name email phoneNumber')
      .populate('salesId', 'name email')
      .populate('slotId')
      .sort({ scheduledTime: -1 });

    res.status(200).json({
      success: true,
      bookings
    });
  } catch (error) {
    if (error.message.includes('authorization') || error.message.includes('token')) {
      return res.status(401).json({ message: error.message });
    }
    console.error('List Bookings Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
