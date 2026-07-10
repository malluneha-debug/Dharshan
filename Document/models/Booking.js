const mongoose = require('mongoose');

const bookingSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'DarshanSlot',
    },
    bookingDate: { type: Date, default: Date.now },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      required: true,
      enum: ['Pending', 'Confirmed', 'Cancelled'],
      default: 'Pending',
    },
  },
  { timestamps: true }
);

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;
