/**
 * Sends a 6-digit Recovery OTP via SMS / WhatsApp integration provider.
 * Logs the OTP for local testing and contains marked integration hooks for Twilio / Fast2SMS / WhatsApp API.
 */
const sendSmsOtp = async (phone, otp) => {
    console.log(`\n======================================================`);
    console.log(`📱 [EVENTHUB RECOVERY OTP SENT]`);
    console.log(`Mobile Number: ${phone}`);
    console.log(`6-Digit OTP:   [ ${otp} ] (Valid for 5 minutes)`);
    console.log(`======================================================\n`);

    // ====================================================================
    // PROVIDER INTEGRATION PLACEHOLDER (Twilio / WhatsApp Business API)
    // ====================================================================
    // To connect a live WhatsApp/SMS gateway (e.g. Twilio / Fast2SMS):
    //
    // const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    // const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    // const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    //
    // if (twilioAccountSid && twilioAuthToken) {
    //     const client = require('twilio')(twilioAccountSid, twilioAuthToken);
    //     await client.messages.create({
    //         body: `Your EventHub Email Recovery OTP is: ${otp}. Valid for 5 minutes.`,
    //         from: twilioPhoneNumber, // or 'whatsapp:' + twilioPhoneNumber
    //         to: phone
    //     });
    // }
    // ====================================================================

    return true;
};

/**
 * Mask email helper function:
 * Converts "madhusudanan@gmail.com" to "ma****@gmail.com"
 * Converts "ab@domain.com" to "a*@domain.com"
 */
const maskEmail = (email) => {
    if (!email || !email.includes('@')) return email;
    const [name, domain] = email.split('@');
    if (name.length <= 2) {
        return name[0] + '*@' + domain;
    }
    const maskedName = name.slice(0, 2) + '*'.repeat(name.length - 2);
    return `${maskedName}@${domain}`;
};

module.exports = {
    sendSmsOtp,
    maskEmail
};
