const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  try {
    // Create a transporter using SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: 465, // 🔥 THE FIX: Strictly force Port 465 (SSL). Port 587 is often blocked by cloud providers!
      secure: true,
      family: 4, // 🌐 Ensure IPv4 is used to prevent the old ENETUNREACH error
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Extra safety timeouts for slow cloud environments
      connectionTimeout: 15000, 
      greetingTimeout: 15000,
      socketTimeout: 15000
    });

    // Define email options
    const mailOptions = {
      from: `"Vartalap Community" <${process.env.SMTP_USER}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Email sent: ${info.messageId}`);
  } catch (error) {
    console.error(`❌ Error sending email: ${error.message}`);
    throw error; // 🛡️ Abhi asli error bypass hoke auth.js me jayega
  }
};

module.exports = sendEmail;
