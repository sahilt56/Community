const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const verifyAdmin = require('../middleware/verifyAdmin');
const User = require('../models/User');
const Post = require('../models/Post');
const Community = require('../models/Community');
const Report = require('../models/Report');
const Notification = require('../models/Notification');
const Setting = require('../models/Setting');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Apply admin middleware to all routes in this file
router.use(verifyToken);
router.use(verifyAdmin);

// ==========================================
// ⚙️ 0. PLATFORM SETTINGS
// ==========================================
router.get('/settings/:key', async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: req.params.key });
    if (!setting) return res.status(404).json({ message: "Setting not found.", key: req.params.key, value: null });
    res.json(setting);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

router.put('/settings/:key', async (req, res) => {
  try {
    const { value, description } = req.body;
    let setting = await Setting.findOne({ key: req.params.key });
    
    if (setting) {
      setting.value = value;
      if (description !== undefined) setting.description = description;
      await setting.save();
    } else {
      setting = new Setting({
        key: req.params.key,
        value,
        description: description || ""
      });
      await setting.save();
    }
    
    res.json({ message: "Setting updated successfully!", setting });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// ==========================================
// 📊 1. GET ADMIN OVERVIEW STATISTICS
// ==========================================
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalCommunities = await Community.countDocuments();
    const totalPosts = await Post.countDocuments({ isDeleted: { $ne: true } });
    const pendingReports = await Report.countDocuments({ status: 'pending' });

    let dbStorageUsed = 0;
    let collectionsStats = [];
    try {
        const dbStats = await mongoose.connection.db.stats();
        // storageSize often represents allocated space + indexes. dataSize is uncompressed data.
        // For free tier tracking (e.g. Atlas 512MB), dataSize + indexSize is a good logical gauge.
        dbStorageUsed = (dbStats.dataSize || 0) + (dbStats.indexSize || 0);

        // Fetch collection stats for major collections
        const colNames = ['users', 'posts', 'communities', 'comments', 'notifications', 'messages'];
        for (const cName of colNames) {
            try {
               const cstats = await mongoose.connection.db.command({ collStats: cName });
               const sizeBytes = (cstats.size || 0) + (cstats.totalIndexSize || 0);
               if (sizeBytes > 0) {
                 collectionsStats.push({ name: cName, sizeBytes });
               }
            } catch(e) { /* ignore missing */ }
        }
        
        // Sort largest first
        collectionsStats.sort((a,b) => b.sizeBytes - a.sizeBytes);
        
    } catch (e) {
        console.error("Failed to fetch DB stats", e);
    }

    res.json({
      totalUsers,
      totalCommunities,
      totalPosts,
      pendingReports,
      dbStorageUsed,
      collectionsStats
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin statistics' });
  }
});

// ==========================================
// 👥 2. MANAGE USERS
// ==========================================
router.get('/users', async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Admin Ban User
router.post('/users/:id/ban', async (req, res) => {
  try {
    const userId = req.params.id;
    const { days } = req.body;

    // Safety check
    if (userId === req.user.id) {
        return res.status(400).json({ message: "You cannot ban your own admin account." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    if (!days || days <= 0) {
      return res.status(400).json({ message: "Invalid ban duration." });
    }

    user.isBanned = true;
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + parseInt(days));
    user.banExpiresAt = expirationDate;
    
    // Increment ban count
    user.banCount = (user.banCount || 0) + 1;

    // Check penalty
    if (user.banCount >= 3) {
      user.anubhav -= 10;
    }

    await user.save();

    res.json({ message: `User temporarily banned for ${days} days. Total Bans: ${user.banCount}` });
  } catch (err) {
    console.error("Admin user ban error:", err);
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

// Admin Unban User
router.post('/users/:id/unban', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    
    if (!user) return res.status(404).json({ message: "User not found." });

    user.isBanned = false;
    user.banExpiresAt = null;
    await user.save();
    
    res.json({ message: "User successfully unbanned." });
  } catch (err) {
    console.error("Admin unban error:", err);
    res.status(500).json({ error: 'Failed to unban user' });
  }
});

// Admin Feature Toggles for Specific User
router.get('/users/:id/features', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    
    res.json({ disabledFeatures: user.disabledFeatures || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user features' });
  }
});

router.post('/users/:id/features', async (req, res) => {
  try {
    const { disabledFeatures } = req.body;
    if (!Array.isArray(disabledFeatures)) {
      return res.status(400).json({ message: "disabledFeatures must be an array of strings." });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    
    user.disabledFeatures = disabledFeatures;
    await user.save();
    
    res.json({ message: "User features updated successfully!", disabledFeatures: user.disabledFeatures });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user features' });
  }
});

// Admin Toggle GIF Banner Permission
router.post('/users/:id/toggle-gif', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    if (req.body && typeof req.body.canUseGifBanner === 'boolean') {
      user.canUseGifBanner = req.body.canUseGifBanner;
    } else {
      user.canUseGifBanner = !user.canUseGifBanner;
    }

    await user.save();

    res.json({ message: `GIF Banner permission ${user.canUseGifBanner ? 'granted' : 'revoked'} for u/${user.username}.`, canUseGifBanner: user.canUseGifBanner });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle GIF banner permission' });
  }
});

// Admin Add User Anubhav (Manual)
router.post('/users/:id/add-anubhav', async (req, res) => {
  try {
    const userId = req.params.id;
    const { amount } = req.body;

    const parsedAmount = parseInt(amount);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: "A valid positive amount is required." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    user.anubhav = (user.anubhav || 0) + parsedAmount;
    await user.save();

    res.json({ message: `Successfully added ${parsedAmount} Anubhav. New balance: ${user.anubhav}` });
  } catch (err) {
    console.error("Admin add anubhav error:", err);
    res.status(500).json({ error: 'Failed to add Anubhav' });
  }
});

// Admin Deduct User Anubhav (Manual)
router.post('/users/:id/deduct-anubhav', async (req, res) => {
  try {
    const userId = req.params.id;
    const { amount } = req.body;

    const parsedAmount = parseInt(amount);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: "A valid positive amount is required." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    user.anubhav -= parsedAmount;
    await user.save();

    res.json({ message: `Successfully deducted ${parsedAmount} Anubhav. New balance: ${user.anubhav}` });
  } catch (err) {
    console.error("Admin deduct anubhav error:", err);
    res.status(500).json({ error: 'Failed to deduct Anubhav' });
  }
});

// Admin Send Direct Message to User
router.post('/users/:id/message', async (req, res) => {
  try {
    const userId = req.params.id;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: "Message content is required." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    const newNotification = new Notification({
      recipient: user._id,
      sender: req.user.id, // Admin sending the message
      type: 'admin_message',
      content: content.trim()
    });
    
    await newNotification.save();
    
    // Broadcast notification if socket is available
    if (req.io) {
       req.io.to(user._id.toString()).emit('new_notification', newNotification);
    }

    res.json({ message: "Direct message sent successfully!" });
  } catch (err) {
    console.error("Admin send message error:", err);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

// Admin Force Delete User (Banning / Scrubbing)
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Safety check - admin cannot delete themselves via this route
    if (userId === req.user.id) {
        return res.status(400).json({ message: "You cannot delete your own admin account from here." });
    }

    // A. Find all Communities created by the user
    // We will delete them completely
    const communitiesToDelete = await Community.find({ creator: userId });
    const communityIds = communitiesToDelete.map(c => c._id);

    // B. Find all Posts that are either IN these communities OR authored by this user
    // We will delete all of these posts
    const postsToDelete = await Post.find({
      $or: [
        { author: userId },
        { community: { $in: communityIds } }
      ]
    });
    const postIds = postsToDelete.map(p => p._id);

    // C. Delete all Comments that are either authored by this user OR belong to any of the deleted posts
    const Comment = require('../models/Comment');
    await Comment.deleteMany({
      $or: [
        { author: userId },
        { post: { $in: postIds } }
      ]
    });

    // D. Delete the identified Posts and Communities
    await Post.deleteMany({ _id: { $in: postIds } });
    await Community.deleteMany({ _id: { $in: communityIds } });

    // E. Remove user's ID from various arrays in remaining documents
    await Post.updateMany({}, { 
      $pull: { upvotes: userId, downvotes: userId, savedBy: userId, hiddenBy: userId } 
    });
    
    // Remove user votes from poll options in remaining posts
    await Post.updateMany(
      { 'pollOptions.votes': userId },
      { $pull: { 'pollOptions.$[].votes': userId } }
    );

    await Comment.updateMany({}, {
      $pull: { upvotes: userId, downvotes: userId }
    });

    await Community.updateMany({}, { 
      $pull: { members: userId, moderators: userId, bannedUsers: userId } 
    });

    await User.updateMany({ following: userId }, { $pull: { following: userId } });
    await User.updateMany({ followers: userId }, { $pull: { followers: userId } });

    // F. Finally, Delete the User document
    await User.findByIdAndDelete(userId);

    res.json({ message: "User account and all associated data permanently deleted." });
  } catch (err) {
    console.error("Admin user wipe error:", err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ==========================================
// 🔐 2.5. ADMIN SECURITY SETTINGS
// ==========================================
router.put('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    // Select password explicitly in case schema hides it by default
    const user = await User.findById(req.user.id).select('+password');
    if (!user) return res.status(404).json({ message: "User not found" });

    // Fallback check for plaintext passwords (if seeded manually in DB)
    let isMatch = false;
    if (user.password && user.password.startsWith('$2')) {
        isMatch = await bcrypt.compare(currentPassword, user.password);
    } else {
        isMatch = currentPassword === user.password;
    }

    if (!isMatch) {
      console.log(`Password mismatch debug:\nDB Hash: ${user.password}\nProvided: '${currentPassword}'\nLength provided: ${currentPassword.length}`);
      return res.status(400).json({ message: "Incorrect current password" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    // Use findByIdAndUpdate to safely and directly modify without pre('save') hooks double hashing
    await User.findByIdAndUpdate(user._id, { password: hashedPassword }, { new: true });

    res.json({ message: "Password updated successfully!" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Failed to change password" });
  }
});

// ==========================================
// 🏘️ 3. MANAGE COMMUNITIES
// ==========================================
router.get('/communities', async (req, res) => {
  try {
    const communities = await Community.find()
      .populate('creator', 'username profilePic')
      .sort({ createdAt: -1 });
    res.json(communities);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch communities' });
  }
});

// Admin Temporarily Ban Community
router.put('/communities/:id/ban', async (req, res) => {
  try {
    const communityId = req.params.id;
    const { durationDays } = req.body;

    const community = await Community.findById(communityId);
    if (!community) return res.status(404).json({ message: "Community not found." });

    if (!durationDays || durationDays <= 0) {
      // Unban logic
      community.isBanned = false;
      community.banExpiresAt = null;
      await community.save();
      return res.json({ message: "Community successfully unbanned." });
    }

    // Ban logic
    community.isBanned = true;
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + parseInt(durationDays));
    community.banExpiresAt = expirationDate;
    await community.save();

    res.json({ message: `Community temporarily banned for ${durationDays} days.` });
  } catch (err) {
    console.error("Admin community ban error:", err);
    res.status(500).json({ error: 'Failed to ban community.' });
  }
});

router.delete('/communities/:id', async (req, res) => {
  try {
     const communityId = req.params.id;
     await Community.findByIdAndDelete(communityId);
     
     // Optionally delete all posts belonging to this community
     await Post.deleteMany({ community: communityId });

     if (req.io) req.io.emit('community_deleted', communityId);

     res.json({ message: "Community and its posts deleted by Admin." });
  } catch (err) {
     res.status(500).json({ error: 'Failed to delete community' });
  }
});

// ==========================================
// 📝 4. MANAGE POSTS
// ==========================================
router.get('/posts', async (req, res) => {
  try {
    const posts = await Post.find({ isDeleted: { $ne: true } })
        .populate('author', 'username profilePic')
        .populate('community', 'name')
        .sort({ createdAt: -1 })
        .limit(50); // Get recent 50 for admin review feed
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

router.delete('/posts/:id', async (req, res) => {
    try {
      const postId = req.params.id;
      // Soft Delete or Hard Delete? Let's Hard Delete for Admin 
      await Post.findByIdAndDelete(postId);
      res.json({ message: "Post permanently deleted by Admin." });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete post' });
    }
});

router.put('/users/:id/vartalap-badge', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        user.hasVartalapBadge = !user.hasVartalapBadge;
        await user.save();
        
        const actionMessage = user.hasVartalapBadge ? 'Vartalap Badge Awarded!' : 'Vartalap Badge Revoked!';
        res.status(200).json({ 
            message: actionMessage, 
            hasVartalapBadge: user.hasVartalapBadge 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to toggle Vartalap Badge' });
    }
});

// ==========================================
// 🚨 5. MANAGE REPORTS
// ==========================================
router.put('/users/:id/beta-tester', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        user.isBetaTester = !user.isBetaTester;
        await user.save();
        
        const actionMessage = user.isBetaTester ? 'Beta Tester access granted!' : 'Beta Tester access revoked!';
        res.status(200).json({ 
            message: actionMessage, 
            isBetaTester: user.isBetaTester 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to toggle Beta Tester status' });
    }
});

router.get('/reports', async (req, res) => {
    try {
      // Fetch reports, prioritizing pending
      const reports = await Report.find()
        .populate('reporter', 'username profilePic')
        .populate({
            path: 'targetId',
            select: 'title content name description author creator text' // Covering both Post and Community fields
        })
        .sort({ status: 1, createdAt: -1 }); // 'pending' comes before 'reviewed' alphabetically, but let's just sort by time for now
        
      res.json(reports);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

router.put('/reports/:id/resolve', async (req, res) => {
    try {
        const { action } = req.body; // 'delete_target', 'dismiss'
        const reportId = req.params.id;
        
        const report = await Report.findById(reportId);
        if (!report) return res.status(404).json({ message: "Report not found" });

        if (action === 'delete_target') {
            if (report.targetType === 'post') {
                await Post.findByIdAndDelete(report.targetId);
            } else if (report.targetType === 'community') {
                await Community.findByIdAndDelete(report.targetId);
                await Post.deleteMany({ community: report.targetId });
            }
            // If it's a comment, we'd need to pull it from the post array, assuming 'targetId' is the comment ID.
            // For now, post and community are covered.
        }

        report.status = action === 'dismiss' ? 'dismissed' : 'reviewed';
        await report.save();

        res.json({ message: `Report marked as ${report.status}`, report });
    } catch (err) {
        console.error("Resolve error:", err);
        res.status(500).json({ error: "Failed to resolve report." });
    }
});

// ==========================================
// 🧹 6. DATA DELETION / CLEANUP
// ==========================================
router.delete('/collections/:name/clear', async (req, res) => {
    try {
        const { name } = req.params;
        const { filterType } = req.query; // e.g., 'all', 'old' 
        
        let ModelToClear;
        let query = {};

        switch(name.toLowerCase()) {
            case 'notifications':
                ModelToClear = Notification;
                break;
            case 'messages':
                const Message = require('../models/Message'); // dynamically import
                ModelToClear = Message;
                break;
            case 'reports':
                ModelToClear = Report;
                query = { status: { $in: ['reviewed', 'dismissed'] } }; // only clear resolved ones
                break;
            case 'comments':
                const Comment = require('../models/Comment');
                ModelToClear = Comment;
                break;
            case 'posts':
                ModelToClear = Post;
                if (filterType === 'old') {
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    query = { createdAt: { $lt: thirtyDaysAgo } };
                }
                break;
            default:
                return res.status(400).json({ message: "Invalid or unsupported collection for deletion." });
        }

        if (filterType === 'old' && !query.createdAt) {
             const thirtyDaysAgo = new Date();
             thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
             query.createdAt = { $lt: thirtyDaysAgo };
        }

        const result = await ModelToClear.deleteMany(query);

        res.json({ 
            message: `Successfully deleted ${result.deletedCount} documents from ${name}.`,
            deletedCount: result.deletedCount
        });

    } catch (err) {
        console.error("Cleanup error:", err);
        res.status(500).json({ error: "Failed to clear collection data." });
    }
});

module.exports = router;
