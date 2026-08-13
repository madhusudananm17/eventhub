const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    ticketId: {
        type: String,
        required: true,
        unique: true
    },
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true
    },
    bookingId: {
        type: String,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    quantity: {
        type: Number,
        default: 1
    },
    ticketStatus: {
        type: String,
        enum: ['CONFIRMED', 'CANCELLED', 'USED'],
        default: 'CONFIRMED'
    },
    qrCodeData: {
        type: String,
        required: true
    },
    generatedAt: {
        type: Date,
        default: Date.now
    },
    usedAt: {
        type: Date,
        default: null
    }
});

module.exports = mongoose.model('Ticket', ticketSchema);
