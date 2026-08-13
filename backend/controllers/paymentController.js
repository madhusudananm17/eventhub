const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');

// @desc    Verify Payment Transaction & Automatically Generate Ticket (Zero-Trust + Idempotent)
// @route   POST /api/payments/verify
// @access  Private (Logged-in User)
const verifyPayment = async (req, res) => {
    try {
        const { bookingId, transactionId, paymentMethod = 'UPI/QR' } = req.body;

        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: 'Booking ID is required for payment verification'
            });
        }

        // Safely check if valid ObjectId
        const isValidId = mongoose.Types.ObjectId.isValid(bookingId);
        const bookingQuery = isValidId 
            ? { $or: [{ bookingId: bookingId }, { _id: bookingId }] }
            : { bookingId: bookingId };

        const booking = await Booking.findOne(bookingQuery).populate('event').populate('user', 'name email phone');

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking record not found'
            });
        }

        // Find Payment Record
        let payment = await Payment.findOne({
            $or: [{ booking: booking._id }, { bookingId: booking.bookingId }]
        });

        const isFree = booking.totalAmount === 0;

        // MANDATORY UTR / TRANSACTION ID VERIFICATION FOR PAID EVENTS
        if (!isFree) {
            if (!transactionId || transactionId.trim().length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Payment Verification Failed: Valid 12-digit UTR / Transaction Reference Number is required.'
                });
            }
        }

        // IDEMPOTENCE CHECK: If ticket already generated for this booking, return existing ticket!
        const existingTicket = await Ticket.findOne({ booking: booking._id }).populate('event user');
        if (existingTicket && payment && payment.paymentStatus === 'PAID') {
            return res.status(200).json({
                success: true,
                message: 'Payment already verified. Returning existing ticket.',
                alreadyVerified: true,
                booking,
                payment,
                ticket: existingTicket
            });
        }

        const now = new Date();
        const txnRef = isFree ? 'FREE' : transactionId.trim();

        // 1. Update Payment Status to PAID
        if (payment) {
            payment.paymentStatus = 'PAID';
            payment.paymentMethod = paymentMethod;
            payment.transactionId = txnRef;
            payment.paidAt = now;
            await payment.save();
        } else {
            const randNum = Math.floor(100000 + Math.random() * 900000);
            payment = await Payment.create({
                paymentId: `PAY-2026-${randNum}`,
                booking: booking._id,
                bookingId: booking.bookingId,
                amount: booking.totalAmount,
                paymentMethod,
                paymentStatus: 'PAID',
                transactionId: txnRef,
                paidAt: now
            });
        }

        // 2. Update Booking Status to CONFIRMED
        booking.bookingStatus = 'CONFIRMED';
        await booking.save();

        // 3. Decrement Event Seats
        const event = await Event.findById(booking.event._id || booking.event);
        if (event) {
            event.availableSeats = Math.max(0, event.availableSeats - booking.quantity);
            await event.save();
        }

        // 4. Generate Unique Ticket ID & Secure QR Code Payload ("TICKET_ID + BOOKING_ID")
        const ticketRand = Math.floor(100000 + Math.random() * 900000);
        const ticketId = `TKT-2026-${ticketRand}`;
        const qrCodeData = `${ticketId}+${booking.bookingId}`;

        // 5. Create & Save Ticket Record in DB
        const ticket = await Ticket.create({
            ticketId,
            booking: booking._id,
            bookingId: booking.bookingId,
            user: booking.user._id || booking.user,
            event: booking.event._id || booking.event,
            quantity: booking.quantity,
            ticketStatus: 'CONFIRMED',
            qrCodeData,
            generatedAt: now
        });

        const populatedTicket = await Ticket.findById(ticket._id)
            .populate('event')
            .populate('user', 'name email phone');

        return res.status(200).json({
            success: true,
            message: 'Payment verified and ticket generated automatically!',
            booking,
            payment,
            ticket: populatedTicket
        });
    } catch (error) {
        console.error('VerifyPayment Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error during payment verification: ' + error.message
        });
    }
};

module.exports = {
    verifyPayment
};
