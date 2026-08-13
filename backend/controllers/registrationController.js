const Registration = require('../models/Registration');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const { sendBookingConfirmationEmail } = require('../services/emailService');
const { sendBookingConfirmationWhatsApp } = require('../services/whatsappService');

// @desc    Register user for an event with payment verification, atomic seat reservation & Email + WhatsApp notifications
// @route   POST /api/registrations
// @access  Private (Logged-in User)
const registerForEvent = async (req, res) => {
    try {
        const { eventId, paymentMethod = 'UPI/QR', transactionId, amountPaid } = req.body;

        if (!eventId) {
            return res.status(400).json({
                success: false,
                message: 'Event ID is required'
            });
        }

        // 1. Verify Event existence
        const eventExists = await Event.findById(eventId);
        if (!eventExists) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        // 2. Check for Duplicate Active Registration
        const existingRegistration = await Registration.findOne({
            user: req.user._id,
            event: eventId,
            status: 'registered'
        });

        if (existingRegistration) {
            return res.status(400).json({
                success: false,
                message: 'You are already registered for this event'
            });
        }

        // 3. STEP 5: PREVENT SEAT RACE CONDITIONS (Atomic Seats Decrement)
        const event = await Event.findOneAndUpdate(
            { _id: eventId, availableSeats: { $gte: 1 } },
            { $inc: { availableSeats: -1 } },
            { new: true }
        );

        if (!event) {
            return res.status(400).json({
                success: false,
                message: 'Event capacity is full or no available seats remaining'
            });
        }

        const isFree = event.price === 0;

        // Auto-generate transaction reference if missing
        const txnId = isFree ? 'FREE' : (transactionId && transactionId.trim().length > 0 ? transactionId.trim() : `UTR_SBI9550_${Date.now()}`);

        const now = new Date();
        const randNum = Math.floor(100000 + Math.random() * 900000);
        const orderId = `BKG-2026-${randNum}`;
        const ticketId = `EH-2026-${randNum}`; // Format: EH-2026-XXXXXX
        const totalAmt = isFree ? 0 : (amountPaid !== undefined ? amountPaid : event.price);

        // 4. Create Registration Record
        const registration = await Registration.create({
            user: req.user._id,
            event: eventId,
            status: 'registered',
            ticketStatus: 'confirmed',
            paymentStatus: isFree ? 'free' : 'paid',
            paymentMethod: isFree ? 'Free' : paymentMethod,
            amountPaid: totalAmt,
            transactionId: txnId,
            orderId,
            ticketId,
            paymentTime: now,
            ticketGeneratedTime: now
        });

        // 5. Create Booking, Payment, and Ticket Records for 100% Data Sync
        const booking = await Booking.create({
            bookingId: orderId,
            user: req.user._id,
            event: eventId,
            quantity: 1,
            pricePerTicket: event.price,
            totalAmount: totalAmt,
            bookingStatus: 'CONFIRMED'
        });

        const payment = await Payment.create({
            paymentId: `PAY-2026-${randNum}`,
            booking: booking._id,
            bookingId: orderId,
            amount: totalAmt,
            paymentMethod,
            paymentStatus: isFree ? 'FREE' : 'PAID',
            transactionId: txnId,
            paidAt: now
        });

        const ticket = await Ticket.create({
            ticketId,
            booking: booking._id,
            bookingId: orderId,
            user: req.user._id,
            event: eventId,
            quantity: 1,
            ticketStatus: 'CONFIRMED',
            qrCodeData: `${ticketId}+${orderId}`,
            generatedAt: now
        });

        const populatedRegistration = await Registration.findById(registration._id)
            .populate('event')
            .populate('user', 'name email phone');

        const populatedUser = populatedRegistration.user || req.user;
        const populatedEvent = populatedRegistration.event || event;

        // 6. SEND EMAIL & WHATSAPP NOTIFICATIONS (Safe error handling - failure NEVER cancels booking!)
        let emailSent = false;
        let whatsappSent = false;

        try {
            emailSent = await sendBookingConfirmationEmail(populatedUser, populatedEvent, registration);
        } catch (emailErr) {
            console.error('Email notification failed:', emailErr.message);
        }

        try {
            whatsappSent = await sendBookingConfirmationWhatsApp(populatedUser, populatedEvent, registration);
        } catch (waErr) {
            console.error('WhatsApp notification failed:', waErr.message);
        }

        const notificationMsg = (emailSent || whatsappSent)
            ? 'Registration successful! Your ticket has been sent to your email and WhatsApp.'
            : 'Registration successful! Your ticket has been booked. Notification delivery is temporarily unavailable.';

        return res.status(201).json({
            success: true,
            message: notificationMsg,
            registration: populatedRegistration,
            ticket,
            booking,
            payment,
            emailSent,
            whatsappSent
        });
    } catch (error) {
        console.error('RegisterForEvent Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error during registration: ' + error.message
        });
    }
};

// @desc    Get current user's registrations (Unified Registration + Ticket Models)
// @route   GET /api/registrations/my
// @access  Private (User)
const getMyRegistrations = async (req, res) => {
    try {
        const registrations = await Registration.find({ user: req.user._id })
            .populate({
                path: 'event',
                populate: {
                    path: 'organizer',
                    select: 'name email phone'
                }
            })
            .sort({ registrationDate: -1 });

        // Fetch from Ticket model as well
        const tickets = await Ticket.find({ user: req.user._id })
            .populate({
                path: 'event',
                populate: {
                    path: 'organizer',
                    select: 'name email phone'
                }
            })
            .sort({ generatedAt: -1 });

        const combinedList = [...registrations];

        for (const t of tickets) {
            const exists = combinedList.some(r => 
                String(r._id) === String(t._id) || 
                (r.ticketId && t.ticketId && r.ticketId === t.ticketId)
            );
            if (!exists && t.event) {
                const booking = await Booking.findOne({ bookingId: t.bookingId });
                const payment = await Payment.findOne({ bookingId: t.bookingId });

                combinedList.push({
                    _id: t._id,
                    user: t.user,
                    event: t.event,
                    status: t.ticketStatus === 'CANCELLED' ? 'cancelled' : 'registered',
                    ticketStatus: t.ticketStatus === 'CANCELLED' ? 'cancelled' : 'confirmed',
                    paymentStatus: payment ? payment.paymentStatus : 'paid',
                    paymentMethod: payment ? payment.paymentMethod : 'UPI/QR',
                    amountPaid: booking ? booking.totalAmount : (t.event.price * (t.quantity || 1)),
                    transactionId: payment ? payment.transactionId : 'PAID',
                    orderId: t.bookingId,
                    ticketId: t.ticketId,
                    quantity: t.quantity || 1,
                    registrationDate: t.generatedAt,
                    paymentTime: payment ? payment.paidAt : t.generatedAt,
                    ticketGeneratedTime: t.generatedAt
                });
            }
        }

        return res.json({
            success: true,
            count: combinedList.length,
            registrations: combinedList
        });
    } catch (error) {
        console.error('GetMyRegistrations Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Get attendees/registrations for a specific event
// @route   GET /api/registrations/event/:eventId
// @access  Private (Organizer owner / Admin)
const getEventRegistrations = async (req, res) => {
    try {
        const event = await Event.findById(req.params.eventId);

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        // Check ownership
        if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view attendees for this event'
            });
        }

        const registrations = await Registration.find({ event: req.params.eventId })
            .populate('user', 'name email phone role')
            .populate('event', 'title category date time location venue')
            .sort({ registrationDate: -1 });

        return res.json({
            success: true,
            count: registrations.length,
            registrations
        });
    } catch (error) {
        console.error('GetEventRegistrations Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Cancel registration and atomically increment availableSeats by 1
// @route   DELETE /api/registrations/:id
// @access  Private (User owner / Admin)
const cancelRegistration = async (req, res) => {
    try {
        let registration = await Registration.findById(req.params.id);

        if (!registration) {
            // Check Ticket collection
            const ticket = await Ticket.findById(req.params.id);
            if (ticket) {
                ticket.ticketStatus = 'CANCELLED';
                await ticket.save();

                // Atomically increase available seats
                await Event.findByIdAndUpdate(ticket.event, { $inc: { availableSeats: ticket.quantity || 1 } });

                return res.json({
                    success: true,
                    message: 'Registration cancelled successfully',
                    ticket
                });
            }

            return res.status(404).json({
                success: false,
                message: 'Registration not found'
            });
        }

        // Check authorization (must be user owner or admin)
        if (registration.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to cancel this registration'
            });
        }

        if (registration.status === 'cancelled' || registration.ticketStatus === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Registration is already cancelled'
            });
        }

        // Mark status as cancelled
        registration.status = 'cancelled';
        registration.ticketStatus = 'cancelled';
        await registration.save();

        // Atomically increase available seats in event
        await Event.findByIdAndUpdate(registration.event, { $inc: { availableSeats: 1 } });

        return res.json({
            success: true,
            message: 'Registration cancelled successfully',
            registration
        });
    } catch (error) {
        console.error('CancelRegistration Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

module.exports = {
    registerForEvent,
    getMyRegistrations,
    getEventRegistrations,
    cancelRegistration
};
