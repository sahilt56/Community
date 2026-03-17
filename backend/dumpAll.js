const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find({ isAdmin: true }).select('+password username email');
    console.log("Admins:");
    for (let u of users) {
        console.log(`- ${u.username} (${u.email}) | passHash: ${u.password.substring(0, 20)}...`);
    }
    
    // Also check 'sahil' specifically if they are not admin or something
    const sahil = await User.findOne({ username: 'sahil' }).select('+password username email isAdmin');
    if (sahil) {
        console.log(`\nSahil user found:`);
        console.log(`- ${sahil.username} (${sahil.email}) | isAdmin: ${sahil.isAdmin} | passHash: ${sahil.password.substring(0, 20)}...`);
    } else {
        console.log("No user named sahil found");
    }
    
    process.exit(0);
}

check().catch(console.error);
