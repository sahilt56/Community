const sendEmail = async (options) => {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (!resendApiKey) {
      throw new Error('Resend API Key missing. Please set RESEND_API_KEY in your server environment variables.');
    }

    const payload = {
      from: 'Vartalap Community <no-reply@vartalap.live>',
      to: [options.email],
      subject: options.subject,
      html: options.html,
      text: options.message,
    };

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
      throw new Error(`Resend API Error: ${data.message || JSON.stringify(data) || 'Failed to send email via API'}`);
    }

    console.log(`✉️ Email sent via Resend API! ID: ${data.id}`);
  } catch (error) {
    console.error(`❌ Error sending email: ${error.message}`);
    throw error;
  }
};

module.exports = sendEmail;
