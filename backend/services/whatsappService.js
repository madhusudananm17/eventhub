/**
 * Phone Number Normalizer Helper
 * Prepends country code +91 for Indian numbers if not already provided.
 */
const normalizePhoneNumber = (phone) => {
    if (!phone) return '';
    let digits = phone.replace(/\D/g, ''); // Extract only numerical digits

    if (digits.length === 10) {
        digits = '91' + digits; // Prepend India country code 91
    } else if (digits.startsWith('0') && digits.length === 11) {
        digits = '91' + digits.substring(1);
    }
    return digits;
};

/**
 * Send Booking Confirmation via Official WhatsApp Business Cloud API
 * @param {Object} user - User object ({ name, phone })
 * @param {Object} event - Event object ({ title, date, time, location, venue })
 * @param {Object} registration - Registration object ({ ticketId })
 */
const sendBookingConfirmationWhatsApp = async (user, event, registration) => {
    try {
        const isEnabled = process.env.WHATSAPP_ENABLED === 'true';

        if (!isEnabled) {
            console.log('[WhatsApp Service] Disabled: WHATSAPP_ENABLED=false in .env. WhatsApp notification skipped.');
            return false;
        }

        if (!user || !user.phone) {
            console.warn('[WhatsApp Service] Skipped: User has no registered phone number.');
            return false;
        }

        const normalizedPhone = normalizePhoneNumber(user.phone);
        if (!normalizedPhone) {
            console.warn(`[WhatsApp Service] Skipped: Invalid phone number format (${user.phone}).`);
            return false;
        }

        const provider = (process.env.WHATSAPP_PROVIDER || 'meta').toLowerCase();
        const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        const customApiUrl = process.env.WHATSAPP_API_URL;

        const eventTitle = event.title || 'Event';
        const eventDate = event.date ? (String(event.date).includes('T') ? String(event.date).split('T')[0] : event.date) : 'N/A';
        const eventTime = event.time || 'N/A';
        const eventLocation = event.location || 'N/A';
        const eventVenue = event.venue || 'Main Venue';
        const ticketId = registration.ticketId || 'N/A';

        const messageText = `EventHub - Registration Confirmed

Hello ${user.name || 'Attendee'},

Your ticket has been successfully booked.

Event: ${eventTitle}
Date: ${eventDate}
Time: ${eventTime}
Location: ${eventLocation}
Venue: ${eventVenue}
Ticket ID: ${ticketId}

Thank you for registering with EventHub.`;

        // Check Meta WhatsApp Cloud API credentials
        if (provider === 'meta') {
            if (!accessToken || !phoneNumberId) {
                console.log(`[WhatsApp Service] Development Mode: WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID missing in .env. Notification skipped.`);
                return false;
            }

            const apiUrl = customApiUrl || `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

            const payload = {
                messaging_product: 'whatsapp',
                to: normalizedPhone,
                type: 'text',
                text: {
                    body: messageText
                }
            };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                console.log(`[WhatsApp Service] WhatsApp booking confirmation sent to ${normalizedPhone}.`);
                return true;
            } else {
                console.error('[WhatsApp Service Error] Provider error response:', data);
                return false;
            }
        } else {
            console.log(`[WhatsApp Service] Custom Provider '${provider}' not configured.`);
            return false;
        }

    } catch (error) {
        console.error('[WhatsApp Service Error] Failed to send WhatsApp message:', error.message);
        return false;
    }
};

module.exports = {
    sendBookingConfirmationWhatsApp,
    normalizePhoneNumber
};
