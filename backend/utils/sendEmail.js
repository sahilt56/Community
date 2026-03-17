const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  try {
    // Create a transporter using SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Extra Safety: Directly instruct the network socket to use IPv4
      family: 4,
      tls: {
        rejectUnauthorized: false // 🛡️ Ye Render par connection timeout hone se bachata hai
      },
      connectionTimeout: 5000, // Fail fast if SMTP is blocked (e.g. 5 seconds)
      greetingTimeout: 5000,
      socketTimeout: 5000
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
