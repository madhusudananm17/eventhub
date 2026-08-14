const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const userRoutes = require('./routes/userRoutes');
const organizerRoutes = require('./routes/organizerRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const ticketRoutes = require('./routes/ticketRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/organizer', organizerRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api', userRoutes);

// Test Route
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'EventHub backend is running'
    });
});

// Error handling middleware for 404
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Endpoint not found - ${req.originalUrl}`
    });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} and accessible across local network`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`⚠️ Port ${PORT} is already in use. Clean up process or restart terminal.`);
        process.exit(1);
    } else {
        console.error('Server error:', err);
    }
});
