const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// REGISTER USER ROUTE
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 1. Check karo ki email pehle se exist toh nahi karti
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists!" });
    }

    // 2. Naya user create karo
    const newUser = new User({ username, email, password });
    const savedUser = await newUser.save(); // Yahan password apne aap hash ho jayega (User.js ke logic se)

    // 3. Login Token (JWT) generate karo
    const token = jwt.sign({ id: savedUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // 4. Success response bhejo
    res.status(201).json({ 
      message: "User registered successfully!",
      token, 
      user: { id: savedUser._id, username: savedUser.username, profilePic: savedUser.profilePic || null } 
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// LOGIN USER ROUTE
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

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

    // 3. Naya Token generate karo login session ke liye
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // 4. Success response
    res.status(200).json({
      message: "Login successful!",
      token,
      user: { id: user._id, username: user.username, profilePic: user.profilePic || null }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;