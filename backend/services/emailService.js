const nodemailer = require('nodemailer');
const https = require('https');
const User = require('../models/User');

// Disable TLS unauthorized certificate rejection for email dispatch
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/**
 * Sends email via Brevo HTTPS API (Port 443 - free 300 emails/day to ANY recipient address)
 */
const sendViaBrevoHttps = (apiKey, fromUser, toEmail, subject, html, text) => {
    return new Promise((resolve) => {
        const senderEmail = process.env.EMAIL_USER || fromUser || 'madhusudanan819@gmail.com';
        const postData = JSON.stringify({
            sender: { name: 'EventHub Tickets', email: senderEmail },
            to: [{ email: toEmail }],
            subject: subject,
            htmlContent: html,
            textContent: text
        });

        const options = {
            hostname: 'api.brevo.com',
            port: 443,
            path: '/v3/smtp/email',
            method: 'POST',
            headers: {
                'api-key': apiKey.trim(),
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 10000
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`✅ [Email Service] Delivered email to ${toEmail} via Brevo HTTPS API! Response: ${body}`);
                    resolve(true);
                } else {
                    console.warn(`⚠️ [Email Service] Brevo HTTPS returned ${res.statusCode}: ${body}`);
                    resolve(false);
                }
            });
        });

        req.on('error', (e) => {
            console.warn(`⚠️ [Email Service] Brevo HTTPS Error: ${e.message}`);
            resolve(false);
        });

        req.on('timeout', () => { req.destroy(); resolve(false); });
        req.write(postData);
        req.end();
    });
};

/**
 * Sends email via Resend HTTPS API (Port 443)
 */
const sendViaResendHttps = (apiKey, from, toEmail, subject, html, text) => {
    return new Promise((resolve) => {
        const postData = JSON.stringify({
            from: 'EventHub Security <onboarding@resend.dev>',
            to: [toEmail],
            subject: subject,
            html: html,
            text: text
        });

        const options = {
            hostname: 'api.resend.com',
            port: 443,
            path: '/emails',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey.trim()}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 10000
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`✅ [Email Service] Delivered email to ${toEmail} via Resend HTTPS API!`);
                    resolve(true);
                } else {
                    console.warn(`⚠️ [Email Service] Resend HTTPS returned ${res.statusCode}: ${body}`);
                    resolve(false);
                }
            });
        });

        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
        req.write(postData);
        req.end();
    });
};

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

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user,
            pass: cleanPass
        },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 8000,
        tls: {
            rejectUnauthorized: false
        }
    });
};

/**
 * Send Booking Confirmation Email dynamically to the authenticated user who booked the ticket.
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

        const emailSender = process.env.EMAIL_USER;

        // Priority 1: Brevo HTTPS API (Port 443 - 300 free emails/day to ANY recipient)
        const brevoApiKey = process.env.BREVO_API_KEY;
        if (brevoApiKey) {
            const brevoOk = await sendViaBrevoHttps(brevoApiKey, emailSender, recipientEmail, subject, htmlContent, textContent);
            if (brevoOk) return true;
        }

        // Priority 2: Resend HTTPS API (Port 443)
        const resendApiKey = process.env.RESEND_API_KEY;
        if (resendApiKey) {
            const resendOk = await sendViaResendHttps(resendApiKey, null, recipientEmail, subject, htmlContent, textContent);
            if (resendOk) return true;
        }

        // Priority 3: Nodemailer Gmail SMTP
        const transporter = createTransporter();
        if (transporter) {
            try {
                const fromAddress = process.env.EMAIL_FROM || `"EventHub Tickets" <${emailSender}>`;
                const info = await transporter.sendMail({
                    from: fromAddress,
                    to: recipientEmail,
                    subject,
                    text: textContent,
                    html: htmlContent
                });
                console.log(`✅ [Email Service] Delivered to ${recipientEmail} via Gmail Nodemailer! (MessageID: ${info.messageId})`);
                return true;
            } catch (err) {
                console.warn(`⚠️ [Email Service] Gmail SMTP failed (${err.message}).`);
            }
        }

        console.warn(`[Email Service] Could not deliver email to ${recipientEmail}. Please verify BREVO_API_KEY or EMAIL_USER credentials on server.`);
        return false;
    } catch (error) {
        console.error('[Email Service Error] Failed to send email:', error.message);
        return false;
    }
};

module.exports = {
    sendBookingConfirmationEmail
};
