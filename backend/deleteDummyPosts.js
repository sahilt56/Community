require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Community = require('./models/Community');
const Post = require('./models/Post');

async function deleteData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        // Find all dummy users
        const dummyUsers = await User.find({ email: { $regex: /@dummy\.com$/ } });
        
        if (!dummyUsers || dummyUsers.length === 0) {
            console.log("No dummy users found. No dummy posts to delete.");
            process.exit(0);
        }

        const dummyUserIds = dummyUsers.map(u => u._id);

        // Delete all posts authored by dummy users
        const result = await Post.deleteMany({ author: { $in: dummyUserIds } });
        console.log(`Deleted ${result.deletedCount} dummy posts.`);

        // Delete dummy communities
        const communityResult = await Community.deleteMany({ creator: { $in: dummyUserIds } });
        console.log(`Deleted ${communityResult.deletedCount} dummy communities.`);

        // Delete dummy users
        const userResult = await User.deleteMany({ _id: { $in: dummyUserIds } });
        console.log(`Deleted ${userResult.deletedCount} dummy users.`);

        console.log("\n=================================");
        console.log("Cleanup complete! All Indian dummy profiles and posts removed.");
        console.log("=================================\n");

        process.exit(0);
    } catch (err) {
        console.error("Deletion error:", err);
        process.exit(1);
    }
}

deleteData();
