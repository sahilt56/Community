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
    throw new Error('Email could not be sent');
  }
};

module.exports = sendEmail;
