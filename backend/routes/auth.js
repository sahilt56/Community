const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Otp = require('../models/Otp');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sendEmail = require('../utils/sendEmail');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');

// Initialize Google Auth Client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const axios = require('axios'); // Add axios at the top if not present, though we use it below

// Helper function to generate tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: userId }, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// Helper function to set HttpOnly cookies
const setTokenCookies = (res, accessToken, refreshToken) => {
  res.cookie('token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000 // 15 minutes
  });
  if (refreshToken) {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  }
};

// CHECK USERNAME AVAILABILITY
router.get('/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    // Strict alphanumeric/underscore check
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(200).json({ available: false, message: "Use 3-20 chars (letters, numbers, and underscores only)" });
    }

    const user = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
    if (user) {
      return res.status(200).json({ available: false, message: "Username already taken" });
    }
    res.status(200).json({ available: true, message: "Username is available" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// GOOGLE LOGIN / REGISTER ROUTE
router.post('/google', async (req, res) => {
  try {
    const { access_token, username: providedUsername } = req.body;

    if (!access_token) {
      return res.status(400).json({ error: "Access token is required" });
    }

    // 1. Verify the Access Token by fetching user info from Google
    const googleResponse = await axios.get(
      `https://www.googleapis.com/oauth2/v3/userinfo`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    
    const payload = googleResponse.data;
    const { email, picture } = payload;

    if (!email) {
      return res.status(400).json({ error: "Invalid token: Email not found" });
    }

    // 2. Check if a user with this email already exists
    let user = await User.findOne({ email });

    if (!user) {
      // 3. New User Flow
      if (!providedUsername) {
        // Stop and ask for username
        return res.status(200).json({ 
          status: "NEED_USERNAME", 
          email, 
          picture,
          message: "Please choose a username to continue."
        });
      }

      // Strict alphanumeric/underscore check
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(providedUsername)) {
        return res.status(400).json({ error: "Username must be 3-20 characters (alphanumeric/underscore only)!" });
      }

      // Check if chosen username is unique
      const usernameExists = await User.findOne({ username: { $regex: new RegExp(`^${providedUsername}$`, 'i') } });
      if (usernameExists) {
        return res.status(400).json({ error: "Username already taken! Please choose another one." });
      }

      const generatedPassword = crypto.randomBytes(16).toString('hex'); // Secure Random Password
      
      const newUser = new User({ 
        username: providedUsername, 
        email, 
        password: generatedPassword,
        profilePic: picture 
      });
      user = await newUser.save();
    }

    // 4. Generate Short-lived Access Token & Refresh Token
    const { accessToken, refreshToken } = generateTokens(user._id);
    setTokenCookies(res, accessToken, refreshToken);

    res.status(200).json({
      message: "Google Login successful!",
      user: { id: user._id, username: user.username, profilePic: user.profilePic || null }
    });

  } catch (err) {
    console.error("Google Auth Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to authenticate with Google" });
  }
});

// SEND OTP ROUTE
router.post('/send-otp', async (req, res) => {
  try {
    const { email, username } = req.body;

    // 🛡️ Security: Enforce data type to prevent NoSQL Injection
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: "A valid email is required!" });
    }

    // 1. Check username exists (if provided)
    if (username) {
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return res.status(400).json({ message: "Username must be 3-20 characters (alphanumeric/underscore only)!" });
      }
      const existingUserByUsername = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Username already taken!" });
      }
    }

    // 2. Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists!" });
    }

    // 3. Generate exactly 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString(); // Cryptographically secure OTP

    // 4. Clear existing OTPs for this email
    await Otp.deleteMany({ email });

    // 5. Hash OTP before saving
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);
    const newOtp = new Otp({ email, otp: hashedOtp });
    await newOtp.save();

    // 6. Send email to user
    const message = `Welcome to Vartalap! Your one-time password (OTP) is: ${otp}. It will expire in 5 minutes.`;
    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background-color: #f97316; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to Vartalap! 👋</h1>
        </div>
        <div style="padding: 30px; text-align: center; background-color: white;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Use the following OTP to verify your email and complete your registration. This OTP is valid for <strong>5 minutes</strong>.</p>
          <div style="background-color: #f3f4f6; p-4 border-radius: 8px; display: inline-block; padding: 15px 30px; margin-bottom: 20px;">
            <p style="font-size: 32px; font-weight: bold; color: #f97316; margin: 0; letter-spacing: 5px;">${otp}</p>
          </div>
          <p style="font-size: 14px; color: #666; margin-top: 20px;">If you didn't request this email, please ignore it.</p>
        </div>
        <div style="background-color: #f3f4f6; padding: 15px; text-align: center;">
          <p style="font-size: 12px; color: #999; margin: 0;">&copy; ${new Date().getFullYear()} Vartalap Community.</p>
        </div>
      </div>
    `;

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      sendEmail({
        email,
        subject: 'Verify your Vartalap Registration',
        message,
        html: htmlMessage
      }).catch(err => console.error("Error sending OTP email:", err));
    } else {
        console.log(`[TESTING] OTP for ${email} is: ${otp}`);
    }

    res.status(200).json({ message: "OTP sent successfully!" });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
  }
});

// REGISTER USER ROUTE
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, otp } = req.body;

    // 🛡️ Security: Prevent NoSQL Injection & check password strength
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: "Invalid input format!" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long!" });
    }

    if (!otp) {
        return res.status(400).json({ message: "OTP is required for registration!" });
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ message: "Username must be 3-20 characters (alphanumeric/underscore only)!" });
    }

    // 1. Check uniqueness again for extra safety
    const existingUser = await User.findOne({ 
      $or: [
        { email },
        { username: { $regex: new RegExp(`^${username}$`, 'i') } }
      ]
    });
    
    if (existingUser) {
      const field = existingUser.email === email ? "Email" : "Username";
      return res.status(400).json({ message: `${field} already exists!` });
    }

    // 2. Verify OTP
    const otpRecord = await Otp.findOne({ email });
    if (!otpRecord) {
        return res.status(400).json({ message: "Invalid or expired OTP!" });
    }

    // Explicitly check if OTP is older than 5 minutes (300,000 milliseconds)
    const otpAge = Date.now() - new Date(otpRecord.createdAt || Date.now()).getTime();
    if (otpAge > 5 * 60 * 1000) {
        await Otp.deleteMany({ email });
        return res.status(400).json({ message: "OTP has expired!" });
    }

    const isOtpValid = await bcrypt.compare(otp, otpRecord.otp);
    if (!isOtpValid) {
        return res.status(400).json({ message: "Invalid or expired OTP!" });
    }

    // 3. Create user
    const newUser = new User({ username, email, password });
    const savedUser = await newUser.save();

    // 4. Clear OTP
    await Otp.deleteMany({ email });

    // 5. Generate Tokens
    const { accessToken, refreshToken } = generateTokens(savedUser._id);
    setTokenCookies(res, accessToken, refreshToken);

    res.status(201).json({ 
      message: "User registered successfully!",
      user: { id: savedUser._id, username: savedUser.username, profilePic: savedUser.profilePic || null } 
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// LOGIN USER ROUTE
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 🛡️ Security: Prevent NoSQL Injection
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: "Invalid input format!" });
    }

    // 1. Check karo ki user database mein hai ya nahi
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    // 2. Password verify karo (Bcrypt use karke)
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Wrong password!" });
    }

    // 3. Generate Short-lived Access Token & Refresh Token
    const { accessToken, refreshToken } = generateTokens(user._id);
    setTokenCookies(res, accessToken, refreshToken);

    // 4. Success response
    res.status(200).json({
      message: "Login successful!",
      user: { id: user._id, username: user.username, profilePic: user.profilePic || null }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// REFRESH TOKEN ROUTE
router.post('/refresh-token', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) return res.status(401).json({ message: "Refresh Token is required!" });

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ message: "Invalid or expired Refresh Token! Please log in again." });

      // Issue a new short-lived access token
      const newAccessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
      setTokenCookies(res, newAccessToken, null); // Keep old refresh token
      res.status(200).json({ message: "Token refreshed successfully" });
    });
  } catch (err) {
    res.status(500).json({ message: "Server error during token refresh." });
  }
});

// LOGOUT ROUTE
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.clearCookie('refreshToken');
  res.status(200).json({ message: "Logged out successfully!" });
});

module.exports = router;