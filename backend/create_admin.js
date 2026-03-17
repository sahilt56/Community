const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const newAdmin = new User({
      username: 'SuperAdmin',
      email: 'admin@vartalap.com',
      password: 'admin123',
      userType: 'professional',
      isAdmin: true,
      anubhav: 100
    });

    await newAdmin.save();
    console.log('SuperAdmin account created successfully! 🎉');
  } catch (err) {
    if (err.code === 11000) {
      console.log('SuperAdmin account already exists! ✅');
    } else {
      console.log('Error:', err);
    }
  }
  process.exit(0);
});
