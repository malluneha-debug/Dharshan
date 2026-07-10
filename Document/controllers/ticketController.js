const Ticket = require('../models/Ticket');

// @desc    Get ticket by booking ID
// @route   GET /api/tickets/:bookingId
// @access  Private
const getTicketByBookingId = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ bookingId: req.params.bookingId }).populate({
      path: 'bookingId',
      populate: {
        path: 'slotId',
        populate: { path: 'templeId', select: 'templeName location latitude longitude image' },
      },
    });

    if (ticket) {
      res.json(ticket);
    } else {
      res.status(404).json({ message: 'Ticket not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getTicketByBookingId };
