const sendEmail = async (options) => {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (!resendApiKey) {
      throw new Error('Resend API Key missing. Please set RESEND_API_KEY in your server environment variables.');
    }

    const payload = {
      // ⚠️ IMPORTANT: Resend free tier only allows sending FROM 'onboarding@resend.dev' TO your verified email.
      // Once you verify a custom domain (e.g., vartalap.live), you can change this to 'no-reply@vartalap.live'.
      from: 'Vartalap Community <onboarding@resend.dev>',
      to: [options.email],
      subject: options.subject,
      html: options.html,
      text: options.message,
    };

    // 🚀 We use the native Node.js fetch (available in Node 18+) to call the REST API over HTTPS (Port 443)
    // This entirely bypasses the SMTP Port 465/587 blocking!
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      // Throw error with exact message from Resend API
      throw new Error(`Resend API Error: ${data.message || JSON.stringify(data) || 'Failed to send email via API'}`);
    }

    console.log(`✉️ Email sent via Resend API! ID: ${data.id}`);
  } catch (error) {
    console.error(`❌ Error sending email: ${error.message}`);
    throw error; // 🛡️ Abhi asli error bypass hoke auth.js me jayega
  }
};

module.exports = sendEmail;
