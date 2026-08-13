const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');

// @desc    Create a new booking and payment order
// @route   POST /api/bookings/create
// @access  Private (Logged-in User)
const createBooking = async (req, res) => {
    try {
        const { eventId, quantity = 1 } = req.body;

        if (!eventId) {
            return res.status(400).json({
                success: false,
                message: 'Event ID is required'
            });
        }

        const qty = parseInt(quantity, 10);
        if (isNaN(qty) || qty < 1) {
            return res.status(400).json({
                success: false,
                message: 'Invalid ticket quantity'
            });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        if (event.availableSeats < qty) {
            return res.status(400).json({
                success: false,
                message: `Not enough seats available. Only ${event.availableSeats} remaining.`
            });
        }

        const randNum = Math.floor(100000 + Math.random() * 900000);
        const bookingId = `BKG-2026-${randNum}`;
        const paymentId = `PAY-2026-${randNum}`;
        const totalAmount = event.price * qty;

        // Create Pending Booking
        const booking = await Booking.create({
            bookingId,
            user: req.user._id,
            event: event._id,
            quantity: qty,
            pricePerTicket: event.price,
            totalAmount,
            bookingStatus: 'PENDING'
        });

        // Create Pending Payment Record
        const payment = await Payment.create({
            paymentId,
            booking: booking._id,
            bookingId: booking.bookingId,
            amount: totalAmount,
            paymentMethod: event.price === 0 ? 'FREE' : 'UPI/QR',
            paymentStatus: event.price === 0 ? 'PAID' : 'PENDING'
        });

        const populatedBooking = await Booking.findById(booking._id)
            .populate('event')
            .populate('user', 'name email phone');

        return res.status(201).json({
            success: true,
            message: 'Booking created. Proceed to payment.',
            booking: populatedBooking,
            payment
        });
    } catch (error) {
        console.error('CreateBooking Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Get booking details by ID
// @route   GET /api/bookings/:id
// @access  Private
const getBookingById = async (req, res) => {
    try {
        const booking = await Booking.findOne({
            $or: [{ _id: req.params.id }, { bookingId: req.params.id }]
        })
        .populate('event')
        .populate('user', 'name email phone');

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        const payment = await Payment.findOne({ booking: booking._id });
        const ticket = await Ticket.findOne({ booking: booking._id });

        return res.json({
            success: true,
            booking,
            payment,
            ticket
        });
    } catch (error) {
        console.error('GetBookingById Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

module.exports = {
    createBooking,
    getBookingById
};
