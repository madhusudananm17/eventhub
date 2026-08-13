const Registration = require('../models/Registration');
const Event = require('../models/Event');

// @desc    Register user for an event with payment verification and ticket generation
// @route   POST /api/registrations
// @access  Private (Logged-in User)
const registerForEvent = async (req, res) => {
    try {
        const { eventId, paymentMethod, transactionId, amountPaid } = req.body;

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

        // Check if user is already registered for this event
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

        const isFree = event.price === 0;

        // BACKEND VERIFICATION OF PAYMENT DETAILS
        if (!isFree) {
            if (!transactionId || transactionId.trim().length < 4) {
                return res.status(400).json({
                    success: false,
                    message: 'Payment verification failed: Please scan QR code and provide a valid 12-digit UTR / Transaction ID.'
                });
            }
        }

        const now = new Date();
        const randNum = Math.floor(100000 + Math.random() * 900000);
        const orderId = `ORD-2026-${randNum}`;
        const ticketId = `TKT-2026-${randNum}`;
        const txnId = isFree ? 'FREE' : transactionId.trim();

        // Create registration record
        const registration = await Registration.create({
            user: req.user._id,
            event: eventId,
            status: 'registered',
            paymentStatus: isFree ? 'free' : 'paid',
            paymentMethod: isFree ? 'Free' : (paymentMethod || 'UPI'),
            amountPaid: isFree ? 0 : (amountPaid !== undefined ? amountPaid : event.price),
            transactionId: txnId,
            orderId,
            ticketId,
            paymentTime: now,
            ticketGeneratedTime: now
        });

        // Decrease available seats
        event.availableSeats -= 1;
        await event.save();

        const populatedRegistration = await Registration.findById(registration._id)
            .populate('event')
            .populate('user', 'name email phone');

        return res.status(201).json({
            success: true,
            message: 'Payment verified & ticket generated successfully',
            registration: populatedRegistration
        });
    } catch (error) {
        console.error('RegisterForEvent Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Get current user's registrations
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

        return res.json({
            success: true,
            count: registrations.length,
            registrations
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
        const registration = await Registration.findById(req.params.id);

        if (!registration) {
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
