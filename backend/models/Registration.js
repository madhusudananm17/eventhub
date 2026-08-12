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
    paymentStatus: {
        type: String,
        enum: ['paid', 'free', 'pending'],
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
    }
});

module.exports = mongoose.model('Registration', registrationSchema);
