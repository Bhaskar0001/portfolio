import dbConnect from '../../lib/mongodb.js';
import Slot from '../../models/Slot.js';
import Booking from '../../models/Booking.js';
import { authenticate, authorize } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Auth check
    const decoded = authenticate(req);
    authorize(decoded, 'sales');

    await dbConnect();
    const { slotId, clientName, clientPhone } = req.body;

    if (!slotId || !clientName) {
      return res.status(400).json({ message: 'Please provide slotId and clientName' });
    }

    // 1. ATOMIC LOCK: Find the slot and mark as booked ONLY if it is still available
    const slot = await Slot.findOneAndUpdate(
      { _id: slotId, status: 'available' },
      { $set: { status: 'booked' } },
      { new: true }
    );

    if (!slot) {
      return res.status(409).json({ message: 'This slot is no longer available. It may have been booked by someone else.' });
    }

    // 2. Compute scheduledTime (combine slot date and start time)
    const scheduledTime = new Date(`${slot.date}T${slot.startTime}:00`);

    // 3. Create the booking record
    const booking = await Booking.create({
      tutorId: slot.tutorId,
      salesId: decoded.id,
      slotId: slot._id,
      clientName,
      clientPhone,
      scheduledTime,
      status: 'confirmed'
    });

    res.status(201).json({
      success: true,
      message: 'Booking confirmed successfully',
      booking
    });
  } catch (error) {
    if (error.message.includes('authorization') || error.message.includes('token')) {
      return res.status(401).json({ message: error.message });
    }
    if (error.message.includes('Forbidden')) {
      return res.status(403).json({ message: error.message });
    }
    console.error('Booking Creation Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
