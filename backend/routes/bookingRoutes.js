const express = require('express');
const router = express.Router();
const { createBooking, getBookingById } = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

router.post('/create', protect, createBooking);
router.get('/:id', protect, getBookingById);

module.exports = router;
