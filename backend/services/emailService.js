const nodemailer = require('nodemailer');
const User = require('../models/User');

// Disable TLS unauthorized certificate rejection for email dispatch
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/**
 * Creates Nodemailer Transporter using Environment Variables
 */
const createTransporter = () => {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASSWORD;

    if (!user || !pass) {
        return null;
    }

    const cleanPass = pass.replace(/\s+/g, '');

    // Native Gmail SMTP Service (Sends to ANY recipient user email address dynamically)
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user,
            pass: cleanPass
        },
        connectionTimeout: 12000,
        greetingTimeout: 12000,
        socketTimeout: 12000,
        tls: {
            rejectUnauthorized: false
        }
    });
};

/**
 * Send Booking Confirmation Email dynamically to the authenticated user who booked the ticket.
 * 
 * @param {Object|String} user - User object or User ID
 * @param {Object} event - Event object ({ title, date, time, location, venue })
 * @param {Object} registration - Registration object ({ ticketId, registrationDate, ticketStatus })
 */
const sendBookingConfirmationEmail = async (user, event, registration) => {
    try {
        let recipientUser = user;

        // Ensure user document with email is retrieved from MongoDB if not fully populated
        if (typeof recipientUser === 'string' || (recipientUser && (!recipientUser.email || !recipientUser.name) && recipientUser._id)) {
            const userId = recipientUser._id || recipientUser;
            const dbUser = await User.findById(userId).select('name email phone');
            if (dbUser) {
                recipientUser = dbUser;
            }
        }

        if (!recipientUser || !recipientUser.email) {
            console.warn('[Email Service] Skipped: Recipient email address could not be resolved from user database record.');
            return false;
        }

        // DYNAMIC RECIPIENT EMAIL (Never hard-coded, never defaults to EMAIL_USER)
        const recipientEmail = String(recipientUser.email).trim().toLowerCase();
        const userName = recipientUser.name || 'Attendee';

        const eventTitle = event.title || 'Event';
        const eventDate = event.date ? (String(event.date).includes('T') ? String(event.date).split('T')[0] : event.date) : 'N/A';
        const eventTime = event.time || 'N/A';
        const eventLocation = event.location || 'N/A';
        const eventVenue = event.venue || 'Main Venue';
        const ticketId = registration.ticketId || 'N/A';
        const regDate = registration.registrationDate ? new Date(registration.registrationDate).toLocaleString('en-IN') : new Date().toLocaleString('en-IN');
        const status = registration.ticketStatus ? String(registration.ticketStatus).toUpperCase() : 'CONFIRMED';

        const subject = `🎉 EventHub Ticket Confirmation: ${eventTitle} (${ticketId})`;

        const textContent = `
Hello ${userName},

Your EventHub ticket booking has been confirmed!

--- BOOKING DETAILS ---
Name: ${userName}
Email: ${recipientEmail}
Event Name: ${eventTitle}
Date: ${eventDate}
Time: ${eventTime}
Venue: ${eventVenue}
Location: ${eventLocation}
Ticket Code: ${ticketId}
Booking Status: ${status}
Registration Date: ${regDate}

📄 PDF Ticket & QR Code:
You can view, scan, and download your official PDF ticket anytime from your EventHub Dashboard under 'My Bookings'.

Thank you for booking with EventHub!
`;

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #06131d; margin: 0; padding: 20px; color: #ffffff; }
        .container { max-width: 600px; margin: 0 auto; background: #0d1d2a; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.5); border: 1px solid rgba(16, 185, 129, 0.3); }
        .header { background: linear-gradient(135deg, #10b981, #059669); padding: 25px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .greeting { font-size: 16px; font-weight: 600; margin-bottom: 15px; color: #34d399; }
        .details-box { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 18px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed rgba(255,255,255,0.1); font-size: 14px; }
        .detail-row:last-child { border-bottom: none; }
        .label { color: #94a3b8; font-weight: 600; }
        .value { color: #ffffff; font-weight: 700; }
        .badge { background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 12px; text-transform: uppercase; }
        .pdf-note { background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 6px; font-size: 13px; color: #93c5fd; margin-top: 20px; }
        .footer { background: rgba(0,0,0,0.2); padding: 18px; text-align: center; font-size: 12px; color: #64748b; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Ticket Booking Confirmed</h1>
        </div>
        <div class="content">
            <div class="greeting">Hello ${userName},</div>
            <p style="color:#cbd5e1;">Your EventHub ticket has been successfully booked! Below are your official booking details:</p>
            
            <div class="details-box">
                <div class="detail-row"><span class="label">Attendee Name:</span><span class="value">${userName}</span></div>
                <div class="detail-row"><span class="label">Registered Email:</span><span class="value">${recipientEmail}</span></div>
                <div class="detail-row"><span class="label">Event Name:</span><span class="value">${eventTitle}</span></div>
                <div class="detail-row"><span class="label">Date:</span><span class="value">${eventDate}</span></div>
                <div class="detail-row"><span class="label">Time:</span><span class="value">${eventTime}</span></div>
                <div class="detail-row"><span class="label">Location:</span><span class="value">${eventLocation}</span></div>
                <div class="detail-row"><span class="label">Venue:</span><span class="value">${eventVenue}</span></div>
                <div class="detail-row"><span class="label">Ticket Code:</span><span class="value" style="color:#fbbf24; font-size:16px;">${ticketId}</span></div>
                <div class="detail-row"><span class="label">Registration Date:</span><span class="value">${regDate}</span></div>
                <div class="detail-row"><span class="label">Booking Status:</span><span class="badge">${status}</span></div>
            </div>

            <div class="pdf-note">
                📄 <strong>PDF Ticket & QR Code:</strong> You can download your official branded PDF ticket and scan your entry QR code anytime from your EventHub Dashboard under 'My Bookings'.
            </div>

            <p style="margin-top: 25px; color:#cbd5e1;">Thank you for using EventHub.</p>
        </div>
        <div class="footer">
            © 2026 EventHub Management System. All Rights Reserved.
        </div>
    </div>
</body>
</html>
`;

        const transporter = createTransporter();
        if (!transporter) {
            console.log(`[Email Service] Skipped email to ${recipientEmail} (EMAIL_USER/EMAIL_PASSWORD unconfigured on server).`);
            return false;
        }

        const emailSender = process.env.EMAIL_USER;
        const fromAddress = process.env.EMAIL_FROM || `"EventHub Tickets" <${emailSender}>`;

        const info = await transporter.sendMail({
            from: fromAddress,
            to: recipientEmail,
            subject,
            text: textContent,
            html: htmlContent
        });

        console.log(`✅ [Email Service] Booking confirmation email successfully sent to recipient: ${recipientEmail} (MessageID: ${info.messageId})`);
        return true;
    } catch (error) {
        console.error('[Email Service Error] Failed to send email to recipient:', error.message);
        return false;
    }
};

module.exports = {
    sendBookingConfirmationEmail
};
