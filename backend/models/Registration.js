const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
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
    registrationDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['registered', 'cancelled'],
        default: 'registered'
    },
    ticketStatus: {
        type: String,
        enum: ['confirmed', 'cancelled'],
        default: 'confirmed'
    },
    paymentStatus: {
        type: String,
        enum: ['paid', 'free', 'pending', 'failed'],
        default: 'paid'
    },
    paymentMethod: {
        type: String,
        default: 'UPI'
    },
    amountPaid: {
        type: Number,
        default: 0
    },
    transactionId: {
        type: String,
        default: ''
    },
    orderId: {
        type: String,
        default: ''
    },
    ticketId: {
        type: String,
        required: true,
        unique: true
    },
    paymentTime: {
        type: Date,
        default: Date.now
    },
    ticketGeneratedTime: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Registration', registrationSchema);
