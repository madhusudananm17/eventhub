const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const Ticket = require('../models/Ticket');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Registration = require('../models/Registration');

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

        let ticket = await Ticket.findOne(
            isValidId 
                ? { $or: [{ _id: queryId }, { ticketId: queryId }, { bookingId: queryId }] }
                : { $or: [{ ticketId: queryId }, { bookingId: queryId }] }
        )
        .populate('event')
        .populate('user', 'name email phone');

        if (!ticket) {
            // Fallback to Registration schema
            const reg = await Registration.findOne(
                isValidId ? { $or: [{ _id: queryId }, { ticketId: queryId }] } : { ticketId: queryId }
            ).populate('event').populate('user', 'name email phone');

            if (!reg) {
                return res.status(404).json({
                    success: false,
                    message: 'Ticket not found'
                });
            }

            // Construct standardized ticket response object
            ticket = {
                _id: reg._id,
                ticketId: reg.ticketId,
                bookingId: reg.orderId || reg.transactionId || reg.ticketId,
                user: reg.user,
                event: reg.event,
                quantity: 1,
                ticketStatus: reg.ticketStatus ? reg.ticketStatus.toUpperCase() : 'CONFIRMED',
                qrCodeData: reg.ticketId,
                generatedAt: reg.ticketGeneratedTime || reg.registrationDate
            };
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

// @desc    Verify ticket by Ticket Code (GET route)
// @route   GET /api/tickets/verify/:ticketCode
// @access  Public / Private (Organizer / Admin)
const verifyTicketByCode = async (req, res) => {
    try {
        const ticketCode = (req.params.ticketCode || '').trim();

        if (!ticketCode) {
            return res.status(400).json({
                isValid: false,
                message: 'Ticket code is required for verification.'
            });
        }

        let searchTicketId = ticketCode;
        if (ticketCode.includes('+')) {
            searchTicketId = ticketCode.split('+')[0];
        }

        const isValidId = mongoose.Types.ObjectId.isValid(searchTicketId);
        const query = isValidId 
            ? { $or: [{ ticketId: searchTicketId }, { qrCodeData: ticketCode }, { _id: searchTicketId }] }
            : { $or: [{ ticketId: searchTicketId }, { qrCodeData: ticketCode }] };

        let ticket = await Ticket.findOne(query)
            .populate('event')
            .populate('user', 'name email phone');

        // Fallback to Registration schema
        if (!ticket) {
            const reg = await Registration.findOne(
                isValidId ? { $or: [{ ticketId: searchTicketId }, { _id: searchTicketId }] } : { ticketId: searchTicketId }
            ).populate('event').populate('user', 'name email phone');

            if (reg) {
                ticket = {
                    _id: reg._id,
                    ticketId: reg.ticketId,
                    bookingId: reg.orderId || reg.ticketId,
                    user: reg.user,
                    event: reg.event,
                    quantity: 1,
                    ticketStatus: reg.ticketStatus ? reg.ticketStatus.toUpperCase() : 'CONFIRMED',
                    qrCodeData: reg.ticketId,
                    generatedAt: reg.registrationDate
                };
            }
        }

        if (!ticket || !ticket.event) {
            return res.status(404).json({
                isValid: false,
                ticketCode,
                message: '❌ Invalid Ticket: Ticket does not exist or has been removed.'
            });
        }

        // Prevent cancelled or invalid tickets
        const isCancelled = ticket.ticketStatus === 'CANCELLED' || (ticket.status && ticket.status === 'cancelled');
        if (isCancelled) {
            return res.status(400).json({
                isValid: false,
                ticketCode: ticket.ticketId,
                eventName: ticket.event.title,
                eventDate: ticket.event.date,
                eventTime: ticket.event.time,
                location: ticket.event.location,
                venue: ticket.event.venue,
                ticketHolderName: ticket.user ? ticket.user.name : 'N/A',
                ticketStatus: 'CANCELLED',
                message: '❌ Ticket Cancelled: This ticket has been cancelled and is no longer valid.'
            });
        }

        const isUsed = ticket.ticketStatus === 'USED' || ticket.usedAt != null;

        return res.json({
            isValid: true,
            ticketCode: ticket.ticketId,
            eventName: ticket.event.title,
            eventDate: ticket.event.date,
            eventTime: ticket.event.time,
            location: ticket.event.location,
            venue: ticket.event.venue,
            ticketHolderName: ticket.user ? ticket.user.name : 'Valued Attendee',
            ticketHolderEmail: ticket.user ? ticket.user.email : '',
            ticketStatus: isUsed ? 'USED' : 'CONFIRMED',
            isUsed,
            message: isUsed ? '⚠️ Ticket Valid but ALREADY USED' : '✅ Ticket Valid & Active'
        });
    } catch (error) {
        console.error('VerifyTicketByCode Error:', error.message);
        return res.status(500).json({
            isValid: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Verify ticket by Organizer / Admin via QR Code or Ticket ID (POST route)
// @route   POST /api/tickets/verify
// @access  Private (Organizer / Admin)
const verifyTicket = async (req, res) => {
    try {
        const { ticketId, qrCodeData } = req.body;
        const queryId = (ticketId || qrCodeData || '').trim();

        req.params.ticketCode = queryId;
        return await verifyTicketByCode(req, res);
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

        let ticket = await Ticket.findOne(query);

        if (!ticket) {
            const reg = await Registration.findOne(query);
            if (reg) {
                if (reg.ticketStatus === 'cancelled') {
                    return res.status(400).json({
                        success: false,
                        message: '❌ Ticket is cancelled.'
                    });
                }
                reg.ticketStatus = 'cancelled'; // or used
                await reg.save();
                return res.json({
                    success: true,
                    message: '✅ Registration verified & admitted!'
                });
            }

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

// @desc    Download Professional PDF Ticket with QR Code
// @route   GET /api/tickets/:id/pdf
// @access  Private (Ticket Owner, Organizer, Admin)
const getTicketPdf = async (req, res) => {
    try {
        const queryId = req.params.id;
        const isValidId = mongoose.Types.ObjectId.isValid(queryId);

        let ticket = await Ticket.findOne(
            isValidId 
                ? { $or: [{ _id: queryId }, { ticketId: queryId }] }
                : { ticketId: queryId }
        )
        .populate('event')
        .populate('user', 'name email phone');

        if (!ticket) {
            const reg = await Registration.findOne(
                isValidId ? { $or: [{ _id: queryId }, { ticketId: queryId }] } : { ticketId: queryId }
            ).populate('event').populate('user', 'name email phone');

            if (reg) {
                ticket = {
                    _id: reg._id,
                    ticketId: reg.ticketId,
                    bookingId: reg.orderId || reg.ticketId,
                    user: reg.user,
                    event: reg.event,
                    quantity: 1,
                    ticketStatus: reg.ticketStatus ? reg.ticketStatus.toUpperCase() : 'CONFIRMED',
                    qrCodeData: reg.ticketId,
                    generatedAt: reg.registrationDate
                };
            }
        }

        if (!ticket || !ticket.event) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found.'
            });
        }

        // Authorization check: Must be ticket owner, event organizer, or admin
        const isOwner = req.user && req.user._id.toString() === ticket.user._id.toString();
        const isOrganizer = req.user && ticket.event.organizer && req.user._id.toString() === ticket.event.organizer.toString();
        const isAdmin = req.user && req.user.role === 'admin';

        if (!isOwner && !isOrganizer && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to download this ticket.'
            });
        }

        // Generate QR code data URL
        const qrCodeDataUrl = await QRCode.toDataURL(ticket.ticketId, {
            errorCorrectionLevel: 'H',
            margin: 1,
            width: 160,
            color: {
                dark: '#06131d',
                light: '#ffffff'
            }
        });

        const codeBase64 = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
        const qrBuffer = Buffer.from(codeBase64, 'base64');

        // Create PDF Document
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const filename = `EventHub_Ticket_${ticket.ticketId}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        doc.pipe(res);

        // Header Background Banner (Dark Forest Palette #06131d)
        doc.rect(40, 40, 515, 80).fill('#06131d');

        // EventHub Header Text
        doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('🎫 EVENTHUB', 60, 58);
        doc.fillColor('#34d399').fontSize(11).font('Helvetica').text('Official Admission Pass & Ticket', 60, 85);
        doc.fillColor('#fbbf24').fontSize(10).font('Helvetica-Bold').text(`STATUS: ${ticket.ticketStatus}`, 420, 70);

        // Card Container Box
        doc.rect(40, 130, 515, 340).strokeColor('#10b981').lineWidth(1.5).stroke();

        // Event Details Title & Category
        doc.fillColor('#06131d').fontSize(18).font('Helvetica-Bold').text(ticket.event.title, 60, 150);
        doc.fillColor('#059669').fontSize(11).font('Helvetica-Bold').text(`Category: ${ticket.event.category || 'General'}`, 60, 175);

        // Divider Line
        doc.moveTo(60, 195).lineTo(340, 195).strokeColor('#cbd5e1').lineWidth(1).stroke();

        // Event Details Column
        doc.fillColor('#475569').fontSize(10).font('Helvetica-Bold').text('DATE & TIME', 60, 210);
        doc.fillColor('#0f172a').fontSize(12).font('Helvetica').text(`${ticket.event.date} at ${ticket.event.time}`, 60, 225);

        doc.fillColor('#475569').fontSize(10).font('Helvetica-Bold').text('LOCATION & VENUE', 60, 255);
        doc.fillColor('#0f172a').fontSize(12).font('Helvetica').text(`${ticket.event.venue}, ${ticket.event.location}`, 60, 270);

        doc.fillColor('#475569').fontSize(10).font('Helvetica-Bold').text('TICKET HOLDER', 60, 300);
        doc.fillColor('#0f172a').fontSize(12).font('Helvetica').text(`${ticket.user.name} (${ticket.user.email})`, 60, 315);

        doc.fillColor('#475569').fontSize(10).font('Helvetica-Bold').text('TICKET CODE', 60, 345);
        doc.fillColor('#059669').fontSize(14).font('Helvetica-Bold').text(ticket.ticketId, 60, 360);

        doc.fillColor('#475569').fontSize(10).font('Helvetica-Bold').text('QUANTITY', 60, 390);
        doc.fillColor('#0f172a').fontSize(12).font('Helvetica').text(`${ticket.quantity || 1} Pass(es)`, 60, 405);

        // QR Code Box Right Side
        doc.rect(360, 150, 170, 210).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.image(qrBuffer, 375, 165, { width: 140, height: 140 });
        doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold').text('SCAN TO VERIFY', 360, 315, { width: 170, align: 'center' });
        doc.fillColor('#0f172a').fontSize(9).font('Helvetica').text(ticket.ticketId, 360, 332, { width: 170, align: 'center' });

        // Footer Instructions
        doc.fillColor('#64748b').fontSize(9).font('Helvetica-Oblique').text(
            'Important: Please present this PDF ticket or QR code at the venue gate for admission. Each ticket code is single-use.',
            60, 435, { width: 475, align: 'left' }
        );

        doc.end();
    } catch (error) {
        console.error('GetTicketPdf Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Error generating ticket PDF: ' + error.message
        });
    }
};

module.exports = {
    getMyTickets,
    getTicketById,
    verifyTicketByCode,
    verifyTicket,
    markTicketUsed,
    getTicketPdf
};
