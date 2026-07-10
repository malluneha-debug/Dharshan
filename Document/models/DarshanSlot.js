const mongoose = require('mongoose');

const darshanSlotSchema = mongoose.Schema(
  {
    templeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Temple',
    },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    availableSeats: { type: Number, required: true },
    price: { type: Number, required: true },
  },
  { timestamps: true }
);

const DarshanSlot = mongoose.model('DarshanSlot', darshanSlotSchema);
module.exports = DarshanSlot;
