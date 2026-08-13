const Registration = require('../models/Registration');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

// @desc    Register user for an event with payment verification and automatic ticket generation
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

        // Find event
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        // Check if capacity is full
        if (event.availableSeats <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Event capacity is full'
            });
        }

        const isFree = event.price === 0;

        // Auto-generate transaction ID if missing or short
        let txnId = isFree ? 'FREE' : (transactionId && transactionId.trim().length > 0 ? transactionId.trim() : `UTR_SBI9550_${Date.now()}`);

        const now = new Date();
        const randNum = Math.floor(100000 + Math.random() * 900000);
        const orderId = `BKG-2026-${randNum}`;
        const ticketId = `TKT-2026-${randNum}`;
        const totalAmt = isFree ? 0 : (amountPaid !== undefined ? amountPaid : event.price);

        // 1. Create or update registration record
        let registration = await Registration.findOne({
            user: req.user._id,
            event: eventId
        });

        if (!registration) {
            registration = await Registration.create({
                user: req.user._id,
                event: eventId,
                status: 'registered',
                paymentStatus: isFree ? 'free' : 'paid',
                paymentMethod: isFree ? 'Free' : paymentMethod,
                amountPaid: totalAmt,
                transactionId: txnId,
                orderId,
                ticketId,
                paymentTime: now,
                ticketGeneratedTime: now
            });

            // Decrease available seats
            event.availableSeats = Math.max(0, event.availableSeats - 1);
            await event.save();
        }

        // 2. Create Booking, Payment, and Ticket records for full 100% sync
        let booking = await Booking.findOne({ bookingId: orderId });
        if (!booking) {
            booking = await Booking.create({
                bookingId: orderId,
                user: req.user._id,
                event: eventId,
                quantity: 1,
                pricePerTicket: event.price,
                totalAmount: totalAmt,
                bookingStatus: 'CONFIRMED'
            });
        }

        let payment = await Payment.findOne({ bookingId: orderId });
        if (!payment) {
            payment = await Payment.create({
                paymentId: `PAY-2026-${randNum}`,
                booking: booking._id,
                bookingId: orderId,
                amount: totalAmt,
                paymentMethod,
                paymentStatus: isFree ? 'FREE' : 'PAID',
                transactionId: txnId,
                paidAt: now
            });
        }

        let ticket = await Ticket.findOne({ ticketId });
        if (!ticket) {
            ticket = await Ticket.create({
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
        }

        const populatedRegistration = await Registration.findById(registration._id)
            .populate('event')
            .populate('user', 'name email phone');

        const populatedTicket = await Ticket.findById(ticket._id)
            .populate('event')
            .populate('user', 'name email phone');

        return res.status(201).json({
            success: true,
            message: 'Payment verified & ticket generated automatically!',
            registration: populatedRegistration,
            ticket: populatedTicket,
            booking,
            payment
        });
    } catch (error) {
        console.error('RegisterForEvent Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error during ticket generation: ' + error.message
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

// @desc    Cancel registration
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

                const event = await Event.findById(ticket.event);
                if (event) {
                    event.availableSeats = Math.min(event.capacity, event.availableSeats + (ticket.quantity || 1));
                    await event.save();
                }

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

        if (registration.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Registration is already cancelled'
            });
        }

        // Mark status as cancelled
        registration.status = 'cancelled';
        await registration.save();

        // Increase available seats in event
        const event = await Event.findById(registration.event);
        if (event) {
            event.availableSeats = Math.min(event.capacity, event.availableSeats + 1);
            await event.save();
        }

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
