let nodemailer = null;
try {
    nodemailer = require('nodemailer');
} catch (e) {
    console.warn('[Email Service] Warning: nodemailer module not installed. Email notifications will run in development log mode.');
}

/**
 * Creates Nodemailer Transporter using Environment Variables
 */
const createTransporter = () => {
    if (!nodemailer) return null;

    const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.EMAIL_PORT || '587', 10);
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASSWORD;

    if (!user || !pass) {
        return null; // Development mode / unconfigured SMTP
    }

    return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
            user,
            pass
        }
    });
};

/**
 * Send Booking Confirmation Email
 * @param {Object} user - Registered user object ({ name, email })
 * @param {Object} event - Event object ({ title, date, time, location, venue })
 * @param {Object} registration - Registration object ({ ticketId, registrationDate, ticketStatus })
 */
const sendBookingConfirmationEmail = async (user, event, registration) => {
    try {
        if (!user || !user.email) {
            console.warn('[Email Service] Skipped: Missing user email recipient.');
            return false;
        }

        const transporter = createTransporter();
        if (!transporter) {
            console.log(`[Email Service] Development Mode: Email notification to ${user.email} skipped (EMAIL_USER/EMAIL_PASSWORD unconfigured in .env).`);
            return false;
        }

        const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || '"EventHub Tickets" <no-reply@eventhub.com>';
        const eventTitle = event.title || 'Event';
        const eventDate = event.date ? (String(event.date).includes('T') ? String(event.date).split('T')[0] : event.date) : 'N/A';
        const eventTime = event.time || 'N/A';
        const eventLocation = event.location || 'N/A';
        const eventVenue = event.venue || 'Main Venue';
        const ticketId = registration.ticketId || 'N/A';
        const regDate = registration.registrationDate ? new Date(registration.registrationDate).toLocaleString('en-IN') : new Date().toLocaleString('en-IN');
        const status = registration.ticketStatus || 'Confirmed';

        const subject = 'EventHub - Ticket Booking Confirmed';

        const textContent = `
Hello ${user.name || 'Attendee'},

Your EventHub ticket has been successfully booked.

Event: ${eventTitle}
Date: ${eventDate}
Time: ${eventTime}
Location: ${eventLocation}
Venue: ${eventVenue}
Ticket ID: ${ticketId}
Registration Date: ${regDate}
Status: ${status}

Thank you for using EventHub.
`;

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border: 1px solid #e1e4e8; }
        .header { background: linear-gradient(135deg, #16834b, #22c55e); padding: 25px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .greeting { font-size: 16px; font-weight: 600; margin-bottom: 15px; }
        .details-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #cbd5e1; font-size: 14px; }
        .detail-row:last-child { border-bottom: none; }
        .label { color: #64748b; font-weight: 600; }
        .value { color: #0f172a; font-weight: 700; }
        .badge { background: #e5f7ed; color: #16834b; padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 12px; }
        .footer { background: #f1f5f9; padding: 18px; text-align: center; font-size: 12px; color: #64748b; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Ticket Booking Confirmed</h1>
        </div>
        <div class="content">
            <div class="greeting">Hello ${user.name || 'Attendee'},</div>
            <p>Your EventHub ticket has been successfully booked. Below are your official booking details:</p>
            
            <div class="details-box">
                <div class="detail-row"><span class="label">Event:</span><span class="value">${eventTitle}</span></div>
                <div class="detail-row"><span class="label">Date:</span><span class="value">${eventDate}</span></div>
                <div class="detail-row"><span class="label">Time:</span><span class="value">${eventTime}</span></div>
                <div class="detail-row"><span class="label">Location:</span><span class="value">${eventLocation}</span></div>
                <div class="detail-row"><span class="label">Venue:</span><span class="value">${eventVenue}</span></div>
                <div class="detail-row"><span class="label">Ticket ID:</span><span class="value" style="color:#635bff;">${ticketId}</span></div>
                <div class="detail-row"><span class="label">Registration Date:</span><span class="value">${regDate}</span></div>
                <div class="detail-row"><span class="label">Status:</span><span class="badge">Confirmed</span></div>
            </div>

            <p style="margin-top: 25px;">Thank you for using EventHub.</p>
        </div>
        <div class="footer">
            © 2026 EventHub Event Management System. All Rights Reserved.
        </div>
    </div>
</body>
</html>
`;

        const info = await transporter.sendMail({
            from: fromAddress,
            to: user.email,
            subject,
            text: textContent,
            html: htmlContent
        });

        console.log(`[Email Service] Booking confirmation email successfully sent to ${user.email} (MessageID: ${info.messageId}).`);
        return true;
    } catch (error) {
        console.error('[Email Service Error] Failed to send email:', error.message);
        return false;
    }
};

module.exports = {
    sendBookingConfirmationEmail
};
