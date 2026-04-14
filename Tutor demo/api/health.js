import dbConnect from '../lib/mongodb.js';

export default async function handler(req, res) {
  try {
    await dbConnect();
    res.status(200).json({ 
      status: 'ok', 
      message: 'Tutor Availability & Booking API is active',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health Check Failed:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Database connection failed',
      error: error.message 
    });
  }
}
