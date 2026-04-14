import dbConnect from '../../lib/mongodb.js';
import Slot from '../../models/Slot.js';
import { authenticate, authorize } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Auth check
    const decoded = authenticate(req);
    authorize(decoded, 'tutor');
    
    await dbConnect();
    
    // Fetch slots for the authenticated tutor
    const slots = await Slot.find({ tutorId: decoded.id }).sort({ date: 1, startTime: 1 });

    res.status(200).json({
      success: true,
      slots
    });
  } catch (error) {
    if (error.message.includes('authorization') || error.message.includes('token')) {
      return res.status(401).json({ message: error.message });
    }
    if (error.message.includes('Forbidden')) {
      return res.status(403).json({ message: error.message });
    }
    console.error('Get Tutor Slots Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
