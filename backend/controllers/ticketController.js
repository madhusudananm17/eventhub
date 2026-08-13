const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

// @desc    Get current user's tickets
// @route   GET /api/tickets/my
// @access  Private (User)
const getMyTickets = async (req, res) => {
    try {
        const tickets = await Ticket.find({ user: req.user._id })
            .populate('event')
            .populate('user', 'name email phone')
            .sort({ generatedAt: -1 });

        return res.json({
            success: true,
            count: tickets.length,
            tickets
        });
    } catch (error) {
        console.error('GetMyTickets Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Get ticket details by Ticket ID or DB ID
// @route   GET /api/tickets/:id
// @access  Private
const getTicketById = async (req, res) => {
    try {
        const queryId = req.params.id;
        const isValidId = mongoose.Types.ObjectId.isValid(queryId);

        const ticket = await Ticket.findOne(
            isValidId 
                ? { $or: [{ _id: queryId }, { ticketId: queryId }, { bookingId: queryId }] }
                : { $or: [{ ticketId: queryId }, { bookingId: queryId }] }
        )
        .populate('event')
        .populate('user', 'name email phone');

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        const booking = await Booking.findOne({ bookingId: ticket.bookingId });
        const payment = await Payment.findOne({ bookingId: ticket.bookingId });

        return res.json({
            success: true,
            ticket,
            booking,
            payment
        });
    } catch (error) {
        console.error('GetTicketById Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Verify ticket by Organizer / Admin via QR Code or Ticket ID
// @route   POST /api/tickets/verify
// @access  Private (Organizer / Admin)
const verifyTicket = async (req, res) => {
    try {
        const { ticketId, qrCodeData } = req.body;

        const queryId = (ticketId || qrCodeData || '').trim();

        if (!queryId) {
            return res.status(400).json({
                isValid: false,
                message: 'Ticket ID or QR Code data is required for verification'
            });
        }

        // Support formats like "TKT-2026-123456+BKG-2026-123456" or direct "TKT-2026-123456"
        let searchTicketId = queryId;
        if (queryId.includes('+')) {
            searchTicketId = queryId.split('+')[0];
        }

        const isValidId = mongoose.Types.ObjectId.isValid(searchTicketId);
        const query = isValidId 
            ? { $or: [{ ticketId: searchTicketId }, { qrCodeData: queryId }, { _id: searchTicketId }] }
            : { $or: [{ ticketId: searchTicketId }, { qrCodeData: queryId }] };

        const ticket = await Ticket.findOne(query)
            .populate('event')
            .populate('user', 'name email phone');

        if (!ticket) {
            return res.status(404).json({
                isValid: false,
                message: '❌ Invalid Ticket: Ticket does not exist or payment has not been verified.'
            });
        }

        const payment = await Payment.findOne({ bookingId: ticket.bookingId });

        if (!payment || payment.paymentStatus !== 'PAID') {
            return res.status(400).json({
                isValid: false,
                message: '❌ Invalid Ticket: Payment for this booking is unpaid or unverified.',
                ticket
            });
        }

        const isUsed = ticket.ticketStatus === 'USED' || ticket.usedAt !== null;

        return res.json({
            isValid: true,
            message: isUsed ? '⚠️ Ticket Valid but ALREADY USED' : '✅ Ticket Valid & Active',
            isUsed,
            ticket,
            payment
        });
    } catch (error) {
        console.error('VerifyTicket Error:', error.message);
        return res.status(500).json({
            isValid: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Mark ticket as used (Admit attendee)
// @route   POST /api/tickets/mark-used
// @access  Private (Organizer / Admin)
const markTicketUsed = async (req, res) => {
    try {
        const { ticketId } = req.body;

        if (!ticketId) {
            return res.status(400).json({
                success: false,
                message: 'Ticket ID is required'
            });
        }

        const isValidId = mongoose.Types.ObjectId.isValid(ticketId);
        const query = isValidId 
            ? { $or: [{ ticketId }, { _id: ticketId }] }
            : { ticketId };

        const ticket = await Ticket.findOne(query);

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        if (ticket.ticketStatus === 'USED' || ticket.usedAt) {
            return res.status(400).json({
                success: false,
                message: '⚠️ Ticket has already been used on ' + new Date(ticket.usedAt).toLocaleString()
            });
        }

        ticket.ticketStatus = 'USED';
        ticket.usedAt = new Date();
        await ticket.save();

        return res.json({
            success: true,
            message: '✅ Ticket marked as USED. Attendee admitted!',
            ticket
        });
    } catch (error) {
        console.error('MarkTicketUsed Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

module.exports = {
    getMyTickets,
    getTicketById,
    verifyTicket,
    markTicketUsed
};
