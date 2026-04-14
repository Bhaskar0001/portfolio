import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema({
  tutorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String, // YYYY-MM-DD
    required: [true, 'Please provide a date']
  },
  startTime: {
    type: String, // HH:mm
    required: [true, 'Please provide a start time']
  },
  endTime: {
    type: String, // HH:mm
    required: [true, 'Please provide an end time']
  },
  status: {
    type: String,
    enum: ['available', 'booked'],
    default: 'available'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add index for fast querying
slotSchema.index({ tutorId: 1, date: 1, status: 1 });

export default mongoose.models.Slot || mongoose.model('Slot', slotSchema);
