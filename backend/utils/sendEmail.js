const nodemailer = require('nodemailer');

/**
 * Sends a password reset email via Nodemailer.
 * Falls back to logging the reset URL in console if credentials are not configured.
 */
const sendPasswordResetEmail = async ({ toEmail, userName, resetUrl, expireMins = 15 }) => {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASSWORD;
    const emailService = process.env.EMAIL_SERVICE || 'gmail';

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
                    
                    <p style="font-size: 13px; color: #94a3b8; word-break: break-all;">Or copy and paste this link into your browser:<br><a href="${resetUrl}" style="color: #34d399;">${resetUrl}</a></p>
                    
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
    console.log(`✉️  [EVENTHUB PASSWORD RESET EMAIL]`);
    console.log(`To: ${toEmail}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log(`======================================================\n`);

    if (emailUser && emailPass) {
        try {
            const transporter = nodemailer.createTransport({
                service: emailService,
                auth: {
                    user: emailUser,
                    pass: emailPass
                }
            });

            await transporter.sendMail({
                from: `"EventHub Security" <${emailUser}>`,
                to: toEmail,
                subject: '🔑 EventHub Password Reset Request',
                html: htmlContent
            });
            console.log(`✅ Reset email successfully sent to ${toEmail} via Nodemailer.`);
            return true;
        } catch (error) {
            console.error(`⚠️ Nodemailer error sending to ${toEmail}:`, error.message);
            // Non-blocking fallback since we already logged URL for dev testing
            return false;
        }
    } else {
        console.log(`ℹ️ EMAIL_USER / EMAIL_PASSWORD not set in environment. Dev Mode: Reset URL logged above.`);
        return true;
    }
};

module.exports = { sendPasswordResetEmail };
