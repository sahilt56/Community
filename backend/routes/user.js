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

    const Community = require('../models/Community');
    // Fetch communities this user has joined
    const joinedCommunities = await Community.find({ members: user._id }).select('name profilePic description');
    // Fetch communities this user has created
    const createdCommunities = await Community.find({ creator: user._id }).select('name profilePic description');

    const isOwner = loggedInUserId && loggedInUserId === user._id.toString();

    // 2. Overview / Posts
    // Base query: author is user, not deleted.
    let postsQuery = { author: user._id, isDeleted: { $ne: true } };
    
    // If not owner, filter out posts the user has hidden
    if (!isOwner && user.hiddenPosts && user.hiddenPosts.length > 0) {
      postsQuery._id = { $nin: user.hiddenPosts };
    }

    const userPosts = await Post.find(postsQuery)
      .populate('community', 'name')
      .sort({ createdAt: -1 });

    // 3. Comments (Posts where this user has commented)
    const commentedPosts = await Post.find({
      'comments.user': user._id,
      isDeleted: { $ne: true }
    }).populate('community', 'name').sort({ createdAt: -1 });

    // 4. Private Tabs (Only fetched if the requester IS the owner)
    let savedPosts = [];
    let hiddenPosts = [];
    let upvotedPosts = [];
    let downvotedPosts = [];

    if (isOwner) {
      savedPosts = await Post.find({ _id: { $in: user.savedPosts }, isDeleted: { $ne: true } })
        .populate('community', 'name').sort({ createdAt: -1 });
      
      hiddenPosts = await Post.find({ _id: { $in: user.hiddenPosts }, isDeleted: { $ne: true } })
        .populate('community', 'name').sort({ createdAt: -1 });

      upvotedPosts = await Post.find({ upvotes: user._id, isDeleted: { $ne: true } })
        .populate('community', 'name').sort({ createdAt: -1 });

      downvotedPosts = await Post.find({ downvotes: user._id, isDeleted: { $ne: true } })
        .populate('community', 'name').sort({ createdAt: -1 });
    }

    // Calculate total Anubhav (exclude self-votes)
    let totalAnubhav = 0;
    userPosts.forEach(post => {
      const otherUpvotes = post.upvotes?.filter(id => id.toString() !== user._id.toString()).length || 0;
      const otherDownvotes = post.downvotes?.filter(id => id.toString() !== user._id.toString()).length || 0;
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
        await deleteFromCloudinary(oldUrl);
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
    if (req.files['profilePic']) {
      // Delete old profile pic before saving new one
      await deleteOldFile(user.profilePic);
      const file = req.files['profilePic'][0];
      user.profilePic = file.path.startsWith('http') ? file.path : `/uploads/${file.filename}`;
    }

    // Handle banner image upload
    if (req.files['bannerPic']) {
      // Delete old banner pic before saving new one
      await deleteOldFile(user.bannerPic);
      const file = req.files['bannerPic'][0];
      user.bannerPic = file.path.startsWith('http') ? file.path : `/uploads/${file.filename}`;
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
        await deleteFromCloudinary(oldUrl);
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
    
    // A. Delete all posts by this user
    await Post.deleteMany({ author: userId });

    // B. Remove comments by this user from ALL posts
    await Post.updateMany(
      {},
      { $pull: { comments: { user: userId } } }
    );

    // C. Remove user's ID from upvotes, downvotes, savedBy, and hiddenBy lists on ALL posts
    await Post.updateMany(
      {},
      { 
        $pull: { 
          upvotes: userId, 
          downvotes: userId, 
          savedBy: userId, 
          hiddenBy: userId 
        } 
      }
    );

    // D. Remove user from all community membership lists
    await Community.updateMany(
      { members: userId },
      { $pull: { members: userId } }
    );

    // E. Handle communities where this user was the CREATOR
    // Option: Delete community OR transfer ownership? For now, we'll keep it but set creator to null 
    // to avoid orphaning. Alternatively, we could delete the community entirely.
    // Let's set it to null so the community remains but marks the creator as 'Deleted User'.
    await Community.updateMany(
      { creator: userId },
      { $set: { creator: null } }
    );

    // F. Cleanup Followers / Following references in other Users
    // Remove me from others' 'following' lists (they were following me)
    await User.updateMany(
        { following: userId },
        { $pull: { following: userId } }
    );
    // Remove me from others' 'followers' lists (I was following them)
    await User.updateMany(
        { followers: userId },
        { $pull: { followers: userId } }
    );

    // G. Finally, delete the User document
    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: "Account deleted permanently. We're sad to see you go! 👋" });

  } catch (err) {
    console.error("Account deletion error:", err);
    res.status(500).json({ error: "Failed to delete account. Please try again." });
  }
});

module.exports = router;