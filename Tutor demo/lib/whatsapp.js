import twilio from 'twilio';

/**
 * Service to send WhatsApp messages via Twilio
 */
const sendWhatsAppMessage = async (to, message) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_NUMBER; // Must be 'whatsapp:+14155238886' for sandbox

  if (!accountSid || !authToken || !from) {
    console.warn('Twilio credentials not configured. Skipping WhatsApp message.');
    return { success: false, error: 'Credentials missing' };
  }

  const client = twilio(accountSid, authToken);

  try {
    // Ensure the number is formatted for WhatsApp if not already
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    const formattedFrom = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;

    const response = await client.messages.create({
      body: message,
      from: formattedFrom,
      to: formattedTo
    });

    console.log(`WhatsApp sent to ${to}: ${response.sid}`);
    return { success: true, sid: response.sid };
  } catch (error) {
    console.error('Twilio Error:', error);
    return { success: false, error: error.message };
  }
};

export default { sendWhatsAppMessage };
