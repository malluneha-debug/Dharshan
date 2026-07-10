const express = require('express');
const {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getAllBookings,
  updateBookingStatus,
  createRazorpayOrder,
  verifyRazorpayPayment,
} = require('../controllers/bookingController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .post(protect, createBooking)
  .get(protect, getMyBookings);

// Admin route to fetch all bookings
router.route('/admin/all')
  .get(protect, admin, getAllBookings);

// Admin route to manage booking status
router.route('/:id/status')
  .put(protect, admin, updateBookingStatus);

// Razorpay checkout integration
router.route('/razorpay-order')
  .post(protect, createRazorpayOrder);

router.route('/verify-payment')
  .post(protect, verifyRazorpayPayment);

router.route('/:id')
  .get(protect, getBookingById)
  .delete(protect, cancelBooking);

module.exports = router;
