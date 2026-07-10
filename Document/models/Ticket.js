const mongoose = require('mongoose');

const ticketSchema = mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Booking',
    },
    qrCode: { type: String, required: true },
    generatedDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Ticket = mongoose.model('Ticket', ticketSchema);
module.exports = Ticket;
