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
    authorize(decoded, 'tutor');

    await dbConnect();
    const { date, startTime, endTime, isBooked, clientName, clientPhone } = req.body;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({ message: 'Please provide date, start time, and end time' });
    }

    // Validation: endTime > startTime
    if (startTime >= endTime) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    // Check for overlapping slots for this tutor
    const existingSlot = await Slot.findOne({
      tutorId: decoded.id,
      date,
      $or: [
        { startTime: { $lt: endTime, $gte: startTime } },
        { endTime: { $gt: startTime, $lte: endTime } },
        { startTime: { $lte: startTime }, endTime: { $gte: endTime } }
      ]
    });

    if (existingSlot) {
      return res.status(409).json({ message: 'This time slot overlaps with an existing slot' });
    }

    const slotStatus = isBooked ? 'booked' : 'available';

    const slot = await Slot.create({
      tutorId: decoded.id,
      date,
      startTime,
      endTime,
      status: slotStatus
    });

    // If marked as booked, create the booking record too
    if (isBooked && clientName) {
      const scheduledTime = new Date(`${date}T${startTime}:00`);
      await Booking.create({
        tutorId: decoded.id,
        slotId: slot._id,
        clientName,
        clientPhone,
        scheduledTime,
        status: 'confirmed',
        bookedBy: 'tutor'
      });
    }

    res.status(201).json({
      success: true,
      slot
    });
  } catch (error) {
    if (error.message.includes('authorization') || error.message.includes('token')) {
      return res.status(401).json({ message: error.message });
    }
    if (error.message.includes('Forbidden')) {
      return res.status(403).json({ message: error.message });
    }
    console.error('Create Slot Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
