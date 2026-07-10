const mongoose = require('mongoose');

const templeSchema = mongoose.Schema(
  {
    templeName: { type: String, required: true },
    location: { type: String, required: true },
    darshanStartTime: { type: String, required: true },
    darshanEndTime: { type: String, required: true },
    description: { type: String },
    image: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
  },
  { timestamps: true }
);

const Temple = mongoose.model('Temple', templeSchema);
module.exports = Temple;
