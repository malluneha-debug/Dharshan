const Booking = require('../models/Booking');
const DarshanSlot = require('../models/DarshanSlot');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const crypto = require('crypto');
const { sendEmail, getBookingEmailTemplate } = require('../utils/sendEmail');

// Helper to trigger confirmation email
const triggerConfirmationEmail = async (bookingId, user) => {
  try {
    const booking = await Booking.findById(bookingId).populate({
      path: 'slotId',
      populate: { path: 'templeId' },
    });
    const ticket = await Ticket.findOne({ bookingId });
    if (booking && ticket) {
      const html = getBookingEmailTemplate(booking, ticket, user, false);
      await sendEmail({
        to: user.email,
        subject: `Booking Confirmed - ${booking.slotId.templeId.templeName}`,
        html,
      });
    }
  } catch (error) {
    console.error('Failed to trigger confirmation email:', error.message);
  }
};

// Helper to trigger cancellation email
const triggerCancellationEmail = async (bookingId, user) => {
  try {
    const booking = await Booking.findById(bookingId).populate({
      path: 'slotId',
      populate: { path: 'templeId' },
    });
    if (booking) {
      const html = getBookingEmailTemplate(booking, null, user, true);
      await sendEmail({
        to: user.email,
        subject: `Booking Cancelled - ${booking.slotId.templeId.templeName}`,
        html,
      });
    }
  } catch (error) {
    console.error('Failed to trigger cancellation email:', error.message);
  }
};

// @desc    Create a new booking (Standard fallback / Direct)
// @route   POST /api/bookings
// @access  Private
const createBooking = async (req, res) => {
  const { slotId, totalAmount } = req.body;

  try {
    const slot = await DarshanSlot.findById(slotId);

    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }

    if (slot.availableSeats <= 0) {
      return res.status(400).json({ message: 'No seats available' });
    }

    const booking = new Booking({
      userId: req.user._id,
      slotId,
      totalAmount,
    });

    const createdBooking = await booking.save();

    // Decrease available seats
    slot.availableSeats -= 1;
    await slot.save();

    // Generate Ticket
    const ticket = new Ticket({
      bookingId: createdBooking._id,
      qrCode: `TICKET-${createdBooking._id}-${Date.now()}`,
    });
    await ticket.save();

    // Mark booking as confirmed
    createdBooking.status = 'Confirmed';
    await createdBooking.save();

    // Trigger Email
    await triggerConfirmationEmail(createdBooking._id, req.user);

    res.status(201).json({ booking: createdBooking, ticket });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get user bookings
// @route   GET /api/bookings
// @access  Private
const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .populate({
        path: 'slotId',
        populate: { path: 'templeId', select: 'templeName location image description' },
      })
      .sort('-createdAt');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get booking by ID
// @route   GET /api/bookings/:id
// @access  Private
const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate({
        path: 'slotId',
        populate: { path: 'templeId', select: 'templeName location image description' },
      });

    if (booking) {
      // Ensure the user owns the booking or is admin
      if (
        booking.userId._id.toString() !== req.user._id.toString() &&
        req.user.role !== 'Admin'
      ) {
        return res.status(401).json({ message: 'Not authorized' });
      }
      res.json(booking);
    } else {
      res.status(404).json({ message: 'Booking not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel a booking
// @route   DELETE /api/bookings/:id
// @access  Private
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (booking) {
      if (booking.userId.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
        return res.status(401).json({ message: 'Not authorized' });
      }

      booking.status = 'Cancelled';
      await booking.save();

      // Increase available seats back
      const slot = await DarshanSlot.findById(booking.slotId);
      if (slot) {
        slot.availableSeats += 1;
        await slot.save();
      }

      // Fetch user profile to trigger email
      const user = await User.findById(booking.userId);
      await triggerCancellationEmail(booking._id, user);

      res.json({ message: 'Booking cancelled' });
    } else {
      res.status(404).json({ message: 'Booking not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all bookings (Admin only)
// @route   GET /api/bookings/admin/all
// @access  Private/Admin
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate('userId', 'name email phone')
      .populate({
        path: 'slotId',
        populate: { path: 'templeId', select: 'templeName location' },
      })
      .sort('-createdAt');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update booking status (Admin only)
// @route   PUT /api/bookings/:id/status
// @access  Private/Admin
const updateBookingStatus = async (req, res) => {
  const { status } = req.body; // 'Confirmed' or 'Cancelled'

  if (!['Confirmed', 'Cancelled', 'Pending'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    const booking = await Booking.findById(req.params.id);

    if (booking) {
      const prevStatus = booking.status;
      booking.status = status;
      await booking.save();

      // Handle seats adjustments
      if (status === 'Cancelled' && prevStatus !== 'Cancelled') {
        const slot = await DarshanSlot.findById(booking.slotId);
        if (slot) {
          slot.availableSeats += 1;
          await slot.save();
        }
        // Send email
        const user = await User.findById(booking.userId);
        await triggerCancellationEmail(booking._id, user);
      } else if (status === 'Confirmed' && prevStatus === 'Cancelled') {
        const slot = await DarshanSlot.findById(booking.slotId);
        if (slot) {
          slot.availableSeats = Math.max(0, slot.availableSeats - 1);
          await slot.save();
        }
        // Send email
        const user = await User.findById(booking.userId);
        await triggerConfirmationEmail(booking._id, user);
      }

      res.json(booking);
    } else {
      res.status(404).json({ message: 'Booking not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create Razorpay Order
// @route   POST /api/bookings/razorpay-order
// @access  Private
const createRazorpayOrder = async (req, res) => {
  const { slotId } = req.body;

  try {
    const slot = await DarshanSlot.findById(slotId).populate('templeId', 'templeName');
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }

    const amount = slot.price * 100; // in paise

    // Use real razorpay if keys are in environment
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      const Razorpay = require('razorpay');
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      const order = await razorpay.orders.create({
        amount,
        currency: 'INR',
        receipt: `receipt_${slotId}_${Date.now()}`,
      });

      res.status(201).json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        keyId: process.env.RAZORPAY_KEY_ID,
        isMock: false,
      });
    } else {
      // Mock order
      res.status(201).json({
        success: true,
        orderId: `mock_order_${slotId}_${Date.now()}`,
        amount,
        keyId: 'rzp_test_mock_key_5521',
        isMock: true,
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify Razorpay payment & create booking
// @route   POST /api/bookings/verify-payment
// @access  Private
const verifyRazorpayPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, slotId, totalAmount } = req.body;

  try {
    const slot = await DarshanSlot.findById(slotId);
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }

    if (slot.availableSeats <= 0) {
      return res.status(400).json({ message: 'No seats available' });
    }

    let isLegit = false;

    if (razorpay_order_id && razorpay_order_id.startsWith('mock_')) {
      isLegit = true;
    } else if (process.env.RAZORPAY_KEY_SECRET) {
      const text = razorpay_order_id + '|' + razorpay_payment_id;
      const generated_signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(text.toString())
        .digest('hex');

      if (generated_signature === razorpay_signature) {
        isLegit = true;
      }
    }

    if (!isLegit) {
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    const booking = new Booking({
      userId: req.user._id,
      slotId,
      totalAmount,
      status: 'Confirmed',
    });

    const createdBooking = await booking.save();

    // Decrease available seats
    slot.availableSeats -= 1;
    await slot.save();

    // Generate Ticket
    const ticket = new Ticket({
      bookingId: createdBooking._id,
      qrCode: `TICKET-${createdBooking._id}-${Date.now()}`,
    });
    await ticket.save();

    // Send confirmation email
    await triggerConfirmationEmail(createdBooking._id, req.user);

    res.status(201).json({ success: true, booking: createdBooking, ticket });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getAllBookings,
  updateBookingStatus,
  createRazorpayOrder,
  verifyRazorpayPayment,
};
