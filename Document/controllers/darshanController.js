const DarshanSlot = require('../models/DarshanSlot');

// @desc    Get all slots or slots by temple
// @route   GET /api/slots
// @access  Public
const getSlots = async (req, res) => {
  const { templeId, date } = req.query;
  const query = {};
  if (templeId) query.templeId = templeId;
  if (date) query.date = new Date(date);

  try {
    const slots = await DarshanSlot.find(query).populate('templeId', 'templeName');
    res.json(slots);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a single slot by ID
// @route   GET /api/slots/:id
// @access  Public
const getSlotById = async (req, res) => {
  try {
    const slot = await DarshanSlot.findById(req.params.id).populate('templeId');
    if (slot) {
      res.json(slot);
    } else {
      res.status(404).json({ message: 'Slot not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a slot
// @route   POST /api/slots
// @access  Private/Organizer
const createSlot = async (req, res) => {
  const { templeId, date, startTime, endTime, availableSeats, price } = req.body;

  try {
    const slot = new DarshanSlot({
      templeId,
      date,
      startTime,
      endTime,
      availableSeats,
      price,
    });

    const createdSlot = await slot.save();
    res.status(201).json(createdSlot);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a slot
// @route   PUT /api/slots/:id
// @access  Private/Organizer
const updateSlot = async (req, res) => {
  const { date, startTime, endTime, availableSeats, price } = req.body;

  try {
    const slot = await DarshanSlot.findById(req.params.id);

    if (slot) {
      slot.date = date || slot.date;
      slot.startTime = startTime || slot.startTime;
      slot.endTime = endTime || slot.endTime;
      slot.availableSeats = availableSeats || slot.availableSeats;
      slot.price = price || slot.price;

      const updatedSlot = await slot.save();
      res.json(updatedSlot);
    } else {
      res.status(404).json({ message: 'Slot not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a slot
// @route   DELETE /api/slots/:id
// @access  Private/Organizer
const deleteSlot = async (req, res) => {
  try {
    const slot = await DarshanSlot.findById(req.params.id);

    if (slot) {
      await slot.deleteOne();
      res.json({ message: 'Slot removed' });
    } else {
      res.status(404).json({ message: 'Slot not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getSlots,
  getSlotById,
  createSlot,
  updateSlot,
  deleteSlot,
};
