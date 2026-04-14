import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  tutorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  salesId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Allow null for tutor-initiated demos
  },
  bookedBy: {
    type: String,
    enum: ['sales', 'tutor'],
    default: 'sales'
  },
  slotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Slot',
    required: true,
    unique: true // Ensure one slot = one booking
  },
  clientName: {
    type: String,
    required: [true, 'Please provide client name'],
    trim: true
  },
  clientPhone: {
    type: String,
    trim: true
  },
  scheduledTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['confirmed', 'cancelled'],
    default: 'confirmed'
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for fast lookup
bookingSchema.index({ tutorId: 1, scheduledTime: 1 });
bookingSchema.index({ salesId: 1, scheduledTime: 1 });

export default mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
