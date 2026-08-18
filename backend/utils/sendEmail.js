const nodemailer = require('nodemailer');

// Disable TLS unauthorized certificate rejection for email dispatch
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Helper function to create robust Nodemailer transporter for cloud hosting (Render)
const createTransporter = (emailUser, emailPass) => {
    const cleanPass = (emailPass || '').replace(/\s+/g, '');
    const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const emailPort = parseInt(process.env.EMAIL_PORT || '587', 10);

    return nodemailer.createTransport({
        host: emailHost,
        port: emailPort,
        secure: emailPort === 465, // true for 465, false for 587
        requireTLS: emailPort === 587,
        auth: {
            user: emailUser,
            pass: cleanPass
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 15000,
        tls: {
            rejectUnauthorized: false,
            ciphers: 'SSLv3'
        }
    });
};

/**
 * Sends a password reset email via Nodemailer using configured SMTP credentials.
 */
const sendPasswordResetEmail = async ({ toEmail, userName, resetUrl, expireMins = 15 }) => {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASSWORD;
    const emailFrom = process.env.EMAIL_FROM || `"EventHub Security" <${emailUser || 'noreply@eventhub.com'}>`;

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #06131d; color: #ffffff; margin: 0; padding: 20px; }
                .container { max-width: 580px; margin: 0 auto; background: #0d1d2a; border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.3); padding: 32px; box-shadow: 0 8px 30px rgba(0,0,0,0.5); }
                .header { text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 20px; margin-bottom: 24px; }
                .logo { font-size: 24px; font-weight: 800; color: #ffffff; text-decoration: none; }
                .badge { display: inline-block; background: rgba(16,185,129,0.2); color: #34d399; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-top: 8px; }
                .content { font-size: 15px; line-height: 1.6; color: #cbd5e1; }
                .btn-container { text-align: center; margin: 30px 0; }
                .btn { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 800; font-size: 15px; display: inline-block; box-shadow: 0 0 20px rgba(16, 185, 129, 0.4); }
                .warning { background: rgba(251, 191, 36, 0.1); border-left: 4px solid #fbbf24; padding: 12px 16px; border-radius: 6px; font-size: 13px; color: #fef08a; margin-top: 24px; }
                .footer { font-size: 12px; color: #64748b; text-align: center; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🎫 EventHub</div>
                    <div class="badge">Security Notification</div>
                </div>
                <div class="content">
                    <p>Hello <strong>${userName || 'Valued User'}</strong>,</p>
                    <p>We received a request to reset the password for your EventHub account (<strong>${toEmail}</strong>).</p>
                    <p>Click the button below to set a new password. This link is valid for <strong>${expireMins} minutes</strong>:</p>
                    
                    <div class="btn-container">
                        <a href="${resetUrl}" target="_blank" class="btn">🔑 Reset Password →</a>
                    </div>
                    
                    <p style="font-size: 13px; color: #94a3b8; word-break: break-all;">
                        Or copy and paste this link into your mobile or computer browser:<br>
                        <a href="${resetUrl}" style="color: #34d399;">${resetUrl}</a>
                    </p>
                    
                    <div class="warning">
                        <strong>⚠️ Security Alert:</strong> If you did not request a password reset, please ignore this email or contact EventHub support immediately. Your password will remain unchanged.
                    </div>
                </div>
                <div class="footer">
                    © 2026 EventHub Karnataka. All rights reserved.
                </div>
            </div>
        </body>
        </html>
    `;

    console.log(`\n======================================================`);
    console.log(`✉️  [EVENTHUB PASSWORD RESET EMAIL DISPATCH]`);
    console.log(`To: ${toEmail}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log(`======================================================\n`);

    if (emailUser && emailPass) {
        try {
            const transporter = createTransporter(emailUser, emailPass);
            const info = await transporter.sendMail({
                from: emailFrom,
                to: toEmail,
                subject: '🔑 EventHub Password Reset Request',
                html: htmlContent
            });

            console.log(`✅ Reset email successfully delivered to ${toEmail}! MessageId: ${info.messageId}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error(`❌ Nodemailer error sending to ${toEmail}:`, error.message);
            return { success: false, error: error.message };
        }
    } else {
        console.log(`ℹ️ EMAIL_USER / EMAIL_PASSWORD not set in environment.`);
        return { success: false, error: 'EMAIL_USER or EMAIL_PASSWORD environment variable is missing on server.' };
    }
};

/**
 * Sends a 6-digit OTP email notification via Nodemailer.
 */
const sendOtpEmail = async ({ toEmail, userName, otp, expireMins = 5 }) => {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASSWORD;
    const emailFrom = process.env.EMAIL_FROM || `"EventHub Security" <${emailUser || 'noreply@eventhub.com'}>`;

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #06131d; color: #ffffff; margin: 0; padding: 20px; }
                .container { max-width: 580px; margin: 0 auto; background: #0d1d2a; border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.3); padding: 32px; box-shadow: 0 8px 30px rgba(0,0,0,0.5); }
                .header { text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 20px; margin-bottom: 24px; }
                .logo { font-size: 24px; font-weight: 800; color: #ffffff; text-decoration: none; }
                .badge { display: inline-block; background: rgba(16,185,129,0.2); color: #34d399; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-top: 8px; }
                .content { font-size: 15px; line-height: 1.6; color: #cbd5e1; text-align: center; }
                .otp-box { background: rgba(16, 185, 129, 0.15); border: 2px dashed #10b981; font-size: 32px; font-weight: 800; color: #fbbf24; letter-spacing: 8px; padding: 16px; border-radius: 12px; margin: 24px 0; display: inline-block; width: 80%; }
                .footer { font-size: 12px; color: #64748b; text-align: center; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🎫 EventHub</div>
                    <div class="badge">Verification Code</div>
                </div>
                <div class="content">
                    <p>Hello <strong>${userName || 'Valued User'}</strong>,</p>
                    <p>Here is your 6-digit Email Recovery Verification OTP (valid for <strong>${expireMins} minutes</strong>):</p>
                    
                    <div class="otp-box">${otp}</div>
                    
                    <p style="font-size: 13px; color: #94a3b8;">If you did not request this OTP, please ignore this message.</p>
                </div>
                <div class="footer">
                    © 2026 EventHub Karnataka. All rights reserved.
                </div>
            </div>
        </body>
        </html>
    `;

    if (emailUser && emailPass) {
        try {
            const transporter = createTransporter(emailUser, emailPass);
            const info = await transporter.sendMail({
                from: emailFrom,
                to: toEmail,
                subject: `📱 EventHub Email Recovery OTP: ${otp}`,
                html: htmlContent
            });

            console.log(`✅ Recovery OTP email sent to ${toEmail}! MessageId: ${info.messageId}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error(`❌ Error sending OTP email to ${toEmail}:`, error.message);
            return { success: false, error: error.message };
        }
    }
    return { success: false, error: 'EMAIL_USER or EMAIL_PASSWORD environment variable is missing on server.' };
};

module.exports = {
    sendPasswordResetEmail,
    sendOtpEmail
};
