const nodemailer = require('nodemailer');
const dns = require('dns').promises;

const sendEmail = async (options) => {
  try {
    const targetHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    
    // 🔥 THE BULLETPROOF FIX: Manually resolve the server's IPv4 address before connecting.
    // This absolutely forces Node to ignore IPv6, bypassing the ENETUNREACH error on Render.
    let resolvedIPv4;
    try {
      const { address } = await dns.lookup(targetHost, { family: 4 });
      resolvedIPv4 = address;
    } catch (e) {
      resolvedIPv4 = targetHost; // Fallback if DNS lookup completely fails
    }

    // Determine port and secure flag dynamically
    // Render and many cloud providers block port 587 (timeout). Port 465 (SSL) works flawlessly.
    const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465;
    const isSecure = smtpPort === 465;

    // Create a transporter using SMTP
    const transporter = nodemailer.createTransport({
      host: resolvedIPv4, // Connect directly to the IPv4 address
      port: smtpPort,
      secure: isSecure, // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        servername: targetHost, // 🔥 Important: Tell the server we are talking to 'smtp.gmail.com' so SSL matches
        rejectUnauthorized: false
      },
      connectionTimeout: 10000, // Increased timeout slightly for reliable delivery
      greetingTimeout: 10000,
      socketTimeout: 10000
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
