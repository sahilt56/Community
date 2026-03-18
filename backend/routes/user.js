const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const verifyToken = require('../middleware/verifyToken');
const upload = require('../middleware/upload');
const contentFilter = require('../middleware/contentFilter');

// GET USER PROFILE & THEIR POSTS
router.get('/:username', async (req, res) => {
  try {
    const requesterId = req.user ? req.user.id : null; // Passed via optional auth if we added one, but let's assume standard lookup first
    
    // We need to know who is requesting to decide if we send private data (Saved, Hidden)
    const token = req.headers.authorization?.split(' ')[1];
    let loggedInUserId = null;
    if (token) {
      const jwt = require('jsonwebtoken');
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        loggedInUserId = decoded.id;
      } catch (e) { /* ignore invalid token for public viewing */ }
    }

    // 1. Username se user dhundo (par password mat bhejna security ke liye)
    const user = await User.findOne({ username: req.params.username })
      .select('-password')
      .populate('followers', 'username profilePic')
      .populate('following', 'username profilePic');
    
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    const isOwner = loggedInUserId && loggedInUserId === user._id.toString();

    // 1.5. If user is banned, hide profile from public (unless owner or Admin)
    let isAdmin = false;
    if (loggedInUserId) {
      const requester = await User.findById(loggedInUserId);
      isAdmin = requester?.isAdmin || false;
    }

    if (user.isBanned && !isOwner && !isAdmin) {
      if (!user.banExpiresAt || new Date() <= user.banExpiresAt) {
          return res.status(404).json({ message: "This user profile is no longer available." });
      } else {
        // Ban implicitly expired, but let login route handle the DB update to be safe
      }
    }

    const Community = require('../models/Community');
    // Fetch communities this user has joined
    const joinedCommunities = await Community.find({ members: user._id }).select('name profilePic description');
    // Fetch communities this user has created
    const createdCommunities = await Community.find({ creator: user._id }).select('name profilePic description');

    // 2. Overview / Posts
    // Base query: author is user, not deleted.
    let postsQuery = { author: user._id, isDeleted: { $ne: true } };
    
    // If not owner, filter out posts the user has hidden
    if (!isOwner && user.hiddenPosts && user.hiddenPosts.length > 0) {
      postsQuery._id = { $nin: user.hiddenPosts };
    }

    const userPosts = await Post.aggregate([
      { $match: postsQuery },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "post",
          as: "comments"
        }
      }
    ]);
    await Post.populate(userPosts, { path: 'community', select: 'name' });

    // 3. Comments (Posts where this user has commented)
    // First find all distinct posts the user commented on
    const Comment = require('../models/Comment');
    const userCommentedPostIds = await Comment.distinct('post', { author: user._id });

    const commentedPosts = await Post.aggregate([
      { $match: { _id: { $in: userCommentedPostIds }, isDeleted: { $ne: true } } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "post",
          as: "comments"
        }
      }
    ]);
    await Post.populate(commentedPosts, { path: 'community', select: 'name' });

    // 4. Private Tabs (Only fetched if the requester IS the owner)
    let savedPosts = [];
    let hiddenPosts = [];
    let upvotedPosts = [];
    let downvotedPosts = [];

    if (isOwner) {
      savedPosts = await Post.aggregate([
        { $match: { _id: { $in: user.savedPosts }, isDeleted: { $ne: true } } },
        { $sort: { createdAt: -1 } },
        { $lookup: { from: "comments", localField: "_id", foreignField: "post", as: "comments" } }
      ]);
      await Post.populate(savedPosts, { path: 'community', select: 'name' });
      
      hiddenPosts = await Post.aggregate([
        { $match: { _id: { $in: user.hiddenPosts }, isDeleted: { $ne: true } } },
        { $sort: { createdAt: -1 } },
        { $lookup: { from: "comments", localField: "_id", foreignField: "post", as: "comments" } }
      ]);
      await Post.populate(hiddenPosts, { path: 'community', select: 'name' });

      upvotedPosts = await Post.aggregate([
        { $match: { upvotes: user._id, isDeleted: { $ne: true } } },
        { $sort: { createdAt: -1 } },
        { $lookup: { from: "comments", localField: "_id", foreignField: "post", as: "comments" } }
      ]);
      await Post.populate(upvotedPosts, { path: 'community', select: 'name' });

      downvotedPosts = await Post.aggregate([
        { $match: { downvotes: user._id, isDeleted: { $ne: true } } },
        { $sort: { createdAt: -1 } },
        { $lookup: { from: "comments", localField: "_id", foreignField: "post", as: "comments" } }
      ]);
      await Post.populate(downvotedPosts, { path: 'community', select: 'name' });
    }

    // Calculate total Anubhav (exclude self-votes)
    let totalAnubhav = user.anubhav || 0;
    userPosts.forEach(post => {
      const otherUpvotes = post.upvotes?.filter(id => id && id.toString() !== user._id.toString()).length || 0;
      const otherDownvotes = post.downvotes?.filter(id => id && id.toString() !== user._id.toString()).length || 0;
      totalAnubhav += (otherUpvotes - otherDownvotes);
    });

    // 5. Send all data
    res.status(200).json({ 
      profile: user, 
      posts: userPosts, // Used for 'Overview' and 'Posts' tab
      commentedPosts,
      savedPosts,
      hiddenPosts,
      upvotedPosts,
      downvotedPosts,
      totalAnubhav: totalAnubhav,
      joinedCommunities,
      createdCommunities
    });

  } catch (err) {
    res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
});

// UPDATE USER PROFILE (Profile Pic & Banner Pic)
router.put('/:username/update', verifyToken, upload.fields([
  { name: 'profilePic', maxCount: 1 },
  { name: 'bannerPic', maxCount: 1 }
]), contentFilter, async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const { deleteFromCloudinary } = require('../utils/cloudinary');

    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ message: "User not found!" });

    // Check if the authenticated user is the owner of the profile
    if (user._id.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only update your own profile!" });
    }

    // Helper: Delete old file (Local or Cloudinary)
    const deleteOldFile = async (oldUrl) => {
      if (!oldUrl) return;
      
      if (oldUrl.startsWith('http')) {
        // Cloudinary deletion
        if (typeof deleteFromCloudinary === 'function') await deleteFromCloudinary(oldUrl);
      } else {
        // Local Disk storage cleanup
        const filename = oldUrl.split('/').pop();
        const filePath = path.join(__dirname, '../uploads', filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Old local file deleted: ${filename}`);
        }
      }
    };

    // Handle profile image upload
    if (req.files && req.files['profilePic']) {
      // Delete old profile pic before saving new one
      await deleteOldFile(user.profilePic);
      const file = req.files['profilePic'][0];
      const fileUrl = file.path || file.secure_url || "";
      user.profilePic = fileUrl.startsWith('http') ? fileUrl : `/uploads/${file.filename}`;
    }

    // Handle banner image upload
    if (req.files && req.files['bannerPic']) {
      const file = req.files['bannerPic'][0];
      const isGif = file.originalname.toLowerCase().endsWith('.gif') || file.mimetype === 'image/gif';

      if (isGif && !user.canUseGifBanner && !user.isAdmin) {
        // Unauthorized GIF upload. Delete the file immediately.
        const fileUrl = file.path || file.secure_url || "";
        await deleteOldFile(fileUrl.startsWith('http') ? fileUrl : `/uploads/${file.filename}`);
        return res.status(403).json({ message: "You do not have permission to upload animated GIF banners. Ask an Admin." });
      }

      // Delete old banner pic before saving new one
      await deleteOldFile(user.bannerPic);
      const fileUrl = file.path || file.secure_url || "";
      user.bannerPic = fileUrl.startsWith('http') ? fileUrl : `/uploads/${file.filename}`;
    }

    // Handle description update
    if (req.body.description !== undefined) {
      user.description = req.body.description;
    }

    await user.save();
    
    // Send updated user back (excluding password)
    const { password, ...updatedUser } = user._doc;
    res.status(200).json({ 
      message: "Profile updated successfully!", 
      user: updatedUser 
    });

  } catch (err) {
    console.error("User update error:", err);
    res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
});

// DELETE PROFILE PIC OR BANNER PIC
router.delete('/:username/remove-image', verifyToken, async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const { deleteFromCloudinary } = require('../utils/cloudinary');

    const { type } = req.body; // 'profilePic' or 'bannerPic'
    if (!['profilePic', 'bannerPic'].includes(type)) {
      return res.status(400).json({ message: "Invalid type! Use 'profilePic' or 'bannerPic'" });
    }

    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ message: "User not found!" });

    if (user._id.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only update your own profile!" });
    }

    // Delete file (Local or Cloudinary)
    const oldUrl = user[type];
    if (oldUrl) {
      if (oldUrl.startsWith('http')) {
        if (typeof deleteFromCloudinary === 'function') await deleteFromCloudinary(oldUrl);
      } else {
        const filename = oldUrl.split('/').pop();
        const filePath = path.join(__dirname, '../uploads', filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Old local file deleted: ${filename}`);
        }
      }
    }

    // Clear from database
    user[type] = null;
    await user.save();

    const { password, ...updatedUser } = user._doc;
    res.status(200).json({ 
      message: `${type === 'profilePic' ? 'Profile Picture' : 'Banner'} removed!`,
      user: updatedUser 
    });

  } catch (err) {
    console.error("User image removal error:", err);
    res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
});

// FOLLOW / UNFOLLOW A USER
router.put('/:id/follow', verifyToken, async (req, res) => {
  try {
    if (req.user.id === req.params.id) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    const targetUser = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    let isFollowing = false;

    // Toggle logic
    if (currentUser.following.includes(targetUser._id)) {
      // Unfollow
      currentUser.following.pull(targetUser._id);
      targetUser.followers.pull(currentUser._id);
    } else {
      // Follow
      currentUser.following.push(targetUser._id);
      targetUser.followers.push(currentUser._id);
      isFollowing = true;

      // Optional: Create Notification here
      const Notification = require('../models/Notification');
      await Notification.create({
        recipient: targetUser._id,
        sender: currentUser._id,
        type: 'follow',
        content: 'started following you'
      });
    }

    await Promise.all([currentUser.save(), targetUser.save()]);

    res.status(200).json({ message: isFollowing ? "Followed successfully" : "Unfollowed successfully", isFollowing });
  } catch (err) {
    res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
});

// PERMANENTLY DELETE ACCOUNT
router.delete('/:id/delete', verifyToken, async (req, res) => {
  try {
    const userId = req.params.id;

    // 1. Security check: user can only delete their own account
    if (req.user.id !== userId) {
      return res.status(403).json({ message: "You can only delete your own account!" });
    }

    const Community = require('../models/Community');

    // 2. Data Cleanup Logic
    
    // A. Find all Communities created by the user
    // We will delete them completely
    const communitiesToDelete = await Community.find({ creator: userId });
    const communityIds = communitiesToDelete.map(c => c._id);

    // B. Find all Posts that are either IN these communities OR authored by this user
    // We will delete all of these posts
    const Post = require('../models/Post');
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

    // F. Finally, delete the User document
    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: "Account deleted permanently. We're sad to see you go! 👋" });

  } catch (err) {
    console.error("Account deletion error:", err);
    res.status(500).json({ error: "Failed to delete account. Please try again." });
  }
});

module.exports = router;