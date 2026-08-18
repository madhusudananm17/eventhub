const nodemailer = require('nodemailer');
const https = require('https');

// Disable TLS unauthorized certificate rejection for local development email dispatch
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/**
 * Sends email via Resend HTTPS API (Port 443)
 */
const sendViaResendHttps = (apiKey, from, to, subject, html, text) => {
    return new Promise((resolve) => {
        const postData = JSON.stringify({
            from: 'EventHub Security <onboarding@resend.dev>',
            to: Array.isArray(to) ? to : [to],
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
                    console.log(`✅ [Email Service] Booking ticket email delivered to ${to} via Resend HTTPS API!`);
                    resolve(true);
                } else {
                    console.warn(`⚠️ [Email Service] Resend HTTPS API returned ${res.statusCode}: ${body}. Falling back to Nodemailer SMTP.`);
                    resolve(false);
                }
            });
        });

        req.on('error', (e) => {
            console.warn(`⚠️ [Email Service] Resend HTTPS Error: ${e.message}. Falling back to Nodemailer SMTP.`);
            resolve(false);
        });

        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });

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

    // Try native Gmail service transport
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user,
            pass: cleanPass
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
        tls: {
            rejectUnauthorized: false
        }
    });
};

/**
 * Send Booking Confirmation Email to ANY user email address
 */
const sendBookingConfirmationEmail = async (user, event, registration) => {
    try {
        if (!user || !user.email) {
            console.warn('[Email Service] Skipped: Missing user email recipient.');
            return false;
        }

        const resendApiKey = process.env.RESEND_API_KEY;
        const emailUser = process.env.EMAIL_USER;
        const emailPass = process.env.EMAIL_PASSWORD;
        const recipientEmail = user.email.trim();

        const eventTitle = event.title || 'Event';
        const eventDate = event.date ? (String(event.date).includes('T') ? String(event.date).split('T')[0] : event.date) : 'N/A';
        const eventTime = event.time || 'N/A';
        const eventLocation = event.location || 'N/A';
        const eventVenue = event.venue || 'Main Venue';
        const ticketId = registration.ticketId || 'N/A';
        const regDate = registration.registrationDate ? new Date(registration.registrationDate).toLocaleString('en-IN') : new Date().toLocaleString('en-IN');
        const status = registration.ticketStatus || 'Confirmed';

        const subject = `🎉 EventHub Ticket Confirmation: ${eventTitle} (${ticketId})`;

        const textContent = `
Hello ${user.name || 'Attendee'},

Your EventHub ticket has been successfully booked!

Event: ${eventTitle}
Date: ${eventDate}
Time: ${eventTime}
Location: ${eventLocation}
Venue: ${eventVenue}
Ticket ID: ${ticketId}
Registration Date: ${regDate}
Status: ${status}

Thank you for using EventHub!
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
        .badge { background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 12px; }
        .footer { background: rgba(0,0,0,0.2); padding: 18px; text-align: center; font-size: 12px; color: #64748b; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Ticket Booking Confirmed</h1>
        </div>
        <div class="content">
            <div class="greeting">Hello ${user.name || 'Attendee'},</div>
            <p style="color:#cbd5e1;">Your EventHub ticket has been successfully booked! Below are your official booking details:</p>
            
            <div class="details-box">
                <div class="detail-row"><span class="label">Event:</span><span class="value">${eventTitle}</span></div>
                <div class="detail-row"><span class="label">Date:</span><span class="value">${eventDate}</span></div>
                <div class="detail-row"><span class="label">Time:</span><span class="value">${eventTime}</span></div>
                <div class="detail-row"><span class="label">Location:</span><span class="value">${eventLocation}</span></div>
                <div class="detail-row"><span class="label">Venue:</span><span class="value">${eventVenue}</span></div>
                <div class="detail-row"><span class="label">Ticket ID:</span><span class="value" style="color:#fbbf24; font-size:16px;">${ticketId}</span></div>
                <div class="detail-row"><span class="label">Registration Date:</span><span class="value">${regDate}</span></div>
                <div class="detail-row"><span class="label">Status:</span><span class="badge">Confirmed</span></div>
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

        // 1. Try Resend HTTPS API first
        if (resendApiKey) {
            const resendOk = await sendViaResendHttps(resendApiKey, null, recipientEmail, subject, htmlContent, textContent);
            if (resendOk) return true;
        }

        // 2. Fallback to Nodemailer Gmail SMTP (Sends to ANY recipient address)
        if (emailUser && emailPass) {
            const transporter = createTransporter();
            if (transporter) {
                const fromAddress = process.env.EMAIL_FROM || `"EventHub Tickets" <${emailUser}>`;
                const info = await transporter.sendMail({
                    from: fromAddress,
                    to: recipientEmail,
                    subject,
                    text: textContent,
                    html: htmlContent
                });
                console.log(`✅ [Email Service] Booking ticket email sent to ${recipientEmail} via Gmail Nodemailer! (MessageID: ${info.messageId})`);
                return true;
            }
        }

        console.warn(`[Email Service] Could not send email to ${recipientEmail}. Please verify EMAIL_USER and EMAIL_PASSWORD credentials.`);
        return false;
    } catch (error) {
        console.error('[Email Service Error] Failed to send email:', error.message);
        return false;
    }
};

module.exports = {
    sendBookingConfirmationEmail
};
