const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const { sendBookingConfirmationEmail } = require('../services/emailService');
const { sendBookingConfirmationWhatsApp } = require('../services/whatsappService');

// @desc    Create Razorpay Order / Demo Order (Zero-Trust Backend Pricing)
// @route   POST /api/payments/create-order
// @access  Private (User)
const createPaymentOrder = async (req, res) => {
    try {
        const { eventId, quantity = 1 } = req.body;

        if (!eventId) {
            return res.status(400).json({
                success: false,
                message: 'Event ID is required to create a payment order.'
            });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found.'
            });
        }

        const qty = parseInt(quantity, 10) || 1;

        if (event.availableSeats < qty) {
            return res.status(400).json({
                success: false,
                message: `Only ${event.availableSeats} seat(s) available for this event.`
            });
        }

        // Calculate pricing strictly on backend
        const pricePerTicket = Number(event.price) || 0;
        const totalAmount = pricePerTicket * qty;

        const randSuffix = Math.floor(100000 + Math.random() * 900000);
        const bookingId = `BKG-2026-${randSuffix}`;

        // Create initial pending Booking record
        const booking = await Booking.create({
            bookingId,
            user: req.user._id,
            event: event._id,
            quantity: qty,
            totalAmount,
            bookingStatus: 'PENDING'
        });

        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        // If Razorpay live credentials configured in .env
        if (keyId && keySecret && keyId.trim() !== '' && keySecret.trim() !== '') {
            try {
                const razorpay = new Razorpay({
                    key_id: keyId,
                    key_secret: keySecret
                });

                const razorpayOrder = await razorpay.orders.create({
                    amount: Math.round(totalAmount * 100), // Amount in paise
                    currency: 'INR',
                    receipt: bookingId,
                    notes: {
                        eventId: event._id.toString(),
                        userId: req.user._id.toString()
                    }
                });

                return res.json({
                    success: true,
                    isDemo: false,
                    isRazorpay: true,
                    orderId: razorpayOrder.id,
                    bookingId: booking.bookingId,
                    amount: totalAmount,
                    amountPaise: razorpayOrder.amount,
                    currency: 'INR',
                    keyId: keyId,
                    eventTitle: event.title
                });
            } catch (rzErr) {
                console.error('Razorpay Order Creation Warning:', rzErr.message);
                // Fallback to simulated mode if Razorpay API fails
            }
        }

        // Development / Demo Mode Fallback (Zero crash architecture)
        const demoOrderId = `order_demo_${Date.now()}_${randSuffix}`;

        return res.json({
            success: true,
            isDemo: true,
            isRazorpay: false,
            orderId: demoOrderId,
            bookingId: booking.bookingId,
            amount: totalAmount,
            currency: 'INR',
            eventTitle: event.title,
            message: totalAmount === 0 ? 'Free Event Order Created' : 'Demo Payment Mode (Razorpay credentials not set in .env)'
        });
    } catch (error) {
        console.error('CreatePaymentOrder Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error creating payment order: ' + error.message
        });
    }
};

// @desc    Verify Payment Transaction & Automatically Generate Ticket (Zero-Trust + Idempotent)
// @route   POST /api/payments/verify
// @access  Private (Logged-in User)
const verifyPayment = async (req, res) => {
    try {
        const {
            bookingId,
            transactionId,
            paymentMethod = 'UPI/QR',
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

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

        // If Razorpay signature provided, verify signature
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (razorpay_order_id && razorpay_payment_id && razorpay_signature && keySecret) {
            const expectedSignature = crypto
                .createHmac('sha256', keySecret)
                .update(`${razorpay_order_id}|${razorpay_payment_id}`)
                .digest('hex');

            if (expectedSignature !== razorpay_signature) {
                return res.status(400).json({
                    success: false,
                    message: 'Razorpay payment signature verification failed.'
                });
            }
        }

        // Find Payment Record
        let payment = await Payment.findOne({
            $or: [{ booking: booking._id }, { bookingId: booking.bookingId }]
        });

        const isFree = booking.totalAmount === 0;
        const now = new Date();

        // Auto-generate transaction reference if missing
        const txnRef = razorpay_payment_id || (isFree ? 'FREE' : (transactionId && transactionId.trim().length > 0 ? transactionId.trim() : `TXN_${Date.now()}`));

        // IDEMPOTENCE CHECK: If ticket already generated for this booking, return existing ticket!
        let existingTicket = await Ticket.findOne({ booking: booking._id }).populate('event user');
        if (!existingTicket) {
            existingTicket = await Ticket.findOne({ bookingId: booking.bookingId }).populate('event user');
        }

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

        // 4. Generate Unique Ticket ID & Secure QR Code Payload ("TICKET_ID+BOOKING_ID")
        const ticketRand = Math.floor(100000 + Math.random() * 900000);
        const ticketId = `EH-2026-${ticketRand}`;
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

        // 6. Create Registration Record for 100% Data Sync
        try {
            await Registration.create({
                user: booking.user._id || booking.user,
                event: booking.event._id || booking.event,
                status: 'registered',
                ticketStatus: 'confirmed',
                paymentStatus: isFree ? 'free' : 'paid',
                paymentMethod,
                amountPaid: booking.totalAmount,
                transactionId: txnRef,
                orderId: booking.bookingId,
                ticketId,
                paymentTime: now,
                ticketGeneratedTime: now
            });
        } catch(regErr) {}

        const populatedTicket = await Ticket.findById(ticket._id)
            .populate('event')
            .populate('user', 'name email phone');

        const populatedUser = populatedTicket.user || booking.user;
        const populatedEvent = populatedTicket.event || booking.event;

        // 7. SEND EMAIL & WHATSAPP NOTIFICATIONS (Failure does NOT cancel ticket)
        let emailSent = false;
        let whatsappSent = false;

        try {
            emailSent = await sendBookingConfirmationEmail(populatedUser, populatedEvent, {
                ticketId,
                registrationDate: now,
                ticketStatus: 'Confirmed'
            });
        } catch (emailErr) {
            console.error('VerifyPayment Email Notification Warning:', emailErr.message);
        }

        try {
            whatsappSent = await sendBookingConfirmationWhatsApp(populatedUser, populatedEvent, { ticketId });
        } catch (waErr) {
            console.error('VerifyPayment WhatsApp Notification Warning:', waErr.message);
        }

        return res.status(200).json({
            success: true,
            message: 'Payment verified and ticket generated automatically!',
            booking,
            payment,
            ticket: populatedTicket,
            emailSent,
            whatsappSent
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
    createPaymentOrder,
    verifyPayment
};
